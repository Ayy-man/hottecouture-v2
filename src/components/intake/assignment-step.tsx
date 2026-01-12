'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStaff } from '@/lib/hooks/useStaff';
import { Loader2 } from 'lucide-react';

interface AssignmentStepProps {
  selectedAssignee: string | null;
  onAssigneeChange: (assignee: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting?: boolean;
}

export function AssignmentStep({
  selectedAssignee,
  onAssigneeChange,
  onNext,
  onPrev,
  isSubmitting = false,
}: AssignmentStepProps) {
  const { staff, loading } = useStaff();

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
          Assigner la commande
        </h2>
        <div className='w-1/3 flex justify-end'>
          <Button
            onClick={onNext}
            disabled={!selectedAssignee || isSubmitting}
            className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-4 py-2 rounded-lg font-medium'
          >
            {isSubmitting ? 'Création...' : 'Créer la commande'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 overflow-y-auto p-4 bg-muted/50 min-h-0'>
        <div className='max-w-md mx-auto space-y-4'>
          <div className='text-center mb-6'>
            <p className='text-sm text-muted-foreground'>
              Qui travaillera sur cette commande?
            </p>
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
            </div>
          ) : (
            <div className='space-y-3'>
              {staff.map((member) => {
                const isSelected = selectedAssignee === member.name;

                return (
                  <Card
                    key={member.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-primary shadow-lg scale-102'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => onAssigneeChange(member.name)}
                  >
                    <CardContent className='p-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <div className='w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-2xl font-semibold text-primary'>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className='font-semibold text-foreground'>{member.name}</h3>
                            <p className='text-sm text-muted-foreground'>Staff</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className='w-6 h-6 rounded-full bg-primary flex items-center justify-center'>
                            <svg
                              className='w-4 h-4 text-white'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path
                                fillRule='evenodd'
                                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                clipRule='evenodd'
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && staff.length === 0 && (
            <p className='text-center text-sm text-amber-600 mt-4'>
              No staff members available. Add staff in Settings.
            </p>
          )}

          {!selectedAssignee && staff.length > 0 && (
            <p className='text-center text-sm text-amber-600 mt-4'>
              Veuillez sélectionner une couturière pour continuer
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
