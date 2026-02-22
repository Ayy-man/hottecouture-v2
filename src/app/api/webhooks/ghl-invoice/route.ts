/**
 * GHL Invoice Webhook Handler
 *
 * Receives webhook events from GoHighLevel when invoices are paid, updated, etc.
 *
 * Setup in GHL:
 * 1. Go to Automation → Workflows
 * 2. Create new workflow with trigger "Invoice Paid"
 * 3. Add action "Custom Webhook"
 * 4. Set URL to: https://hottecouture-v2.vercel.app/api/webhooks/ghl-invoice
 * 5. Method: POST
 * 6. Add header: x-webhook-secret = your-secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { validateWebhookSecret } from '@/lib/utils/timing-safe';
import { calculateDepositCents, parsePaymentTypeFromMetadata, type PaymentType } from '@/lib/payments/deposit-calculator';

// Webhook secret for verification (set in GHL webhook config)
const WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET || 'hotte-couture-ghl-webhook-2024';

// Raw payload from GHL - accepts both snake_case and camelCase, strings or numbers
interface GHLInvoiceWebhookPayloadRaw {
  type: 'InvoicePaid' | 'InvoiceCreate' | 'InvoiceUpdate' | 'InvoiceSent' | 'InvoiceVoid';
  locationId?: string;
  location_id?: string;
  invoice: {
    _id?: string;
    id?: string;
    invoiceNumber?: string;
    invoice_number?: string;
    status?: 'draft' | 'sent' | 'paid' | 'void' | 'partially_paid';
    // GHL sends these as snake_case, may be string or number
    amountPaid?: number | string;
    amount_paid?: number | string;
    amountDue?: number | string;
    amount_due?: number | string;
    total?: number | string;
    total_price?: number | string;
    currency?: string;
    contactId?: string;
    contact_id?: string;
    contactDetails?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
    };
    paidAt?: string;
    paid_at?: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
    // Invoice name and notes for metadata parsing
    name?: string;
    termsNotes?: string;
    terms_notes?: string;
  };
}

// Normalized invoice data
interface NormalizedInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  amountPaid: number;
  amountDue: number;
  total: number;
  currency: string;
  contactId: string;
  paidAt: string | null;
}

/**
 * Parse a value that might be a string or number into a number
 */
function toNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  // Remove any whitespace and parse
  const cleaned = String(value).trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize the raw GHL payload to a consistent format
 */
