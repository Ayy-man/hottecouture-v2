import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  withErrorHandling, 
  getCorrelationId, 
  logEvent, 
  validateRequest,
  requireAuth,
  NotFoundError
} from '@/lib/api/error-handler'
import { webhookPaymentSchema, WebhookPayment, WebhookResponse } from '@/lib/dto'

async function handlePaymentWebhook(request: NextRequest): Promise<WebhookResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = createClient()
  
  // Validate authentication (webhook secret)
  requireAuth(request)
  
  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateRequest(webhookPaymentSchema, body, correlationId) as WebhookPayment
  
  const { 
    orderId, 
    amount_cents, 
    currency, 
    payment_method, 
    transaction_id, 
    timestamp, 
    metadata 
  } = validatedData

  // Verify order exists
  const { data: order, error: orderError } = await supabase
    .from('order')
    .select('id, order_number, total_cents, deposit_cents, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new NotFoundError('Order', correlationId)
  }

  // Validate payment amount
  const expectedAmount = order.total_cents - order.deposit_cents
  if (amount_cents !== expectedAmount) {
    throw new Error(`Payment amount mismatch. Expected: ${expectedAmount}, Received: ${amount_cents}`)
  }

  // Update order with payment information
  const { error: updateError } = await supabase
    .from('order')
    .update({ 
      deposit_cents: order.deposit_cents + amount_cents,
      // If this is the full payment, mark as paid
      ...(amount_cents >= expectedAmount && { status: 'ready' })
    })
    .eq('id', orderId)

  if (updateError) {
    throw new Error(`Failed to update order payment: ${updateError.message}`)
  }

  // Create payment record (if you have a payments table)
  const { error: paymentError } = await supabase
    .from('document')
    .insert({
      order_id: orderId,
      kind: 'payment_receipt',
      path: `payments/${transaction_id}.json`,
      meta: {
        amount_cents,
        currency,
        payment_method,
        transaction_id,
        timestamp,
        metadata,
      }
    })

  if (paymentError) {
    console.warn('Failed to create payment record:', paymentError.message)
  }

  // Log the webhook event
  await logEvent('order', orderId, 'webhook_payment_received', {
    correlationId,
    amount_cents,
    currency,
    payment_method,
    transaction_id,
    timestamp,
    metadata,
    orderNumber: order.order_number,
  })

  // TODO: Implement actual payment processor integration
  // - Verify payment with Stripe/QBO/Chase
  // - Update accounting systems
  // - Send payment confirmation
  // - Handle refunds/chargebacks

  const response: WebhookResponse = {
    success: true,
    message: `Payment of ${currency} ${(amount_cents / 100).toFixed(2)} received for order ${order.order_number}`,
    correlationId,
  }

  return response
}

export async function POST(request: NextRequest) {
  return withErrorHandling(() => handlePaymentWebhook(request), request)
}
