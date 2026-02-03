import { Database } from '@/lib/types/database'

export type TaskStage = Database['public']['Tables']['task']['Row']['stage']
export type OrderStatus = Database['public']['Tables']['order']['Row']['status']

export interface StageTransition {
  fromStage: TaskStage
  toStage: TaskStage
  isValid: boolean
  orderStatusUpdate?: OrderStatus | undefined
}

export interface TaskWithStage {
  id: string
  stage: TaskStage
  order_id: string
}

export interface OrderWithTasks {
  id: string
  status: OrderStatus
  tasks: TaskWithStage[]
}

/**
 * Valid stage transitions for tasks
 */
export const VALID_STAGE_TRANSITIONS: Record<TaskStage, TaskStage[]> = {
  pending: ['working'],
  working: ['done', 'pending'],
  done: ['ready', 'working'],
  ready: ['delivered', 'done'],
  delivered: ['ready'], // Allow going back to ready if needed
}

/**
 * Order status mapping based on task stages
 */
export const ORDER_STATUS_MAPPING: Record<TaskStage, OrderStatus> = {
  pending: 'pending',
  working: 'working',
  done: 'done',
  ready: 'ready',
  delivered: 'delivered',
}

/**
 * Check if a stage transition is valid
 */
export function isValidStageTransition(fromStage: TaskStage, toStage: TaskStage): boolean {
  return VALID_STAGE_TRANSITIONS[fromStage]?.includes(toStage) ?? false
}

/**
 * Get the order status based on task stages
 */
export function getOrderStatusFromTasks(tasks: TaskWithStage[]): OrderStatus {
  if (tasks.length === 0) {
    return 'pending'
  }

  // Check if all tasks are delivered
  const allDelivered = tasks.every(task => task.stage === 'delivered')
  if (allDelivered) {
    return 'delivered'
  }

  // Check if all tasks are ready or delivered
  const allReadyOrDelivered = tasks.every(task => 
    task.stage === 'ready' || task.stage === 'delivered'
  )
  if (allReadyOrDelivered) {
    return 'ready'
  }

  // Check if all tasks are done or beyond
  const allDoneOrBeyond = tasks.every(task => 
    ['done', 'ready', 'delivered'].includes(task.stage)
  )
  if (allDoneOrBeyond) {
    return 'done'
  }

  // Check if any task is working
  const hasWorking = tasks.some(task => task.stage === 'working')
  if (hasWorking) {
    return 'working'
  }

  // Default to pending
  return 'pending'
}

/**
 * Calculate stage transition for a task update
 */
export function calculateStageTransition(
  taskId: string,
  newStage: TaskStage,
  order: OrderWithTasks
): StageTransition {
  const task = order.tasks.find(t => t.id === taskId)
  
  if (!task) {
    throw new Error(`Task ${taskId} not found in order ${order.id}`)
  }

  const fromStage = task.stage
  const isValid = isValidStageTransition(fromStage, newStage)

  // Calculate new order status if transition is valid
  let orderStatusUpdate: OrderStatus | undefined
  if (isValid) {
    // Create updated tasks array
    const updatedTasks = order.tasks.map(t => 
      t.id === taskId ? { ...t, stage: newStage } : t
    )
    orderStatusUpdate = getOrderStatusFromTasks(updatedTasks)
  }

  return {
    fromStage,
    toStage: newStage,
    isValid,
    orderStatusUpdate: orderStatusUpdate ?? undefined,
  }
}

/**
 * Get all valid next stages for a given stage
 */
export function getValidNextStages(currentStage: TaskStage): TaskStage[] {
  return VALID_STAGE_TRANSITIONS[currentStage] || []
}

/**
 * Check if an order can be moved to a specific status
 */
export function canOrderMoveToStatus(order: OrderWithTasks, targetStatus: OrderStatus): boolean {
  const currentStatus = getOrderStatusFromTasks(order.tasks)
  
  // Define valid order status transitions
  const validOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['working', 'archived'],
    working: ['done', 'pending', 'archived'],
    done: ['ready', 'working', 'archived'],
    ready: ['delivered', 'done', 'archived'],
    delivered: ['ready', 'archived'],
    archived: ['pending', 'working', 'done', 'ready', 'delivered'], // Allow full unarchiving (same as delivered)
  }

  return validOrderTransitions[currentStatus]?.includes(targetStatus) ?? false
}

/**
 * Get the minimum stage required for an order status
 */
export function getMinimumStageForOrderStatus(status: OrderStatus): TaskStage {
  const statusToStage: Record<OrderStatus, TaskStage> = {
    pending: 'pending',
    working: 'working',
    done: 'done',
    ready: 'ready',
    delivered: 'delivered',
    archived: 'pending', // Archived orders can have any stage
  }

  return statusToStage[status]
}
