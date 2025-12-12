import { NextRequest, NextResponse } from 'next/server';

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

    // Only process ready_for_pickup and delivered status changes
    if (!['ready', 'delivered'].includes(payload.new_status)) {
      return NextResponse.json({
        success: true,
        message: 'No action needed for this status',
      });
    }

    // Agent B: Forward to Make.com for QuickBooks invoice creation
    if (process.env.MAKE_WEBHOOK_URL && payload.new_status === 'ready') {
      try {
        const makeResponse = await fetch(process.env.MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (makeResponse.ok) {
          const makeResult = await makeResponse.json();
          console.log('✅ Make.com webhook successful:', makeResult);

          // If Make.com returns invoice URL, we could update the order here
          // This will be implemented by Agent B
        } else {
          console.warn('⚠️ Make.com webhook failed:', await makeResponse.text());
        }
      } catch (makeError) {
        console.warn('⚠️ Make.com webhook error:', makeError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order ${payload.order_number} status webhook processed`,
    });
  } catch (error) {
    console.error('❌ Order status webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
