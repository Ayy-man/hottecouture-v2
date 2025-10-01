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
import { taskStartSchema, TaskStart, TaskResponse } from '@/lib/dto'

async function handleTaskStart(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<TaskResponse> {
  const correlationId = getCorrelationId(request)
  const supabase = createClient()
  
  // Validate authentication
  const token = requireAuth(request)
  
  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateRequest(taskStartSchema, body, correlationId) as TaskStart
  
  const taskId = params.id

  // Get current user ID from token (in real implementation, decode JWT)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }
  const userId = user.id

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
  if (task.is_active) {
    throw new ConflictError('Task is already active', correlationId)
  }

  // Check if user has any other active tasks
  const { data: activeTasks, error: activeTasksError } = await supabase
    .from('task')
    .select('id, operation')
    .eq('assignee', userId)
    .eq('is_active', true)

  if (activeTasksError) {
    throw new Error(`Failed to check active tasks: ${activeTasksError.message}`)
  }

  if (activeTasks && activeTasks.length > 0) {
    throw new ConflictError(
      `User already has an active task: ${activeTasks[0].operation}`,
      correlationId
    )
  }

  // Start the task
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
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
    operation: task.operation,
    garmentId: task.garment_id,
  })

  const response: TaskResponse = {
    taskId,
    status: 'started',
    message: `Task "${task.operation}" started successfully`,
  }

  return response
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(() => handleTaskStart(request, { params }), request)
}
