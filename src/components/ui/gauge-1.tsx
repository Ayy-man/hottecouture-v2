'use client';

import { cn } from '@/lib/utils';

interface GaugeProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function Gauge({
  value,
  size = 'md',
  showValue = true,
  className,
  primaryColor,
  secondaryColor,
}: GaugeProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  const sizeConfig = {
    sm: { width: 48, strokeWidth: 4, fontSize: 'text-xs' },
    md: { width: 72, strokeWidth: 6, fontSize: 'text-sm' },
    lg: { width: 96, strokeWidth: 8, fontSize: 'text-base' },
  };

  const { width, strokeWidth, fontSize } = sizeConfig[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  const getColor = () => {
    if (primaryColor) return primaryColor;
    if (normalizedValue >= 80) return 'stroke-green-500';
    if (normalizedValue >= 50) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={width}
        height={width / 2 + strokeWidth}
        viewBox={`0 0 ${width} ${width / 2 + strokeWidth}`}
        className="transform -rotate-90"
        style={{ transform: 'rotate(180deg)' }}
      >
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn('stroke-muted', secondaryColor)}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference / 2}
        />
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn(getColor())}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference / 2 + strokeDashoffset / 2}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      {showValue && (
        <span
          className={cn(
            'absolute bottom-0 font-semibold tabular-nums',
            fontSize
          )}
        >
          {Math.round(normalizedValue)}%
        </span>
      )}
    </div>
  );
}

interface GaugeCircleProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function GaugeCircle({
  value,
  size = 'md',
  showValue = true,
  className,
  primaryColor,
  secondaryColor,
}: GaugeCircleProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  const sizeConfig = {
    sm: { width: 48, strokeWidth: 4, fontSize: 'text-xs' },
    md: { width: 72, strokeWidth: 6, fontSize: 'text-sm' },
    lg: { width: 96, strokeWidth: 8, fontSize: 'text-base' },
  };

  const { width, strokeWidth, fontSize } = sizeConfig[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  const getColor = () => {
    if (primaryColor) return primaryColor;
    if (normalizedValue >= 80) return 'stroke-green-500';
    if (normalizedValue >= 50) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={width}
        height={width}
        viewBox={`0 0 ${width} ${width}`}
        className="transform -rotate-90"
      >
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn('stroke-muted', secondaryColor)}
        />
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn(getColor())}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      {showValue && (
        <span
          className={cn(
            'absolute font-semibold tabular-nums',
            fontSize
          )}
        >
          {Math.round(normalizedValue)}%
        </span>
      )}
    </div>
  );
}
