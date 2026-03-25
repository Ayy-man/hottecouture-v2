'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePricing } from '@/lib/pricing/usePricing';
import { formatCurrency } from '@/lib/pricing/client';
import { RushOrderTimeline } from '@/components/rush-orders/rush-indicator';

interface OrderData {
  type: 'alteration' | 'custom';
  due_date?: string;
  rush: boolean;
  rush_fee_type?: 'small' | 'large'; // 'small' = $30 express service, 'large' = $60 express service for suits & evening dresses
  deposit_required?: boolean;
  deposit_amount_cents?: number;
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
  autoPrint?: boolean;
  onAutoPrintChange?: (enabled: boolean) => void;
}

export function PricingStep({
  data,
  garments,
  onUpdate,
  onNext,
  onPrev,
  isSubmitting,
  autoPrint = true,
  onAutoPrintChange,
}: PricingStepProps) {
  const t = useTranslations('intake.pricing');
  const tc = useTranslations('common');
  const ts = useTranslations('intake.submit');
  const [calculation, setCalculation] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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

  const getServicePrice = (baseService: any, qty: number, customPriceCents?: number): number => {
    if (customPriceCents) return customPriceCents * qty;
    if (baseService?.pricing_model === 'hourly') {
      return (baseService.hourly_rate_cents || 3500) * qty;
    }
    return (baseService?.base_price_cents || 0) * qty;
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

          const baseService = services.find(s => s.id === service.serviceId);
          const serviceTotal = getServicePrice(baseService, service.qty, service.customPriceCents);
          subtotal_cents += serviceTotal;
        }
      }

      console.log('🔍 PricingStep: calculated subtotal_cents:', subtotal_cents);

      const rush_fee_cents = data.rush
        ? data.rush_fee_type === 'large'
          ? 6000
          : 3000
        : 0;

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

    calculatePricing().then(setCalculation);
  }, [data.rush, data.rush_fee_type, garments, services]);

  const handleInputChange = (field: keyof OrderData, value: any) => {
    onUpdate({ ...data, [field]: value });
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
      <div className='flex items-center justify-between px-1 py-3 border-b border-border bg-white flex-shrink-0'>
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
          <span className='font-medium'>{tc('previous')}</span>
        </Button>

        <div className='flex-1 text-center'>
          <h2 className='text-lg font-semibold text-foreground'>
            {t('title')}
          </h2>
          <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
        </div>

        <Button
          onClick={onNext}
          disabled={isSubmitting}
          className='bg-gradient-to-r from-secondary-500 to-accent-olive hover:from-secondary-600 hover:to-accent-olive text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSubmitting ? ts('processing') : ts('submitOrder')}
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-4 pb-24 md:pb-4 space-y-4'>
          {/* Due Date */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>{t('dueDate')}</CardTitle>
              <CardDescription className='text-sm'>
                {t('dueDateDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px] touch-manipulation text-left flex items-center justify-between"
                  >
                    <span className={data.due_date ? 'text-foreground' : 'text-muted-foreground'}>
                      {data.due_date
                        ? format(parseISO(data.due_date), 'PPP', { locale: fr })
                        : t('chooseDatePlaceholder')}
                    </span>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data.due_date ? parseISO(data.due_date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        handleInputChange('due_date', format(date, 'yyyy-MM-dd'));
                        setDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(0, 0, 0, 0);
                      return date < tomorrow;
                    }}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Rush Order */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>{t('rushOrder')}</CardTitle>
              <CardDescription className='text-sm'>
                {t('rushDescription')}
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
                      className='w-5 h-5 text-primary border-border rounded focus:ring-primary touch-manipulation'
                    />
                    <label htmlFor='rush' className='text-sm font-medium'>
                      {t('isRush')}
                    </label>
                  </div>

                  {data.rush && (
                    <div className='ml-8 space-y-2'>
                      <div>
                        <label className='text-xs font-medium text-muted-foreground mb-2 block'>
                          {t('rushTypeLabel')}
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
                              onChange={e => handleInputChange('rush_fee_type', e.target.value)}
                              className='w-4 h-4 text-primary border-border focus:ring-primary touch-manipulation'
                            />
                            <span className='text-xs'>
                              {t('rushSmallLabel')}
                            </span>
                          </label>
                          <label className='flex items-center space-x-2 cursor-pointer'>
                            <input
                              type='radio'
                              name='rush_fee_type'
                              value='large'
                              checked={data.rush_fee_type === 'large'}
                              onChange={e => handleInputChange('rush_fee_type', e.target.value)}
                              className='w-4 h-4 text-primary border-border focus:ring-primary touch-manipulation'
                            />
                            <span className='text-xs'>
                              {t('rushLargeLabel')}
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
                      estimatedDays={
                        data.rush_fee_type === 'large'
                          ? (data.type === 'alteration' ? 1 : 4)   // 3-4 jours plus tôt
                          : (data.type === 'alteration' ? 2 : 10)  // 1-3 jours plus tôt (small/default)
                      }
                    />

                    <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
                      <p className='text-red-800 font-medium text-sm'>
                        {t('rushNote')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Garments & Services Summary */}
          {garments && garments.length > 0 && (
            <Card className='bg-muted/50 border-border'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-foreground text-lg'>
                  {t('items')}
                </CardTitle>
                <CardDescription className='text-sm'>
                  {t('itemsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                {garments.map((garment, index) => (
                  <div
                    key={index}
                    className='mb-3 p-3 bg-white rounded-lg border'
                  >
                    <div className='font-semibold text-foreground text-sm mb-2'>
                      {garment.type}
                    </div>
                    {garment.services.map((service, sIndex) => {
                      const baseService = services.find(
                        s => s.id === service.serviceId
                      );
                      const unitPrice = service.customPriceCents 
                        || (baseService?.pricing_model === 'hourly' 
                          ? baseService?.hourly_rate_cents 
                          : baseService?.base_price_cents) 
                        || 0;
                      const isHourly = baseService?.pricing_model === 'hourly';

                      return (
                        <div
                          key={sIndex}
                          className='ml-3 text-xs text-muted-foreground mb-1'
                        >
                          • {getServiceName(service.serviceId)}: {isHourly ? `${service.qty}h` : `${t('qty')} ${service.qty}`} × ${(unitPrice / 100).toFixed(2)}{isHourly ? '/h' : ''}
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
                  {t('orderSummary')}
                </CardTitle>
                <CardDescription className='text-sm'>
                  {t('summaryDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-sm'>{t('subtotal')}:</span>
                    <span className='text-sm font-medium'>
                      {formatCurrency(calculation.subtotal_cents)}
                    </span>
                  </div>

                  {data.rush && (
                    <div className='flex justify-between'>
                      <span className='text-sm'>{t('rushFee')}:</span>
                      <span className='text-sm font-medium'>
                        {formatCurrency(calculation.rush_fee_cents)}
                      </span>
                    </div>
                  )}

                  <div className='flex justify-between'>
                    <span className='text-sm'>{t('tpsLabel')}</span>
                    <span className='text-sm font-medium'>
                      {formatCurrency(calculation.tps_cents || 0)}
                    </span>
                  </div>

                  <div className='flex justify-between'>
                    <span className='text-sm'>{t('tvqLabel')}</span>
                    <span className='text-sm font-medium'>
                      {formatCurrency(calculation.tvq_cents || 0)}
                    </span>
                  </div>

                  <div className='border-t border-primary/20 pt-2'>
                    <div className='flex justify-between items-center'>
                      <span className='text-lg font-bold'>{t('total')}:</span>
                      <span className='text-xl font-bold text-primary'>
                        {formatCurrency(calculation.total_cents)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deposit Entry - Custom orders only */}
          {data.type === 'custom' && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-lg'>{t('deposit')}</CardTitle>
                <CardDescription className='text-sm'>
                  {t('depositDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='space-y-3'>
                  <div className='flex items-center space-x-3'>
                    <input
                      type='checkbox'
                      id='deposit_required'
                      checked={data.deposit_required || false}
                      onChange={e =>
                        handleInputChange('deposit_required', e.target.checked)
                      }
                      className='w-5 h-5 text-primary border-border rounded focus:ring-primary touch-manipulation'
                    />
                    <label htmlFor='deposit_required' className='text-sm font-medium'>
                      {t('deposit')}
                    </label>
                  </div>

                  {data.deposit_required && (
                    <div className='ml-8'>
                      <label className='text-xs font-medium text-muted-foreground mb-1 block'>
                        {t('depositAmountLabel')}
                      </label>
                      <div className='flex items-center gap-2'>
                        <span className='text-muted-foreground'>$</span>
                        <input
                          type='text'
                          inputMode='numeric'
                          pattern='[0-9]*'
                          value={data.deposit_amount_cents ? String(Math.round(data.deposit_amount_cents / 100)) : ''}
                          onChange={e => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            const cents = value ? parseInt(value, 10) * 100 : 0;
                            handleInputChange('deposit_amount_cents', cents);
                          }}
                          className='w-32 px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent'
                          placeholder='0'
                        />
                      </div>
                      {calculation && data.deposit_amount_cents && (
                        <p className='text-xs text-muted-foreground mt-2'>
                          {t('remainingBalance')} {formatCurrency(calculation.total_cents - data.deposit_amount_cents)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-Print Toggle */}
          {onAutoPrintChange && (
            <Card>
              <CardContent className='py-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <span className='text-sm font-medium'>{t('autoPrint')}</span>
                    <p className='text-xs text-muted-foreground'>
                      {t('autoPrintDescription')}
                    </p>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={autoPrint}
                      onChange={e => onAutoPrintChange(e.target.checked)}
                      className='sr-only peer'
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
