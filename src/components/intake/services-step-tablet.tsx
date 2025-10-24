'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, X, DollarSign, Clock, Scissors, Zap } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description?: string;
  base_price_cents: number;
  category: string;
  estimated_minutes?: number;
  icon?: string;
}

interface GarmentService {
  serviceId: string;
  qty: number;
  customPriceCents?: number;
}

interface Garment {
  id?: string;
  type: string;
  color?: string;
  brand?: string;
  notes?: string;
  labelCode: string;
  services: GarmentService[];
}

interface ServicesStepProps {
  data: Garment[];
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

// Visual service categories with icons and colors
const SERVICE_CATEGORIES = {
  hemming: {
    name: 'Hemming',
    icon: '📏',
    color: 'bg-blue-100 border-blue-200 text-blue-800',
    description: 'Adjust garment length',
  },
  waist: {
    name: 'Waist Adjustments',
    icon: '👗',
    color: 'bg-pink-100 border-pink-200 text-pink-800',
    description: 'Take in or let out waist',
  },
  sleeves: {
    name: 'Sleeves',
    icon: '👕',
    color: 'bg-green-100 border-green-200 text-green-800',
    description: 'Adjust sleeve length or width',
  },
  repairs: {
    name: 'Repairs',
    icon: '🔧',
    color: 'bg-orange-100 border-orange-200 text-orange-800',
    description: 'Fix tears, zippers, buttons',
  },
  custom: {
    name: 'Custom Work',
    icon: '✨',
    color: 'bg-purple-100 border-purple-200 text-purple-800',
    description: 'Special alterations and custom work',
  },
};

export function ServicesStepTablet({
  data,
  onUpdate,
  onNext,
  onPrev,
}: ServicesStepProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGarment, setSelectedGarment] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load services from API
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
          console.log('🔍 Services loaded:', data.services?.length || 0);
          console.log(
            '🔍 Services data:',
            data.services?.map((s: any) => ({
              id: s.id,
              name: s.name,
              base_price_cents: s.base_price_cents,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load services:', error);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  const addServiceToGarment = (garmentIndex: number, service: Service) => {
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];

    if (!garment) return;

    console.log('🔍 Adding service to garment:', {
      garmentIndex,
      serviceId: service.id,
      serviceName: service.name,
      garmentType: garment.type,
    });

    const existingServiceIndex = garment.services.findIndex(
      s => s.serviceId === service.id
    );

    if (existingServiceIndex >= 0) {
      // Update quantity
      garment.services[existingServiceIndex]!.qty += 1;
      console.log(
        '🔍 Updated existing service quantity:',
        garment.services[existingServiceIndex]
      );
    } else {
      // Add new service with complete data
      const newService = {
        serviceId: service.id,
        qty: 1,
        name: service.name,
        basePriceCents: service.base_price_cents,
        category: service.category,
        description: service.description,
      };
      garment.services.push(newService);
      console.log('🔍 Added new service:', newService);
    }

    onUpdate(updatedGarments);
  };

  const removeServiceFromGarment = (
    garmentIndex: number,
    serviceId: string
  ) => {
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];

    if (!garment) return;

    garment.services = garment.services.filter(s => s.serviceId !== serviceId);
    onUpdate(updatedGarments);
  };

  const updateServiceQuantity = (
    garmentIndex: number,
    serviceId: string,
    qty: number
  ) => {
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];

    if (!garment) return;

    const serviceIndex = garment.services.findIndex(
      s => s.serviceId === serviceId
    );
    if (serviceIndex >= 0) {
      if (qty <= 0) {
        garment.services.splice(serviceIndex, 1);
      } else {
        garment.services[serviceIndex]!.qty = qty;
      }
    }

    onUpdate(updatedGarments);
  };

  const updateServicePrice = (
    garmentIndex: number,
    serviceIndex: number,
    customPriceCents?: number
  ) => {
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];

    if (!garment || !garment.services[serviceIndex]) return;

