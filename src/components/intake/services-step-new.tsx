'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Service } from '@/lib/types/database';
import { formatCurrency } from '@/lib/pricing/calcTotal';

interface Garment {
  type: string;
  color?: string;
  brand?: string;
  notes?: string;
  photoPath?: string;
  labelCode: string;
  services: Array<{
    serviceId: string;
    qty: number;
    customPriceCents?: number;
    customServiceName?: string; // Added for custom services
  }>;
}

interface ServicesStepProps {
  data: Garment[];
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

type ServiceCategory =
  | 'alterations'
  | 'projects'
  | 'accessories'
  | 'fabrics'
  | 'curtains'
  | 'custom';

export function ServicesStepNew({
  data,
  onUpdate,
  onNext,
  onPrev,
}: ServicesStepProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ServiceCategory>('alterations');
  const [subtotal, setSubtotal] = useState(0);
  const [customServiceName, setCustomServiceName] = useState(''); // State for custom service name
  const [customServicePrice, setCustomServicePrice] = useState(''); // State for custom service price

  const supabase = createClient();

  const categories: { key: ServiceCategory; label: string; icon: string }[] = [
    { key: 'alterations', label: 'Alterations', icon: '✂️' },
    { key: 'projects', label: 'Projects', icon: '🔨' },
    { key: 'accessories', label: 'Accessories', icon: '🧵' },
    { key: 'fabrics', label: 'Fabrics', icon: '🪡' },
    { key: 'curtains', label: 'Curtains', icon: '🪟' },
    { key: 'custom', label: 'Custom', icon: '⚙️' },
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    calculateSubtotal();
  }, [data, services]); // Recalculate when data or services change

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data: fetchedServices, error } = await supabase
        .from('service')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('display_order')
        .order('name');

      if (error) {
        console.error('Error fetching services:', error);
        // Handle error appropriately
      } else {
        setServices(fetchedServices || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    let total = 0;
    data.forEach(garment => {
      garment.services.forEach(service => {
        const serviceData = services.find(s => s.id === service.serviceId);
        const isCustomService = service.serviceId.startsWith('custom-');

        if (serviceData || isCustomService) {
          const price =
            service.customPriceCents || serviceData?.base_price_cents || 0;
          total += price * service.qty;
        }
      });
    });
    setSubtotal(total);
  };

  const getServicesByCategory = (category: ServiceCategory) => {
    return services.filter(service => {
      switch (category) {
        case 'alterations':
          return (
            service.category === 'alteration' ||
            service.category === 'alterations'
          );
        case 'projects':
          return (
            service.category === 'project' || service.category === 'projects'
          );
        case 'accessories':
          return (
            service.category === 'accessory' ||
            service.category === 'accessories'
          );
        case 'fabrics':
          return (
            service.category === 'fabric' || service.category === 'fabrics'
          );
        case 'curtains':
          return (
            service.category === 'curtain' || service.category === 'curtains'
          );
        case 'custom':
          return service.category === 'custom'; // Only show predefined custom services if any
        default:
          return false;
      }
    });
  };

  const addServiceToGarment = (garmentIndex: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    // Check if service already exists
    const existingServiceIndex = garment.services.findIndex(
      s => s.serviceId === serviceId
    );

    if (existingServiceIndex >= 0) {
      // Update quantity
      const existingService = garment.services[existingServiceIndex];
      if (existingService) {
        existingService.qty += 1;
      }
    } else {
      // Add new service
      garment.services.push({
        serviceId,
        qty: 1,
        customPriceCents: service.base_price_cents,
      });
    }

    onUpdate(updatedGarments);
  };

  const updateServiceQuantity = (
    garmentIndex: number,
    serviceId: string,
    qty: number
  ) => {
    if (qty <= 0) {
      removeServiceFromGarment(garmentIndex, serviceId);
      return;
    }

    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    const serviceIndex = garment.services.findIndex(
      s => s.serviceId === serviceId
    );

    if (serviceIndex >= 0) {
      const service = garment.services[serviceIndex];
      if (service) {
        service.qty = qty;
        onUpdate(updatedGarments);
      }
    }
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

  const addCustomService = (garmentIndex: number) => {
    if (!customServiceName.trim() || !customServicePrice.trim()) {
      return;
    }

    const price = parseFloat(customServicePrice) * 100; // Convert to cents
    if (isNaN(price) || price <= 0) {
      return;
    }

    const customServiceId = `custom-${Date.now()}`;
    const updatedGarments = [...data];
    const garment = updatedGarments[garmentIndex];
    if (!garment) return;

    // Check if this custom service already exists
    const existingService = garment.services.find(
      s => s.serviceId === customServiceId
    );
    if (existingService) {
      existingService.qty += 1;
    } else {
      garment.services.push({
        serviceId: customServiceId,
        qty: 1,
        customPriceCents: price,
        customServiceName: customServiceName.trim(),
      });
    }

    onUpdate(updatedGarments);

    // Clear the form
    setCustomServiceName('');
    setCustomServicePrice('');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex items-center justify-center h-32'>
            <p className='text-gray-500'>Loading services...</p>
          </div>
        </CardContent>
      </Card>
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
          <h2 className='text-lg font-semibold text-gray-900'>
            Select Services
          </h2>
          <p className='text-sm text-gray-500'>Choose what you need</p>
        </div>

        <Button
          onClick={onNext}
          disabled={data.length === 0}
          className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          Next
        </Button>
      </div>

      {/* iOS-style Category Tabs */}
      <div className='bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0'>
        <div className='flex space-x-1 overflow-x-auto scrollbar-hide'>
          {categories.map(category => {
            const categoryServices = getServicesByCategory(category.key);
            return (
              <button
                key={category.key}
                onClick={() => setActiveTab(category.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeTab === category.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className='text-base'>{category.icon}</span>
                <span>{category.label}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    activeTab === category.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {categoryServices.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content - iOS-style Layout with Scrolling */}
      <div className='flex-1 flex overflow-hidden min-h-0'>
        {/* Services Grid / Custom Card - Now Scrollable */}
        <div className='flex-1 bg-gray-50 overflow-y-auto'>
          <div className='p-4 pb-24'>
            {activeTab === 'custom' ? (
              <div className='bg-white rounded-lg p-6 shadow-sm border border-gray-100 w-full'>
                {/* Compact Header */}
                <div className='flex items-center gap-3 mb-6'>
                  <div className='text-3xl'>✨</div>
                  <div>
                    <h3 className='text-xl font-semibold text-gray-900'>
                      Custom Service
                    </h3>
                    <p className='text-sm text-gray-500'>
                      Add your own service with custom pricing
                    </p>
                  </div>
                </div>

                {/* Horizontal Form Layout - Always in one row with more width */}
                <div className='flex gap-6 mb-6'>
                  <div className='flex-1'>
                    <label
                      htmlFor='customServiceName'
                      className='block text-sm font-medium text-gray-700 mb-2'
                    >
                      Service Name
                    </label>
                    <input
                      id='customServiceName'
                      type='text'
                      value={customServiceName}
                      onChange={e => setCustomServiceName(e.target.value)}
                      placeholder='e.g., Custom embroidery, Special hemming...'
                      className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base'
                    />
                  </div>

                  <div className='w-40'>
                    <label
                      htmlFor='customServicePrice'
                      className='block text-sm font-medium text-gray-700 mb-2'
                    >
                      Price ($)
                    </label>
                    <input
                      id='customServicePrice'
                      type='number'
                      step='0.01'
                      min='0'
                      value={customServicePrice}
                      onChange={e => setCustomServicePrice(e.target.value)}
                      placeholder='0.00'
                      className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base'
                    />
                  </div>
                </div>

                {/* Compact Garment List */}
                {data.length > 0 && (
                  <div>
                    <h4 className='font-medium text-gray-900 text-base mb-4'>
                      Add to garments:
                    </h4>
                    <div className='space-y-4'>
                      {data.map((garment, garmentIndex) => (
                        <div
                          key={garmentIndex}
                          className='bg-gray-50 rounded-lg p-5'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-4 flex-1 min-w-0'>
                              <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0'>
                                <span className='text-base'>👕</span>
                              </div>
                              <div className='min-w-0 flex-1'>
                                <h5 className='font-medium text-base text-gray-900'>
                                  {garment.type}
                                </h5>
                                <p className='text-sm text-gray-500'>
                                  #{garment.labelCode}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => addCustomService(garmentIndex)}
                              disabled={
                                !customServiceName.trim() ||
                                !customServicePrice.trim()
                              }
                              className='px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0'
                            >
                              Add Service
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-16'>
                {getServicesByCategory(activeTab).map(service => (
                  <div
                    key={service.id}
                    className='bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 flex flex-col h-full'
                  >
                    <div className='flex-1'>
                      <h3 className='font-medium text-gray-900 text-xs leading-tight mb-1 line-clamp-2'>
                        {service.name}
                      </h3>
                      <p className='text-xs text-gray-500 mb-2'>Fixed</p>
                      <div className='text-right'>
                        <div className='text-sm font-bold text-green-600'>
                          {formatCurrency(service.base_price_cents)}
                        </div>
                      </div>
                    </div>

                    {data.length > 0 && (
                      <div className='mt-auto pt-2'>
                        {data.map((garment, garmentIndex) => {
                          const garmentService = garment.services.find(
                            s => s.serviceId === service.id
                          );
                          const isAdded = !!garmentService;

                          return (
                            <button
                              key={garmentIndex}
                              onClick={() => {
                                if (isAdded) {
                                  updateServiceQuantity(
                                    garmentIndex,
                                    service.id,
                                    (garmentService?.qty || 0) + 1
                                  );
                                } else {
                                  addServiceToGarment(garmentIndex, service.id);
                                }
                              }}
                              className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                                isAdded
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {isAdded
                                ? `✓ Add (${garmentService?.qty || 0})`
                                : `+ Add`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {getServicesByCategory(activeTab).length === 0 && (
                  <div className='text-center py-12'>
                    <div className='text-6xl mb-4'>📝</div>
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                      No services available
                    </h3>
                    <p className='text-gray-500'>
                      Try selecting a different category
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* iOS-style Selected Services Summary - Also Scrollable */}
        <div className='w-80 bg-white border-l border-gray-200 flex flex-col h-full'>
          <div className='p-4 border-b border-gray-200 flex-shrink-0'>
            <h3 className='font-semibold text-gray-900'>Selected Services</h3>
            <div className='mt-2 p-3 bg-green-50 rounded-lg'>
              <div className='flex justify-between items-center'>
                <span className='font-semibold text-gray-900'>Total</span>
                <span className='text-xl font-bold text-green-600'>
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>
          </div>

          <div className='flex-1 overflow-y-auto min-h-0'>
            {data.some(garment => garment.services.length > 0) ? (
              <div className='p-4 space-y-4'>
                {data.map((garment, garmentIndex) => {
                  if (garment.services.length === 0) return null;

                  return (
                    <div
                      key={garmentIndex}
                      className='bg-gray-50 rounded-lg p-3'
                    >
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                          <span className='text-sm'>👕</span>
                        </div>
                        <div>
                          <h4 className='font-medium text-sm text-gray-900'>
                            {garment.type}
                          </h4>
                          <p className='text-xs text-gray-500'>
                            #{garment.labelCode}
                          </p>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        {garment.services.map(garmentService => {
                          const service = services.find(
                            s => s.id === garmentService.serviceId
                          );
                          const isCustomService =
                            garmentService.serviceId.startsWith('custom-');

                          if (!service && !isCustomService) return null;

                          return (
                            <div
                              key={garmentService.serviceId}
                              className='bg-white rounded-lg p-3 border border-gray-200'
                            >
                              <div className='flex items-start justify-between mb-2'>
                                <div className='flex-1 pr-2'>
                                  <h5 className='font-medium text-sm text-gray-900'>
                                    {isCustomService
                                      ? garmentService.customServiceName
                                      : service?.name}
                                  </h5>
                                  <p className='text-xs text-gray-500'>
                                    {formatCurrency(
                                      garmentService.customPriceCents ||
                                        service?.base_price_cents ||
                                        0
                                    )}{' '}
                                    each
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    removeServiceFromGarment(
                                      garmentIndex,
                                      garmentService.serviceId
                                    )
                                  }
                                  className='text-gray-400 hover:text-red-500 transition-colors'
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
                                      d='M6 18L18 6M6 6l12 12'
                                    />
                                  </svg>
                                </button>
                              </div>

                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                  <button
                                    onClick={() =>
                                      updateServiceQuantity(
                                        garmentIndex,
                                        garmentService.serviceId,
                                        garmentService.qty - 1
                                      )
                                    }
                                    className='w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors'
                                  >
                                    <svg
                                      className='w-3 h-3'
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M20 12H4'
                                      />
                                    </svg>
                                  </button>
                                  <span className='w-8 text-center font-medium text-sm'>
                                    {garmentService.qty}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateServiceQuantity(
                                        garmentIndex,
                                        garmentService.serviceId,
                                        garmentService.qty + 1
                                      )
                                    }
                                    className='w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors'
                                  >
                                    <svg
                                      className='w-3 h-3'
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                                      />
                                    </svg>
                                  </button>
                                </div>
                                <div className='font-semibold text-gray-900'>
                                  {formatCurrency(
                                    getServiceTotal(service, garmentService)
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='p-8 text-center'>
                <div className='text-6xl mb-4'>🛍️</div>
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  No services selected
                </h3>
                <p className='text-gray-500 text-sm'>
                  Choose services from the list to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
