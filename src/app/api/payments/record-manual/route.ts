import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPaiementRecu } from '@/lib/webhooks/n8n-webhooks';

interface RecordManualPaymentRequest {
  orderId: string;
  type: 'deposit' | 'balance' | 'full';
  method: 'cash' | 'card_terminal' | 'other';
  amountCents?: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecordManualPaymentRequest = await request.json();
    const { orderId, type, method, amountCents, notes } = body;

    if (!orderId || !type || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, type, method' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    // Fetch current order with client for GHL webhook
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        total_cents,
        deposit_cents,
        balance_due_cents,
        payment_status,
        notes,
        client:client_id (
          ghl_contact_id
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, any> = {};

    switch (type) {
      case 'deposit':
        // Record deposit payment
        const depositAmount = amountCents || Math.ceil(order.total_cents / 2);
        updateData.deposit_cents = depositAmount;
        updateData.deposit_paid_at = now;
        updateData.deposit_payment_method = method;
        updateData.payment_status = 'deposit_paid'; // Deposit received, balance pending
        console.log(`💵 Recording ${method} deposit of $${(depositAmount / 100).toFixed(2)} for order ${order.order_number}`);
        break;

      case 'balance':
        // Record balance payment (after deposit was already paid)
        updateData.payment_status = 'paid';
        updateData.payment_method = method;
        updateData.paid_at = now;
        console.log(`💵 Recording ${method} balance payment for order ${order.order_number}`);
        break;

      case 'full':
        // Record full payment (covers both deposit and balance)
        updateData.payment_status = 'paid';
        updateData.payment_method = method;
        updateData.paid_at = now;
        // If this is a custom order, also mark deposit as paid
        if (order.deposit_cents === 0 || !order.deposit_cents) {
          updateData.deposit_cents = Math.ceil(order.total_cents / 2);
          updateData.deposit_paid_at = now;
          updateData.deposit_payment_method = method;
        }
        console.log(`💵 Recording ${method} full payment for order ${order.order_number}`);
        break;

      default:
        return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    // Add payment notes if provided
    if (notes) {
      const existingNotes = (order.notes as Record<string, any>) || {};
      updateData.notes = {
        ...existingNotes,
        payment_notes: notes,
        payment_recorded_at: now,
        payment_recorded_method: method,
      };
    }

    // Update the order
    const { error: updateError } = await supabase
      .from('order')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // Calculate amount for webhook
    const paymentAmountCents = amountCents || (type === 'deposit' ? Math.ceil(order.total_cents / 2) : order.balance_due_cents);

    // Send n8n webhook to update GHL tags (discrete - no detailed logging for cash)
    const client = order.client as any;
    // Map 'other' to 'cash' for webhook (manual payments are treated as cash)
    const webhookMethod: 'stripe' | 'cash' | 'card_terminal' = method === 'other' ? 'cash' : method;
    try {
      await sendPaiementRecu({
        payment_type: type,
        payment_method: webhookMethod,
        amount_cents: paymentAmountCents,
        order: {
          id: orderId,
          order_number: order.order_number,
        },
        client: {
          ghl_contact_id: client?.ghl_contact_id || null,
        },
      });
      console.log(`✅ Payment received webhook sent for order ${order.order_number}`);
    } catch (webhookError) {
      console.warn('⚠️ Payment received webhook failed (non-blocking):', webhookError);
    }

    return NextResponse.json({
      success: true,
      message: `${type} payment recorded via ${method}`,
      payment_status: updateData.payment_status,
    });
  } catch (error) {
    console.error('❌ Record manual payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record payment' },
      { status: 500 }
    );
  }
}
