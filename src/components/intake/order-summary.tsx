'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IntakeResponse } from '@/lib/dto'
import { formatCurrency } from '@/lib/pricing'

interface OrderSummaryProps {
  order: IntakeResponse | null
  onPrintLabels: () => void
  onNewOrder: () => void
}

export function OrderSummary({ order, onPrintLabels, onNewOrder }: OrderSummaryProps) {
  const t = useTranslations('intake.submit')

  if (!order) {
    return (
      <div className="text-center py-8">
        <div className="text-lg text-gray-600">No order data available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">{t('success')}</h2>
            <p className="text-green-600">
              Order #{order.orderNumber} has been created successfully
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>
            Order #{order.orderNumber} - {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-lg mb-3">Order Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">#{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono text-sm">{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    Pending
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-lg mb-3">Pricing Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(order.totals.subtotal_cents)}</span>
                </div>
                {order.totals.rush_fee_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rush Fee:</span>
                    <span className="font-medium">{formatCurrency(order.totals.rush_fee_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">{formatCurrency(order.totals.tax_cents)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(order.totals.total_cents)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      {order.qrcode && (
        <Card>
          <CardHeader>
            <CardTitle>Order QR Code</CardTitle>
            <CardDescription>
              Use this QR code to track the order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <img
                src={order.qrcode}
                alt="Order QR Code"
                className="w-32 h-32 mx-auto border border-gray-300 rounded"
              />
              <p className="text-sm text-gray-600 mt-2">
                Order #{order.orderNumber}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          onClick={onPrintLabels}
          className="flex-1 py-3 text-lg"
        >
          {t('printLabels')}
        </Button>
        <Button
          onClick={onNewOrder}
          variant="outline"
          className="flex-1 py-3 text-lg"
        >
          {t('viewOrder')}
        </Button>
      </div>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Print Labels</h4>
                <p className="text-sm text-gray-600">
                  Print labels for each garment to track them through the process
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Start Work</h4>
                <p className="text-sm text-gray-600">
                  Begin working on the garments according to the selected services
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Update Status</h4>
                <p className="text-sm text-gray-600">
                  Update the order status as work progresses
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
