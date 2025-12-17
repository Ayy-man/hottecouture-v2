import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import {
  sendDemandeDepot,
  sendPretRamassage,
  buildN8nOrder,
  buildN8nClient,
} from '@/lib/webhooks/n8n-webhooks';

// Lazy initialization to avoid build-time errors
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

interface CreateCheckoutRequest {
  orderId: string;
  type: 'deposit' | 'balance' | 'full';
  sendSms?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateCheckoutRequest = await request.json();
    const { orderId, type, sendSms = true } = body;

    if (!orderId || !type) {
      return NextResponse.json(
        { error: 'Missing orderId or type' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    // Fetch order with client details
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        type,
        total_cents,
        deposit_cents,
        balance_due_cents,
        payment_status,
        deposit_paid_at,
        client:client_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          language
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Calculate amount based on type
    let amountCents: number;
    let description: string;

    switch (type) {
      case 'deposit':
        // 50% deposit for custom orders
        amountCents = Math.ceil(order.total_cents / 2);
        description = `Dépôt 50% - Commande #${order.order_number}`;
        break;
      case 'balance':
        // Remaining balance (total - deposit already paid)
        const depositPaid = order.deposit_paid_at ? (order.deposit_cents || Math.ceil(order.total_cents / 2)) : 0;
        amountCents = order.total_cents - depositPaid;
        description = `Solde - Commande #${order.order_number}`;
        break;
      case 'full':
        // Full amount
        amountCents = order.total_cents;
        description = `Commande #${order.order_number}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    if (amountCents <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount - nothing to pay' },
        { status: 400 }
      );
    }

    const client = order.client as any;
    const clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'Client';

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: description,
              description: `Client: ${clientName}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hottecouture-v2.vercel.app'}/portal?order=${order.order_number}&payment=success&type=${type}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hottecouture-v2.vercel.app'}/portal?order=${order.order_number}&payment=cancelled`,
      customer_email: client?.email || undefined,
      metadata: {
        order_id: orderId,
        order_number: order.order_number.toString(),
        payment_type: type,
      },
      locale: client?.language === 'en' ? 'en' : 'fr-CA',
    });

    // Update order with checkout session ID and pending status
    const updateData: Record<string, any> = {
      stripe_checkout_session_id: session.id,
    };

    if (type === 'deposit') {
      updateData.payment_status = 'deposit_pending';
      // Pre-set the deposit amount
      updateData.deposit_cents = amountCents;
    } else {
      updateData.payment_status = 'pending';
    }

    await supabase
      .from('order')
      .update(updateData)
      .eq('id', orderId);

    // Send notification via n8n webhook
    if (sendSms && client?.phone) {
      try {
        // Build n8n-compatible order and client objects
        const n8nOrder = buildN8nOrder({
          ...order,
          deposit_cents: type === 'deposit' ? amountCents : order.deposit_cents,
        });
        const n8nClient = buildN8nClient(client);

        if (type === 'deposit') {
          // Send deposit request notification
          const webhookResult = await sendDemandeDepot(n8nClient, n8nOrder, session.url!);

          if (webhookResult.success) {
            console.log(`✅ Deposit request sent via n8n for order ${order.order_number}`);
          } else {
            console.warn(`⚠️ Deposit request webhook failed:`, webhookResult.error);
          }
        } else {
          // Send ready for pickup notification with payment link
          const webhookResult = await sendPretRamassage(n8nClient, n8nOrder, session.url!, amountCents);

          if (webhookResult.success) {
            console.log(`✅ Payment ready notification sent via n8n for order ${order.order_number}`);
          } else {
            console.warn(`⚠️ Payment ready webhook failed:`, webhookResult.error);
          }
        }
      } catch (webhookError) {
        console.warn('⚠️ Failed to send n8n webhook:', webhookError);
        // Don't fail the checkout creation if webhook fails
      }
    }

    console.log(`✅ Checkout session created for order ${order.order_number}, type: ${type}, amount: $${(amountCents / 100).toFixed(2)}`);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      amount_cents: amountCents,
      type,
    });
  } catch (error) {
    console.error('❌ Create checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
