'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InteractiveBoard } from '@/components/board/interactive-board';
import { PipelineFilter } from '@/components/board/pipeline-filter';
import { ArchiveButton } from '@/components/board/archive-button';
import { OrderType } from '@/lib/types/database';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoadingLogo } from '@/components/ui/loading-logo';
import { MuralBackground } from '@/components/ui/mural-background';
import { WorkListExport } from '@/components/board/worklist-export';
import { SmsConfirmationModal } from '@/components/board/sms-confirmation-modal';
import Link from 'next/link';

interface PendingSmsConfirmation {
  orderId: string;
  orderNumber: number;
  clientName: string;
  newStatus: string;
}

export default function BoardPage() {
  console.log('🎯 Board page rendering...');

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<OrderType | 'all'>(
    'all'
  );
  const [refreshKey] = useState(0);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [showWorkListExport, setShowWorkListExport] = useState(false);
  const [pendingSmsConfirmation, setPendingSmsConfirmation] = useState<PendingSmsConfirmation | null>(null);

  // Real-time refresh trigger
  const realtimeTrigger = useRealtimeOrders();

  // Auto-refresh when real-time changes are detected
  useEffect(() => {
    if (realtimeTrigger > 0) {
      console.log('🔄 Real-time change detected, refreshing orders...');
      handleRefresh();
    }
  }, [realtimeTrigger]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Fetch with proper cache busting
      const response = await fetch(`/api/orders?ts=${Date.now()}`, {
        cache: 'no-store',
        next: { revalidate: 0 },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        console.log('🔄 Manual refresh completed:', {
          count: data.orders?.length || 0,
          timestamp: data.timestamp,
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear orders state first to ensure we start fresh
    setOrders([]);
    setLoading(true);
    setError(null);

    // Check if this is a refresh from order creation
    const urlParams = new URLSearchParams(window.location.search);
    const isRefresh = urlParams.get('refresh') === 'true';

    if (isRefresh) {
      console.log('🔄 Board: Fresh refresh from order creation detected');
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchOrders = async () => {
      try {
        console.log('🔍 Fetching orders from Supabase...');
        console.log(
          '🔍 Board: Current orders state before fetch:',
          orders.length
        );

        // Fetch real orders from Supabase with proper cache busting
        const url = `/api/orders?ts=${Date.now()}`;
        console.log('🔍 Board: Fetching from URL:', url);

        const response = await fetch(url, {
          cache: 'no-store',
          next: { revalidate: 0 },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('📊 Orders result:', result);
        console.log('📊 Orders count from API:', result.orders?.length || 0);
        console.log('📊 API timestamp:', result.timestamp);
        console.log('📊 API source:', result.source);

        console.log(
          '📊 Board: Setting orders from API response:',
          result.orders?.length || 0
        );
        console.log('📊 Board: API response details:', {
          success: result.success,
          count: result.count,
          timestamp: result.timestamp,
          source: result.source,
        });

        console.log(
          '🔍 Board: About to set orders state with:',
          result.orders?.length || 0,
          'orders'
        );
        console.log('🔍 Board: Raw orders data:', result.orders);

        // Force a fresh state update
        setOrders([]);
        setTimeout(() => {
          setOrders(result.orders || []);
          setLoading(false);
          console.log(
            '🔍 Board: Orders state set, should now have:',
            result.orders?.length || 0,
            'orders'
          );
        }, 100);
      } catch (err) {
        console.error('❌ Error fetching orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
        setLoading(false);
      }
    };

    fetchOrders();
  }, [refreshKey]);

  // Track orders state changes
  useEffect(() => {
    console.log('🔍 Board: Orders state changed to:', orders.length, 'orders');
    console.log('🔍 Board: First few orders:', orders.slice(0, 3));
  }, [orders]);

  const handleOrderUpdate = async (orderId: string, newStatus: string) => {
    console.log(`🔄 Updating order ${orderId} to status: ${newStatus}`);

    const targetOrder = orders.find(o => o.id === orderId);
    
    // If moving to "ready", show SMS confirmation modal instead of immediate update
    if (newStatus === 'ready' && targetOrder) {
      setPendingSmsConfirmation({
        orderId,
        orderNumber: targetOrder.order_number,
        clientName: targetOrder.client_name || 'Client',
        newStatus,
      });
      return;
    }

    // For other status changes, proceed immediately without notification
    await executeOrderUpdate(orderId, newStatus, false);
  };

  const executeOrderUpdate = async (orderId: string, newStatus: string, sendNotification: boolean) => {
    console.log(`🔄 Executing order update: ${orderId} to ${newStatus}, sendNotification: ${sendNotification}`);

    // Store original status for potential revert
    const originalOrder = orders.find(o => o.id === orderId);
    const originalStatus = originalOrder?.status || 'pending';

    // Mark order as updating
    setUpdatingOrders(prev => new Set(prev).add(orderId));

    // OPTIMISTIC UPDATE: Immediately update the UI
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    try {
      // Generate a correlation ID for this request
      const correlationId = crypto.randomUUID();

      const response = await fetch(`/api/order/${orderId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          stage: newStatus,
          correlationId: correlationId,
          sendNotification: sendNotification,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(
          `Failed to update order: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log('API Response:', result);

      // Update local state with server response (in case server made additional changes)
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      console.log(`✅ Order ${orderId} updated to ${newStatus}`);
    } catch (err) {
      console.error('❌ Error updating order:', err);

      // REVERT OPTIMISTIC UPDATE: Restore the original status
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: originalStatus } : order
        )
      );

      // You could add a toast notification here to inform the user
      console.log(
        `🔄 Reverted order ${orderId} to original status due to API error`
      );
    } finally {
      // Remove order from updating set
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleSmsConfirm = () => {
    if (pendingSmsConfirmation) {
      executeOrderUpdate(pendingSmsConfirmation.orderId, pendingSmsConfirmation.newStatus, true);
      setPendingSmsConfirmation(null);
    }
  };

  const handleSmsCancel = () => {
    if (pendingSmsConfirmation) {
      executeOrderUpdate(pendingSmsConfirmation.orderId, pendingSmsConfirmation.newStatus, false);
      setPendingSmsConfirmation(null);
    }
  };

  if (loading) {
    return (
      <div className='p-8'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <LoadingLogo size='xl' text='Loading board...' />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-6'>
          <h2 className='text-xl font-semibold text-red-800 mb-2'>
            Error Loading Board
          </h2>
          <p className='text-red-600 mb-4'>{error}</p>
          <Button onClick={() => window.location.reload()} variant='outline'>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Filter orders by selected pipeline
  const filteredOrders =
    selectedPipeline === 'all'
      ? orders
      : orders.filter(order => order.type === selectedPipeline);

  console.log('📊 Board: Filtered orders count:', filteredOrders.length);
  console.log('📊 Board: Selected pipeline:', selectedPipeline);
  console.log(
    '📊 Board: First few filtered orders:',
    filteredOrders.slice(0, 3)
  );

  return (
    <AuthGuard>
      <MuralBackground useMuralBackground={true} opacity={0.08}>
        <div className='w-full max-w-none px-4 py-4 ipad-landscape:px-2 h-full flex flex-col overflow-hidden'>
          {/* Compact Header */}
          <div className='mb-3 text-center'>
            <h1 className='text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary-600 to-accent-olive bg-clip-text text-transparent mb-1'>
              Kanban Board
            </h1>
            <p className='text-xs sm:text-sm text-text-secondary max-w-2xl mx-auto'>
              Order Management Dashboard - Drag & Drop to Update Status
            </p>
          </div>

          {/* Compact Pipeline Filter */}
          <div className='mb-2 flex flex-col ipad:flex-row items-start ipad:items-center justify-between gap-2'>
            <PipelineFilter
              orders={orders}
              selectedPipeline={selectedPipeline}
              onPipelineChange={setSelectedPipeline}
            />
            <div className='flex gap-1'>
              <Button
                onClick={() => setShowWorkListExport(true)}
                variant='outline'
                size='sm'
                className='btn-press bg-gradient-to-r from-secondary-100 to-secondary-200 hover:from-secondary-200 hover:to-secondary-300 text-secondary-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-secondary-300 px-2 py-1 text-xs'
              >
                📊 Export Tasks
              </Button>
              <ArchiveButton onArchiveComplete={handleRefresh} />
              <Button
                onClick={() => (window.location.href = '/clients')}
                variant='outline'
                size='sm'
                className='btn-press bg-gradient-to-r from-accent-taupe/20 to-accent-taupe/30 hover:from-accent-taupe/30 hover:to-accent-taupe/40 text-accent-contrast font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-accent-taupe/40 px-2 py-1 text-xs'
              >
                👥 Clients
              </Button>
              <Button
                asChild
                className='btn-press bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 px-2 py-1 text-xs'
              >
                <Link href='/intake'>Create New Order</Link>
              </Button>
            </div>
          </div>

          {/* Board area - Same height chain as intake form */}
          <div className='flex-1 min-h-0 overflow-hidden'>
            <InteractiveBoard
              orders={filteredOrders}
              onOrderUpdate={handleOrderUpdate}
              updatingOrders={updatingOrders}
            />
          </div>
        </div>

        {/* Work List Export Modal */}
        {showWorkListExport && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
            <div className='bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto'>
              <div className='p-4 border-b border-gray-200'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Export Work List
                  </h3>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowWorkListExport(false)}
                    className='text-gray-400 hover:text-gray-600'
                  >
                    ✕
                  </Button>
                </div>
              </div>
              <div className='p-4'>
                <WorkListExport
                  onExportComplete={() => setShowWorkListExport(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* SMS Confirmation Modal */}
        <SmsConfirmationModal
          isOpen={pendingSmsConfirmation !== null}
          orderNumber={pendingSmsConfirmation?.orderNumber || 0}
          clientName={pendingSmsConfirmation?.clientName || ''}
          onConfirm={handleSmsConfirm}
          onCancel={handleSmsCancel}
        />
      </MuralBackground>
    </AuthGuard>
  );
}
