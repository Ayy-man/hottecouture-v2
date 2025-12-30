/**
 * GHL Invoice Webhook Handler
 *
 * Receives webhook events from GoHighLevel when invoices are paid, updated, etc.
 *
 * Setup in GHL:
 * 1. Go to Automation → Workflows
 * 2. Create new workflow with trigger "Invoice Paid"
 * 3. Add action "Custom Webhook"
 * 4. Set URL to: https://hottecouture.vercel.app/api/webhooks/ghl-invoice
 * 5. Method: POST
 * 6. Add header: x-webhook-secret = your-secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
    // Verify webhook secret
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret !== WEBHOOK_SECRET) {
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

    // Extract order number from invoice number (format: HC-123)
    const orderNumberMatch = invoiceNumber.match(/HC-(\d+)/);
    if (!orderNumberMatch || !orderNumberMatch[1]) {
      console.warn(`⚠️ Could not extract order number from invoice: ${invoiceNumber}`);
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

    // Determine payment type based on invoice name and current status
    const isDeposit = invoiceNumber.toLowerCase().includes('depot') ||
                      (invoice.total > 0 && invoice.total < order.total_cents / 100);

    // Update order based on payment
    const paidAt = invoice.paidAt || new Date().toISOString();
    const updateData: Record<string, any> = {
      paid_at: paidAt,
    };

    if (isDeposit && !order.deposit_paid_at) {
      // Deposit payment
      updateData.payment_status = 'deposit_paid';
      updateData.deposit_paid_at = paidAt;
      updateData.deposit_cents = Math.round(invoice.amountPaid * 100);
      console.log(`✅ Deposit payment recorded for order #${orderNumber}: $${invoice.amountPaid}`);
    } else if (order.deposit_paid_at || order.payment_status === 'deposit_paid') {
      // Balance payment (deposit was already paid)
      updateData.payment_status = 'paid';

      // Auto-archive if order is delivered
      if (order.status === 'delivered') {
        updateData.status = 'archived';
        updateData.is_archived = true;
        updateData.archived_at = paidAt;
        console.log(`📦 Auto-archiving order #${orderNumber} (delivered + paid)`);
      }

      console.log(`✅ Balance payment recorded for order #${orderNumber}`);
    } else {
      // Full payment
      updateData.payment_status = 'paid';

      // Auto-archive if order is delivered
      if (order.status === 'delivered') {
        updateData.status = 'archived';
        updateData.is_archived = true;
        updateData.archived_at = paidAt;
        console.log(`📦 Auto-archiving order #${orderNumber} (delivered + paid)`);
      }

      console.log(`✅ Full payment recorded for order #${orderNumber}`);
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
        amount_paid: invoice.amountPaid,
        total: invoice.total,
        payment_type: isDeposit ? 'deposit' : 'full',
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

    console.log(`✅ Order #${orderNumber} payment status updated to: ${updateData.payment_status}`);

    return NextResponse.json({
      success: true,
      order_number: orderNumber,
      payment_status: updateData.payment_status,
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