    if (customPriceCents !== undefined) {
      garment.services[serviceIndex].customPriceCents = customPriceCents;
    } else {
      delete garment.services[serviceIndex].customPriceCents;
    }
    onUpdate(updatedGarments);
  };

  const filteredServices = services.filter(service => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getServiceById = (serviceId: string) => {
    return services.find(s => s.id === serviceId);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getTotalForGarment = (garment: Garment) => {
    return garment.services.reduce((total, gs) => {
      const service = getServiceById(gs.serviceId);
      if (!service) return total;

      const price = gs.customPriceCents || service.base_price_cents;
      return total + price * gs.qty;
    }, 0);
  };

  const getGrandTotal = () => {
    return data.reduce(
      (total, garment) => total + getTotalForGarment(garment),
      0
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-lg text-gray-600'>Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Garment Selection Tabs */}
      <div className='border-b border-gray-200'>
        <div className='flex space-x-1 overflow-x-auto pb-2'>
          {data.map((garment, index) => (
            <button
              key={garment.id}
              onClick={() => setSelectedGarment(index)}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                selectedGarment === index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {garment.type} {garment.color && `(${garment.color})`}
            </button>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Services Selection */}
        <div className='space-y-4'>
          <div>
            <h3 className='text-lg font-semibold mb-4'>Select Services</h3>

            {/* Search and Filter */}
            <div className='space-y-3 mb-4'>
              <div>
                <Label htmlFor='search'>Search Services</Label>
                <Input
                  id='search'
                  placeholder='Search services...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='text-lg h-12'
                />
              </div>

              <div>
                <Label>Category</Label>
                <div className='flex flex-wrap gap-2 mt-2'>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(SERVICE_CATEGORIES).map(([key, category]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.icon} {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Services Grid */}
            <div className='grid grid-cols-1 gap-3 max-h-96 overflow-y-auto'>
              {filteredServices.map(service => {
                const categoryInfo = SERVICE_CATEGORIES[
                  service.category as keyof typeof SERVICE_CATEGORIES
                ] || {
                  name: 'Other',
                  icon: '🔧',
                  color: 'bg-gray-100 border-gray-200 text-gray-800',
                };

                return (
                  <Card
                    key={service.id}
                    className='cursor-pointer hover:shadow-md transition-shadow'
                    onClick={() =>
                      addServiceToGarment(selectedGarment, service)
                    }
                  >
                    <CardContent className='p-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex-1'>
                          <div className='flex items-center space-x-3'>
                            <span className='text-2xl'>
                              {categoryInfo.icon}
                            </span>
                            <div>
                              <h4 className='font-semibold text-lg'>
                                {service.name}
                              </h4>
                              {service.description && (
                                <p className='text-sm text-gray-600'>
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-lg font-bold text-primary'>
                            {formatPrice(service.base_price_cents)}
                          </div>
                          {service.estimated_minutes && (
                            <div className='flex items-center text-sm text-gray-500'>
                              <Clock className='w-4 h-4 mr-1' />
                              {service.estimated_minutes}min
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Services for Current Garment */}
        <div className='space-y-4'>
          <div>
            <h3 className='text-lg font-semibold mb-4'>
              Services for {data[selectedGarment]?.type}{' '}
              {data[selectedGarment]?.color &&
                `(${data[selectedGarment].color})`}
            </h3>

            {data[selectedGarment]?.services.length === 0 ? (
              <div className='text-center py-8 text-gray-500'>
                <Scissors className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                <p>No services selected yet</p>
                <p className='text-sm'>
                  Tap on services from the left to add them
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {data[selectedGarment]?.services.map(
                  (garmentService, index) => {
                    const service = getServiceById(garmentService.serviceId);
                    if (!service) return null;

                    return (
                      <Card
                        key={garmentService.serviceId}
                        className='border-l-4 border-l-primary'
                      >
                        <CardContent className='p-4'>
                          <div className='flex items-center justify-between mb-3'>
                            <div>
                              <h4 className='font-semibold'>{service.name}</h4>
                              <p className='text-sm text-gray-600'>
                                {service.description}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                removeServiceFromGarment(
                                  selectedGarment,
                                  garmentService.serviceId
                                )
                              }
                              className='text-red-500 hover:text-red-700 p-1'
                            >
                              <X className='w-5 h-5' />
                            </button>
                          </div>

                          <div className='flex items-center justify-between'>
                            <div className='flex items-center space-x-3'>
                              <button
                                onClick={() =>
                                  updateServiceQuantity(
                                    selectedGarment,
                                    garmentService.serviceId,
                                    garmentService.qty - 1
                                  )
                                }
                                className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200'
                              >
                                <Minus className='w-4 h-4' />
                              </button>
                              <span className='text-lg font-semibold w-8 text-center'>
                                {garmentService.qty}
                              </span>
                              <button
                                onClick={() =>
                                  updateServiceQuantity(
                                    selectedGarment,
                                    garmentService.serviceId,
                                    garmentService.qty + 1
                                  )
                                }
                                className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200'
                              >
                                <Plus className='w-4 h-4' />
                              </button>
                            </div>

                            <div className='text-right'>
                              <div className='text-lg font-bold text-primary'>
                                {formatPrice(
                                  (garmentService.customPriceCents ||
                                    service.base_price_cents) *
                                    garmentService.qty
                                )}
                              </div>
                              {garmentService.customPriceCents && (
                                <div className='text-sm text-gray-500'>
                                  Custom:{' '}
                                  {formatPrice(garmentService.customPriceCents)}{' '}
                                  each
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Custom Price Input */}
                          <div className='mt-3 pt-3 border-t border-gray-100'>
                            <Label
                              htmlFor={`custom-price-${garmentService.serviceId}`}
                              className='text-sm'
                            >
                              Custom Price (optional)
                            </Label>
                            <div className='flex items-center space-x-2'>
                              <DollarSign className='w-4 h-4 text-gray-400' />
                              <input
                                id={`custom-price-${garmentService.serviceId}`}
                                type='text'
                                inputMode='decimal'
                                pattern='[0-9]*\.?[0-9]*'
                                placeholder={formatPrice(
                                  service.base_price_cents
                                )}
                                defaultValue={
                                  garmentService.customPriceCents
                                    ? (
                                        garmentService.customPriceCents / 100
                                      ).toFixed(2)
                                    : ''
                                }
                                onChange={e => {
                                  // Allow natural typing without immediate formatting
                                  const value = parseFloat(e.target.value);
                                  updateServicePrice(
                                    selectedGarment,
                                    index,
                                    isNaN(value)
                                      ? undefined
                                      : Math.round(value * 100)
                                  );
                                }}
                                onBlur={e => {
                                  // Format only on blur to allow natural typing
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value) && value > 0) {
                                    e.target.value = value.toFixed(2);
                                    updateServicePrice(
                                      selectedGarment,
                                      index,
                                      Math.round(value * 100)
                                    );
                                  } else if (e.target.value.trim() === '') {
                                    updateServicePrice(
                                      selectedGarment,
                                      index,
                                      undefined
                                    );
                                  }
                                }}
                                onFocus={e => {
                                  // Select all text on focus for easy replacement
                                  e.target.select();
                                }}
                                className='h-10 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-right'
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <Card className='bg-primary/5 border-primary/20'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold'>
                  Subtotal for this garment:
                </span>
                <span className='text-xl font-bold text-primary'>
                  {formatPrice(
                    getTotalForGarment(
                      data[selectedGarment] || {
                        type: '',
                        labelCode: '',
                        services: [],
                      }
                    )
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grand Total */}
      <Card className='bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Zap className='w-6 h-6 text-primary' />
              <span className='text-xl font-semibold'>Grand Total:</span>
            </div>
            <span className='text-3xl font-bold text-primary'>
              {formatPrice(getGrandTotal())}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Navigation - iPad 8 Optimized */}
      <div className='sticky bottom-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200'>
        <div className='flex justify-between gap-4'>
          <Button
            onClick={onPrev}
            variant='outline'
            className='h-12 px-8 btn-press flex-1 ipad:flex-none'
          >
            Previous
          </Button>
          <Button
            onClick={onNext}
            className='h-12 px-8 btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-1 ipad:flex-none'
            disabled={data.every(garment => garment.services.length === 0)}
          >
            Next: Notes & Measurements →
          </Button>
        </div>
      </div>
    </div>
  );
}
