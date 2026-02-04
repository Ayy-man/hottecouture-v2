'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PipelineSelector } from '@/components/intake/pipeline-selector';
import { ClientStep } from '@/components/intake/client-step';
import { GarmentServicesStep } from '@/components/intake/garment-services-step';
import { PricingStep } from '@/components/intake/pricing-step';
import { AssignmentStep, AssignmentItem } from '@/components/intake/assignment-step';
import { OrderSummary } from '@/components/intake/order-summary';
import { IntakeRequest, IntakeResponse, MeasurementsData } from '@/lib/dto';
import { usePricing } from '@/lib/pricing/usePricing';
import { MuralBackground } from '@/components/ui/mural-background';

type IntakeStep =
  | 'pipeline'
  | 'client'
  | 'garment-services'  // Merged: replaces 'garments' and 'services'
  | 'pricing'
  | 'assignment'
  | 'summary';

interface IntakeFormData {
  client: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string; // Required for GHL sync
    language: 'fr' | 'en';
    newsletter_consent: boolean;
    preferred_contact: 'sms' | 'email';
    notes?: string;
  } | null;
  measurements?: MeasurementsData | undefined;
  garments: Array<{
    type: string;
    garment_type_id?: string | null;
    color?: string;
    brand?: string;
    notes?: string;
    labelCode: string;
    services: Array<{
      serviceId: string;
      serviceName?: string; // For display in assignment step
      qty: number;
      customPriceCents?: number;
      assignedSeamstressId?: string | null; // Per-item assignment
      estimatedMinutes?: number; // User-provided time estimate
    }>;
  }>;
  order: {
    type: 'alteration' | 'custom';
    due_date?: string;
    rush: boolean;
    rush_fee_type?: 'small' | 'large';
    assigned_to?: string; // Deprecated: kept for backward compatibility
    deposit_required?: boolean;
    deposit_amount_cents?: number;
  };
}

const initialFormData: IntakeFormData = {
  client: null,
  measurements: undefined,
  garments: [],
  order: {
    type: 'alteration',
    rush: false,
    rush_fee_type: 'small',
  },
};

