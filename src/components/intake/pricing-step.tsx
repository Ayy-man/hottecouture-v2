'use client';

import { useState, useEffect } from 'react';
// import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { usePricing } from '@/lib/pricing/usePricing';
import { formatCurrency } from '@/lib/pricing/client';
import { RushOrderTimeline } from '@/components/rush-orders/rush-indicator';

interface OrderData {
  type: 'alteration' | 'custom';
  due_date?: string;
  rush: boolean;
  rush_fee_type?: 'small' | 'large'; // 'small' = $30 express service, 'large' = $60 express service for suits & evening dresses
  deposit_required?: boolean;
}

interface GarmentData {
  type: string;
  services: Array<{
    serviceId: string;
    qty: number;
    customPriceCents?: number;
  }>;
}

interface PricingStepProps {
  data: OrderData;
  garments: GarmentData[];
  onUpdate: (order: OrderData) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
}

export function PricingStep({
  data,
  garments,
  onUpdate,
  onNext,
  onPrev,
  isSubmitting,
}: PricingStepProps) {
  // const t = useTranslations('intake.pricing')
  const [calculation, setCalculation] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);

  // Fetch services for display names
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    fetchServices();
  }, []);

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || `Service ${serviceId}`;
  };

  usePricing({
    isRush: data.rush,
  });

  useEffect(() => {
    // Calculate pricing based on actual garments and services
    const calculatePricing = async () => {
      let subtotal_cents = 0;

      console.log('🔍 PricingStep: garments data:', garments);

      // Calculate from garments and their services
      for (const garment of garments || []) {
        console.log(`🔍 PricingStep: garment:`, garment);
        for (const service of garment.services || []) {
          console.log(`🔍 PricingStep: service:`, service);

          // Try to get the service from the loaded services list first
          let baseService = services.find(s => s.id === service.serviceId);
          let basePrice = baseService?.base_price_cents || 5000;

          // If not found in loaded services, try to fetch from API
          if (!baseService) {
            try {
              const response = await fetch(`/api/services`);
              if (response.ok) {
                const data = await response.json();
                baseService = data.services?.find(
                  (s: any) => s.id === service.serviceId
                );
                basePrice = baseService?.base_price_cents || 5000;
                console.log(
                  `🔍 PricingStep: fetched service from API:`,
                  baseService
                );
              }
            } catch (error) {
              console.error('Error fetching service from API:', error);
            }
          }

          const servicePrice = service.customPriceCents || basePrice;

          console.log(`🔍 PricingStep: baseService:`, baseService);
          console.log(
            `🔍 PricingStep: basePrice: ${basePrice}, customPrice: ${service.customPriceCents}, finalPrice: ${servicePrice}, qty: ${service.qty}`
          );
          subtotal_cents += servicePrice * service.qty;
        }
      }

      console.log('🔍 PricingStep: calculated subtotal_cents:', subtotal_cents);

      const rush_fee_cents = data.rush
        ? data.rush_fee_type === 'large'
          ? 6000
          : 3000
        : 0; // $30 or $60 if rush

      // Calculate taxable amount (subtotal + rush fee)
      const taxable_amount = subtotal_cents + rush_fee_cents;

      // Calculate TPS (GST) - 5% on subtotal + rush fee
      const tps_cents = Math.round(taxable_amount * 0.05);

      // Calculate TVQ (QST) - 9.975% on subtotal + rush fee
      const tvq_cents = Math.round(taxable_amount * 0.09975);

      // Calculate total tax (TPS + TVQ) for backward compatibility
      const tax_cents = tps_cents + tvq_cents;

      const total_cents = subtotal_cents + rush_fee_cents + tax_cents;

      return {
        subtotal_cents,
        rush_fee_cents,
        tax_cents,
        tps_cents,
        tvq_cents,
        total_cents,
      };
    };

    calculatePricing().then(calculation => {
      setCalculation(calculation);
    });
  }, [data.rush, data.rush_fee_type, garments, services]);

  const handleInputChange = (field: keyof OrderData, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  const getMinDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const calculateDueDate = () => {
    const today = new Date();
    let workingDays = 0;
    const currentDate = new Date(today);

    // Calculate 10 working days (excluding weekends)
    while (workingDays < 10) {
      currentDate.setDate(currentDate.getDate() + 1);
      // Check if it's not a weekend (0 = Sunday, 6 = Saturday)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        workingDays++;
      }
    }

    return currentDate.toISOString().split('T')[0];
  };

  // Set default due date when component mounts if not already set
  useEffect(() => {
    if (!data.due_date) {
      const defaultDueDate = calculateDueDate();
      handleInputChange('due_date', defaultDueDate);
    }
  }, []); // Empty dependency array means this runs once on mount

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
            Pricing & Due Date
          </h2>
          <p className='text-sm text-gray-500'>Final pricing and due date</p>
        </div>

        <Button
          onClick={onNext}
          disabled={isSubmitting}
          className='bg-gradient-to-r from-secondary-500 to-accent-olive hover:from-secondary-600 hover:to-accent-olive text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSubmitting ? 'Processing...' : 'Submit Order 🚀'}
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-4 space-y-4'>
          {/* Due Date */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>Due Date</CardTitle>
              <CardDescription className='text-sm'>
                When should this order be completed? (Default: 10 working days
                from today)
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <input
                type='date'
                value={data.due_date || ''}
                onChange={e => handleInputChange('due_date', e.target.value)}
                min={getMinDate()}
                className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] touch-manipulation'
              />
            </CardContent>
          </Card>

          {/* Rush Order */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>Express Service</CardTitle>
              <CardDescription className='text-sm'>
                Express services are completed faster but include additional
                fees
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='space-y-3'>
                <div className='space-y-3'>
                  <div className='flex items-center space-x-3'>
                    <input
                      type='checkbox'
                      id='rush'
                      checked={data.rush}
                      onChange={e =>
                        handleInputChange('rush', e.target.checked)
                      }
                      className='w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary touch-manipulation'
                    />
                    <label htmlFor='rush' className='text-sm font-medium'>
                      This is an express service
                    </label>
                  </div>

                  {data.rush && (
                    <div className='ml-8 space-y-2'>
                      <div>
                        <label className='text-xs font-medium text-gray-700 mb-2 block'>
                          Express Service Type
                        </label>
                        <div className='space-y-2'>
                          <label className='flex items-center space-x-2 cursor-pointer'>
                            <input
                              type='radio'
                              name='rush_fee_type'
                              value='small'
                              checked={
                                data.rush_fee_type === 'small' ||
                                data.rush_fee_type === undefined
                              }
                              onChange={e =>
                                handleInputChange(
                                  'rush_fee_type',
                                  e.target.value
                                )
                              }
                              className='w-4 h-4 text-primary border-gray-300 focus:ring-primary touch-manipulation'
                            />
                            <span className='text-xs'>
                              Express Service - $30.00 (1-2 days faster)
                            </span>
                          </label>
                          <label className='flex items-center space-x-2 cursor-pointer'>
                            <input
                              type='radio'
                              name='rush_fee_type'
                              value='large'
                              checked={data.rush_fee_type === 'large'}
                              onChange={e =>
                                handleInputChange(
                                  'rush_fee_type',
                                  e.target.value
                                )
                              }
                              className='w-4 h-4 text-primary border-gray-300 focus:ring-primary touch-manipulation'
                            />
                            <span className='text-xs'>
                              Express Service for Suits & Evening Dresses -
                              $60.00 (3+ days faster)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {data.rush && calculation && (
                  <div className='space-y-4'>
                    <RushOrderTimeline
                      isRush={data.rush}
                      orderType={data.type}
                      estimatedDays={data.type === 'alteration' ? 3 : 14}
                    />

                    <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
                      <p className='text-red-800 font-medium text-sm'>
                        ⚡ Express services are prioritized and completed faster
                        than regular orders.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Garments & Services Summary */}
          {garments && garments.length > 0 && (
            <Card className='bg-gray-50 border-gray-200'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-gray-900 text-lg'>
                  Order Items
                </CardTitle>
                <CardDescription className='text-sm'>
                  Review the garments and services for this order
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                {garments.map((garment, index) => (
                  <div
                    key={index}
                    className='mb-3 p-3 bg-white rounded-lg border'
                  >
                    <div className='font-semibold text-gray-900 text-sm mb-2'>
                      {garment.type}
                    </div>
                    {garment.services.map((service, sIndex) => {
                      // Use the same logic as the calculation
                      const baseService = services.find(
                        s => s.id === service.serviceId
                      );
                      const basePrice = baseService?.base_price_cents || 5000;
                      const servicePrice =
                        service.customPriceCents || basePrice;

                      return (
                        <div
                          key={sIndex}
                          className='ml-3 text-xs text-gray-700 mb-1'
                        >
                          • {getServiceName(service.serviceId)}: Qty{' '}
                          {service.qty} × ${(servicePrice / 100).toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pricing Summary */}
          {calculation && (
            <Card className='bg-primary/5 border-primary/20'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-primary text-lg'>
                  Order Summary
                </CardTitle>
                <CardDescription className='text-sm'>
                  Review the pricing breakdown for this order
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-sm'>Subtotal:</span>
                    <span className='text-sm font-medium'>
                      {formatCurrency(calculation.subtotal_cents)}
                    </span>
                  </div>

                  {data.rush && (
                    <div className='flex justify-between'>
                      <span className='text-sm'>Express Service Fee:</span>
                      <span className='text-sm font-medium'>
                        {formatCurrency(calculation.rush_fee_cents)}
                      </span>
                    </div>
                  )}

                  <div className='flex justify-between'>
                    <span className='text-sm'>TPS: Canada tax</span>
                    <span className='text-sm font-medium'>
                      {formatCurrency(calculation.tps_cents || 0)}
                    </span>
                  </div>

                  <div className='flex justify-between'>
                    <span className='text-sm'>TVQ: Québec tax</span>
                    <span className='text-sm font-medium'>
                      {formatCurrency(calculation.tvq_cents || 0)}
                    </span>
                  </div>

                  <div className='border-t border-primary/20 pt-2'>
                    <div className='flex justify-between'>
                      <span className='text-lg font-bold'>Total:</span>
                      <span className='text-xl font-bold text-primary'>
                        {formatCurrency(calculation.total_cents)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
