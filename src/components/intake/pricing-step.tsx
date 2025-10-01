'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePricing } from '@/lib/pricing/usePricing'
import { formatCurrency } from '@/lib/pricing'

interface OrderData {
  type: 'alteration' | 'custom'
  due_date?: string
  rush: boolean
  deposit_required: boolean
}

interface PricingStepProps {
  data: OrderData
  onUpdate: (order: OrderData) => void
  onNext: () => void
  onPrev: () => void
  isSubmitting: boolean
}

export function PricingStep({ data, onUpdate, onNext, onPrev, isSubmitting }: PricingStepProps) {
  const t = useTranslations('intake.pricing')
  const [calculation, setCalculation] = useState<any>(null)

  const pricing = usePricing({
    isRush: data.rush,
  })

  useEffect(() => {
    // This would be calculated based on the garments and services
    // For now, we'll use a mock calculation
    const mockCalculation = {
      subtotal_cents: 5000, // $50.00
      rush_fee_cents: data.rush ? 3000 : 0, // $30.00 if rush
      tax_cents: Math.round((5000 + (data.rush ? 3000 : 0)) * 0.12), // 12% tax
      total_cents: 5000 + (data.rush ? 3000 : 0) + Math.round((5000 + (data.rush ? 3000 : 0)) * 0.12),
    }
    setCalculation(mockCalculation)
  }, [data.rush])

  const handleInputChange = (field: keyof OrderData, value: any) => {
    onUpdate({ ...data, [field]: value })
  }

  const getMinDate = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6">
      {/* Order Type */}
      <Card>
        <CardHeader>
          <CardTitle>Order Type</CardTitle>
          <CardDescription>
            Select the type of work for this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleInputChange('type', 'alteration')}
              className={`p-4 border-2 rounded-lg text-center ${
                data.type === 'alteration'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-medium text-lg">Alteration</h3>
              <p className="text-sm text-gray-600">Modify existing garments</p>
            </button>
            <button
              type="button"
              onClick={() => handleInputChange('type', 'custom')}
              className={`p-4 border-2 rounded-lg text-center ${
                data.type === 'custom'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-medium text-lg">Custom</h3>
              <p className="text-sm text-gray-600">Create new garments</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Due Date */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dueDate')}</CardTitle>
          <CardDescription>
            When should this order be completed?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="date"
            value={data.due_date || ''}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
            min={getMinDate()}
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </CardContent>
      </Card>

      {/* Rush Order */}
      <Card>
        <CardHeader>
          <CardTitle>{t('rushOrder')}</CardTitle>
          <CardDescription>
            Rush orders are completed faster but include additional fees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="rush"
              checked={data.rush}
              onChange={(e) => handleInputChange('rush', e.target.checked)}
              className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="rush" className="text-lg font-medium">
              This is a rush order
            </label>
          </div>
          {data.rush && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 font-medium">
                Rush fee: {formatCurrency(3000)} (Small orders) / {formatCurrency(6000)} (Large orders)
              </p>
              <p className="text-sm text-orange-600 mt-1">
                Rush orders are prioritized and completed faster than regular orders.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit */}
      <Card>
        <CardHeader>
          <CardTitle>{t('deposit')}</CardTitle>
          <CardDescription>
            Deposit requirements for this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="deposit"
              checked={data.deposit_required}
              onChange={(e) => handleInputChange('deposit_required', e.target.checked)}
              className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="deposit" className="text-lg font-medium">
              Deposit required
            </label>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            A deposit may be required before work begins on this order.
          </p>
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      {calculation && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Order Summary</CardTitle>
            <CardDescription>
              Review the pricing breakdown for this order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-lg">{t('subtotal')}:</span>
                <span className="text-lg font-medium">{formatCurrency(calculation.subtotal_cents)}</span>
              </div>
              
              {data.rush && (
                <div className="flex justify-between">
                  <span className="text-lg">{t('rushFee')}:</span>
                  <span className="text-lg font-medium">{formatCurrency(calculation.rush_fee_cents)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-lg">{t('tax')}:</span>
                <span className="text-lg font-medium">{formatCurrency(calculation.tax_cents)}</span>
              </div>
              
              <div className="border-t border-primary/20 pt-3">
                <div className="flex justify-between">
                  <span className="text-xl font-bold">{t('total')}:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(calculation.total_cents)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={isSubmitting}
          className="flex-1 py-3 text-lg"
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="flex-1 py-3 text-lg"
        >
          {isSubmitting ? t('submit.processing') : t('submit.submitOrder')}
        </Button>
      </div>
    </div>
  )
}