export default function IntakePage() {
  const [currentStep, setCurrentStep] = useState<IntakeStep>('client');
  const [formData, setFormData] = useState<IntakeFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<IntakeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [totalOverrideCents, setTotalOverrideCents] = useState<number | null>(null);

  usePricing({
    initialItems: [],
    isRush: formData.order.rush,
  });

  const steps: Array<{ key: IntakeStep; title: string; description: string }> =
    useMemo(
      () => [
        {
          key: 'client',
          title: 'Client',
          description: 'Client information and contact details',
        },
        {
          key: 'pipeline',
          title: 'Service Type',
          description: 'Choose alteration or custom design',
        },
        {
          key: 'garment-services',
          title: 'Articles',
          description: 'Add garments, services, and assign',
        },
        {
          key: 'pricing',
          title: 'Pricing & Due Date',
          description: 'Final pricing and due date',
        },
        {
          key: 'assignment',
          title: 'Assignment',
          description: 'Review assignments',
        },
      ],
      []
    );

  const updateFormData = useCallback((updates: Partial<IntakeFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Compute assignment items from garments and services
  const assignmentItems: AssignmentItem[] = useMemo(() => {
    const items: AssignmentItem[] = [];
    formData.garments.forEach((garment, garmentIndex) => {
      garment.services.forEach((service, serviceIndex) => {
        items.push({
          garmentIndex,
          garmentType: garment.type,
          serviceIndex,
          serviceName: service.serviceName || 'Service',
          assignedSeamstressId: service.assignedSeamstressId || null,
        });
      });
    });
    return items;
  }, [formData.garments]);

  // Handle per-item assignment change
  const handleItemAssignmentChange = useCallback(
    (garmentIndex: number, serviceIndex: number, seamstressId: string | null) => {
      setFormData(prev => {
        const newGarments = [...prev.garments];
        const garment = newGarments[garmentIndex];
        const existingService = garment?.services[serviceIndex];
        if (garment && existingService) {
          garment.services = [...garment.services];
          const updatedService: typeof existingService = {
            serviceId: existingService.serviceId,
            qty: existingService.qty,
            assignedSeamstressId: seamstressId,
          };
          if (existingService.serviceName !== undefined) {
            updatedService.serviceName = existingService.serviceName;
          }
          if (existingService.customPriceCents !== undefined) {
            updatedService.customPriceCents = existingService.customPriceCents;
          }
          if (existingService.estimatedMinutes !== undefined) {
            updatedService.estimatedMinutes = existingService.estimatedMinutes;
          }
          garment.services[serviceIndex] = updatedService;
        }
        return { ...prev, garments: newGarments };
      });
    },
    []
  );

  const nextStep = useCallback(() => {
    const stepIndex = steps.findIndex(step => step.key === currentStep);
    if (stepIndex < steps.length - 1) {
      const nextStep = steps[stepIndex + 1];
      if (nextStep) {
        setCurrentStep(nextStep.key as IntakeStep);
      }
    }
  }, [currentStep, steps]);

  const prevStep = useCallback(() => {
    const stepIndex = steps.findIndex(step => step.key === currentStep);
    if (stepIndex > 0) {
      const prevStep = steps[stepIndex - 1];
      if (prevStep) {
        setCurrentStep(prevStep.key as IntakeStep);
      }
    }
  }, [currentStep, steps]);

  const handleSubmit = async () => {
    if (!formData.client) {
      setError('Client information is required');
      return;
    }

    if (formData.garments.length === 0) {
      setError('At least one garment is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert form data to API format
      const intakeRequest: IntakeRequest & { total_override_cents?: number } = {
        client: formData.client,
        order: {
          type: formData.order.type,
          priority: 'normal' as const,
          due_date: formData.order.due_date,
          rush: formData.order.rush,
          rush_fee_type: formData.order.rush_fee_type,
          deposit_required: formData.order.deposit_required,
          deposit_amount_cents: formData.order.deposit_amount_cents,
        },
        measurements: formData.measurements,
        garments: formData.garments.map(garment => ({
          type: garment.type,
          garment_type_id: garment.garment_type_id,
          color: garment.color,
          brand: garment.brand,
          notes: garment.notes,
          services: garment.services,
        })),
        ...(totalOverrideCents ? { total_override_cents: totalOverrideCents } : {}),
      };

      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(intakeRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit order');
      }

      const result: IntakeResponse = await response.json();
      setOrderResult(result);
      setCurrentStep('summary');

      // Auto-print labels if enabled
      if (autoPrint && result.orderId) {
        window.open(`/labels/${result.orderId}`, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'client':
        return (
          <ClientStep
            data={formData.client as any}
            measurements={formData.measurements}
            onUpdate={client => updateFormData({ client: client as any })}
            onMeasurementsUpdate={measurements => updateFormData({ measurements })}
            onNext={nextStep}
          />
        );
      case 'pipeline':
        return (
          <PipelineSelector
            selectedPipeline={formData.order.type}
            onPipelineChange={type =>
              updateFormData({ order: { ...formData.order, type } })
            }
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 'garment-services':
        return (
          <GarmentServicesStep
            data={formData.garments}
            onUpdate={garments => updateFormData({ garments })}
            onNext={nextStep}
            onPrev={prevStep}
            orderType={formData.order.type}
            client={formData.client}
            onChangeCustomer={() => setCurrentStep('client')}
          />
        );
      case 'pricing':
        return (
          <PricingStep
            data={formData.order}
            garments={formData.garments}
            onUpdate={order => updateFormData({ order })}
            onNext={nextStep}
            onPrev={prevStep}
            isSubmitting={false}
            autoPrint={autoPrint}
            onAutoPrintChange={setAutoPrint}
            totalOverrideCents={totalOverrideCents}
            onTotalOverrideChange={setTotalOverrideCents}
          />
        );
      case 'assignment':
        return (
          <AssignmentStep
            items={assignmentItems}
            onItemAssignmentChange={handleItemAssignmentChange}
            onNext={handleSubmit}
            onPrev={prevStep}
            isSubmitting={isSubmitting}
          />
        );
      case 'summary':
        return (
          <OrderSummary
            order={orderResult}
            onPrintLabels={() => {
              if (orderResult) {
                window.open(`/labels/${orderResult.orderId}`, '_blank');
              }
            }}
            onNewOrder={() => {
              setFormData(initialFormData);
              setOrderResult(null);
              setCurrentStep('client');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <MuralBackground useMuralBackground={true} opacity={0.08}>
      <div className='container mx-auto px-4 py-2 max-w-7xl flex h-full min-h-0 flex-col lg:flex-row gap-3'>
        {/* Progress Indicator - Horizontal on mobile, Vertical sidebar on desktop */}
        {/* Mobile: Compact horizontal progress bar */}
        <div className='lg:hidden flex-shrink-0 mb-3'>
          <div className='bg-white rounded-xl shadow-sm border border-border p-3'>
            <div className='flex items-center justify-between gap-2'>
              {steps.map((step, index) => {
                const isActive = step.key === currentStep;
                const isCompleted =
                  steps.findIndex(s => s.key === currentStep) > index;
                const currentStepIndex = steps.findIndex(s => s.key === currentStep);

                return (
                  <div key={step.key} className='flex items-center flex-1'>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0 ${isActive
                        ? 'bg-gradient-to-r from-primary-500 to-accent-clay text-white shadow-md scale-110'
                        : isCompleted
                          ? 'bg-gradient-to-r from-secondary-500 to-accent-olive text-white'
                          : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {isCompleted ? (
                        <svg
                          className='w-4 h-4'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-1 rounded-full transition-colors ${index < currentStepIndex ? 'bg-secondary-400' : 'bg-muted'
                          }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Current step label */}
            <p className='text-center text-sm font-medium text-text mt-2'>
              {steps.find(s => s.key === currentStep)?.title}
            </p>
          </div>
        </div>

        {/* Desktop: Vertical sidebar */}
        <div className='hidden lg:block flex-shrink-0 lg:w-16'>
          <div className='bg-white rounded-lg shadow-sm border border-border p-2'>
            <div className='flex flex-col items-center gap-2'>
              {steps.map((step, index) => {
                const isActive = step.key === currentStep;
                const isCompleted =
                  steps.findIndex(s => s.key === currentStep) > index;

                return (
                  <div key={step.key} className='flex flex-col items-center'>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold touch-manipulation transition-all duration-300 flex-shrink-0 ${isActive
                        ? 'bg-gradient-to-r from-primary-500 to-accent-clay text-white shadow-lg'
                        : isCompleted
                          ? 'bg-gradient-to-r from-secondary-500 to-accent-olive text-white'
                          : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {isCompleted ? (
                        <svg
                          className='w-4 h-4'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className='flex items-center mt-1 mb-1'>
                        <div
                          className={`w-0.5 h-6 ${isCompleted ? 'bg-green-400' : 'bg-muted'
                            }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className='flex-1 min-w-0 flex flex-col'>
          {/* Error display */}
          {error && (
            <div className='mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex-shrink-0'>
              <p className='text-red-800 text-sm'>{error}</p>
            </div>
          )}

          {/* Step content - One Page App */}
          <Card className='shadow-lg border-0 bg-white/95 backdrop-blur-sm flex-1 min-h-0 overflow-hidden'>
            <CardContent className='p-0 h-full overflow-y-auto'>
              {renderStep()}
            </CardContent>
          </Card>
        </div>
      </div>
    </MuralBackground>
  );
}
