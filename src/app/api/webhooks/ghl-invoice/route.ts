/**
 * GHL Invoice Webhook Handler
 *
 * Receives webhook events from GoHighLevel when invoices are paid, updated, etc.
 *
 * Setup in GHL:
 * 1. Go to Automation → Workflows
 * 2. Create new workflow with trigger "Invoice Paid"
 * 3. Add action "Custom Webhook"
 * 4. Set URL to: https://your-domain.com/api/webhooks/ghl-invoice
 * 5. Method: POST
 * 6. Add header: x-webhook-secret = your-secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Webhook secret for verification (set in GHL webhook config)
const WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET || 'hotte-couture-ghl-webhook-2024';

interface GHLInvoiceWebhookPayload {
  type: 'InvoicePaid' | 'InvoiceCreate' | 'InvoiceUpdate' | 'InvoiceSent' | 'InvoiceVoid';
  locationId: string;
  invoice: {
    _id: string;
    invoiceNumber: string;
    status: 'draft' | 'sent' | 'paid' | 'void' | 'partially_paid';
    amountPaid: number;
    amountDue: number;
    total: number;
    currency: string;
    contactId: string;
    contactDetails?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
    };
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
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

    const payload: GHLInvoiceWebhookPayload = await request.json();

    console.log(`📥 GHL Invoice Webhook: ${payload.type}`, {
      invoiceId: payload.invoice._id,
      invoiceNumber: payload.invoice.invoiceNumber,
      status: payload.invoice.status,
    });

    // Only process InvoicePaid events
    if (payload.type !== 'InvoicePaid') {
      console.log(`ℹ️ Ignoring ${payload.type} event`);
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    const invoice = payload.invoice;
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
      .select('id, order_number, type, total_cents, deposit_cents, payment_status, deposit_paid_at')
      .eq('order_number', orderNumber)
      .single();

    if (orderError || !order) {
      console.error(`❌ Order not found for order_number: ${orderNumber}`, orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Determine payment type based on invoice name and current status
    const isDeposit = invoiceNumber.toLowerCase().includes('depot') ||
                      invoice.total < order.total_cents / 100;

    // Update order based on payment
    const updateData: Record<string, any> = {
      paid_at: invoice.paidAt || new Date().toISOString(),
    };

    if (isDeposit && !order.deposit_paid_at) {
      // Deposit payment
      updateData.payment_status = 'deposit_paid';
      updateData.deposit_paid_at = invoice.paidAt || new Date().toISOString();
      updateData.deposit_cents = Math.round(invoice.amountPaid * 100);
      console.log(`✅ Deposit payment recorded for order #${orderNumber}`);
    } else if (order.deposit_paid_at || order.payment_status === 'deposit_paid') {
      // Balance payment (deposit was already paid)
      updateData.payment_status = 'paid';
      console.log(`✅ Balance payment recorded for order #${orderNumber}`);
    } else {
      // Full payment
      updateData.payment_status = 'paid';
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
        invoice_id: invoice._id,
        invoice_number: invoiceNumber,
        amount_paid: invoice.amountPaid,
        payment_type: isDeposit ? 'deposit' : 'full',
        contact_id: invoice.contactId,
      },
    });

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
