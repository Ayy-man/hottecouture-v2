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
import { webhookOrderReadySchema, WebhookOrderReady, WebhookResponse } from '@/lib/dto'

async function handleOrderReadyWebhook(request: NextRequest): Promise<WebhookResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = createClient()
  
  // Validate authentication (webhook secret)
  requireAuth(request)
  
  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateRequest(webhookOrderReadySchema, body, correlationId) as WebhookOrderReady
  
  const { orderId, timestamp, metadata } = validatedData

  // Verify order exists
  const { data: order, error: orderError } = await supabase
    .from('order')
    .select('id, order_number, status, client:client_id (first_name, last_name, phone)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new NotFoundError('Order', correlationId)
  }

  // Update order status to ready if not already
  if (order.status !== 'ready') {
    const { error: updateError } = await supabase
      .from('order')
      .update({ status: 'ready' })
      .eq('id', orderId)

    if (updateError) {
      throw new Error(`Failed to update order status: ${updateError.message}`)
    }
  }

  // Log the webhook event
  await logEvent('order', orderId, 'webhook_order_ready', {
    correlationId,
    timestamp,
    metadata,
    orderNumber: order.order_number,
  })

  // TODO: Implement actual n8n integration
  // - Send notification to client
  // - Update external systems
  // - Trigger delivery workflow
  // - Send SMS/email notifications

  const response: WebhookResponse = {
    success: true,
    message: `Order ${order.order_number} marked as ready`,
    correlationId,
  }

  return response
}

export async function POST(request: NextRequest) {
  return withErrorHandling(() => handleOrderReadyWebhook(request), request)
}
