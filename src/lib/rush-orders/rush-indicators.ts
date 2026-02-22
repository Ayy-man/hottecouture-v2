import { OrderType } from '@/lib/types/database';

export interface RushOrderConfig {
  enabled: boolean;
  rushFeeMultiplier: number;
  priority: 'high' | 'urgent' | 'critical';
  visualIndicator: {
    color: string;
    icon: string;
    text: string;
    animation?: 'pulse' | 'blink' | 'none';
  };
  timelineReduction: number; // Percentage reduction in estimated time
  notificationSettings: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
}

export const RUSH_ORDER_CONFIGS: Record<OrderType, RushOrderConfig> = {
  alteration: {
    enabled: true,
    rushFeeMultiplier: 1.5,
    priority: 'high',
    visualIndicator: {
      color: 'bg-red-500 text-white',
      icon: '🔥',
      text: 'URGENT',
      animation: 'none',
    },
    timelineReduction: 50, // 50% faster
    notificationSettings: {
      email: true,
      sms: true,
      inApp: true,
    },
  },
  custom: {
    enabled: true,
    rushFeeMultiplier: 2.0,
    priority: 'urgent',
    visualIndicator: {
      color: 'bg-red-500 text-white',
      icon: '🔥',
      text: 'URGENT',
      animation: 'none',
    },
    timelineReduction: 30, // 30% faster (custom work is more complex)
    notificationSettings: {
      email: true,
      sms: true,
      inApp: true,
    },
  },
};

export interface RushOrderVisualProps {
  isRush: boolean;
  orderType: OrderType;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function getRushOrderConfig(orderType: OrderType): RushOrderConfig {
  return RUSH_ORDER_CONFIGS[orderType] || RUSH_ORDER_CONFIGS.alteration;
}

export function calculateRushFee(
  basePrice: number,
  orderType: OrderType,
  isRush: boolean
): number {
  if (!isRush) return 0;

  const config = getRushOrderConfig(orderType);
  return Math.round(basePrice * (config.rushFeeMultiplier - 1));
}

export function calculateRushTimeline(
  estimatedDays: number,
  orderType: OrderType,
  isRush: boolean
): number {
  if (!isRush) return estimatedDays;

  const config = getRushOrderConfig(orderType);
  const reduction = config.timelineReduction / 100;
  return Math.max(1, Math.round(estimatedDays * (1 - reduction)));
}

export function getRushOrderPriority(
  orderType: OrderType,
  isRush: boolean
): string {
  if (!isRush) return 'normal';

  const config = getRushOrderConfig(orderType);
  return config.priority;
}

export function shouldShowRushIndicator(
  isRush: boolean,
  orderType: OrderType
): boolean {
  if (!isRush) return false;

  const config = getRushOrderConfig(orderType);
  return config.enabled;
}

export function getRushOrderAnimationClass(
  orderType: OrderType,
  isRush: boolean
): string {
  if (!isRush) return '';

  const config = getRushOrderConfig(orderType);
  const animation = config.visualIndicator.animation;

  switch (animation) {
    case 'pulse':
      return 'animate-pulse';
    case 'blink':
      return 'animate-bounce';
    case 'none':
    default:
      return '';
  }
}

export function getRushOrderColorClass(
  orderType: OrderType,
  isRush: boolean
): string {
  if (!isRush) return 'bg-gray-100 text-gray-600';

  const config = getRushOrderConfig(orderType);
  return config.visualIndicator.color;
}

export function getRushOrderIcon(
  orderType: OrderType,
  isRush: boolean
): string {
  if (!isRush) return '';

  const config = getRushOrderConfig(orderType);
  return config.visualIndicator.icon;
}

export function getRushOrderText(
  orderType: OrderType,
  isRush: boolean
): string {
  if (!isRush) return '';

  const config = getRushOrderConfig(orderType);
  return config.visualIndicator.text;
}

export function formatRushOrderTimeline(
  estimatedDays: number,
  orderType: OrderType,
  isRush: boolean
): string {
  const rushDays = calculateRushTimeline(estimatedDays, orderType, isRush);

  if (isRush) {
    return `${rushDays} day${rushDays !== 1 ? 's' : ''} (Rush)`;
  }

  return `${estimatedDays} day${estimatedDays !== 1 ? 's' : ''}`;
}

export function getRushOrderNotifications(
  orderType: OrderType,
  isRush: boolean
): RushOrderConfig['notificationSettings'] {
  if (!isRush) {
    return {
      email: false,
      sms: false,
      inApp: false,
    };
  }

  const config = getRushOrderConfig(orderType);
  return config.notificationSettings;
}

export function validateRushOrder(
  orderType: OrderType,
  isRush: boolean,
  currentWorkload: number
): {
  canRush: boolean;
  reason?: string;
  estimatedDelay?: number;
} {
  if (!isRush) {
    return { canRush: true };
  }

  const config = getRushOrderConfig(orderType);

  if (!config.enabled) {
    return {
      canRush: false,
      reason: 'Rush orders are not available for this order type',
    };
  }

  // Check if we can accommodate rush orders based on current workload
  const maxRushOrders = orderType === 'alteration' ? 5 : 2;
  if (currentWorkload >= maxRushOrders) {
    return {
      canRush: false,
      reason: 'Too many rush orders in progress',
      estimatedDelay: 1, // 1 day delay
    };
  }

  return { canRush: true };
}

export function getRushOrderSummary(
  orderType: OrderType,
  isRush: boolean,
  basePrice: number,
  estimatedDays: number
): {
  rushFee: number;
  totalPrice: number;
  rushDays: number;
  savings: number;
} {
  const rushFee = calculateRushFee(basePrice, orderType, isRush);
  const totalPrice = basePrice + rushFee;
  const rushDays = calculateRushTimeline(estimatedDays, orderType, isRush);
  const savings = estimatedDays - rushDays;

  return {
    rushFee,
    totalPrice,
    rushDays,
    savings,
  };
}
