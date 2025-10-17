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
    <div className='space-y-6'>
      {/* Measurements */}
      <Card>
        <CardHeader>
          <CardTitle>Measurements</CardTitle>
          <CardDescription>
            Record any measurements or sizing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={data.measurements || ''}
            onChange={e => handleInputChange('measurements', e.target.value)}
            rows={6}
            placeholder='Enter measurements, sizing notes, or any relevant details...'
            className='w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent'
          />
        </CardContent>
      </Card>

      {/* Special Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Special Instructions</CardTitle>
          <CardDescription>
            Any special instructions or requirements for this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={data.specialInstructions || ''}
            onChange={e =>
              handleInputChange('specialInstructions', e.target.value)
            }
            rows={4}
            placeholder='Enter any special instructions, preferences, or requirements...'
            className='w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent'
          />
        </CardContent>
      </Card>

      {/* Detailed Measurements */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Measurements</CardTitle>
          <CardDescription>
            Capture precise measurements for each garment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {garments.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {garments.map((garment, index) => {
                  const existingMeasurement = data.detailedMeasurements?.find(
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
                      className='p-4 border rounded-lg hover:shadow-md transition-shadow'
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <h4 className='font-medium'>{garment.type}</h4>
                        <div className='flex items-center space-x-2'>
                          {isMeasured && (
                            <span className='text-green-600 text-sm'>
                              ✓ Measured
                            </span>
                          )}
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => handleStartMeasurement(garment)}
                            className='btn-press bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-blue-300'
                          >
                            {existingMeasurement ? 'Edit' : 'Measure'}
                          </Button>
                        </div>
                      </div>
                      {existingMeasurement && (
                        <div className='text-sm text-gray-600'>
                          {
                            existingMeasurement.points.filter(
                              p => p.value !== undefined
                            ).length
                          }{' '}
                          of {existingMeasurement.points.length} measurements
                          taken
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='text-center py-8 text-gray-500'>
                <p>
                  No garments added yet. Please add garments in the previous
                  step.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Sticky Navigation - iPad 8 Optimized */}
      <div className='sticky bottom-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200'>
        <div className='flex space-x-4'>
          <Button
            type='button'
            variant='outline'
            onClick={onPrev}
            className='flex-1 py-3 text-lg btn-press'
          >
            Previous
          </Button>
          <Button
            type='button'
            onClick={onNext}
            className='flex-1 py-3 text-lg btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300'
          >
            Next: Pricing →
          </Button>
        </div>
      </div>
    </div>
  );
}
