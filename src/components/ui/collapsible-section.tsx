'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  /** Section header text */
  label: string;
  /** Initial expanded state (default: false) */
  defaultExpanded?: boolean;
  /** Content to show when expanded */
  children: React.ReactNode;
  /** Additional classes for content area */
  className?: string;
  /** Show indicator dot when true and collapsed */
  hasContent?: boolean;
}

/**
 * Reusable collapsible section wrapper following codebase patterns.
 * Based on pattern from client-step.tsx measurements section.
 */
export function CollapsibleSection({
  label,
  defaultExpanded = false,
  children,
  className,
  hasContent = false,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className='border border-border rounded-md overflow-hidden'>
      <button
        type='button'
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full px-3 py-2 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors min-h-[44px]'
      >
        <span className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
          {label}
          {/* Content indicator dot when collapsed with content */}
          {!isExpanded && hasContent && (
            <span className='w-1.5 h-1.5 bg-primary-500 rounded-full' />
          )}
        </span>
        <svg
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 9l-7 7-7-7'
          />
        </svg>
      </button>

      {isExpanded && (
        <div className={cn('p-3 space-y-3', className)}>{children}</div>
      )}
    </div>
  );
}
