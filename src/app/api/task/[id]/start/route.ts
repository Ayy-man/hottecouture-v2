import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withErrorHandling,
  getCorrelationId,
  logEvent,
  validateRequest,
  NotFoundError,
  ConflictError
} from '@/lib/api/error-handler'
import { taskStartSchema, TaskResponse } from '@/lib/dto'

async function handleTaskStart(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<TaskResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = await createServiceRoleClient()

  // Parse and validate request body
  const body = await request.json()
  validateRequest(taskStartSchema, body, correlationId)

  const { id: taskId } = await params

  // Use assignee from body or default
  const userId = body.assignee || 'system'

  // Check if task exists
  const { data: task, error: taskError } = await supabase
    .from('task')
    .select('id, garment_id, operation, assignee, is_active, started_at')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    throw new NotFoundError('Task', correlationId)
  }

  // Check if task is already active
  if ((task as any).is_active) {
    throw new ConflictError('Task is already active', correlationId)
  }

  // Start the task
  const now = new Date().toISOString()
  const { error: updateError } = await (supabase as any)
    .from('task')
    .update({
      assignee: userId,
      is_active: true,
      started_at: now,
      stage: 'working',
    })
    .eq('id', taskId)

  if (updateError) {
    throw new Error(`Failed to start task: ${updateError.message}`)
  }

  // Log the event
  await logEvent('task', taskId, 'started', {
    correlationId,
    assignee: userId,
    operation: (task as any).operation,
    garmentId: (task as any).garment_id,
  })

  const response: TaskResponse = {
    taskId,
    status: 'started',
    message: `Task "${(task as any).operation}" started successfully`,
  }

  return response
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(() => handleTaskStart(request, { params }), request)
}
