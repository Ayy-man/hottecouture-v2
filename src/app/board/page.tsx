'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InteractiveBoard } from '@/components/board/interactive-board';
import { OrderListView } from '@/components/board/order-list-view';
import { PipelineFilter } from '@/components/board/pipeline-filter';
import { ArchiveButton } from '@/components/board/archive-button';
import { OrderType } from '@/lib/types/database';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoadingLogo } from '@/components/ui/loading-logo';
import { MuralBackground } from '@/components/ui/mural-background';
import { WorkListExport } from '@/components/board/worklist-export';
import { SmsConfirmationModal } from '@/components/board/sms-confirmation-modal';
import { LayoutGrid, List, Users, Settings } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Read order query param
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialOrderNumber = urlParams?.get('order') || null;

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

        // Force a fresh state update
        setOrders([]);
        setTimeout(() => {
          setOrders(result.orders || []);
          setLoading(false);
        }, 100);
      } catch (err) {
        console.error('❌ Error fetching orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
        setLoading(false);
      }
    };

    fetchOrders();
  }, [refreshKey]);

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

    const originalOrder = orders.find(o => o.id === orderId);
    const originalStatus = originalOrder?.status || 'pending';

    setUpdatingOrders(prev => new Set(prev).add(orderId));

    // OPTIMISTIC UPDATE
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    try {
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
        throw new Error(`Failed to update order: ${response.status} - ${errorText}`);
      }

      await response.json();
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      console.error('❌ Error updating order:', err);
      // REVERT
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: originalStatus } : order
        )
      );

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('work time') || errorMessage.includes('timer')) {
        alert('Cannot mark as done: Please record work hours using the timer first.');
      }
    } finally {
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

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen bg-stone-50'>
        <LoadingLogo />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen bg-stone-50'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>
            Unable to load orders
          </h1>
          <p className='text-gray-600 mb-4'>{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className='h-screen bg-stone-50 overflow-hidden'>
        <MuralBackground>
          <div className='flex flex-col h-full relative z-10'>
            {/* Header */}
            <header className='bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 py-4 shadow-sm flex-none'>
              <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 max-w-[1920px] mx-auto w-full'>
                <div className='flex items-center gap-4'>
                  <h1 className='text-xl sm:text-2xl font-bold text-stone-800 tracking-tight'>
                    Production Board
                  </h1>
                  <div className='h-6 w-px bg-stone-300 hidden sm:block' />
                  <div className='flex bg-stone-100 p-1 rounded-lg border border-stone-200'>
                    <Button
                      variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                      size='sm'
                      onClick={() => setViewMode('kanban')}
                      className={`gap-2 h-8 ${viewMode === 'kanban' ? 'shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-900'}`}
                    >
                      <LayoutGrid className='w-4 h-4' />
                      <span className='hidden sm:inline'>Board</span>
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size='sm'
                      onClick={() => setViewMode('list')}
                      className={`gap-2 h-8 ${viewMode === 'list' ? 'shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-900'}`}
                    >
                      <List className='w-4 h-4' />
                      <span className='hidden sm:inline'>List</span>
                    </Button>
                  </div>
                  <div className='hidden md:block'>
                    <PipelineFilter
                      orders={orders}
                      selectedPipeline={selectedPipeline}
                      onPipelineChange={setSelectedPipeline}
                    />
                  </div>
                </div>

                <div className='flex items-center gap-3 w-full sm:w-auto'>
                  <div className='md:hidden flex-1'>
                    <PipelineFilter
                      orders={orders}
                      selectedPipeline={selectedPipeline}
                      onPipelineChange={setSelectedPipeline}
                    />
                  </div>
                  <Button
                    variant='outline'
                    asChild
                    className='hidden sm:flex border-stone-300 hover:bg-stone-50 hover:text-stone-900'
                  >
                    <Link href='/board/workload' className='flex items-center gap-2'>
                      <Users className='w-4 h-4' />
                      <span>Workload</span>
                    </Link>
                  </Button>
                  <div className='hidden sm:block'>
                    <ArchiveButton />
                  </div>
                  <Button
                    variant='outline'
                    asChild
                    className='hidden sm:flex border-stone-300 hover:bg-stone-50 hover:text-stone-900'
                  >
                    <Link href='/admin/staff' className='flex items-center gap-2'>
                      <Settings className='w-4 h-4' />
                      <span>Staff</span>
                    </Link>
                  </Button>
                  <Button asChild className='bg-stone-900 hover:bg-black text-white shadow-lg shadow-stone-900/20'>
                    <Link href='/intake'>New Order</Link>
                  </Button>
                </div>
              </div>
            </header>

            {/* Board Area */}
            <main className='flex-1 overflow-hidden relative'>
              <div className='h-full w-full max-w-[1920px] mx-auto p-4 sm:p-6'>
                {viewMode === 'kanban' ? (
                  <InteractiveBoard
                    orders={orders.filter(
                      o =>
                        selectedPipeline === 'all' || o.type === selectedPipeline
                    )}
                    onOrderUpdate={handleOrderUpdate}
                    updatingOrders={updatingOrders}
                    initialOrderNumber={initialOrderNumber}
                  />
                ) : (
                  <OrderListView
                    orders={orders.filter(
                      o =>
                        selectedPipeline === 'all' || o.type === selectedPipeline
                    )}
                    onOrderUpdate={handleOrderUpdate}
                    updatingOrders={updatingOrders}
                  />
                )}
              </div>
            </main>
          </div>

          <SmsConfirmationModal
            isOpen={!!pendingSmsConfirmation}
            onCancel={() => setPendingSmsConfirmation(null)}
            onConfirm={handleSmsConfirm}
            clientName={pendingSmsConfirmation?.clientName || ''}
            orderNumber={pendingSmsConfirmation?.orderNumber || 0}
          />

          {/* Export Button (Bottom Left) */}
          <div className='fixed bottom-6 left-6 z-50'>
            <Button
              variant='secondary'
              size='sm'
              className='bg-white/90 backdrop-blur border border-stone-200 shadow-sm hover:bg-white text-xs'
              onClick={() => setShowWorkListExport(true)}
            >
              Export Work List
            </Button>
          </div>

          {/* Export Modal */}
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
        </MuralBackground>
      </div>
    </AuthGuard>
  );
}
