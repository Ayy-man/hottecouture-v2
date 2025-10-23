'use client';

import { useState } from 'react';
// import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MeasurementCapture } from '@/components/measurements/measurement-capture';
import { MeasurementSet } from '@/lib/measurements/measurement-types';

interface NotesData {
  measurements?: string;
  specialInstructions?: string;
  detailedMeasurements?: MeasurementSet[];
}

interface NotesStepProps {
  data: NotesData;
  onUpdate: (notes: NotesData) => void;
  onNext: () => void;
  onPrev: () => void;
  garments?: Array<{ type: string; id: string }>;
}

export function NotesStep({
  data,
  onUpdate,
  onNext,
  onPrev,
  garments = [],
}: NotesStepProps) {
  // const t = useTranslations('intake.notes')
  const [showMeasurementCapture, setShowMeasurementCapture] = useState(false);
  const [selectedGarment, setSelectedGarment] = useState<{
    type: string;
    id: string;
  } | null>(null);
  // const supabase = createClient()

  const handleInputChange = (field: keyof NotesData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleStartMeasurement = (garment: { type: string; id: string }) => {
    setSelectedGarment(garment);
    setShowMeasurementCapture(true);
  };

  const handleSaveMeasurement = async (measurements: MeasurementSet) => {
    if (!selectedGarment) return;

    const updatedMeasurements = [...(data.detailedMeasurements || [])];
    const existingIndex = updatedMeasurements.findIndex(
      m => m.garmentType === selectedGarment.type
    );

    if (existingIndex >= 0) {
      updatedMeasurements[existingIndex] = measurements;
    } else {
      updatedMeasurements.push(measurements);
    }

    onUpdate({
      ...data,
      detailedMeasurements: updatedMeasurements,
    });

    setShowMeasurementCapture(false);
    setSelectedGarment(null);
  };

  const handleCancelMeasurement = () => {
    setShowMeasurementCapture(false);
    setSelectedGarment(null);
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
                rows={1}
                placeholder='Enter measurements, sizing notes, or any relevant details...'
                className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] resize-none'
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
                rows={1}
                placeholder='Enter any special instructions, preferences, or requirements...'
                className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] resize-none'
              />
            </CardContent>
          </Card>

          {/* Detailed Measurements */}
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>Detailed Measurements</CardTitle>
              <CardDescription className='text-xs'>
                Capture precise measurements for each garment
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='space-y-2'>
                {garments.length > 0 ? (
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    {garments.map((garment, index) => {
                      const existingMeasurement =
                        data.detailedMeasurements?.find(
                          m => m.garmentType === garment.type
                        );
                      const isMeasured =
                        existingMeasurement &&
                        existingMeasurement.points
                          .filter(p => p.isRequired)
                          .every(p => p.value !== undefined);

                      return (
                        <div
                          key={garment.id || index}
                          className='p-2 border rounded-lg hover:shadow-md transition-shadow'
                        >
                          <div className='flex items-center justify-between mb-1'>
                            <h4 className='font-medium text-xs'>
                              {garment.type}
                            </h4>
                            <div className='flex items-center space-x-1'>
                              {isMeasured && (
                                <span className='text-green-600 text-xs'>
                                  ✓
                                </span>
                              )}
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => handleStartMeasurement(garment)}
                                className='btn-press bg-gradient-to-r from-primary-100 to-primary-200 hover:from-primary-200 hover:to-primary-300 text-primary-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-primary-300 text-xs px-2 py-1 h-6'
                              >
                                {existingMeasurement ? 'Edit' : 'Measure'}
                              </Button>
                            </div>
                          </div>
                          {existingMeasurement && (
                            <div className='text-xs text-gray-600'>
                              {
                                existingMeasurement.points.filter(
                                  p => p.value !== undefined
                                ).length
                              }
                              /{existingMeasurement.points.length} measured
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className='text-center py-4 text-gray-500'>
                    <p className='text-xs'>
                      No garments added yet. Please add garments in the previous
                      step.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Measurement Capture Modal */}
      {showMeasurementCapture && selectedGarment && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
            <MeasurementCapture
              garmentType={selectedGarment.type}
              garmentId={selectedGarment.id}
              onSave={handleSaveMeasurement}
              onCancel={handleCancelMeasurement}
              initialMeasurements={
                data.detailedMeasurements?.find(
                  m => m.garmentType === selectedGarment.type
                ) || {
                  id: '',
                  name: '',
                  description: '',
                  garmentType: selectedGarment.type,
                  points: [],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