function normalizeInvoice(raw: GHLInvoiceWebhookPayloadRaw['invoice']): NormalizedInvoice {
  return {
    id: raw._id || raw.id || '',
    invoiceNumber: raw.invoiceNumber || raw.invoice_number || '',
    status: raw.status || 'paid',
    amountPaid: toNumber(raw.amountPaid ?? raw.amount_paid),
    amountDue: toNumber(raw.amountDue ?? raw.amount_due),
    total: toNumber(raw.total ?? raw.total_price),
    currency: raw.currency || 'CAD',
    contactId: raw.contactId || raw.contact_id || raw.contactDetails?.id || '',
    paidAt: raw.paidAt || raw.paid_at || raw.updatedAt || raw.updated_at || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret using timing-safe comparison
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (!validateWebhookSecret(webhookSecret, WEBHOOK_SECRET)) {
      console.warn('⚠️ Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawPayload: GHLInvoiceWebhookPayloadRaw = await request.json();

    // Log raw payload for debugging
    console.log('📥 GHL Invoice Webhook Raw:', JSON.stringify(rawPayload, null, 2));

    // Normalize the invoice data (handles snake_case, camelCase, strings, numbers)
    const invoice = normalizeInvoice(rawPayload.invoice);

    console.log(`📥 GHL Invoice Webhook: ${rawPayload.type}`, {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      amountPaid: invoice.amountPaid,
      total: invoice.total,
    });

    // Only process InvoicePaid events
    if (rawPayload.type !== 'InvoicePaid') {
      console.log(`ℹ️ Ignoring ${rawPayload.type} event`);
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    const invoiceNumber = invoice.invoiceNumber;
    const invoiceName = rawPayload.invoice.name || '';

    // Extract order number from invoice number (format: HC-123, HC 123, hc-123, etc.)
    const orderNumberMatch = invoiceNumber.match(/HC[- ]?(\d+)/i);
    if (!orderNumberMatch?.[1]) {
      console.warn(`[GHL-Webhook] Could not parse order number from: "${invoiceNumber}" (name: "${invoiceName}")`);
      return NextResponse.json({ success: true, message: 'Non-order invoice' });
    }

    const orderNumber = parseInt(orderNumberMatch[1], 10);

    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    // Find order by order_number
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('id, order_number, type, total_cents, deposit_cents, payment_status, deposit_paid_at, status')
      .eq('order_number', orderNumber)
      .single();

    if (orderError || !order) {
      console.error(`❌ Order not found for order_number: ${orderNumber}`, orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // ── Detect payment type ──────────────────────────────────────────
    // Priority: 1) termsNotes metadata  2) invoice number suffix  3) invoice name  4) order state
    const rawTerms = rawPayload.invoice.termsNotes || rawPayload.invoice.terms_notes;
    const metadataPaymentType = parsePaymentTypeFromMetadata(rawTerms);

    let detectedPaymentType: PaymentType = 'full';
    let detectionMethod = 'default';

    if (metadataPaymentType) {
      detectedPaymentType = metadataPaymentType;
      detectionMethod = 'metadata';
    } else if (invoiceNumber.toUpperCase().includes('-DEPOSIT')) {
      detectedPaymentType = 'deposit';
      detectionMethod = 'invoice_number_suffix';
    } else if (invoiceNumber.toUpperCase().includes('-BALANCE')) {
      detectedPaymentType = 'balance';
      detectionMethod = 'invoice_number_suffix';
    } else {
      // Check invoice name for French keywords
      const nameToCheck = (invoiceName || '').toLowerCase();
      if (nameToCheck.includes('dépôt') || nameToCheck.includes('depot')) {
        detectedPaymentType = 'deposit';
        detectionMethod = 'invoice_name';
      } else if (nameToCheck.includes('solde')) {
        detectedPaymentType = 'balance';
        detectionMethod = 'invoice_name';
      } else if (order.type === 'custom' && !order.deposit_paid_at) {
        // Custom order with no deposit yet — this must be the deposit
        detectedPaymentType = 'deposit';
        detectionMethod = 'order_state';
      }
    }

    console.log(`📋 Payment type: ${detectedPaymentType} (via ${detectionMethod})`);

    const isDeposit = detectedPaymentType === 'deposit';
    const isBalance = detectedPaymentType === 'balance';

    // ── Calculate amount ──────────────────────────────────────────────
    // GHL webhook may not include amountPaid — derive from order data
    let thisPaymentCents: number;

    if (invoice.amountPaid > 0) {
      // Amount was in the webhook payload (dollars → cents)
      thisPaymentCents = Math.round(invoice.amountPaid * 100);
      console.log(`💰 Amount from webhook: $${invoice.amountPaid} (${thisPaymentCents}¢)`);
    } else {
      // Amount NOT in payload — calculate from order based on payment type
      if (isDeposit) {
        thisPaymentCents = calculateDepositCents(order.total_cents);
      } else if (isBalance) {
        const depositPaid = order.deposit_cents || calculateDepositCents(order.total_cents);
        thisPaymentCents = order.total_cents - depositPaid;
      } else {
        thisPaymentCents = order.total_cents;
      }
      console.log(`💰 Amount calculated from order: ${thisPaymentCents}¢ (type: ${detectedPaymentType})`);
    }

    const previouslyPaidCents = order.deposit_paid_at ? (order.deposit_cents || 0) : 0;
    const totalPaidAfterCents = previouslyPaidCents + thisPaymentCents;

    // ── Update order ──────────────────────────────────────────────────
    const paidAt = invoice.paidAt || new Date().toISOString();
    const updateData: Record<string, any> = {};

    let newPaymentStatus: string;
    let logMessage: string;

    if (isDeposit && !order.deposit_paid_at) {
      // Deposit payment
      newPaymentStatus = 'deposit_paid';
      updateData.deposit_paid_at = paidAt;
      updateData.deposit_cents = thisPaymentCents;
      updateData.deposit_payment_method = 'stripe';
      logMessage = `Deposit of $${(thisPaymentCents / 100).toFixed(2)} recorded for order #${orderNumber}`;
    } else if (isBalance || totalPaidAfterCents >= order.total_cents) {
      // Balance payment or fully paid
      newPaymentStatus = 'paid';
      updateData.paid_at = paidAt;
      updateData.payment_method = 'stripe';
      logMessage = `Payment of $${(thisPaymentCents / 100).toFixed(2)} completed for order #${orderNumber} (fully paid)`;
    } else {
      // Full payment in one go
      newPaymentStatus = 'paid';
      updateData.paid_at = paidAt;
      updateData.payment_method = 'stripe';
      logMessage = `Full payment of $${(thisPaymentCents / 100).toFixed(2)} recorded for order #${orderNumber}`;
    }

    updateData.payment_status = newPaymentStatus;
    console.log(`✅ ${logMessage}`);

    // Auto-archive if order is delivered and fully paid
    if (newPaymentStatus === 'paid' && order.status === 'delivered') {
      updateData.status = 'archived';
      updateData.is_archived = true;
      updateData.archived_at = paidAt;
      console.log(`📦 Auto-archiving order #${orderNumber} (delivered + paid)`);
    }

    // Update the order
    const { error: updateError } = await supabase
      .from('order')
      .update(updateData)
      .eq('id', order.id);

    if (updateError) {
      console.error(`❌ Failed to update order #${orderNumber}:`, updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // Log the event
    await supabase.from('event_log').insert({
      actor: 'ghl-webhook',
      entity: 'order',
      entity_id: order.id,
      action: 'payment_received',
      details: {
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        amount_paid_cents: thisPaymentCents,
        amount_from_webhook: invoice.amountPaid > 0,
        total_paid_cents: totalPaidAfterCents,
        order_total_cents: order.total_cents,
        payment_type: detectedPaymentType,
        detection_method: detectionMethod,
        new_status: newPaymentStatus,
        contact_id: invoice.contactId,
      },
    });

    // Log auto-archive if it happened
    if (updateData.status === 'archived') {
      await supabase.from('event_log').insert({
        actor: 'ghl-webhook',
        entity: 'order',
        entity_id: order.id,
        action: 'auto_archived_on_payment',
        details: {
          reason: 'Order was delivered and fully paid',
          invoice_number: invoiceNumber,
        },
      });
    }

    console.log(`✅ Order #${orderNumber} payment status updated to: ${newPaymentStatus}`);

    return NextResponse.json({
      success: true,
      order_number: orderNumber,
      payment_status: newPaymentStatus,
      payment_type: detectedPaymentType,
    });
  } catch (error) {
    console.error('❌ GHL Invoice Webhook Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'GHL Invoice Webhook endpoint ready',
    events: ['InvoicePaid', 'InvoiceCreate', 'InvoiceUpdate', 'InvoiceSent', 'InvoiceVoid'],
  });
}
