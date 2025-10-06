import { OrderType, TaskStage } from '@/lib/types/database';

export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  stages: TaskStage[];
  defaultAssignee?: string;
  estimatedDays: number;
  rushMultiplier: number;
}

export const PIPELINE_CONFIGS: Record<OrderType, PipelineConfig> = {
  alteration: {
    id: 'alteration',
    name: 'Alterations',
    description: 'Standard garment alterations and repairs',
    color: 'bg-blue-100 text-blue-800',
    icon: '✂️',
    stages: ['pending', 'working', 'done', 'ready', 'delivered'],
    defaultAssignee: 'seamstress',
    estimatedDays: 3,
    rushMultiplier: 1.5,
  },
  custom: {
    id: 'custom',
    name: 'Custom Design',
    description: 'Custom design and creation work',
    color: 'bg-purple-100 text-purple-800',
    icon: '✨',
    stages: ['pending', 'working', 'done', 'ready', 'delivered'],
    defaultAssignee: 'designer',
    estimatedDays: 14,
    rushMultiplier: 2.0,
  },
};

export interface PipelineStage {
  id: TaskStage;
  name: string;
  description: string;
  color: string;
  icon: string;
  estimatedHours: number;
  requiredSkills: string[];
}

export const PIPELINE_STAGES: Record<TaskStage, PipelineStage> = {
  pending: {
    id: 'pending',
    name: 'Pending',
    description: 'Order received, awaiting assignment',
    color: 'bg-gray-100 text-gray-800',
    icon: '⏳',
    estimatedHours: 0,
    requiredSkills: [],
  },
  working: {
    id: 'working',
    name: 'In Progress',
    description: 'Work is actively being performed',
    color: 'bg-blue-100 text-blue-800',
    icon: '🔨',
    estimatedHours: 2,
    requiredSkills: ['sewing', 'measurement'],
  },
  done: {
    id: 'done',
    name: 'Completed',
    description: 'Work completed, awaiting quality check',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
    estimatedHours: 0.5,
    requiredSkills: ['quality_control'],
  },
  ready: {
    id: 'ready',
    name: 'Ready',
    description: 'Order ready for pickup or delivery',
    color: 'bg-purple-100 text-purple-800',
    icon: '📦',
    estimatedHours: 0.25,
    requiredSkills: ['packaging'],
  },
  delivered: {
    id: 'delivered',
    name: 'Delivered',
    description: 'Order has been delivered to customer',
    color: 'bg-teal-100 text-teal-800',
    icon: '🚚',
    estimatedHours: 0,
    requiredSkills: [],
  },
};

export function getPipelineConfig(orderType: OrderType): PipelineConfig {
  return PIPELINE_CONFIGS[orderType] || PIPELINE_CONFIGS.alteration;
}

export function getPipelineStage(stage: TaskStage): PipelineStage {
  return PIPELINE_STAGES[stage] || PIPELINE_STAGES.pending;
}

export function getPipelineStages(orderType: OrderType): PipelineStage[] {
  const config = getPipelineConfig(orderType);
  return config.stages.map(stage => getPipelineStage(stage));
}

export function calculateEstimatedCompletion(
  orderType: OrderType,
  isRush: boolean = false
): { days: number; hours: number } {
  const config = getPipelineConfig(orderType);
  const stages = getPipelineStages(orderType);

  const totalHours = stages.reduce(
    (sum, stage) => sum + stage.estimatedHours,
    0
  );
  const multiplier = isRush ? config.rushMultiplier : 1;

  return {
    days: Math.ceil((config.estimatedDays * multiplier) / 7), // Convert to business days
    hours: Math.ceil(totalHours * multiplier),
  };
}

export function getRequiredSkills(orderType: OrderType): string[] {
  const stages = getPipelineStages(orderType);
  const skills = new Set<string>();

  stages.forEach(stage => {
    stage.requiredSkills.forEach(skill => skills.add(skill));
  });

  return Array.from(skills);
}

export function canTransitionToStage(
  currentStage: TaskStage,
  targetStage: TaskStage,
  orderType: OrderType
): boolean {
  const config = getPipelineConfig(orderType);
  const currentIndex = config.stages.indexOf(currentStage);
  const targetIndex = config.stages.indexOf(targetStage);

  // Can only move forward or stay in same stage
  return targetIndex >= currentIndex;
}

export function getNextStage(
  currentStage: TaskStage,
  orderType: OrderType
): TaskStage | null {
  const config = getPipelineConfig(orderType);
  const currentIndex = config.stages.indexOf(currentStage);

  if (currentIndex === -1 || currentIndex >= config.stages.length - 1) {
    return null;
  }

  return config.stages[currentIndex + 1] || null;
}

export function getPreviousStage(
  currentStage: TaskStage,
  orderType: OrderType
): TaskStage | null {
  const config = getPipelineConfig(orderType);
  const currentIndex = config.stages.indexOf(currentStage);

  if (currentIndex <= 0) {
    return null;
  }

  return config.stages[currentIndex - 1] || null;
}

export function getStageProgress(
  currentStage: TaskStage,
  orderType: OrderType
): number {
  const config = getPipelineConfig(orderType);
  const currentIndex = config.stages.indexOf(currentStage);

  if (currentIndex === -1) {
    return 0;
  }

  return Math.round((currentIndex / (config.stages.length - 1)) * 100);
}

export function getPipelineStats(orders: any[]): Record<string, number> {
  const stats: Record<string, number> = {};

  // Initialize all pipeline types
  Object.keys(PIPELINE_CONFIGS).forEach(type => {
    stats[type] = 0;
  });

  // Count orders by type
  orders.forEach((order: any) => {
    if (order.type && stats.hasOwnProperty(order.type)) {
      (stats as any)[order.type]++;
    }
  });

  return stats;
}

export function getStageStats(
  orders: any[],
  orderType?: OrderType
): Record<TaskStage, number> {
  const stats: Record<TaskStage, number> = {
    pending: 0,
    working: 0,
    done: 0,
    ready: 0,
    delivered: 0,
  };

  orders.forEach(order => {
    // Filter by order type if specified
    if (orderType && order.type !== orderType) {
      return;
    }

    // Count by most common stage among tasks
    if (order.tasks && order.tasks.length > 0) {
      const stageCounts: Record<TaskStage, number> = {
        pending: 0,
        working: 0,
        done: 0,
        ready: 0,
        delivered: 0,
      };

      order.tasks.forEach((task: any) => {
        if (task.stage && stageCounts.hasOwnProperty(task.stage)) {
          (stageCounts as any)[task.stage]++;
        }
      });

      // Find the most common stage
      const mostCommonStage = Object.entries(stageCounts).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )?.[0] as TaskStage;

      if (mostCommonStage && stats.hasOwnProperty(mostCommonStage)) {
        stats[mostCommonStage]++;
      }
    } else {
      // No tasks, assume pending
      stats.pending++;
    }
  });

  return stats;
}
