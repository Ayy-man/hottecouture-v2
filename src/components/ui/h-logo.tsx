'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

interface HLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string | undefined;
  variant?: 'default' | 'light' | 'dark' | 'round';
}

const sizeConfig = {
  xs: { class: 'w-6 h-6', px: 24 },
  sm: { class: 'w-8 h-8', px: 32 },
  md: { class: 'w-12 h-12', px: 48 },
  lg: { class: 'w-16 h-16', px: 64 },
  xl: { class: 'w-24 h-24', px: 96 },
  xxl: { class: 'w-32 h-32', px: 128 },
};

// Signature logo dimensions (width:height ratio from the actual image)
const signatureRatio = 3.5; // Approximate width:height ratio for signature logo

export function HLogo({ size = 'md', className, variant = 'default' }: HLogoProps) {
  const config = sizeConfig[size];

  // For round variant, use the round logo
  if (variant === 'round') {
    return (
      <div className={cn(config.class, 'relative', className)}>
        <Image
          src="/logo-round.jpg"
          alt="Hotte Couture"
          width={config.px}
          height={config.px}
          className="rounded-full object-cover w-full h-full"
          priority
        />
      </div>
    );
  }

  // Default: use signature logo (wider aspect ratio)
  const height = config.px;
  const width = Math.round(height * signatureRatio);

  return (
    <div className={cn('relative', className)} style={{ height: config.px, width }}>
      <Image
        src="/logo-signature.png"
        alt="Hotte Couture"
        width={width}
        height={height}
        className="object-contain h-full w-auto"
        priority
      />
    </div>
  );
}

export function HLogoRound({ size = 'md', className }: Omit<HLogoProps, 'variant'>) {
  return <HLogo size={size} className={className} variant="round" />;
}

export function HLogoAnimated({ size = 'md', className }: HLogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('relative', config.class, className)}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/20 to-accent-clay/20 animate-spin" style={{ animationDuration: '3s' }} />
      <HLogo size={size} variant="round" className="relative z-10 w-full h-full" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 border-r-accent-clay animate-spin" style={{ animationDuration: '2s' }} />
    </div>
  );
}