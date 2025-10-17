'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CameraCapture } from '@/components/intake/camera-capture';
import { nanoid } from 'nanoid';

interface GarmentType {
  id: string;
  code: string;
  name: string;
  category: string;
  icon: string;
  is_common: boolean;
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

  const handlePhotoCapture = async (imageDataUrl: string) => {
    try {
      console.log('Storing photo locally...');

      // Convert data URL to file
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const fileName = `garment-${nanoid()}.jpg`;

      console.log('Photo stored locally:', fileName, 'Size:', blob.size);

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
      <Card>
        <CardContent className='p-6'>
          <div className='text-center'>Loading garment types...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Garments</CardTitle>
        <CardDescription>
          Add garments that need alterations or custom work
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {!showAddForm ? (
          <Button
            onClick={() => setShowAddForm(true)}
            className='w-full btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300'
          >
            Add Garment
          </Button>
        ) : (
          <div className='space-y-4 p-4 border border-gray-200 rounded-lg'>
            <div>
              <label
                htmlFor='garmentType'
                className='block text-sm font-medium mb-1'
              >
                Garment Type *
              </label>
              <select
                id='garmentType'
                value={currentGarment.garment_type_id || ''}
                onChange={e => handleGarmentTypeChange(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                required
              >
                <option value=''>Select garment type</option>
                {Object.entries(groupedTypes).map(([category, types]) => (
                  <optgroup key={category} label={category}>
                    {types.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor='labelCode'
                className='block text-sm font-medium mb-1'
              >
                Label Code
              </label>
              <input
                id='labelCode'
                type='text'
                value={currentGarment.labelCode}
                readOnly
                className='w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600'
                placeholder='Auto-generated'
              />
              <p className='text-xs text-gray-500 mt-1'>
                This code will be used to identify the garment
              </p>
            </div>

            <div>
              <label
                htmlFor='garmentNotes'
                className='block text-sm font-medium mb-1'
              >
                Notes
              </label>
              <textarea
                id='garmentNotes'
                value={currentGarment.notes}
                onChange={e => updateGarmentField('notes', e.target.value)}
                rows={3}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='Special instructions, damage notes, etc.'
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-2'>Photo</label>
              <div className='space-y-3'>
                {currentGarment.photoPath || currentGarment.photoDataUrl ? (
                  <div className='grid grid-cols-2 gap-4'>
                    {/* Photo on the left - 50% width */}
                    <div className='h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden'>
                      {currentGarment.photoDataUrl ? (
                        <img
                          src={currentGarment.photoDataUrl}
                          alt='Garment photo'
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <span className='text-sm text-gray-600'>📷</span>
                      )}
                    </div>
                    {/* Text and button on the right - 50% width */}
                    <div className='space-y-3'>
                      <div className='text-sm text-gray-600'>
                        Photo captured successfully
                      </div>
                      <div className='text-xs text-gray-500'>
                        Click remove to take a new photo
                      </div>
                      <div className='flex gap-2'>
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
                          className='btn-press bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-red-300'
                        >
                          Remove Photo
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='border-2 border-dashed border-gray-300 rounded-lg p-6'>
                    <CameraCapture
                      onCapture={handlePhotoCapture}
                      onCancel={() => {}}
                    />
                  </div>
                )}
                {uploadError && (
                  <div className='text-red-600 text-sm'>{uploadError}</div>
                )}
              </div>
            </div>

            <div className='flex gap-3'>
              <Button
                onClick={addGarment}
                disabled={
                  !currentGarment.type || !currentGarment.garment_type_id
                }
                className='flex-1 btn-press bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Add Garment
              </Button>
              <Button
                variant='outline'
                onClick={() => setShowAddForm(false)}
                className='flex-1 btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300'
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {data.length > 0 && (
          <div className='space-y-3'>
            <h3 className='font-medium'>Added Garments ({data.length})</h3>
            {data.map((garment, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={index} className='p-4 bg-gray-50 rounded-lg'>
                  <div
                    className={`grid grid-cols-2 gap-4 ${!isEven ? 'grid-flow-col-dense' : ''}`}
                  >
                    {/* Photo - 50% width */}
                    <div
                      className={`h-24 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden ${!isEven ? 'order-2' : ''}`}
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
                        <span className='text-xs text-gray-500'>No Photo</span>
                      )}
                    </div>

                    {/* Text content - 50% width */}
                    <div className={`space-y-2 ${!isEven ? 'order-1' : ''}`}>
                      <div className='font-medium text-gray-900'>
                        {garment.type}
                      </div>
                      <div className='text-sm text-gray-600'>
                        Label: {garment.labelCode}
                      </div>
                      {garment.color && (
                        <div className='text-sm text-gray-500'>
                          Color: {garment.color}
                        </div>
                      )}
                      {garment.brand && (
                        <div className='text-sm text-gray-500'>
                          Brand: {garment.brand}
                        </div>
                      )}
                      <div className='pt-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => removeGarment(index)}
                          className='btn-press bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-red-300'
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

        {/* Sticky Navigation - iPad 8 Optimized */}
        <div className='sticky bottom-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200'>
          <div className='flex justify-between gap-4'>
            <Button
              variant='outline'
              onClick={onPrev}
              className='btn-press flex-1 ipad:flex-none'
            >
              Previous
            </Button>
            <Button
              onClick={onNext}
              disabled={data.length === 0}
              className='btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-1 ipad:flex-none'
            >
              Continue to Services →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
