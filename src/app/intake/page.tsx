'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientStep } from '@/components/intake/client-step'
import { GarmentsStep } from '@/components/intake/garments-step'
import { ServicesStep } from '@/components/intake/services-step'
import { NotesStep } from '@/components/intake/notes-step'
import { PricingStep } from '@/components/intake/pricing-step'
import { OrderSummary } from '@/components/intake/order-summary'
import { IntakeRequest, IntakeResponse } from '@/lib/dto'
import { usePricing } from '@/lib/pricing/usePricing'
import { formatCurrency } from '@/lib/pricing'

type IntakeStep = 'client' | 'garments' | 'services' | 'notes' | 'pricing' | 'summary'

interface IntakeFormData {
  client: {
    first_name: string
    last_name: string
    phone?: string
    email?: string
    language: 'fr' | 'en'
    newsletter_consent: boolean
    preferred_contact: 'sms' | 'email'
    notes?: string
  } | null
  garments: Array<{
    type: string
    color?: string
    brand?: string
    notes?: string
    photoPath?: string
    labelCode: string
    services: Array<{
      serviceId: string
      qty: number
      customPriceCents?: number
    }>
  }>
  notes: {
    measurements?: string
    specialInstructions?: string
    documents: File[]
    additionalPhotos: File[]
  }
  order: {
    type: 'alteration' | 'custom'
    due_date?: string
    rush: boolean
    deposit_required: boolean
  }
}

const initialFormData: IntakeFormData = {
  client: null,
  garments: [],
  notes: {
    documents: [],
    additionalPhotos: [],
  },
  order: {
    type: 'alteration',
    rush: false,
    deposit_required: false,
  },
}

export default function IntakePage() {
  const t = useTranslations('intake')
  const [currentStep, setCurrentStep] = useState<IntakeStep>('client')
  const [formData, setFormData] = useState<IntakeFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<IntakeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pricing = usePricing({
    initialItems: [],
    isRush: formData.order.rush,
  })

  const steps: Array<{ key: IntakeStep; title: string; description: string }> = [
    { key: 'client', title: t('steps.client'), description: 'Client information and contact details' },
    { key: 'garments', title: t('steps.garments'), description: 'Add garments and take photos' },
    { key: 'services', title: t('steps.services'), description: 'Select services and pricing' },
    { key: 'notes', title: t('steps.notes'), description: 'Measurements and special instructions' },
    { key: 'pricing', title: t('steps.pricing'), description: 'Final pricing and due date' },
  ]

  const updateFormData = useCallback((updates: Partial<IntakeFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const nextStep = useCallback(() => {
    const stepIndex = steps.findIndex(step => step.key === currentStep)
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].key as IntakeStep)
    }
  }, [currentStep, steps])

  const prevStep = useCallback(() => {
    const stepIndex = steps.findIndex(step => step.key === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].key as IntakeStep)
    }
  }, [currentStep, steps])

  const handleSubmit = async () => {
    if (!formData.client) {
      setError('Client information is required')
      return
    }

    if (formData.garments.length === 0) {
      setError('At least one garment is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Convert form data to API format
      const intakeRequest: IntakeRequest = {
        client: formData.client,
        order: {
          client_id: '', // Will be set by API
          type: formData.order.type,
          due_date: formData.order.due_date,
          rush: formData.order.rush,
        },
        garments: formData.garments.map(garment => ({
          type: garment.type,
          color: garment.color,
          brand: garment.brand,
          notes: garment.notes,
          photoTempPath: garment.photoPath,
          services: garment.services,
        })),
      }

      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(intakeRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit order')
      }

      const result: IntakeResponse = await response.json()
      setOrderResult(result)
      setCurrentStep('summary')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'client':
        return (
          <ClientStep
            data={formData.client}
            onUpdate={(client) => updateFormData({ client })}
            onNext={nextStep}
          />
        )
      case 'garments':
        return (
          <GarmentsStep
            data={formData.garments}
            onUpdate={(garments) => updateFormData({ garments })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 'services':
        return (
          <ServicesStep
            data={formData.garments}
            onUpdate={(garments) => updateFormData({ garments })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 'notes':
        return (
          <NotesStep
            data={formData.notes}
            onUpdate={(notes) => updateFormData({ notes })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 'pricing':
        return (
          <PricingStep
            data={formData.order}
            onUpdate={(order) => updateFormData({ order })}
            onNext={handleSubmit}
            onPrev={prevStep}
            isSubmitting={isSubmitting}
          />
        )
      case 'summary':
        return (
          <OrderSummary
            order={orderResult}
            onPrintLabels={() => {
              if (orderResult) {
                window.open(`/api/labels/${orderResult.orderId}`, '_blank')
              }
            }}
            onNewOrder={() => {
              setFormData(initialFormData)
              setOrderResult(null)
              setCurrentStep('client')
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">{t('title')}</h1>
          <p className="text-center text-gray-600">
            Complete order intake in {steps.length} simple steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step.key === currentStep
              const isCompleted = steps.findIndex(s => s.key === currentStep) > index
              
              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-gray-600'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-8 h-0.5 bg-gray-200 mx-4" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps.find(s => s.key === currentStep)?.title}</CardTitle>
            <CardDescription>
              {steps.find(s => s.key === currentStep)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
