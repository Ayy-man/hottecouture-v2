'use client';

import { Badge } from '@/components/ui/badge';
import {
  getRushOrderConfig,
  getRushOrderColorClass,
  getRushOrderIcon,
  getRushOrderText,
  getRushOrderAnimationClass,
  RushOrderVisualProps,
} from '@/lib/rush-orders/rush-indicators';

export function RushIndicator({
  isRush,
  orderType,
  size = 'md',
  showText = true,
  showIcon = true,
  className = '',
}: RushOrderVisualProps) {
  if (!isRush) return null;

  const colorClass = getRushOrderColorClass(orderType, isRush);
  const icon = getRushOrderIcon(orderType, isRush);
  const text = getRushOrderText(orderType, isRush);
  const animationClass = getRushOrderAnimationClass(orderType, isRush);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <Badge
      className={`
        ${colorClass}
        ${sizeClasses[size]}
        ${animationClass}
        font-bold
        border-0
        shadow-sm
        ${className}
      `}
    >
      <div className='flex items-center space-x-1'>
        {showIcon && icon && <span className={iconSizes[size]}>{icon}</span>}
        {showText && text && <span>{text}</span>}
      </div>
    </Badge>
  );
}

export function RushRibbon({
  isRush,
  orderType,
  className = '',
}: {
  isRush: boolean;
  orderType: string;
  className?: string;
}) {
  if (!isRush) return null;

  const colorClass = getRushOrderColorClass(orderType as any, isRush);
  const icon = getRushOrderIcon(orderType as any, isRush);
  const text = getRushOrderText(orderType as any, isRush);
  const animationClass = getRushOrderAnimationClass(orderType as any, isRush);

  return (
    <div
      className={`
        absolute top-0 right-0
        ${colorClass}
        text-white
        font-bold
        text-xs
        px-2 py-1
        transform rotate-45
        translate-x-4 -translate-y-1
        shadow-lg
        z-10
        ${animationClass}
        ${className}
      `}
      style={{
        width: '80px',
        textAlign: 'center',
      }}
    >
      <div className='flex items-center justify-center space-x-1'>
        <span>{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

export function RushOrderCard({
  isRush,
  orderType,
  children,
  className = '',
}: {
  isRush: boolean;
  orderType: string;
  children: React.ReactNode;
  className?: string;
}) {
  const borderClass = isRush ? 'border-red-300' : 'border-gray-200';
  const bgClass = isRush ? 'bg-red-50' : 'bg-white';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isRush && <RushRibbon isRush={isRush} orderType={orderType} />}
      <div
        className={`
          border-2 rounded-lg p-4
          ${borderClass}
          ${bgClass}
          transition-all duration-200
          ${isRush ? 'shadow-md' : 'shadow-sm'}
        `}
      >
        {children}
      </div>
    </div>
  );
}

export function RushOrderTimeline({
  isRush,
  orderType,
  estimatedDays,
  className = '',
}: {
  isRush: boolean;
  orderType: string;
  estimatedDays: number;
  className?: string;
}) {
  const config = getRushOrderConfig(orderType as any);
  const rushDays = isRush
    ? Math.max(
        1,
        Math.round(estimatedDays * (1 - config.timelineReduction / 100))
      )
    : estimatedDays;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-gray-600'>Timeline:</span>
        <div className='flex items-center space-x-2'>
          {isRush && (
            <RushIndicator
              isRush={isRush}
              orderType={orderType as any}
              size='sm'
            />
          )}
          <span
            className={`font-bold ${isRush ? 'text-red-600' : 'text-gray-900'}`}
          >
            {rushDays} day{rushDays !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {isRush && (
        <div className='text-xs text-red-600 bg-red-100 rounded px-2 py-1'>
          ⚡ {estimatedDays - rushDays} day
          {estimatedDays - rushDays !== 1 ? 's' : ''} faster than standard
        </div>
      )}
    </div>
  );
}

export function RushOrderPricing({
  isRush,
  orderType,
  basePrice,
  className = '',
}: {
  isRush: boolean;
  orderType: string;
  basePrice: number;
  className?: string;
}) {
  const config = getRushOrderConfig(orderType as any);
  const rushFee = isRush
    ? Math.round(basePrice * (config.rushFeeMultiplier - 1))
    : 0;
  const totalPrice = basePrice + rushFee;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-gray-600'>Base Price:</span>
        <span className='font-medium'>${(basePrice / 100).toFixed(2)}</span>
      </div>

      {isRush && (
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium text-red-600'>Rush Fee:</span>
          <span className='font-medium text-red-600'>
            +${(rushFee / 100).toFixed(2)}
          </span>
        </div>
      )}

      <div className='border-t pt-2'>
        <div className='flex items-center justify-between'>
          <span className='font-bold text-gray-900'>Total:</span>
          <span
            className={`font-bold text-lg ${isRush ? 'text-red-600' : 'text-gray-900'}`}
          >
            ${(totalPrice / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
