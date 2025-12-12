import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink, OrderForPayment } from '@/lib/integrations/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { order_id } = await request.json();

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      );
    }

    interface OrderQueryResult {
      id: string;
      order_number: number;
      total_cents: number;
      client: {
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
      };
      garment: Array<{
        type: string;
        garment_service: Array<{
          quantity: number;
          custom_price_cents: number | null;
          service: { name: string; base_price_cents: number } | null;
        }>;
      }>;
    }

    const supabase = await createClient();

    const { data, error: orderError } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        total_cents,
        client:client_id (
          first_name,
          last_name,
          email,
          phone
        ),
        garment (
          type,
          garment_service (
            quantity,
            custom_price_cents,
            service:service_id (
              name,
              base_price_cents
            )
          )
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = data as unknown as OrderQueryResult;
    const client = order.client;
    const garments = order.garment;

    const orderForPayment: OrderForPayment = {
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
      client: {
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
      },
      garments: garments.map(g => ({
        type: g.type,
        services: g.garment_service
          .filter(gs => gs.service)
          .map(gs => ({
            name: gs.service!.name,
            price_cents: gs.custom_price_cents || gs.service!.base_price_cents,
            quantity: gs.quantity,
          })),
      })),
    };

    const paymentUrl = await createPaymentLink(orderForPayment);

    return NextResponse.json({
      success: true,
      payment_url: paymentUrl,
      order_number: order.order_number,
    });
  } catch (error) {
    console.error('❌ Failed to create payment link:', error);
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
