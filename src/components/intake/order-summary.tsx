'use client';

// import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IntakeResponse } from '@/lib/dto';
import { formatCurrency } from '@/lib/pricing/client';

interface OrderSummaryProps {
  order: IntakeResponse | null;
  onPrintLabels: () => void;
  onNewOrder: () => void;
}

export function OrderSummary({
  order,
  onPrintLabels,
  onNewOrder,
}: OrderSummaryProps) {
  // const t = useTranslations('intake.submit')

  if (!order) {
    return (
      <div className='text-center py-8'>
        <div className='text-lg text-gray-600'>No order data available</div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header */}
      <div className='flex items-center justify-center px-1 py-3 border-b border-gray-200 bg-white flex-shrink-0'>
        <div className='text-center'>
          <div className='flex items-center justify-center mb-2'>
            <img
              src='/logo.jpg'
              alt="Hotte Design D'Intérieur & Couture"
              className='h-8 w-auto object-contain'
            />
          </div>
          <h2 className='text-lg font-semibold text-gray-900'>
            Order Confirmation
          </h2>
          <p className='text-sm text-gray-500'>
            Your order has been created successfully
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-4 space-y-4'>
          {/* Success Message */}
          <Card className='bg-green-50 border-green-200'>
            <CardContent className='pt-4'>
              <div className='text-center'>
                <div className='w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <svg
                    className='w-6 h-6 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <h2 className='text-xl font-bold text-green-800 mb-2'>
                  Order Created Successfully!
                </h2>
                <p className='text-sm text-green-600'>
                  Order #{order.orderNumber} has been created successfully
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>Order Details</CardTitle>
              <CardDescription className='text-sm'>
                Order #{order.orderNumber} - {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <h3 className='font-medium text-sm mb-2'>
                    Order Information
                  </h3>
                  <div className='space-y-1'>
                    <div className='flex justify-between'>
                      <span className='text-xs text-gray-600'>
                        Order Number:
                      </span>
                      <span className='text-xs font-medium'>
                        #{order.orderNumber}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-xs text-gray-600'>Order ID:</span>
                      <span className='font-mono text-xs'>{order.orderId}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-xs text-gray-600'>Status:</span>
                      <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs'>
                        Pending
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className='font-medium text-sm mb-2'>Pricing Summary</h3>
                  <div className='space-y-1'>
                    <div className='flex justify-between'>
                      <span className='text-xs text-gray-600'>Subtotal:</span>
                      <span className='text-xs font-medium'>
                        {formatCurrency(order.totals.subtotal_cents)}
                      </span>
                    </div>
                    {order.totals.rush_fee_cents > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-xs text-gray-600'>Rush Fee:</span>
                        <span className='text-xs font-medium'>
                          {formatCurrency(order.totals.rush_fee_cents)}
                        </span>
                      </div>
                    )}
                    {order.totals.tps_cents !== undefined &&
                    order.totals.tvq_cents !== undefined ? (
                      <>
                        <div className='flex justify-between'>
                          <span className='text-xs text-gray-600'>
                            TPS: Canada tax
                          </span>
                          <span className='text-xs font-medium'>
                            {formatCurrency(order.totals.tps_cents)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-xs text-gray-600'>
                            TVQ: Québec tax
                          </span>
                          <span className='text-xs font-medium'>
                            {formatCurrency(order.totals.tvq_cents)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className='flex justify-between'>
                        <span className='text-xs text-gray-600'>Tax:</span>
                        <span className='text-xs font-medium'>
                          {formatCurrency(order.totals.tax_cents)}
                        </span>
                      </div>
                    )}
                    <div className='flex justify-between text-sm font-bold border-t pt-1'>
                      <span>Total:</span>
                      <span className='text-primary'>
                        {formatCurrency(order.totals.total_cents)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          {order.qrcode && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-lg'>Order QR Code</CardTitle>
                <CardDescription className='text-sm'>
                  Use this QR code to track the order
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='text-center'>
                  <img
                    src={order.qrcode}
                    alt='Order QR Code'
                    className='w-24 h-24 mx-auto border border-gray-300 rounded'
                  />
                  <p className='text-xs text-gray-600 mt-2'>
                    Order #{order.orderNumber}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className='flex space-x-3'>
            <Button
              onClick={onPrintLabels}
              className='flex-1 py-2 text-sm btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation'
            >
              Print Labels
            </Button>
            <Button
              onClick={onNewOrder}
              variant='outline'
              className='flex-1 py-2 text-sm btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300 touch-manipulation'
            >
              New Order
            </Button>
          </div>

          {/* Next Steps */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='space-y-2'>
                <div className='flex items-start space-x-2'>
                  <div className='w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium'>
                    1
                  </div>
                  <div>
                    <h4 className='font-medium text-sm'>Print Labels</h4>
                    <p className='text-xs text-gray-600'>
                      Print labels for each garment to track them through the
                      process
                    </p>
                  </div>
                </div>
                <div className='flex items-start space-x-2'>
                  <div className='w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium'>
                    2
                  </div>
                  <div>
                    <h4 className='font-medium text-sm'>Start Work</h4>
                    <p className='text-xs text-gray-600'>
                      Begin working on the garments according to the selected
                      services
                    </p>
                  </div>
                </div>
                <div className='flex items-start space-x-2'>
                  <div className='w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium'>
                    3
                  </div>
                  <div>
                    <h4 className='font-medium text-sm'>Update Status</h4>
                    <p className='text-xs text-gray-600'>
                      Update the order status as work progresses
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
