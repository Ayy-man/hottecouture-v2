'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { PhotoGallery } from '@/components/ui/photo-gallery';
import { GarmentTaskSummary } from '@/components/tasks/garment-task-summary';
import { TaskManagementModal } from '@/components/tasks/task-management-modal';
import { LoadingLogo } from '@/components/ui/loading-logo';
import { RACK_CONFIG } from '@/lib/config/production';
import { PaymentStatusSection } from '@/components/payments/payment-status-section';
import { HoldToArchiveButton } from '@/components/ui/hold-and-release-button';
import { useToast } from '@/components/ui/toast';
import { CollapsibleNotes } from '@/components/ui/collapsible-notes';
import { ClipboardList } from 'lucide-react';

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
  const toast = useToast();
  const [detailedOrder, setDetailedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [orderMeasurements, setOrderMeasurements] = useState<Record<string, any[]>>({});
  const [editingGarmentId, setEditingGarmentId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [editingTimeGarmentId, setEditingTimeGarmentId] = useState<string | null>(null);
  const [editingTimeHours, setEditingTimeHours] = useState<number>(0);
  const [editingTimeMinutes, setEditingTimeMinutes] = useState<number>(0);
  const [savingTime, setSavingTime] = useState<string | null>(null);
  const [rackPosition, setRackPosition] = useState<string>('');
  const [customRackPosition, setCustomRackPosition] = useState<string>('');
  const [savingRack, setSavingRack] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedGarmentForTasks, setSelectedGarmentForTasks] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editPriceCents, setEditPriceCents] = useState(0);
  const [savingPrice, setSavingPrice] = useState(false);
  const [revealedContact, setRevealedContact] = useState(false);

  // Item-level price editing state
  const [editingServicePrice, setEditingServicePrice] = useState<string | null>(null);
  const [editServicePriceCents, setEditServicePriceCents] = useState(0);
  const [savingServicePrice, setSavingServicePrice] = useState<string | null>(null);

  // Privacy masking functions (standardized format)
  const maskPhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '***';
    return '***-***-' + digits.slice(-4);
  };

  const maskEmail = (email: string): string => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return '***';
    return parts[0].charAt(0) + '***@' + parts[1];
  };

  const handleArchive = async () => {
    if (!order?.id) return;
    setArchiving(true);
    try {
      const response = await fetch('/api/orders/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order.id] }),
      });
      if (response.ok) {
        onClose();
        // Trigger a page refresh to update the board
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to archive order');
      }
    } catch (error) {
      console.error('Error archiving order:', error);
      toast.error('Failed to archive order');
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    if (!order?.id) return;
    setArchiving(true);
    try {
      const response = await fetch('/api/orders/unarchive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order.id] }),
      });
      if (response.ok) {
        onClose();
        // Trigger a page refresh to update the board
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to restore order');
      }
    } catch (error) {
      console.error('Error restoring order:', error);
      toast.error('Failed to restore order');
    } finally {
      setArchiving(false);
    }
  };

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

        // Fetch order measurements
        const measRes = await fetch(`/api/orders/${order.id}/measurements`);
        if (measRes.ok) {
          const measData = await measRes.json();
          setOrderMeasurements(measData.data || {});
        }
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
      setEditingTimeHours(0);
      setEditingTimeMinutes(0);
      setSavingTime(null);
      setRackPosition('');
      setCustomRackPosition('');
      // Reset item-level price editing
      setEditingServicePrice(null);
      setEditServicePriceCents(0);
      setSavingServicePrice(null);
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
      toast.error(error instanceof Error ? error.message : 'Failed to save notes');
    } finally {
      setSavingNotes(null);
    }
  };

  const handleStartEditTime = (garmentId: string, currentMinutes: number) => {
    setEditingTimeGarmentId(garmentId);
    setEditingTimeHours(Math.floor(currentMinutes / 60));
    setEditingTimeMinutes(currentMinutes % 60);
  };

  const handleCancelEditTime = () => {
    setEditingTimeGarmentId(null);
    setEditingTimeHours(0);
    setEditingTimeMinutes(0);
  };

  const handleSaveTime = async (garmentId: string) => {
    setSavingTime(garmentId);
    const totalMinutes = editingTimeHours * 60 + editingTimeMinutes;
    console.log('⏱️ Saving actual time:', { garmentId, hours: editingTimeHours, minutes: editingTimeMinutes, totalMinutes });
    try {
      const response = await fetch(`/api/garment/${garmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actual_minutes: totalMinutes }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to save time:', error);
        throw new Error(error.error || 'Failed to save actual time');
      }

      const result = await response.json();
      console.log('✅ Time saved, response:', result);

      if (detailedOrder && detailedOrder.garments) {
        setDetailedOrder({
          ...detailedOrder,
          garments: detailedOrder.garments.map((g: any) =>
            g.id === garmentId ? { ...g, actual_minutes: result.garment.actual_minutes } : g
          ),
        });
      }

      setEditingTimeGarmentId(null);
      setEditingTimeHours(0);
      setEditingTimeMinutes(0);
    } catch (error) {
      console.error('Error saving time estimate:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save time estimate');
    } finally {
      setSavingTime(null);
    }
  };

  const handleCancelEditPrice = () => {
    setEditingPrice(false);
    setEditPriceCents(0);
  };

  const handleSavePrice = async () => {
    if (!order?.id) return;
    setSavingPrice(true);
    try {
      const response = await fetch(`/api/order/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_cents: editPriceCents }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Échec de la mise à jour du prix');
      }
      // Update local state
      if (detailedOrder) {
        setDetailedOrder({ ...detailedOrder, total_cents: editPriceCents });
      }
      setEditingPrice(false);
    } catch (error) {
      console.error('Error saving price:', error);
      toast.error(error instanceof Error ? error.message : 'Échec de la mise à jour du prix');
    } finally {
      setSavingPrice(false);
    }
  };

  // Item-level price editing handlers
  const handleStartEditServicePrice = (serviceId: string, currentPriceCents: number) => {
    setEditingServicePrice(serviceId);
    setEditServicePriceCents(currentPriceCents);
  };

  const handleCancelEditServicePrice = () => {
    setEditingServicePrice(null);
    setEditServicePriceCents(0);
  };

  const handleSaveServicePrice = async (serviceId: string) => {
    setSavingServicePrice(serviceId);
    try {
      // Get current staff name from localStorage or default
      const staffName = localStorage.getItem('currentStaffName') || 'Staff';

      const response = await fetch(`/api/garment-service/${serviceId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_price_cents: editServicePriceCents,
          changed_by: staffName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update price');
      }

      const result = await response.json();

      // Update local state with new prices
      if (detailedOrder) {
        // Update the specific garment service price
        const updatedGarments = detailedOrder.garments.map((g: any) => ({
          ...g,
          services: g.services?.map((s: any) =>
            s.id === serviceId
              ? { ...s, final_price_cents: editServicePriceCents }
              : s
          ),
        }));

        // Update order totals from API response
        setDetailedOrder({
          ...detailedOrder,
          garments: updatedGarments,
          subtotal_cents: result.order.subtotal_cents,
          tax_cents: result.order.tax_cents,
          total_cents: result.order.total_cents,
        });
      }

      setEditingServicePrice(null);
      setEditServicePriceCents(0);
    } catch (error) {
      console.error('Error saving service price:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update price');
    } finally {
      setSavingServicePrice(null);
    }
  };

  // Helper to get the effective price for a service
  const getServicePriceInfo = (service: any) => {
    const finalPrice = service.final_price_cents;
    const customPrice = service.custom_price_cents;
    const basePrice = service.service?.base_price_cents || 0;

    // Determine which price is active
    const activePriceCents = finalPrice ?? customPrice ?? basePrice;
    const estimatedPriceCents = customPrice ?? basePrice;
    const hasFinalPrice = finalPrice !== null && finalPrice !== undefined;

    return {
      activePriceCents,
      estimatedPriceCents,
      hasFinalPrice,
      totalCents: activePriceCents * (service.quantity || 1),
      estimatedTotalCents: estimatedPriceCents * (service.quantity || 1),
    };
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
        <div className='p-3 sm:p-4'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start mb-4 gap-3'>
            <div className='flex-1'>
              <h2 className='text-lg sm:text-xl font-bold text-foreground'>
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
              <p className='text-muted-foreground mt-1 text-sm sm:text-base'>
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
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4'>
                {/* Basic Info */}
                <div className='space-y-2'>
                  <h3 className='text-base font-semibold text-foreground mb-2'>
                    Order Information
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground text-xs'>Type:</span>
                      <span className='font-medium capitalize text-xs'>{order.type}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground text-xs'>Status:</span>
                      <span className='font-medium capitalize text-xs'>{order.status}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground text-xs'>Priority:</span>
                      <span className='font-medium capitalize text-xs'>{order.priority || 'Normal'}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground text-xs'>Due:</span>
                      <span className='font-medium text-xs'>{formatDate(order.due_date)}</span>
                    </div>
                    <div className='flex justify-between col-span-full'>
                      <span className='text-muted-foreground text-xs'>Created:</span>
                      <span className='font-medium text-xs'>{formatDate(order.created_at)}</span>
                    </div>
                    {RACK_CONFIG.editableStatuses.includes(order.status) ? (
                      <div className='col-span-full space-y-2 pt-2 border-t border-border mt-1'>
                        <label className='block text-sm font-medium text-muted-foreground'>
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
                            className='flex-1 px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-blue-500'
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
                                className='w-24 px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-blue-500'
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
                        <span className='text-muted-foreground'>{RACK_CONFIG.label}:</span>
                        <span className='font-medium'>
                          {order.rack_position}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Client Info */}
                <div className='space-y-2'>
                  <h3 className='text-base font-semibold text-foreground mb-2'>
                    Client Information
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                    <div className='flex justify-between col-span-full'>
                      <span className='text-muted-foreground text-xs'>Name:</span>
                      <span className='font-medium text-xs'>{order.client_name || 'Unknown Client'}</span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-muted-foreground text-xs'>Phone:</span>
                      <span className='font-medium font-mono text-xs'>
                        {order.client_phone ? (revealedContact ? order.client_phone : maskPhone(order.client_phone)) : 'N/A'}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-muted-foreground text-xs'>Email:</span>
                      <span className='font-medium font-mono text-xs truncate max-w-[120px]'>
                        {order.client_email ? (revealedContact ? order.client_email : maskEmail(order.client_email)) : 'N/A'}
                      </span>
                    </div>
                    <div className='flex justify-between col-span-full'>
                      <span className='text-muted-foreground text-xs'>Language:</span>
                      <span className='font-medium text-xs'>{order.client_language || 'English'}</span>
                    </div>
                  </div>
                  {(order.client_phone || order.client_email) && (
                    <button
                      onClick={() => setRevealedContact(!revealedContact)}
                      className='flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors'
                    >
                      {revealedContact ? '🙈 Masquer' : '👁️ Afficher'}
                    </button>
                  )}
                  {order.client_id && (
                    <Link
                      href={`/orders/history?clientId=${order.client_id}`}
                      className='text-xs text-primary-600 hover:text-primary-800 hover:underline transition-colors'
                    >
                      📋 Voir l'historique des commandes
                    </Link>
                  )}
                  {order.client_notes && (
                    <div className='mt-2 pt-2 border-t border-border'>
                      <span className='text-muted-foreground text-xs font-medium'>
                        Client Notes:
                      </span>
                      <div className='mt-1 p-2 bg-yellow-50 rounded text-xs text-muted-foreground'>
                        {order.client_notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Measurements Section - Only show if there are measurements */}
              {Object.keys(orderMeasurements).length > 0 && (
                <div className='mb-4'>
                  <h3 className='text-base font-semibold text-foreground mb-2'>
                    📏 Mesures
                  </h3>
                  <div className='bg-purple-50 rounded-lg p-3'>
                    {Object.entries(orderMeasurements).map(([category, items]) => (
                      <div key={category} className='mb-4 last:mb-0'>
                        <h4 className='text-sm font-medium text-purple-700 mb-2 capitalize'>
                          {category === 'body' ? 'Mesures corporelles' :
                           category === 'curtain' ? 'Rideaux' :
                           category === 'upholstery' ? 'Rembourrage' : category}
                        </h4>
                        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                          {(items as any[]).map((m: any) => (
                            <div key={m.id} className='bg-white rounded p-2 text-center'>
                              <p className='text-xs text-muted-foreground'>{m.name_fr || m.name}</p>
                              <p className='text-lg font-semibold text-foreground'>
                                {m.value} <span className='text-xs font-normal text-muted-foreground'>{m.unit}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Garments */}
              <div className='mb-4'>
                <h3 className='text-base font-semibold text-foreground mb-2'>
                  Garments ({displayOrder.garments?.length || 0})
                </h3>
                <div className='space-y-3'>
                  {displayOrder.garments?.map((garment: any, index: number) => (
                    <div
                      key={garment.id || index}
                      className='border border-border rounded-lg p-3'
                    >
                      <div className='flex justify-between items-start mb-2'>
                        <div className='flex items-center gap-2'>
                          {garment.garment_type?.icon && (
                            <span className='text-lg'>
                              {garment.garment_type.icon}
                            </span>
                          )}
                          <h4 className='font-medium text-foreground'>
                            {garment.type}
                          </h4>
                          {garment.garment_type?.category && (
                            <span className='text-xs bg-muted text-muted-foreground px-2 py-1 rounded'>
                              {garment.garment_type.category}
                            </span>
                          )}
                        </div>
                        <span className='text-sm text-muted-foreground'>
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
                        <div className='mb-3 text-sm text-muted-foreground'>
                          No photo available
                        </div>
                      )}

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3'>
                        <div>
                          <span className='text-muted-foreground'>Color:</span>
                          <span className='ml-2'>
                            {garment.color || 'Not specified'}
                          </span>
                        </div>
                        <div>
                          <span className='text-muted-foreground'>Brand:</span>
                          <span className='ml-2'>
                            {garment.brand || 'Not specified'}
                          </span>
                        </div>
                      </div>

                      {/* Notes Section - Collapsible */}
                      <div className='mb-2'>
                        {editingGarmentId === garment.id ? (
                          <div className='space-y-2'>
                            <label className='block text-xs font-medium text-muted-foreground mb-1'>
                              Notes:
                            </label>
                            <Textarea
                              value={editingNotes}
                              onChange={e => setEditingNotes(e.target.value)}
                              rows={3}
                              className='w-full min-h-[60px] text-sm'
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
                                {savingNotes === garment.id ? 'Saving...' : 'Save'}
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
                          <CollapsibleNotes
                            notes={garment.notes}
                            onEdit={() => handleStartEditNotes(garment.id, garment.notes)}
                            label='Notes'
                            defaultExpanded={false}
                          />
                        )}
                      </div>

                      {/* Garment Time Estimate - Editable */}
                      <div className='mb-2 p-2 bg-purple-50 rounded'>
                        {editingTimeGarmentId === garment.id ? (
                          <div className='space-y-2'>
                            <label className='block text-xs font-medium text-purple-700'>
                              Estimated Time
                            </label>
                            <div className='flex items-center gap-2'>
                              <input
                                type='number'
                                min='0'
                                max='99'
                                value={editingTimeHours}
                                onChange={e => setEditingTimeHours(Math.max(0, parseInt(e.target.value) || 0))}
                                className='w-16 px-2 py-1 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500'
                                disabled={savingTime === garment.id}
                              />
                              <span className='text-xs text-purple-600'>h</span>
                              <input
                                type='number'
                                min='0'
                                max='59'
                                value={editingTimeMinutes}
                                onChange={e => setEditingTimeMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                className='w-16 px-2 py-1 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500'
                                disabled={savingTime === garment.id}
                              />
                              <span className='text-xs text-purple-600'>m</span>
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
                              Work Hours:{' '}
                              {(() => {
                                // Prefer actual_minutes (recorded work), fallback to estimated
                                const workMinutes = garment.actual_minutes || garment.estimated_minutes;
                                if (workMinutes && workMinutes > 0) {
                                  const h = Math.floor(workMinutes / 60);
                                  const m = workMinutes % 60;
                                  return h > 0 ? `${h}h ${m}m` : `${m}m`;
                                }
                                const totalMinutes = garment.services?.reduce(
                                  (sum: number, s: any) => {
                                    // Priority: garment_service.estimated_minutes > service.estimated_minutes
                                    const mins = s.estimated_minutes || s.service?.estimated_minutes || 0;
                                    return sum + mins * (s.quantity || 1);
                                  },
                                  0
                                ) || 0;
                                if (totalMinutes === 0) return 'Not recorded';
                                const h = Math.floor(totalMinutes / 60);
                                const m = totalMinutes % 60;
                                return h > 0 ? `${h}h ${m}m` : `${m}m`;
                              })()}
                            </span>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => {
                                // Load actual_minutes first, then estimated, then service defaults
                                const currentMinutes = garment.actual_minutes || garment.estimated_minutes ||
                                  garment.services?.reduce(
                                    (sum: number, s: any) => sum + (s.estimated_minutes || s.service?.estimated_minutes || 0) * (s.quantity || 1),
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

                      {/* Services for this garment - Updated with item-level pricing */}
                      {garment.services && garment.services.length > 0 && (
                        <div className='mt-2 pt-2 border-t border-border'>
                          <h5 className='text-xs font-medium text-blue-600 mb-1'>
                            Services Required:
                          </h5>
                          <div className='space-y-1'>
                            {garment.services.map((service: any, serviceIndex: number) => {
                              const priceInfo = getServicePriceInfo(service);
                              const isEditing = editingServicePrice === service.id;
                              const isSaving = savingServicePrice === service.id;

                              return (
                                <div
                                  key={service.id || serviceIndex}
                                  className='bg-blue-50 rounded-lg p-2'
                                >
                                  <div className='flex justify-between items-start'>
                                    <div className='flex-1'>
                                      <h6 className='font-medium text-foreground'>
                                        {service.service?.name ||
                                          service.custom_service_name ||
                                          'Service'}
                                      </h6>
                                      {service.service?.description && (
                                        <p className='text-sm text-muted-foreground mt-1'>
                                          {service.service.description}
                                        </p>
                                      )}
                                      {service.notes && (
                                        <div className='mt-2'>
                                          <span className='text-xs font-medium text-muted-foreground'>
                                            Service Notes:
                                          </span>
                                          <p className='text-xs text-muted-foreground mt-1 bg-white rounded p-2'>
                                            {service.notes}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    <div className='text-right text-sm ml-4 min-w-[140px]'>
                                      <div className='text-muted-foreground'>
                                        Qty: {service.quantity}
                                      </div>

                                      {/* Estimated Price (readonly) */}
                                      <div className='text-xs text-muted-foreground mt-1'>
                                        Est: ${(priceInfo.estimatedTotalCents / 100).toFixed(2)}
                                      </div>

                                      {/* Final Price (editable) */}
                                      {isEditing ? (
                                        <div className='mt-2 space-y-1'>
                                          <div className='flex items-center gap-1'>
                                            <span className='text-xs'>$</span>
                                            <input
                                              type='number'
                                              step='0.01'
                                              value={(editServicePriceCents / 100).toFixed(2)}
                                              onChange={(e) => setEditServicePriceCents(
                                                Math.round(parseFloat(e.target.value || '0') * 100)
                                              )}
                                              className='w-20 px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500'
                                              disabled={isSaving}
                                              autoFocus
                                            />
                                          </div>
                                          <div className='flex gap-1'>
                                            <Button
                                              size='sm'
                                              onClick={() => handleSaveServicePrice(service.id)}
                                              disabled={isSaving}
                                              className='bg-blue-600 hover:bg-blue-700 text-xs h-6 px-2'
                                            >
                                              {isSaving ? '...' : 'Save'}
                                            </Button>
                                            <Button
                                              size='sm'
                                              variant='outline'
                                              onClick={handleCancelEditServicePrice}
                                              disabled={isSaving}
                                              className='text-xs h-6 px-2'
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className='mt-1'>
                                          <div className='flex items-center justify-end gap-1'>
                                            <span className={`font-medium ${priceInfo.hasFinalPrice ? 'text-green-700' : 'text-foreground'}`}>
                                              ${(priceInfo.totalCents / 100).toFixed(2)}
                                            </span>
                                            {priceInfo.hasFinalPrice && (
                                              <span className='text-[10px] text-green-600 font-medium'>FINAL</span>
                                            )}
                                          </div>
                                          <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => handleStartEditServicePrice(
                                              service.id,
                                              priceInfo.activePriceCents
                                            )}
                                            className='text-xs text-blue-600 hover:text-blue-800 h-5 px-1 mt-1'
                                          >
                                            Edit Price
                                          </Button>
                                        </div>
                                      )}

                                      {service.service?.estimated_minutes && (
                                        <div className='text-xs text-muted-foreground mt-1'>
                                          Est time:{' '}
                                          {Math.floor(service.service.estimated_minutes / 60)}h{' '}
                                          {service.service.estimated_minutes % 60}m
                                          {service.quantity > 1 && ` x ${service.quantity}`}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Garment Task Summary */}
                      <div className='mt-4 pt-3 border-t border-border'>
                        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2'>
                          <GarmentTaskSummary
                            garmentId={garment.id}
                            orderId={displayOrder.id}
                            orderStatus={displayOrder.status}
                            services={garment.services}
                          />
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => {
                              setSelectedGarmentForTasks(garment.id);
                              setShowTaskModal(true);
                            }}
                            className='text-xs shrink-0'
                          >
                            <ClipboardList className='w-4 h-4 mr-1' />
                            Manage Tasks
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className='mb-4'>
                <h3 className='text-base font-semibold text-foreground mb-2'>
                  Pricing
                </h3>
                <div className='bg-muted/50 rounded-lg p-3'>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Subtotal:</span>
                      <span className='font-medium'>
                        {formatCurrency(displayOrder.subtotal_cents || 0)}
                      </span>
                    </div>
                    {displayOrder.rush_fee_cents > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
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
                          <span className='text-muted-foreground'>TPS: Canada tax</span>
                          <span className='font-medium'>
                            {formatCurrency(displayOrder.tps_cents || 0)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>TVQ: Québec tax</span>
                          <span className='font-medium'>
                            {formatCurrency(displayOrder.tvq_cents || 0)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Tax:</span>
                        <span className='font-medium'>
                          {formatCurrency(displayOrder.tax_cents || 0)}
                        </span>
                      </div>
                    )}
                    <div className='flex justify-between items-center border-t border-border pt-2'>
                      <span className='text-lg font-semibold text-foreground'>
                        Total:
                      </span>
                      {editingPrice ? (
                        <div className='flex items-center gap-2'>
                          <span className='text-sm text-muted-foreground'>$</span>
                          <input
                            type='number'
                            step='0.01'
                            value={(editPriceCents / 100).toFixed(2)}
                            onChange={(e) => setEditPriceCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                            className='w-24 px-2 py-1 text-sm border border-primary-300 rounded focus:ring-2 focus:ring-primary-500'
                            disabled={savingPrice}
                          />
                          <Button
                            size='sm'
                            onClick={handleSavePrice}
                            disabled={savingPrice}
                            className='bg-primary-600 hover:bg-primary-700 text-xs h-7 px-2'
                          >
                            {savingPrice ? '...' : 'OK'}
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={handleCancelEditPrice}
                            disabled={savingPrice}
                            className='text-xs h-7 px-2'
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <span className='text-lg font-semibold text-foreground'>
                          {formatCurrency(displayOrder.total_cents || 0)}
                        </span>
                      )}
                    </div>
                    {displayOrder.deposit_cents > 0 && (
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Deposit Paid:</span>
                        <span className='font-medium'>
                          {formatCurrency(displayOrder.deposit_cents)}
                        </span>
                      </div>
                    )}
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>Balance Due:</span>
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

              {/* Payment Section */}
              <div className='mb-4'>
                <PaymentStatusSection
                  order={{
                    id: displayOrder.id,
                    order_number: displayOrder.order_number,
                    type: displayOrder.type || 'alteration',
                    total_cents: displayOrder.total_cents || 0,
                    deposit_cents: displayOrder.deposit_cents || 0,
                    deposit_paid_at: displayOrder.deposit_paid_at || null,
                    balance_due_cents: displayOrder.balance_due_cents || displayOrder.total_cents || 0,
                    payment_status: displayOrder.payment_status || 'unpaid',
                    paid_at: displayOrder.paid_at || null,
                    payment_method: displayOrder.payment_method || null,
                    deposit_payment_method: displayOrder.deposit_payment_method || null,
                  }}
                  onPaymentUpdate={fetchOrderDetails}
                />
              </div>

              {/* Actions */}
              <div className='flex flex-wrap justify-end gap-2'>
                {/* Archive/Unarchive Button */}
                {displayOrder.status === 'archived' ? (
                  <HoldToArchiveButton
                    variant='unarchive'
                    onComplete={handleUnarchive}
                    disabled={archiving}
                  />
                ) : (
                  <HoldToArchiveButton
                    variant='archive'
                    onComplete={handleArchive}
                    disabled={archiving}
                  />
                )}
                <Button variant='outline' onClick={onClose}>
                  Close
                </Button>
                <Button variant='outline' onClick={() => setShowTaskModal(true)}>
                  Manage Tasks
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

      {/* Task Management Modal */}
      <TaskManagementModal
        orderId={displayOrder.id}
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedGarmentForTasks(null);
        }}
        {...(selectedGarmentForTasks ? { garmentId: selectedGarmentForTasks } : {})}
        onSaveAndClose={() => {
          setShowTaskModal(false);
          setSelectedGarmentForTasks(null);
          fetchOrderDetails(); // Refresh order after task changes
        }}
      />
    </div>
  );
}
