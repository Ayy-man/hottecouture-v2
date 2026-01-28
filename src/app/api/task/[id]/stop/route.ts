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
import { taskStopSchema, TaskStop, TaskResponse } from '@/lib/dto'

async function handleTaskStop(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<TaskResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = await createServiceRoleClient()

  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateRequest(taskStopSchema, body, correlationId) as TaskStop

  const { id: taskId } = await params

  // Use assignee from body or task's current assignee
  const userId = body.assignee || 'system'

  // Check if task exists and is assigned to current user
  const { data: task, error: taskError } = await supabase
    .from('task')
    .select('id, garment_id, operation, assignee, is_active, started_at, actual_minutes')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    throw new NotFoundError('Task', correlationId)
  }

  // Check if task is active
  if (!(task as any).is_active) {
    throw new ConflictError('Task is not active', correlationId)
  }

  // Calculate actual minutes if not provided
  let actualMinutes = validatedData.actual_minutes
  if (actualMinutes === undefined && (task as any).started_at) {
    const startTime = new Date((task as any).started_at)
    const endTime = new Date()
    actualMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
  }

  // Update the task
  const now = new Date().toISOString()
  const { error: updateError } = await (supabase as any)
    .from('task')
    .update({
      is_active: false,
      stopped_at: now,
      actual_minutes: actualMinutes || 0,
      stage: 'done',
    })
    .eq('id', taskId)

  if (updateError) {
    throw new Error(`Failed to stop task: ${updateError.message}`)
  }

  // Log the event
  await logEvent('task', taskId, 'stopped', {
    correlationId,
    assignee: userId,
    operation: (task as any).operation,
    garmentId: (task as any).garment_id,
    actualMinutes: actualMinutes || 0,
  })

  const response: TaskResponse = {
    taskId,
    status: 'stopped',
    actual_minutes: actualMinutes || 0,
    message: `Task "${(task as any).operation}" stopped successfully. Duration: ${actualMinutes || 0} minutes`,
  }

  return response
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(() => handleTaskStop(request, { params }), request)
}
