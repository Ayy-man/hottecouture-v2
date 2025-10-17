'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PhotoGallery } from '@/components/ui/photo-gallery';
import { TimerButton } from '@/components/timer/timer-button';

interface OrderDetailModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
}: OrderDetailModalProps) {
  const [detailedOrder, setDetailedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!order?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/order/${order.id}/details`);
      if (response.ok) {
        const result = await response.json();
        setDetailedOrder(result.order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  }, [order?.id]);

  useEffect(() => {
    if (isOpen && order?.id) {
      fetchOrderDetails();
    }
  }, [isOpen, order?.id, fetchOrderDetails]);

  if (!isOpen) return null;

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Always use detailedOrder if available, otherwise fall back to basic order data
  const displayOrder = detailedOrder ? detailedOrder : order;

  // Safety check - if we don't have any order data, don't render
  if (!displayOrder) {
    console.log('🔍 Modal: No order data to display');
    return null;
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4'>
      <Card className='w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-white shadow-2xl'>
        <div className='p-4 sm:p-6'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start mb-6 gap-4'>
            <div className='flex-1'>
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900'>
                Order #{displayOrder.order_number}
                {displayOrder.rush && (
                  <span className='ml-2 sm:ml-3 px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold text-white bg-red-500 rounded-full'>
                    RUSH{' '}
                    {displayOrder.rush_fee_type
                      ? `(${displayOrder.rush_fee_type.toUpperCase()})`
                      : ''}
                  </span>
                )}
              </h2>
              <p className='text-gray-600 mt-1 text-sm sm:text-base'>
                {displayOrder.client_name || 'Unknown Client'}
              </p>
            </div>
            <Button
              variant='outline'
              onClick={onClose}
              className='w-full sm:w-auto'
            >
              ✕ Close
            </Button>
          </div>

          {loading && (
            <div className='flex items-center justify-center py-8'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4'></div>
                <p className='text-gray-600'>Loading order details...</p>
              </div>
            </div>
          )}

          {!loading && (
            <>
              {/* Order Details Grid */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6'>
                {/* Basic Info */}
                <div className='space-y-4'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Order Information
                  </h3>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Type:</span>
                      <span className='font-medium capitalize'>
                        {order.type}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Status:</span>
                      <span className='font-medium capitalize'>
                        {order.status}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Priority:</span>
                      <span className='font-medium capitalize'>
                        {order.priority || 'Normal'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Due Date:</span>
                      <span className='font-medium'>
                        {formatDate(order.due_date)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Created:</span>
                      <span className='font-medium'>
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    {order.rack_position && (
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Rack Position:</span>
                        <span className='font-medium'>
                          {order.rack_position}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Info */}
                <div className='space-y-4'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Client Information
                  </h3>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Name:</span>
                      <span className='font-medium'>
                        {order.client_name || 'Unknown Client'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Phone:</span>
                      <span className='font-medium'>
                        {order.client_phone || 'Not provided'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Email:</span>
                      <span className='font-medium'>
                        {order.client_email || 'Not provided'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Language:</span>
                      <span className='font-medium'>
                        {order.client_language || 'English'}
                      </span>
                    </div>
                    {order.client_notes && (
                      <div className='mt-3 pt-3 border-t border-gray-200'>
                        <span className='text-gray-600 text-sm font-medium'>
                          Client Notes:
                        </span>
                        <div className='mt-1 p-2 bg-yellow-50 rounded text-sm text-gray-700'>
                          {order.client_notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Garments */}
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                  Garments ({displayOrder.garments?.length || 0})
                </h3>
                <div className='space-y-4'>
                  {displayOrder.garments?.map((garment: any, index: number) => (
                    <div
                      key={garment.id || index}
                      className='border border-gray-200 rounded-lg p-4'
                    >
                      <div className='flex justify-between items-start mb-3'>
                        <div className='flex items-center gap-2'>
                          {garment.garment_type?.icon && (
                            <span className='text-lg'>
                              {garment.garment_type.icon}
                            </span>
                          )}
                          <h4 className='font-medium text-gray-900'>
                            {garment.type}
                          </h4>
                          {garment.garment_type?.category && (
                            <span className='text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded'>
                              {garment.garment_type.category}
                            </span>
                          )}
                        </div>
                        <span className='text-sm text-gray-500'>
                          Label: {garment.label_code}
                        </span>
                      </div>

                      {/* Garment Photos */}
                      {garment.photo_path && (
                        <div className='mb-3'>
                          <PhotoGallery
                            photos={[
                              {
                                id: garment.id,
                                url: `/api/photo/${garment.photo_path}`,
                                alt: garment.type,
                                caption: `Label: ${garment.label_code}`,
                              },
                            ]}
                            className='w-48'
                          />
                        </div>
                      )}
                      {!garment.photo_path && (
                        <div className='mb-3 text-sm text-gray-500'>
                          No photo available
                        </div>
                      )}

                      <div className='grid grid-cols-2 gap-4 text-sm mb-3'>
                        <div>
                          <span className='text-gray-600'>Color:</span>
                          <span className='ml-2'>
                            {garment.color || 'Not specified'}
                          </span>
                        </div>
                        <div>
                          <span className='text-gray-600'>Brand:</span>
                          <span className='ml-2'>
                            {garment.brand || 'Not specified'}
                          </span>
                        </div>
                      </div>

                      {garment.notes && (
                        <div className='mb-3 text-sm'>
                          <span className='text-gray-600 font-medium'>
                            Notes:
                          </span>
                          <span className='ml-2'>{garment.notes}</span>
                        </div>
                      )}

                      {/* Detailed Measurements */}
                      {garment.measurements && (
                        <div className='mb-3'>
                          <h5 className='text-sm font-medium text-gray-700 mb-2'>
                            Detailed Measurements:
                          </h5>
                          <div className='bg-blue-50 rounded-lg p-3 text-sm'>
                            <pre className='whitespace-pre-wrap text-gray-700'>
                              {typeof garment.measurements === 'string'
                                ? garment.measurements
                                : JSON.stringify(garment.measurements, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Services for this garment */}
                      {garment.services && garment.services.length > 0 && (
                        <div className='mt-3 pt-3 border-t border-gray-100'>
                          <h5 className='text-sm font-medium text-blue-600 mb-2'>
                            Services Required:
                          </h5>
                          <div className='space-y-2'>
                            {garment.services.map(
                              (service: any, serviceIndex: number) => (
                                <div
                                  key={serviceIndex}
                                  className='bg-blue-50 rounded-lg p-3'
                                >
                                  <div className='flex justify-between items-start'>
                                    <div className='flex-1'>
                                      <h6 className='font-medium text-gray-900'>
                                        {service.service?.name || 'Service'}
                                      </h6>
                                      {service.service?.description && (
                                        <p className='text-sm text-gray-600 mt-1'>
                                          {service.service.description}
                                        </p>
                                      )}
                                      {service.notes && (
                                        <div className='mt-2'>
                                          <span className='text-xs font-medium text-gray-600'>
                                            Service Notes:
                                          </span>
                                          <p className='text-xs text-gray-700 mt-1 bg-white rounded p-2'>
                                            {service.notes}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    <div className='text-right text-sm ml-4'>
                                      <div className='text-gray-600'>
                                        Qty: {service.quantity}
                                      </div>
                                      <div className='font-medium text-gray-900'>
                                        {service.custom_price_cents
                                          ? `$${(service.custom_price_cents / 100).toFixed(2)}`
                                          : service.service?.base_price_cents
                                            ? `$${((service.service.base_price_cents * service.quantity) / 100).toFixed(2)}`
                                            : 'Price TBD'}
                                      </div>
                                      {service.service?.estimated_minutes && (
                                        <div className='text-xs text-gray-500 mt-1'>
                                          Est:{' '}
                                          {Math.floor(
                                            service.service.estimated_minutes /
                                              60
                                          )}
                                          h{' '}
                                          {service.service.estimated_minutes %
                                            60}
                                          m
                                          {service.quantity > 1 &&
                                            ` × ${service.quantity}`}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Tracking */}
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                  Time Tracking
                </h3>
                <div className='space-y-4'>
                  {/* Timer Controls */}
                  <TimerButton
                    orderId={displayOrder.id}
                    orderStatus={displayOrder.status}
                  />

                  {/* Estimated Time Display */}
                  {displayOrder.time_tracking && (
                    <div className='bg-gray-50 rounded-lg p-4'>
                      <div className='flex justify-between items-center'>
                        <span className='text-gray-600'>Estimated Time:</span>
                        <span className='font-medium text-gray-900'>
                          {displayOrder.time_tracking.estimated_time || '0h 0m'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Measurements */}
              {displayOrder.notes && (
                <div className='mb-6'>
                  <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                    Notes & Measurements
                  </h3>
                  <div className='bg-yellow-50 rounded-lg p-4'>
                    {displayOrder.notes.measurements && (
                      <div className='mb-4'>
                        <h4 className='font-medium text-gray-900 mb-2'>
                          Measurements:
                        </h4>
                        <div className='text-sm text-gray-700 whitespace-pre-wrap'>
                          {displayOrder.notes.measurements}
                        </div>
                      </div>
                    )}
                    {displayOrder.notes.specialInstructions && (
                      <div>
                        <h4 className='font-medium text-gray-900 mb-2'>
                          Special Instructions:
                        </h4>
                        <div className='text-sm text-gray-700 whitespace-pre-wrap'>
                          {displayOrder.notes.specialInstructions}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                  Pricing
                </h3>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Subtotal:</span>
                      <span className='font-medium'>
                        {formatCurrency(displayOrder.subtotal_cents || 0)}
                      </span>
                    </div>
                    {displayOrder.rush_fee_cents > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>
                          Rush Fee{' '}
                          {displayOrder.rush_fee_type
                            ? `(${displayOrder.rush_fee_type})`
                            : ''}
                          :
                        </span>
                        <span className='font-medium text-red-600'>
                          {formatCurrency(displayOrder.rush_fee_cents)}
                        </span>
                      </div>
                    )}
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Tax:</span>
                      <span className='font-medium'>
                        {formatCurrency(displayOrder.tax_cents || 0)}
                      </span>
                    </div>
                    <div className='flex justify-between border-t border-gray-300 pt-2'>
                      <span className='text-lg font-semibold text-gray-900'>
                        Total:
                      </span>
                      <span className='text-lg font-semibold text-gray-900'>
                        {formatCurrency(displayOrder.total_cents || 0)}
                      </span>
                    </div>
                    {displayOrder.deposit_cents > 0 && (
                      <div className='flex justify-between text-sm'>
                        <span className='text-gray-600'>Deposit Paid:</span>
                        <span className='font-medium'>
                          {formatCurrency(displayOrder.deposit_cents)}
                        </span>
                      </div>
                    )}
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-600'>Balance Due:</span>
                      <span className='font-medium'>
                        {formatCurrency(
                          displayOrder.balance_due_cents ||
                            displayOrder.total_cents ||
                            0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='flex justify-end space-x-3'>
                <Button variant='outline' onClick={onClose}>
                  Close
                </Button>
                <Button asChild>
                  <a href={`/labels/${displayOrder.id}`} target='_blank'>
                    Print Labels
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
