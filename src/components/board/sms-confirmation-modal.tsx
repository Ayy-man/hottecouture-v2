'use client';

import { Button } from '@/components/ui/button';

interface SmsConfirmationModalProps {
  isOpen: boolean;
  orderNumber: number;
  clientName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SmsConfirmationModal({
  isOpen,
  orderNumber,
  clientName,
  onConfirm,
  onCancel,
}: SmsConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div
        className='absolute inset-0 bg-black/50'
        onClick={onCancel}
      />
      <div className='relative bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4'>
        <div className='text-center mb-4'>
          <div className='w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-8 h-8 text-purple-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-semibold text-foreground mb-2'>
            Send Pickup Notification?
          </h3>
          <p className='text-sm text-muted-foreground'>
            Order <span className='font-semibold'>#{orderNumber}</span> for{' '}
            <span className='font-semibold'>{clientName}</span> is ready.
          </p>
          <p className='text-sm text-muted-foreground mt-2'>
            This will send an SMS to notify the customer their order is ready for pickup.
          </p>
        </div>

        <div className='flex gap-3'>
          <Button
            onClick={onCancel}
            variant='outline'
            className='flex-1'
          >
            Skip SMS
          </Button>
          <Button
            onClick={onConfirm}
            className='flex-1 bg-purple-600 hover:bg-purple-700 text-white'
          >
            Send SMS
          </Button>
        </div>
      </div>
    </div>
  );
}
