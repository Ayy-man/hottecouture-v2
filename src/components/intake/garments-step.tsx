'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/intake/camera-capture';
import { nanoid } from 'nanoid';

interface GarmentType {
  id: string;
  code: string;
  name: string;
  category: string;
  icon: string;
  is_common: boolean;
  is_active?: boolean;
}

interface Garment {
  type: string;
  garment_type_id?: string;
  color?: string;
  brand?: string;
  notes?: string;
  photoPath?: string;
  photoDataUrl?: string; // Local data URL for immediate display
  photoFileName?: string; // Intended filename for upload
  labelCode: string;
  services: Array<{
    serviceId: string;
    qty: number;
    customPriceCents?: number;
  }>;
}

interface GarmentsStepProps {
  data: Garment[];
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function GarmentsStep({
  data,
  onUpdate,
  onNext,
  onPrev,
}: GarmentsStepProps) {
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [groupedTypes, setGroupedTypes] = useState<
    Record<string, GarmentType[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [currentGarment, setCurrentGarment] = useState<Partial<Garment>>({
    type: '',
    notes: '',
    labelCode: nanoid(8).toUpperCase(),
    services: [],
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load garment types from API
  useEffect(() => {
    const loadGarmentTypes = async () => {
      try {
        const response = await fetch('/api/garment-types');
        if (response.ok) {
          const data = await response.json();
          setGarmentTypes(data.garmentTypes || []);
          setGroupedTypes(data.groupedTypes || {});
        } else {
          console.error('Failed to load garment types');
        }
      } catch (error) {
        console.error('Error loading garment types:', error);
      } finally {
        setLoading(false);
      }
    };
    loadGarmentTypes();
  }, []);

  const addGarment = () => {
    if (!currentGarment.type || !currentGarment.garment_type_id) return;

    const newGarment: Garment = {
      type: currentGarment.type,
      garment_type_id: currentGarment.garment_type_id,
      notes: currentGarment.notes || '',
      ...(currentGarment.photoPath && { photoPath: currentGarment.photoPath }),
      ...(currentGarment.photoDataUrl && {
        photoDataUrl: currentGarment.photoDataUrl,
      }),
      ...(currentGarment.photoFileName && {
        photoFileName: currentGarment.photoFileName,
      }),
      labelCode: currentGarment.labelCode || nanoid(8).toUpperCase(),
      services: [],
    };

    onUpdate([...data, newGarment]);
    setCurrentGarment({
      type: '',
      notes: '',
      labelCode: nanoid(8).toUpperCase(),
      services: [],
    });
    setShowAddForm(false);
  };

  const handleGarmentTypeChange = (garmentTypeId: string) => {
    const selectedType = garmentTypes.find(gt => gt.id === garmentTypeId);
    if (selectedType) {
      setCurrentGarment(prev => ({
        ...prev,
        type: selectedType.name,
        garment_type_id: selectedType.id,
      }));
    }
  };

  const removeGarment = (index: number) => {
    const updatedGarments = data.filter((_, i) => i !== index);
    onUpdate(updatedGarments);
  };

  const updateGarmentField = (field: keyof Garment, value: any) => {
    setCurrentGarment(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoCapture = async (imageDataUrl: string, fileName: string) => {
    try {
      console.log('Storing photo locally...', fileName);

      // Store locally for now - will upload when order is submitted
      setCurrentGarment(prev => ({
        ...prev,
        photoDataUrl: imageDataUrl, // Store the data URL locally
        photoFileName: fileName, // Store the intended filename
        // photoPath will be set after upload
      }));

      console.log('Photo stored locally successfully');
    } catch (error) {
      console.error('Photo capture failed:', error);
      setUploadError(
        `Photo capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  if (loading) {
    return (
      <div className='h-full flex flex-col overflow-hidden min-h-0'>
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
              Add Garments
            </h2>
            <p className='text-sm text-gray-500'>Loading garment types...</p>
          </div>
          <Button
            onClick={onNext}
            disabled={true}
            className='bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Next
          </Button>
        </div>
        <div className='flex-1 overflow-y-auto min-h-0 flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>Loading garment types...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header with Navigation */}
      <div className='flex items-center justify-between px-1 py-3 border-b border-gray-200 bg-white flex-shrink-0'>
        <Button
          variant='ghost'
          onClick={onPrev}
          className='flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200'
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
          <h2 className='text-lg font-semibold text-gray-900'>Add Garments</h2>
          <p className='text-sm text-gray-500'>
            Add garments that need alterations or custom work
          </p>
        </div>

        <Button
          onClick={onNext}
          disabled={data.length === 0}
          className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          Next
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-4 space-y-4'>
          {!showAddForm ? (
            <Button
              onClick={() => setShowAddForm(true)}
              className='w-full btn-press bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm py-2'
            >
              Add Garment
            </Button>
          ) : (
            <div className='space-y-3 p-3 border border-gray-200 rounded-lg'>
              <div>
                <label
                  htmlFor='garmentType'
                  className='block text-sm font-medium mb-1'
                >
                  Garment Type *
                </label>
                <div className='relative'>
                  <select
                    id='garmentType'
                    value={currentGarment.garment_type_id || ''}
                    onChange={e => handleGarmentTypeChange(e.target.value)}
                    className='w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-gray-400 touch-manipulation min-h-[40px]'
                    required
                  >
                    <option value=''>Choose a garment type...</option>
                    {Object.entries(groupedTypes).map(([category, types]) => (
                      <optgroup
                        key={category}
                        label={
                          category.charAt(0).toUpperCase() +
                          category.slice(1).replace('_', ' ')
                        }
                        className='font-semibold text-gray-700'
                      >
                        {types
                          .filter(type => type.is_active !== false)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(type => (
                            <option
                              key={type.id}
                              value={type.id}
                              className='py-2'
                            >
                              {type.icon} {type.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
                    <svg
                      className='w-5 h-5 text-gray-400'
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
                  </div>
                </div>
                {currentGarment.garment_type_id && (
                  <div className='mt-1 text-xs text-green-600 flex items-center'>
                    <svg
                      className='w-3 h-3 mr-1'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    Garment type selected
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor='labelCode'
                  className='block text-xs font-medium mb-1'
                >
                  Label Code
                </label>
                <input
                  id='labelCode'
                  type='text'
                  value={currentGarment.labelCode}
                  readOnly
                  className='w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 min-h-[36px] text-sm'
                  placeholder='Auto-generated'
                />
                <p className='text-xs text-gray-500 mt-1'>
                  This code will be used to identify the garment
                </p>
              </div>

              <div>
                <label
                  htmlFor='garmentNotes'
                  className='block text-xs font-medium mb-1'
                >
                  Notes
                </label>
                <textarea
                  id='garmentNotes'
                  value={currentGarment.notes}
                  onChange={e => updateGarmentField('notes', e.target.value)}
                  rows={2}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[60px] text-sm touch-manipulation'
                  placeholder='Special instructions, damage notes, etc.'
                />
              </div>

              <div>
                <label className='block text-xs font-medium mb-1'>Photo</label>
                <div className='space-y-2'>
                  {currentGarment.photoPath || currentGarment.photoDataUrl ? (
                    <div className='space-y-3'>
                      <div className='h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden'>
                        {currentGarment.photoDataUrl ? (
                          <img
                            src={currentGarment.photoDataUrl}
                            alt='Garment photo'
                            className='w-full h-full object-cover'
                          />
                        ) : (
                          <span className='text-2xl text-gray-600'>📷</span>
                        )}
                      </div>
                      <div className='text-center'>
                        <p className='text-xs text-gray-600 mb-2'>
                          Photo captured successfully
                        </p>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setCurrentGarment(prev => {
                              const {
                                photoPath,
                                photoDataUrl,
                                photoFileName,
                                ...rest
                              } = prev;
                              return rest;
                            })
                          }
                          className='text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                        >
                          Remove Photo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <CameraCapture onCapture={handlePhotoCapture} />
                  )}
                  {uploadError && (
                    <div className='text-red-600 text-xs'>{uploadError}</div>
                  )}
                </div>
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={addGarment}
                  disabled={
                    !currentGarment.type || !currentGarment.garment_type_id
                  }
                  className='flex-1 btn-press bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2'
                >
                  Add Garment
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setShowAddForm(false)}
                  className='flex-1 btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300 text-sm py-2'
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {data.length > 0 && (
            <div className='space-y-2'>
              <h3 className='font-medium text-sm'>
                Added Garments ({data.length})
              </h3>
              {data.map((garment, index) => {
                const isEven = index % 2 === 0;
                return (
                  <div key={index} className='p-3 bg-gray-50 rounded-lg'>
                    <div
                      className={`grid grid-cols-2 gap-3 ${!isEven ? 'grid-flow-col-dense' : ''}`}
                    >
                      {/* Photo - 50% width */}
                      <div
                        className={`h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden ${!isEven ? 'order-2' : ''}`}
                      >
                        {garment.photoPath || garment.photoDataUrl ? (
                          garment.photoDataUrl ? (
                            <img
                              src={garment.photoDataUrl}
                              alt='Garment photo'
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <span className='text-xs text-gray-600'>📷</span>
                          )
                        ) : (
                          <span className='text-xs text-gray-500'>
                            No Photo
                          </span>
                        )}
                      </div>

                      {/* Text content - 50% width */}
                      <div className={`space-y-1 ${!isEven ? 'order-1' : ''}`}>
                        <div className='flex items-center space-x-2'>
                          {garment.garment_type_id && (
                            <span className='text-sm'>
                              {garmentTypes.find(
                                gt => gt.id === garment.garment_type_id
                              )?.icon || '👕'}
                            </span>
                          )}
                          <div className='font-medium text-gray-900 text-sm'>
                            {garment.type}
                          </div>
                        </div>
                        <div className='text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded'>
                          #{garment.labelCode}
                        </div>
                        {garment.color && (
                          <div className='text-xs text-gray-500'>
                            <span className='font-medium'>Color:</span>{' '}
                            {garment.color}
                          </div>
                        )}
                        {garment.brand && (
                          <div className='text-xs text-gray-500'>
                            <span className='font-medium'>Brand:</span>{' '}
                            {garment.brand}
                          </div>
                        )}
                        {garment.notes && (
                          <div className='text-xs text-gray-500 italic'>
                            <span className='font-medium'>Notes:</span>{' '}
                            {garment.notes}
                          </div>
                        )}
                        <div className='pt-1'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => removeGarment(index)}
                            className='btn-press bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-red-300 text-xs px-2 py-1'
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
