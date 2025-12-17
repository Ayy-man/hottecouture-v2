'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PipelineSelector } from '@/components/intake/pipeline-selector';
import { ClientStep } from '@/components/intake/client-step';
import { GarmentsStep } from '@/components/intake/garments-step';
import { ServicesStepNew } from '@/components/intake/services-step-new';
import { PricingStep } from '@/components/intake/pricing-step';
import { AssignmentStep } from '@/components/intake/assignment-step';
import { OrderSummary } from '@/components/intake/order-summary';
import { IntakeRequest, IntakeResponse } from '@/lib/dto';
import { usePricing } from '@/lib/pricing/usePricing';
import { MuralBackground } from '@/components/ui/mural-background';

type IntakeStep =
  | 'pipeline'
  | 'client'
  | 'garments'
  | 'services'
  | 'pricing'
  | 'assignment'
  | 'summary';

interface IntakeFormData {
  client: {
    first_name: string;
    last_name: string;
    phone: string; // Now required
    email?: string;
    language: 'fr' | 'en';
    newsletter_consent: boolean;
    preferred_contact: 'sms' | 'email';
    notes?: string;
  } | null;
  garments: Array<{
    type: string;
    garment_type_id?: string | null;
    color?: string;
    brand?: string;
    notes?: string;
    labelCode: string;
    services: Array<{
      serviceId: string;
      qty: number;
      customPriceCents?: number;
    }>;
  }>;
  order: {
    type: 'alteration' | 'custom';
    due_date?: string;
    rush: boolean;
    rush_fee_type?: 'small' | 'large';
    assigned_to?: string;
    deposit_required?: boolean;
    deposit_amount_cents?: number;
  };
}

const initialFormData: IntakeFormData = {
  client: null,
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
          key: 'garments',
          title: 'Garments',
          description: 'Add garments and take photos',
        },
        {
          key: 'services',
          title: 'Services',
          description: 'Select services and pricing',
        },
        {
          key: 'pricing',
          title: 'Pricing & Due Date',
          description: 'Final pricing and due date',
        },
        {
          key: 'assignment',
          title: 'Assignment',
          description: 'Assign to seamstress',
        },
      ],
      []
    );

  const updateFormData = useCallback((updates: Partial<IntakeFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

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
      const intakeRequest: IntakeRequest = {
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
        garments: formData.garments.map(garment => ({
          type: garment.type,
          garment_type_id: garment.garment_type_id,
          color: garment.color,
          brand: garment.brand,
          notes: garment.notes,
          services: garment.services,
        })),
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
            onUpdate={client => updateFormData({ client: client as any })}
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
      case 'garments':
        return (
          <GarmentsStep
            data={formData.garments}
            onUpdate={garments => updateFormData({ garments })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 'services':
        return (
          <ServicesStepNew
            data={formData.garments}
            client={formData.client}
            onUpdate={garments => updateFormData({ garments })}
            onNext={nextStep}
            onPrev={prevStep}
            onChangeCustomer={() => setCurrentStep('client')}
            orderType={formData.order.type}
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
          />
        );
      case 'assignment':
        return (
          <AssignmentStep
            selectedAssignee={formData.order.assigned_to || null}
            onAssigneeChange={assignee =>
              updateFormData({ order: { ...formData.order, assigned_to: assignee } })
            }
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
        {/* Left Sidebar - Compact Steps Bar */}
        <div className='flex-shrink-0 lg:w-16'>
          {/* Compact Header */}
          <div className='mb-2 text-center lg:text-center flex-shrink-0'>
            <div className='flex items-center justify-center gap-2 mb-1'>
              <div className='inline-flex items-center justify-center w-6 h-6 bg-gradient-to-r from-primary-500 to-accent-clay rounded-full shadow-sm'>
                <svg
                  className='w-3 h-3 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Compact Vertical Progress Indicator */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-2'>
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
                            : 'bg-gray-100 text-gray-500'
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
                          className={`w-0.5 h-6 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'
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
          <Card className='shadow-lg border-0 bg-white/95 backdrop-blur-sm flex-1 min-h-0'>
            <CardContent className='p-3 h-full overflow-y-auto'>
              {renderStep()}
            </CardContent>
          </Card>
        </div>
      </div>
    </MuralBackground>
  );
}
