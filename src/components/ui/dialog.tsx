'use client';

import * as React from 'react';

// Lightweight Dialog components matching shadcn/ui API
// Uses native HTML + portal pattern (no @radix-ui/react-dialog dependency)

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center'
      onClick={e => {
        if (e.target === e.currentTarget) onOpenChange?.(false);
      }}
    >
      <div className='fixed inset-0 bg-black/50' />
      <div className='relative z-50'>{children}</div>
    </div>
  );
}

function DialogContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-border w-full mx-4 p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

function DialogTitle({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={`text-lg font-semibold text-foreground ${className}`} {...props}>
      {children}
    </h2>
  );
}

export { Dialog, DialogContent, DialogHeader, DialogTitle };
