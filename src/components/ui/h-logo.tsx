'use client';

import { cn } from '@/lib/utils';

interface HLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'minimal' | 'gradient';
}

export function HLogo({
  size = 'md',
  className,
  variant = 'default',
}: HLogoProps) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const fontSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'flex items-center justify-center font-serif font-bold text-primary',
          fontSizeClasses[size],
          className
        )}
      >
        H
      </div>
    );
  }

  if (variant === 'gradient') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-clay',
          sizeClasses[size],
          className
        )}
      >
        <span
          className={cn(
            'font-serif font-bold text-white',
            fontSizeClasses[size]
          )}
        >
          H
        </span>
      </div>
    );
  }

  return (
    <svg
      viewBox='0 0 48 48'
      className={cn(sizeClasses[size], className)}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='24' cy='24' r='22' fill='currentColor' className='text-primary' />
      <text
        x='24'
        y='32'
        textAnchor='middle'
        fill='white'
        fontSize='28'
        fontFamily='Georgia, serif'
        fontWeight='bold'
      >
        H
      </text>
    </svg>
  );
}

export function HLogoAnimated({
  size = 'md',
  className,
}: Omit<HLogoProps, 'variant'>) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <div className='absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/20 to-accent-clay/20 animate-spin' />
      <HLogo size={size} variant='gradient' className='relative z-10' />
    </div>
  );
}
