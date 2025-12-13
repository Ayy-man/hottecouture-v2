'use client';

import { cn } from '@/lib/utils';

interface HLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'light' | 'dark';
}

const sizeConfig = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function HLogo({ size = 'md', className, variant = 'default' }: HLogoProps) {
  const bgColor = variant === 'light' ? '#ffffff' : variant === 'dark' ? '#1a1a1a' : '#2d1b4e';
  const letterColor = variant === 'light' ? '#2d1b4e' : '#d4a574';

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(sizeConfig[size], className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="48" fill={bgColor} stroke={letterColor} strokeWidth="2" />
      <text
        x="50"
        y="50"
        dominantBaseline="central"
        textAnchor="middle"
        fill={letterColor}
        fontFamily="serif"
        fontSize="52"
        fontWeight="bold"
        fontStyle="italic"
      >
        H
      </text>
    </svg>
  );
}

export function HLogoAnimated({ size = 'md', className }: HLogoProps) {
  return (
    <div className={cn('relative', sizeConfig[size], className)}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/20 to-accent-clay/20 animate-spin" style={{ animationDuration: '3s' }} />
      <HLogo size={size} className="relative z-10 w-full h-full" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 border-r-accent-clay animate-spin" style={{ animationDuration: '2s' }} />
    </div>
  );
}