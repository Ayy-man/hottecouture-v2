'use client';

// import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface NotesData {
  measurements?: string;
  specialInstructions?: string;
}

interface NotesStepProps {
  data: NotesData;
  onUpdate: (notes: NotesData) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function NotesStep({ data, onUpdate, onNext, onPrev }: NotesStepProps) {
  // const t = useTranslations('intake.notes')

  const handleInputChange = (field: keyof NotesData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header with Navigation */}
      <div className='flex items-center justify-between px-1 py-3 border-b border-gray-200 bg-white flex-shrink-0'>
        <Button
          variant='ghost'
          onClick={onPrev}
          className='flex items-center gap-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg transition-all duration-200'
        >
          <svg
            className='w-4 h-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
          <span className='font-medium'>Previous</span>
        </Button>

        <div className='flex-1 text-center'>
          <h2 className='text-lg font-semibold text-gray-900'>
            Notes & Measurements
          </h2>
          <p className='text-sm text-gray-500'>
            Measurements and special instructions
          </p>
        </div>

        <Button
          onClick={onNext}
          className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-6 py-2 rounded-lg font-medium transition-all duration-200'
        >
          Next: Pricing →
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-3 space-y-3 pb-32'>
          {/* Measurements */}
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>Measurements</CardTitle>
              <CardDescription className='text-xs'>
                Record any measurements or sizing information
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <textarea
                value={data.measurements || ''}
                onChange={e =>
                  handleInputChange('measurements', e.target.value)
                }
                rows={4}
                placeholder='Enter measurements, sizing notes, or any relevant details...'
                className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px] resize-none'
              />
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>Special Instructions</CardTitle>
              <CardDescription className='text-xs'>
                Any special instructions or requirements for this order
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <textarea
                value={data.specialInstructions || ''}
                onChange={e =>
                  handleInputChange('specialInstructions', e.target.value)
                }
                rows={4}
                placeholder='Enter any special instructions, preferences, or requirements...'
                className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px] resize-none'
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
