'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { PhotoGallery } from '@/components/ui/photo-gallery';
import { TimerButton } from '@/components/timer/timer-button';
import { LoadingLogo } from '@/components/ui/loading-logo';
import { RACK_CONFIG } from '@/lib/config/production';

interface OrderDetailModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate?: (orderId: string, newStatus: string) => void;
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
}: OrderDetailModalProps) {
  const [detailedOrder, setDetailedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingGarmentId, setEditingGarmentId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [editingTimeGarmentId, setEditingTimeGarmentId] = useState<string | null>(null);
  const [editingTimeMinutes, setEditingTimeMinutes] = useState<number>(0);
  const [savingTime, setSavingTime] = useState<string | null>(null);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const [rackPosition, setRackPosition] = useState<string>('');
  const [customRackPosition, setCustomRackPosition] = useState<string>('');
  const [savingRack, setSavingRack] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!order?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/order/${order.id}/details`);
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 OrderDetailModal: Received order data:', {
          id: result.order?.id,
          status: result.order?.status,
          order_number: result.order?.order_number,
        });
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

  useEffect(() => {
    if (detailedOrder?.rack_position) {
      const isPreset = RACK_CONFIG.positions.includes(detailedOrder.rack_position);
      if (isPreset) {
        setRackPosition(detailedOrder.rack_position);
        setCustomRackPosition('');
      } else {
        setRackPosition('other');
        setCustomRackPosition(detailedOrder.rack_position);
      }
    } else {
      setRackPosition('');
      setCustomRackPosition('');
    }
  }, [detailedOrder?.rack_position]);

  // Refresh order details when the order status changes
  useEffect(() => {
    if (isOpen && order?.id && order?.status) {
      fetchOrderDetails();
    }
  }, [isOpen, order?.id, order?.status, fetchOrderDetails]);

  useEffect(() => {
    if (!isOpen) {
      setEditingGarmentId(null);
      setEditingNotes('');
      setSavingNotes(null);
      setEditingTimeGarmentId(null);
      setEditingTimeMinutes(0);
      setSavingTime(null);
      setPaymentLinkUrl(null);
      setRackPosition('');
      setCustomRackPosition('');
    }
  }, [isOpen]);

  const handleStartEditNotes = (
    garmentId: string,
    currentNotes: string | null
  ) => {
    setEditingGarmentId(garmentId);
    setEditingNotes(currentNotes || '');
  };

  const handleCancelEditNotes = () => {
    setEditingGarmentId(null);
    setEditingNotes('');
  };

  const handleSaveNotes = async (garmentId: string) => {
    setSavingNotes(garmentId);
    try {
      const response = await fetch(`/api/garment/${garmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: editingNotes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save notes');
      }

      const result = await response.json();

      if (detailedOrder && detailedOrder.garments) {
        setDetailedOrder({
          ...detailedOrder,
          garments: detailedOrder.garments.map((g: any) =>
            g.id === garmentId ? { ...g, notes: result.garment.notes } : g
          ),
        });
      }

      setEditingGarmentId(null);
      setEditingNotes('');
    } catch (error) {
      console.error('Error saving garment notes:', error);
      alert(error instanceof Error ? error.message : 'Failed to save notes');
    } finally {
      setSavingNotes(null);
    }
  };

  const handleStartEditTime = (garmentId: string, currentMinutes: number) => {
    setEditingTimeGarmentId(garmentId);
    setEditingTimeMinutes(currentMinutes);
  };

  const handleCancelEditTime = () => {
    setEditingTimeGarmentId(null);
    setEditingTimeMinutes(0);
  };

  const handleSaveTime = async (garmentId: string) => {
    setSavingTime(garmentId);
    try {
      const response = await fetch(`/api/garment/${garmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estimated_minutes: editingTimeMinutes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save time estimate');
      }

      const result = await response.json();

      if (detailedOrder && detailedOrder.garments) {
        setDetailedOrder({
          ...detailedOrder,
          garments: detailedOrder.garments.map((g: any) =>
            g.id === garmentId ? { ...g, estimated_minutes: result.garment.estimated_minutes } : g
          ),
        });
      }

      setEditingTimeGarmentId(null);
      setEditingTimeMinutes(0);
    } catch (error) {
      console.error('Error saving time estimate:', error);
      alert(error instanceof Error ? error.message : 'Failed to save time estimate');
    } finally {
      setSavingTime(null);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!displayOrder?.id) return;
    
    setGeneratingPaymentLink(true);
    setPaymentLinkUrl(null);
    
    try {
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: displayOrder.id }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate payment link');
      }
      
      setPaymentLinkUrl(data.payment_url);
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleCopyPaymentLink = async () => {
    if (!paymentLinkUrl) return;
    try {
      await navigator.clipboard.writeText(paymentLinkUrl);
      alert('Payment link copied to clipboard!');
    } catch {
      alert('Failed to copy. Link: ' + paymentLinkUrl);
    }
  };

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
                  <span className='ml-2 sm:ml-3 px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-accent-contrast to-primary-500 rounded-full'>
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
            <div className='flex items-center justify-center py-12'>
              <LoadingLogo size='lg' text='Loading order details...' />
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
                    {RACK_CONFIG.editableStatuses.includes(order.status) ? (
                      <div className='space-y-2 pt-2 border-t border-gray-200'>
                        <label className='block text-sm font-medium text-gray-700'>
                          {RACK_CONFIG.label}
                        </label>
                        <div className='flex gap-2'>
                          <select
                            value={rackPosition}
                            onChange={async (e) => {
                              const value = e.target.value;
                              setRackPosition(value);
                              if (value !== 'other' && value !== '') {
                                setCustomRackPosition('');
                                setSavingRack(true);
                                try {
                                  await fetch(`/api/order/${order.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ rack_position: value }),
                                  });
                                  if (detailedOrder) {
                                    setDetailedOrder({ ...detailedOrder, rack_position: value });
                                  }
                                } catch (err) {
                                  console.error('Error saving rack position:', err);
                                } finally {
                                  setSavingRack(false);
                                }
                              }
                            }}
                            disabled={savingRack}
                            className='flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500'
                          >
                            <option value=''>{RACK_CONFIG.placeholder}</option>
                            {RACK_CONFIG.positions.map(pos => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                            <option value='other'>{RACK_CONFIG.otherOption}</option>
                          </select>
                          {rackPosition === 'other' && (
                            <>
                              <input
                                type='text'
                                value={customRackPosition}
                                onChange={(e) => setCustomRackPosition(e.target.value)}
                                placeholder={RACK_CONFIG.placeholder}
                                className='w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500'
                                disabled={savingRack}
                              />
                              <Button
                                size='sm'
                                onClick={async () => {
                                  if (!customRackPosition.trim()) return;
                                  setSavingRack(true);
                                  try {
                                    await fetch(`/api/order/${order.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ rack_position: customRackPosition.trim() }),
                                    });
                                    if (detailedOrder) {
                                      setDetailedOrder({ ...detailedOrder, rack_position: customRackPosition.trim() });
                                    }
                                  } catch (err) {
                                    console.error('Error saving rack position:', err);
                                  } finally {
                                    setSavingRack(false);
                                  }
                                }}
                                disabled={savingRack || !customRackPosition.trim()}
                                className='bg-blue-600 hover:bg-blue-700 text-white'
                              >
                                {savingRack ? '...' : 'OK'}
                              </Button>
                            </>
                          )}
                        </div>
                        {savingRack && (
                          <p className='text-xs text-blue-600'>Enregistrement...</p>
                        )}
                      </div>
                    ) : order.rack_position ? (
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>{RACK_CONFIG.label}:</span>
                        <span className='font-medium'>
                          {order.rack_position}
                        </span>
                      </div>
                    ) : null}
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

                      {/* Notes Section - Always Visible */}
                      <div className='mb-3'>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                          Notes:
                        </label>
                        {editingGarmentId === garment.id ? (
                          <div className='space-y-2'>
                            <Textarea
                              value={editingNotes}
                              onChange={e => setEditingNotes(e.target.value)}
                              rows={4}
                              className='w-full min-h-[100px] text-sm'
                              placeholder='Special instructions, damage notes, etc.'
                              disabled={savingNotes === garment.id}
                            />
                            <div className='flex gap-2'>
                              <Button
                                size='sm'
                                onClick={() => handleSaveNotes(garment.id)}
                                disabled={savingNotes === garment.id}
                                className='bg-primary hover:bg-primary-600'
                              >
                                {savingNotes === garment.id
                                  ? 'Saving...'
                                  : 'Save'}
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={handleCancelEditNotes}
                                disabled={savingNotes === garment.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            <Textarea
                              value={garment.notes || ''}
                              readOnly
                              rows={4}
                              className='w-full min-h-[100px] text-sm bg-gray-50 cursor-not-allowed'
                              placeholder='No notes added yet. Click "Edit Notes" to add notes.'
                            />
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                handleStartEditNotes(garment.id, garment.notes)
                              }
                              className='mt-1'
                            >
                              Edit Notes
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Garment Time Estimate - Editable */}
                      <div className='mb-2 p-2 bg-purple-50 rounded'>
                        {editingTimeGarmentId === garment.id ? (
                          <div className='space-y-2'>
                            <label className='block text-xs font-medium text-purple-700'>
                              Estimated Time (minutes)
                            </label>
                            <div className='flex items-center gap-2'>
                              <input
                                type='number'
                                min='0'
                                value={editingTimeMinutes}
                                onChange={e => setEditingTimeMinutes(parseInt(e.target.value) || 0)}
                                className='w-24 px-2 py-1 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500'
                                disabled={savingTime === garment.id}
                              />
                              <span className='text-xs text-purple-600'>
                                = {Math.floor(editingTimeMinutes / 60)}h {editingTimeMinutes % 60}m
                              </span>
                            </div>
                            <div className='flex gap-2'>
                              <Button
                                size='sm'
                                onClick={() => handleSaveTime(garment.id)}
                                disabled={savingTime === garment.id}
                                className='bg-purple-600 hover:bg-purple-700 text-xs'
                              >
                                {savingTime === garment.id ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={handleCancelEditTime}
                                disabled={savingTime === garment.id}
                                className='text-xs'
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className='flex items-center justify-between'>
                            <span className='text-xs font-medium text-purple-700'>
                              Est. Time:{' '}
                              {(() => {
                                const customMinutes = garment.estimated_minutes;
                                if (customMinutes && customMinutes > 0) {
                                  const h = Math.floor(customMinutes / 60);
                                  const m = customMinutes % 60;
                                  return h > 0 ? `${h}h ${m}m` : `${m}m`;
                                }
                                const totalMinutes = garment.services?.reduce(
                                  (sum: number, s: any) => {
                                    const mins = s.service?.estimated_minutes || 0;
                                    return sum + mins * (s.quantity || 1);
                                  },
                                  0
                                ) || 0;
                                if (totalMinutes === 0) return 'TBD';
                                const h = Math.floor(totalMinutes / 60);
                                const m = totalMinutes % 60;
                                return h > 0 ? `${h}h ${m}m` : `${m}m`;
                              })()}
                            </span>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => {
                                const currentMinutes = garment.estimated_minutes || 
                                  garment.services?.reduce(
                                    (sum: number, s: any) => sum + (s.service?.estimated_minutes || 0) * (s.quantity || 1),
                                    0
                                  ) || 0;
                                handleStartEditTime(garment.id, currentMinutes);
                              }}
                              className='text-xs text-purple-600 hover:text-purple-800 h-6 px-2'
                            >
                              Edit
                            </Button>
                          </div>
                        )}
                      </div>

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
                                        {service.service?.name ||
                                          service.custom_service_name ||
                                          'Service'}
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

                      {/* Timer Button for Garment */}
                      <div className='mt-4 pt-3 border-t border-gray-100 flex justify-between items-center'>
                        <div className='text-xs text-gray-500'>
                          {/* Optional: Show task status here if needed, but TimerButton handles it */}
                        </div>
                        <TimerButton
                          orderId={displayOrder.id}
                          garmentId={garment.id}
                          orderStatus={displayOrder.status}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
                        <span className='font-medium text-accent-contrast'>
                          {formatCurrency(displayOrder.rush_fee_cents)}
                        </span>
                      </div>
                    )}
                    {displayOrder.tps_cents !== undefined &&
                      displayOrder.tvq_cents !== undefined ? (
                      <>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>TPS: Canada tax</span>
                          <span className='font-medium'>
                            {formatCurrency(displayOrder.tps_cents || 0)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>TVQ: Québec tax</span>
                          <span className='font-medium'>
                            {formatCurrency(displayOrder.tvq_cents || 0)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Tax:</span>
                        <span className='font-medium'>
                          {formatCurrency(displayOrder.tax_cents || 0)}
                        </span>
                      </div>
                    )}
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

              {/* Payment Link Section */}
              <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
                <h3 className='text-lg font-semibold text-green-800 mb-3'>Payment</h3>
                {paymentLinkUrl ? (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <input
                        type='text'
                        value={paymentLinkUrl}
                        readOnly
                        className='flex-1 px-3 py-2 text-sm border border-green-300 rounded bg-white truncate'
                      />
                      <Button
                        size='sm'
                        onClick={handleCopyPaymentLink}
                        className='bg-green-600 hover:bg-green-700 text-white'
                      >
                        Copy
                      </Button>
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        asChild
                        className='text-green-700 border-green-300'
                      >
                        <a href={paymentLinkUrl} target='_blank' rel='noopener noreferrer'>
                          Open Payment Page
                        </a>
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => setPaymentLinkUrl(null)}
                        className='text-gray-500'
                      >
                        Generate New Link
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleGeneratePaymentLink}
                    disabled={generatingPaymentLink}
                    className='bg-green-600 hover:bg-green-700 text-white'
                  >
                    {generatingPaymentLink ? 'Generating...' : '💳 Generate Payment Link'}
                  </Button>
                )}
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
