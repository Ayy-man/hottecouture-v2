import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  withErrorHandling, 
  getCorrelationId, 
  logEvent, 
  validateRequest,
  requireAuth,
  NotFoundError,
  ConflictError
} from '@/lib/api/error-handler'
import { orderStageSchema, OrderStage, OrderStageResponse } from '@/lib/dto'

// Valid status transitions
const validTransitions: Record<string, string[]> = {
  'pending': ['working', 'archived'],
  'working': ['done', 'ready', 'archived'],
  'done': ['ready', 'archived'],
  'ready': ['delivered', 'archived'],
  'delivered': ['archived'],
  'archived': [], // Terminal state
}

async function handleOrderStage(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<OrderStageResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = createClient()
  
  // Validate authentication
  requireAuth(request)
  
  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateRequest(orderStageSchema, body, correlationId) as OrderStage
  
  const orderId = params.id
  const newStage = validatedData.stage

  // Get current order status
  const { data: order, error: orderError } = await supabase
    .from('order')
    .select('id, status, client_id')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new NotFoundError('Order', correlationId)
  }

  const currentStatus = order.status

  // Validate status transition
  const allowedTransitions = validTransitions[currentStatus] || []
  if (!allowedTransitions.includes(newStage)) {
    throw new ConflictError(
      `Invalid status transition from ${currentStatus} to ${newStage}. Allowed transitions: ${allowedTransitions.join(', ')}`,
      correlationId
    )
  }

  // Update order status
  const { error: updateError } = await supabase
    .from('order')
    .update({ 
      status: newStage,
      ...(validatedData.notes && { notes: validatedData.notes })
    })
    .eq('id', orderId)

  if (updateError) {
    throw new Error(`Failed to update order status: ${updateError.message}`)
  }

  // Check if all tasks are complete (for automatic status updates)
  let allTasksComplete = false
  if (newStage === 'done' || newStage === 'ready') {
    const { data: tasks, error: tasksError } = await supabase
      .from('task')
      .select('id, stage')
      .eq('garment_id', orderId) // Assuming garment_id links to order
      .in('stage', ['pending', 'working'])

    if (tasksError) {
      console.warn('Failed to check task completion:', tasksError.message)
    } else {
      allTasksComplete = !tasks || tasks.length === 0
    }
  }

  // If all tasks are complete and order is in 'done' stage, auto-advance to 'ready'
  if (allTasksComplete && newStage === 'done') {
    const { error: autoUpdateError } = await supabase
      .from('order')
      .update({ status: 'ready' })
      .eq('id', orderId)

    if (autoUpdateError) {
      console.warn('Failed to auto-advance order to ready:', autoUpdateError.message)
    } else {
      await logEvent('order', orderId, 'auto_advanced_to_ready', {
        correlationId,
        reason: 'all_tasks_complete'
      })
    }
  }

  // Log the event
  await logEvent('order', orderId, 'status_changed', {
    correlationId,
    fromStatus: currentStatus,
    toStatus: newStage,
    allTasksComplete,
    notes: validatedData.notes,
  })

  const response: OrderStageResponse = {
    orderId,
    status: newStage,
    allTasksComplete,
    message: `Order status updated from ${currentStatus} to ${newStage}`,
  }

  return response
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(() => handleOrderStage(request, { params }), request)
}
