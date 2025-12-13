'use client';

import { cn } from '@/lib/utils';
import { HLogo } from './h-logo';

interface LoadingLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  text?: string;
}

export function LoadingLogo({
  size = 'md',
  className,
  showText = true,
  text = 'Loading...',
}: LoadingLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
  };

  const hLogoSizeMap = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
    xl: 'xl' as const,
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-3',
        className
      )}
    >
      {/* Animated Logo Container */}
      <div className={cn('relative', sizeClasses[size])}>
        {/* Rotating Background Circle */}
        <div className='absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/20 to-accent-clay/20 animate-spin' style={{ animationDuration: '3s' }}></div>

        {/* H Logo */}
        <div className='relative z-10 flex items-center justify-center h-full w-full animate-pulse'>
          <HLogo size={hLogoSizeMap[size]} className='w-full h-full' />
        </div>

        {/* Rotating Ring */}
        <div className='absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 border-r-accent-clay animate-spin' style={{ animationDuration: '2s' }}></div>
      </div>

      {/* Loading Text */}
      {showText && (
        <div className='text-center'>
          <p
            className={cn(
              'font-medium text-gray-600 animate-pulse',
              textSizeClasses[size]
            )}
          >
            {text}
          </p>
          {/* Animated Dots */}
          <div className='flex justify-center space-x-1 mt-2'>
            <div className='w-1 h-1 bg-primary-500 rounded-full animate-bounce'></div>
            <div
              className='w-1 h-1 bg-primary-500 rounded-full animate-bounce'
              style={{ animationDelay: '0.1s' }}
            ></div>
            <div
              className='w-1 h-1 bg-primary-500 rounded-full animate-bounce'
              style={{ animationDelay: '0.2s' }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Full Screen Loading Overlay
export function FullScreenLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm'>
      <div className='text-center'>
        <LoadingLogo size='xl' text={text} />
        <div className='mt-8'>
          <div className='w-32 h-1 bg-gray-200 rounded-full overflow-hidden'>
            <div className='h-full bg-gradient-to-r from-primary-500 to-accent-clay rounded-full animate-pulse'></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Loading Spinner
export function InlineLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className='flex items-center justify-center py-8'>
      <LoadingLogo size='md' text={text} />
    </div>
  );
}
