'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CollapsibleNotesProps {
  /** The notes text */
  notes: string | null | undefined;
  /** Called when Edit button clicked */
  onEdit?: () => void;
  /** Header text (default: "Notes") */
  label?: string;
  /** Initial expanded state (default: false) */
  defaultExpanded?: boolean;
  /** Max height for expanded content (default: "80px") */
  maxHeight?: string;
}

/**
 * Notes-specific collapsible component with edit support.
 * Collapsed by default, shows indicator when notes exist.
 *
 * Height savings: ~160px textarea -> ~40px collapsed header
 */
export function CollapsibleNotes({
  notes,
  onEdit,
  label = 'Notes',
  defaultExpanded = false,
  maxHeight = '80px',
}: CollapsibleNotesProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasNotes = !!notes && notes.trim().length > 0;

  return (
    <div className='border border-border rounded-md overflow-hidden'>
      <button
        type='button'
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full px-3 py-2 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors min-h-[44px]'
      >
        <span className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
          <svg
            className={cn(
              'w-4 h-4 transition-transform',
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
          {label}
          {/* Content indicator dot when collapsed with content */}
          {!isExpanded && hasNotes && (
            <span className='w-1.5 h-1.5 bg-primary-500 rounded-full' />
          )}
        </span>
        {onEdit && (
          <span
            role='button'
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onEdit();
              }
            }}
            className='text-xs text-primary-600 hover:text-primary-700 px-2 py-1 -my-1 cursor-pointer'
          >
            Edit
          </span>
        )}
      </button>

      {isExpanded && (
        <div
          className='p-3 text-xs text-muted-foreground bg-muted/20 overflow-y-auto'
          style={{ maxHeight }}
        >
          {hasNotes ? (
            <p className='whitespace-pre-wrap'>{notes}</p>
          ) : (
            <p className='italic'>No notes</p>
          )}
        </div>
      )}
    </div>
  );
}
