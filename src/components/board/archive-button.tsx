'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Archive, Loader2, CheckCircle } from 'lucide-react';

interface ArchiveButtonProps {
  onArchiveComplete?: () => void;
}

export function ArchiveButton({ onArchiveComplete }: ArchiveButtonProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleArchiveDelivered = async () => {
    setIsArchiving(true);
    try {
      const response = await fetch('/api/orders/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archiveAllDelivered: true }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Archive successful:', result);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        onArchiveComplete?.();
      } else {
        console.error('❌ Archive failed:', result);
        alert(`Archive failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Archive error:', error);
      alert('Failed to archive orders. Please try again.');
    } finally {
      setIsArchiving(false);
    }
  };

  if (showSuccess) {
    return (
      <Button
        variant='outline'
        size='sm'
        className='bg-secondary-50 border-secondary-200 text-secondary-700 hover:bg-secondary-100'
        disabled
      >
        <CheckCircle className='w-4 h-4 mr-2' />
        Archived!
      </Button>
    );
  }

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={handleArchiveDelivered}
      disabled={isArchiving}
      className='btn-press bg-gradient-to-r from-primary-400/20 to-primary-400/30 hover:from-primary-400/30 hover:to-primary-400/40 text-primary-900 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-primary-400/40'
    >
      {isArchiving ? (
        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
      ) : (
        <Archive className='w-4 h-4 mr-2' />
      )}
      Archive Delivered
    </Button>
  );
}
