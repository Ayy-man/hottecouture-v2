import { Database } from '@/lib/types/database';

export type TaskStage = Database['public']['Tables']['task']['Row']['stage'];
export type OrderStatus =
  Database['public']['Tables']['order']['Row']['status'];
export type OrderType = Database['public']['Tables']['order']['Row']['type'];

export interface WorkflowStage {
  id: TaskStage;
  name: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  estimatedDuration?: number; // in minutes
  requiresApproval?: boolean;
  canBeSkipped?: boolean;
}

export interface WorkflowTransition {
  from: TaskStage;
  to: TaskStage;
  isAllowed: boolean;
  requiresReason?: boolean;
  autoAdvance?: boolean;
  conditions?: string[];
}

export interface TaskWorkflow {
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
  orderType: OrderType;
  description: string;
}

/**
 * Enhanced workflow stages based on your business process
 */
export const WORKFLOW_STAGES: Record<TaskStage, WorkflowStage> = {
  pending: {
    id: 'pending',
    name: 'Pending',
    description: 'New order awaiting assignment and review',
    color: 'bg-yellow-100 border-yellow-200 text-yellow-800',
    icon: '⏳',
    isActive: true,
    estimatedDuration: 0,
    requiresApproval: false,
    canBeSkipped: false,
  },
  working: {
    id: 'working',
    name: 'Working',
    description: 'Order is being worked on by assigned seamstress',
    color: 'bg-blue-100 border-blue-200 text-blue-800',
    icon: '👷',
    isActive: true,
    estimatedDuration: 30, // 30 minutes average
    requiresApproval: false,
    canBeSkipped: false,
  },
  done: {
    id: 'done',
    name: 'Done',
    description: 'Work completed, awaiting quality check',
    color: 'bg-green-100 border-green-200 text-green-800',
    icon: '✅',
    isActive: true,
    estimatedDuration: 0,
    requiresApproval: true, // Requires Solange's approval
    canBeSkipped: false,
  },
  ready: {
    id: 'ready',
    name: 'Ready',
    description: 'Quality checked and ready for pickup',
    color: 'bg-purple-100 border-purple-200 text-purple-800',
    icon: '📦',
    isActive: true,
    estimatedDuration: 0,
    requiresApproval: false,
    canBeSkipped: false,
  },
  delivered: {
    id: 'delivered',
    name: 'Delivered',
    description: 'Order completed and delivered to client',
    color: 'bg-gray-100 border-gray-200 text-gray-800',
    icon: '🏠',
    isActive: true,
    estimatedDuration: 0,
    requiresApproval: false,
    canBeSkipped: false,
  },
};

/**
 * Workflow transitions based on your business rules
 */
export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  // Pending → Working (assignment)
  {
    from: 'pending',
    to: 'working',
    isAllowed: true,
    requiresReason: false,
    autoAdvance: false,
    conditions: ['assigned_to_seamstress'],
  },

  // Working → Done (completion)
  {
    from: 'working',
    to: 'done',
    isAllowed: true,
    requiresReason: false,
    autoAdvance: false,
    conditions: ['work_completed', 'time_tracked'],
  },

  // Done → Ready (quality check passed)
  {
    from: 'done',
    to: 'ready',
    isAllowed: true,
    requiresReason: false,
    autoAdvance: false, // Manual transition - requires quality check and approval
    conditions: ['quality_check_passed', 'solange_approval'],
  },

  // Ready → Delivered (pickup)
  {
    from: 'ready',
    to: 'delivered',
    isAllowed: true,
    requiresReason: false,
    autoAdvance: false,
    conditions: ['client_pickup', 'payment_received'],
  },

  // Backward transitions (for corrections)
  {
    from: 'working',
    to: 'pending',
    isAllowed: true,
    requiresReason: true,
    autoAdvance: false,
    conditions: ['reassignment_needed'],
  },

  {
    from: 'done',
    to: 'working',
    isAllowed: true,
    requiresReason: true,
    autoAdvance: false,
    conditions: ['rework_needed', 'quality_issues'],
  },

  {
    from: 'ready',
    to: 'done',
    isAllowed: true,
    requiresReason: true,
    autoAdvance: false,
    conditions: ['quality_issues_found'],
  },

  {
    from: 'delivered',
    to: 'ready',
    isAllowed: true,
    requiresReason: true,
    autoAdvance: false,
    conditions: ['return_requested', 'issue_found'],
  },
];

/**
 * Get workflow for a specific order type
 */
export function getWorkflowForOrderType(orderType: OrderType): TaskWorkflow {
  const baseStages = Object.values(WORKFLOW_STAGES);

  if (orderType === 'custom') {
    // Custom orders have additional stages
    return {
      stages: baseStages,
      transitions: WORKFLOW_TRANSITIONS,
      orderType: 'custom',
      description: 'Custom design workflow with additional approval steps',
    };
  } else {
    // Alteration orders use standard workflow
    return {
      stages: baseStages,
      transitions: WORKFLOW_TRANSITIONS,
      orderType: 'alteration',
      description: 'Standard alteration workflow',
    };
  }
}

/**
 * Check if a transition is allowed
 */
