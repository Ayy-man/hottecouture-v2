import { NextRequest, NextResponse } from 'next/server';
import { sendToMake, updateOrderWithInvoice, MakeWebhookPayload } from '@/lib/integrations/make';

interface OrderStatusWebhookPayload {
  event: 'order.status_changed';
  order_id: string;
  order_number: number;
  new_status: string;
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    language: string;
  };
  items: Array<{
    garment_type: string;
    services: string[];
    total_cents: number;
  }>;
  totals: {
    subtotal_cents: number;
    tps_cents: number;
    tvq_cents: number;
    total_cents: number;
  };
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: OrderStatusWebhookPayload = await request.json();

    console.log('📬 Order status webhook received:', {
      event: payload.event,
      order_id: payload.order_id,
      order_number: payload.order_number,
      new_status: payload.new_status,
      timestamp: payload.timestamp,
    });

    if (!['ready', 'delivered'].includes(payload.new_status)) {
      return NextResponse.json({
        success: true,
        message: 'No action needed for this status',
      });
    }

    let invoiceResult = null;

    if (payload.new_status === 'ready') {
      const makePayload: MakeWebhookPayload = {
        event: 'order.status_changed',
        order_id: payload.order_id,
        order_number: payload.order_number,
        new_status: payload.new_status,
        client: payload.client,
        items: payload.items,
        totals: payload.totals,
        timestamp: payload.timestamp,
      };

      const result = await sendToMake(makePayload);

      if (result.success && result.invoice_url) {
        await updateOrderWithInvoice(
          payload.order_id,
          result.invoice_url,
          result.invoice_number || ''
        );
        invoiceResult = {
          invoice_url: result.invoice_url,
          invoice_number: result.invoice_number,
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order ${payload.order_number} status webhook processed`,
      invoice: invoiceResult,
    });
  } catch (error) {
    console.error('❌ Order status webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
