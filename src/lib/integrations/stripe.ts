import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export async function createPaymentIntent(
  orderId: string,
  amountCents: number,
  customerEmail?: string
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'cad',
    metadata: {
      order_id: orderId,
    },
    ...(customerEmail && { receipt_email: customerEmail }),
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

export async function handlePaymentSuccess(
  orderId: string,
  stripePaymentIntentId: string
): Promise<void> {
  const supabase = await createClient();

  await (supabase
    .from('order') as ReturnType<typeof supabase.from>)
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: stripePaymentIntentId,
    })
    .eq('id', orderId);
}

export async function getPaymentStatus(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent.Status> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent.status;
}

export async function refundPayment(
  paymentIntentId: string,
  amountCents?: number
): Promise<Stripe.Refund> {
  const params: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };
  if (amountCents !== undefined) {
    params.amount = amountCents;
  }
  const refund = await stripe.refunds.create(params);

  return refund;
}

export function constructWebhookEvent(
  payload: string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

export { stripe };