export function isTransitionAllowed(
  fromStage: TaskStage,
  toStage: TaskStage
): boolean {
  const transition = WORKFLOW_TRANSITIONS.find(
    t => t.from === fromStage && t.to === toStage
  );

  return transition?.isAllowed ?? false;
}

/**
 * Get valid next stages for a given stage
 */
export function getValidNextStages(currentStage: TaskStage): TaskStage[] {
  return WORKFLOW_TRANSITIONS.filter(
    t => t.from === currentStage && t.isAllowed
  ).map(t => t.to);
}

/**
 * Get stage information
 */
export function getStageInfo(stage: TaskStage): WorkflowStage {
  return WORKFLOW_STAGES[stage];
}

/**
 * Calculate order status based on task stages
 */
export function calculateOrderStatus(
  tasks: Array<{ stage: TaskStage }>
): OrderStatus {
  if (tasks.length === 0) {
    return 'pending';
  }

  // All tasks delivered = order delivered
  if (tasks.every(task => task.stage === 'delivered')) {
    return 'delivered';
  }

  // All tasks ready or delivered = order ready
  if (tasks.every(task => ['ready', 'delivered'].includes(task.stage))) {
    return 'ready';
  }

  // All tasks done or beyond = order done
  if (
    tasks.every(task => ['done', 'ready', 'delivered'].includes(task.stage))
  ) {
    return 'done';
  }

  // Any task working = order working
  if (tasks.some(task => task.stage === 'working')) {
    return 'working';
  }

  // Default to pending
  return 'pending';
}

/**
 * Get workflow progress percentage
 */
export function getWorkflowProgress(
  tasks: Array<{ stage: TaskStage }>
): number {
  if (tasks.length === 0) return 0;

  const stageValues = {
    pending: 0,
    working: 25,
    done: 50,
    ready: 75,
    delivered: 100,
  };

  const totalProgress = tasks.reduce((sum, task) => {
    return sum + (stageValues[task.stage] || 0);
  }, 0);

  return Math.round(totalProgress / tasks.length);
}

/**
 * Get estimated completion time
 */
export function getEstimatedCompletionTime(
  tasks: Array<{ stage: TaskStage }>
): number {
  const stageDurations = {
    pending: 0,
    working: 30, // 30 minutes average
    done: 0,
    ready: 0,
    delivered: 0,
  };

  return tasks.reduce((total, task) => {
    return total + (stageDurations[task.stage] || 0);
  }, 0);
}

/**
 * Check if order is on track (not overdue)
 */
export function isOrderOnTrack(
  order: { due_date?: string; rush: boolean },
  tasks: Array<{ stage: TaskStage }>
): boolean {
  if (!order.due_date) return true;

  const dueDate = new Date(order.due_date);
  const now = new Date();
  const timeUntilDue = dueDate.getTime() - now.getTime();

  // If rush order, check if it's being worked on
  if (order.rush) {
    return tasks.some(task => task.stage === 'working');
  }

  // For regular orders, check if progress is reasonable
  const progress = getWorkflowProgress(tasks);
  const daysUntilDue = timeUntilDue / (1000 * 60 * 60 * 24);

  // If due in more than 3 days, should have some progress
  if (daysUntilDue > 3) {
    return progress > 0;
  }

  // If due in 1-3 days, should be working or done
  if (daysUntilDue > 1) {
    return progress >= 25;
  }

  // If due today or overdue, should be done or ready
  return progress >= 50;
}

/**
 * Get workflow alerts and warnings
 */
export function getWorkflowAlerts(
  order: { due_date?: string; rush: boolean; order_number: string },
  tasks: Array<{ stage: TaskStage; assignee?: string }>
): Array<{ type: 'warning' | 'error' | 'info'; message: string }> {
  const alerts: Array<{ type: 'warning' | 'error' | 'info'; message: string }> =
    [];

  // Check if order is overdue
  if (order.due_date) {
    const dueDate = new Date(order.due_date);
    const now = new Date();
    const isOverdue = now > dueDate;

    if (isOverdue) {
      alerts.push({
        type: 'error',
        message: `Order ${order.order_number} is overdue!`,
      });
    } else {
      const hoursUntilDue =
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilDue < 24) {
        alerts.push({
          type: 'warning',
          message: `Order ${order.order_number} is due in ${Math.round(hoursUntilDue)} hours`,
        });
      }
    }
  }

  // Check if rush order is not being worked on
  if (order.rush && !tasks.some(task => task.stage === 'working')) {
    alerts.push({
      type: 'warning',
      message: `Rush order ${order.order_number} is not being worked on`,
    });
  }

  // Check if tasks are stuck in pending
  const pendingTasks = tasks.filter(task => task.stage === 'pending');
  if (pendingTasks.length > 0) {
    alerts.push({
      type: 'info',
      message: `${pendingTasks.length} task(s) pending assignment`,
    });
  }

  // Check if tasks are stuck in done (waiting for approval)
  const doneTasks = tasks.filter(task => task.stage === 'done');
  if (doneTasks.length > 0) {
    alerts.push({
      type: 'info',
      message: `${doneTasks.length} task(s) completed, waiting for quality check`,
    });
  }

  return alerts;
}
