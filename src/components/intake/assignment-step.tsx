'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStaff } from '@/lib/hooks/useStaff';
import { Loader2 } from 'lucide-react';

export interface AssignmentItem {
  garmentIndex: number;
  garmentType: string;
  serviceIndex: number;
  serviceName: string;
  assignedSeamstressId: string | null;
}

interface AssignmentStepProps {
  items: AssignmentItem[];
  onItemAssignmentChange: (
    garmentIndex: number,
    serviceIndex: number,
    seamstressId: string | null
  ) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting?: boolean;
}

export function AssignmentStep({
  items,
  onItemAssignmentChange,
  onNext,
  onPrev,
  isSubmitting = false,
}: AssignmentStepProps) {
  const { staff, loading } = useStaff();

  // Get the name of a seamstress by ID
  const getSeamstressName = (id: string | null): string => {
    if (!id) return '';
    const member = staff.find(s => s.id === id);
    return member?.name || '';
  };

  // Handle "Assign All" action
  const handleAssignAll = (seamstressId: string) => {
    items.forEach(item => {
      onItemAssignmentChange(
        item.garmentIndex,
        item.serviceIndex,
        seamstressId || null
      );
    });
  };

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0'>
        <div className='w-1/3'>
          <Button
            onClick={onPrev}
            variant='ghost'
            className='text-primary-600 hover:text-primary-800 p-0'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 mr-1'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
            Retour
          </Button>
        </div>
        <h2 className='text-lg font-semibold text-foreground'>
          Assigner les taches
        </h2>
        <div className='w-1/3 flex justify-end'>
          <Button
            onClick={onNext}
            disabled={isSubmitting}
            className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-4 py-2 rounded-lg font-medium'
          >
            {isSubmitting ? 'Creation...' : 'Creer la commande'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 overflow-y-auto p-4 bg-muted/50 min-h-0'>
        <div className='max-w-md mx-auto space-y-4'>
          <div className='text-center mb-6'>
            <p className='text-sm text-muted-foreground'>
              Assignez chaque tache a une couturiere
            </p>
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
            </div>
          ) : (
            <>
              {/* Assign All Quick Action */}
              {items.length > 1 && staff.length > 0 && (
                <div className='mb-6'>
                  <label className='block text-sm font-medium text-muted-foreground mb-2'>
                    Assigner tout a...
                  </label>
                  <Select onValueChange={handleAssignAll}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Assigner tout a...' />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Per-item assignment list */}
              <div className='space-y-3'>
                {items.map((item) => (
                  <Card key={`${item.garmentIndex}-${item.serviceIndex}`}>
                    <CardContent className='p-4'>
                      <div className='flex items-center justify-between gap-4'>
                        <div className='flex-1 min-w-0'>
                          <p className='font-medium text-foreground truncate'>
                            {item.garmentType}
                          </p>
                          <p className='text-sm text-muted-foreground truncate'>
                            {item.serviceName}
                          </p>
                        </div>
                        <div className='flex-shrink-0 w-40'>
                          <Select
                            value={item.assignedSeamstressId || ''}
                            onValueChange={(val) =>
                              onItemAssignmentChange(
                                item.garmentIndex,
                                item.serviceIndex,
                                val || null
                              )
                            }
                          >
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='Non assigne'>
                                {getSeamstressName(item.assignedSeamstressId) || 'Non assigne'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value=''>Non assigne</SelectItem>
                              {staff.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {!loading && staff.length === 0 && (
            <p className='text-center text-sm text-amber-600 mt-4'>
              Aucun membre du personnel disponible. Ajoutez du personnel dans les parametres.
            </p>
          )}

          {!loading && items.length === 0 && (
            <p className='text-center text-sm text-amber-600 mt-4'>
              Aucun service selectionne. Retournez a l etape des services.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
