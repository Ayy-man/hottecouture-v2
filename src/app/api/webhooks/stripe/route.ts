import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/integrations/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import {
  recordPaymentReceived,
  isGHLConfigured,
  type AppClient,
} from '@/lib/ghl';

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

  const supabase = await createServiceRoleClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        const paymentType = session.metadata?.payment_type; // 'deposit', 'balance', or 'full'
        const orderNumber = session.metadata?.order_number;

        if (orderId) {
          const now = new Date().toISOString();
          const updateData: Record<string, any> = {
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
          };

          if (paymentType === 'deposit') {
            // Deposit payment completed
            updateData.deposit_cents = session.amount_total;
            updateData.deposit_paid_at = now;
            updateData.deposit_payment_method = 'stripe';
            updateData.payment_status = 'deposit_paid'; // Balance still pending

            console.log(`✅ Deposit of $${((session.amount_total || 0) / 100).toFixed(2)} received for order #${orderNumber} (${orderId})`);
          } else {
            // Balance or full payment completed
            updateData.payment_status = 'paid';
            updateData.payment_method = 'stripe';
            updateData.paid_at = now;

            // Check if order is delivered - if so, auto-archive
            const { data: currentOrder } = await supabase
              .from('order')
              .select('status')
              .eq('id', orderId)
              .single();

            if (currentOrder?.status === 'delivered') {
              updateData.status = 'archived';
              updateData.archived_at = now;
              console.log(`📦 Auto-archiving order #${orderNumber} (delivered + paid)`);
            }

            console.log(`✅ Full payment of $${((session.amount_total || 0) / 100).toFixed(2)} completed for order #${orderNumber} (${orderId})`);
          }

          // Update the order
          const { error: updateError } = await supabase
            .from('order')
            .update(updateData)
            .eq('id', orderId);

          if (updateError) {
            console.error('❌ Failed to update order:', updateError);
          }

          // Log the payment event
          await supabase.from('event_log').insert({
            entity: 'order',
            entity_id: orderId,
            action: paymentType === 'deposit' ? 'deposit_received' : 'payment_received',
            actor: 'stripe_webhook',
            details: {
              payment_type: paymentType,
              amount_cents: session.amount_total,
              session_id: session.id,
              payment_intent_id: session.payment_intent,
            },
          });

          // Log auto-archive if it happened
          if (updateData.status === 'archived') {
            await supabase.from('event_log').insert({
              entity: 'order',
              entity_id: orderId,
              action: 'auto_archived_on_payment',
              actor: 'stripe_webhook',
              details: {
                reason: 'Order was delivered and fully paid',
                payment_type: paymentType,
              },
            });
          }

          // Get full order and client data for webhook
          const { data: orderWithClient } = await supabase
            .from('order')
            .select(`
              id,
              order_number,
              type,
              status,
              total_cents,
              deposit_cents,
              balance_due_cents,
              deposit_paid_at,
              client:client_id (
                id,
                first_name,
                last_name,
                email,
                phone,
                language,
                preferred_contact,
                newsletter_consent,
                ghl_contact_id
              )
            `)
            .eq('id', orderId)
            .single();

          const clientData = orderWithClient?.client as any;

          // Update GHL tags
          if (orderWithClient && clientData && isGHLConfigured()) {
            try {
              const ghlClient: AppClient = {
                id: clientData.id,
                first_name: clientData.first_name || '',
                last_name: clientData.last_name || '',
                email: clientData.email || null,
                phone: clientData.phone || null,
                language: clientData.language || 'fr',
                ghl_contact_id: clientData.ghl_contact_id || null,
                preferred_contact: clientData.preferred_contact || 'sms',
              };

              await recordPaymentReceived(ghlClient, paymentType as 'deposit' | 'balance' | 'full', 'stripe');
              console.log(`✅ GHL tags updated for order #${orderNumber}`);
            } catch (ghlError) {
              console.warn('⚠️ GHL tag update failed (non-blocking):', ghlError);
            }
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;
        const paymentType = paymentIntent.metadata?.payment_type;

        if (orderId) {
          // Only update if this wasn't already handled by checkout.session.completed
          const { data: order } = await supabase
            .from('order')
            .select('payment_status, stripe_payment_intent_id, status')
            .eq('id', orderId)
            .single();

          // Skip if already processed (has same payment intent ID)
          if (order?.stripe_payment_intent_id === paymentIntent.id) {
            console.log(`ℹ️ Payment intent ${paymentIntent.id} already processed, skipping`);
            break;
          }

          const now = new Date().toISOString();
          const updateData: Record<string, any> = {
            stripe_payment_intent_id: paymentIntent.id,
          };

          if (paymentType === 'deposit') {
            updateData.deposit_paid_at = now;
            updateData.deposit_payment_method = 'stripe';
            updateData.payment_status = 'deposit_paid';
          } else {
            updateData.payment_status = 'paid';
            updateData.payment_method = 'stripe';
            updateData.paid_at = now;

            // Auto-archive if order is delivered
            if (order?.status === 'delivered') {
              updateData.status = 'archived';
              updateData.archived_at = now;
              console.log(`📦 Auto-archiving order ${orderId} (delivered + paid)`);
            }
          }

          await supabase
            .from('order')
            .update(updateData)
            .eq('id', orderId);

          console.log(`✅ Payment intent succeeded for order ${orderId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          // Update payment status to failed
          await supabase
            .from('order')
            .update({ payment_status: 'failed' })
            .eq('id', orderId);

          console.log(`❌ Payment failed for order ${orderId}:`, paymentIntent.last_payment_error?.message);

          // Log the failure
          await supabase.from('event_log').insert({
            entity: 'order',
            entity_id: orderId,
            action: 'payment_failed',
            actor: 'stripe_webhook',
            details: {
              error: paymentIntent.last_payment_error?.message,
              payment_intent_id: paymentIntent.id,
            },
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        // Find the order by payment intent
        const { data: order } = await supabase
          .from('order')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single();

        if (order) {
          await supabase
            .from('order')
            .update({ payment_status: 'refunded' })
            .eq('id', order.id);

          console.log(`💰 Refund processed for order ${order.id}`);
        } else {
          console.log(`💰 Refund processed for charge ${charge.id} (no matching order found)`);
        }
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
