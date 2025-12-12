import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, handlePaymentSuccess } from '@/lib/integrations/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error('❌ Stripe webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log('📬 Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (orderId && session.payment_intent) {
          await handlePaymentSuccess(
            orderId,
            session.payment_intent as string
          );

          console.log(`✅ Payment completed for order ${orderId}`);

          if (process.env.NEXT_PUBLIC_APP_URL) {
            try {
              await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/payment-received`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ order_id: orderId }),
                }
              );
            } catch (notifyError) {
              console.warn('⚠️ Failed to send payment notification:', notifyError);
            }
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          await handlePaymentSuccess(orderId, paymentIntent.id);
          console.log(`✅ Payment intent succeeded for order ${orderId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          console.log(`❌ Payment failed for order ${orderId}:`, paymentIntent.last_payment_error?.message);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`💰 Refund processed for charge ${charge.id}`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
