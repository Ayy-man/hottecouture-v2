'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InteractiveBoard } from '@/components/board/interactive-board';
import { PipelineFilter } from '@/components/board/pipeline-filter';
import { ArchiveButton } from '@/components/board/archive-button';
import { OrderType } from '@/lib/types/database';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import { AuthGuard } from '@/components/auth/auth-guard';
import Link from 'next/link';

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

  const handleForceReload = () => {
    console.log('🔄 Force page reload triggered');
    window.location.reload();
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

  if (loading) {
    return (
      <div className='p-8'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-lg text-gray-600'>Loading board...</p>
          </div>
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
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50'>
        <div className='container mx-auto px-4 py-8 ipad-landscape:px-2'>
          {/* Header */}
          <div className='mb-6 ipad:mb-8 lg:mb-10 text-center'>
            <h1 className='text-3xl sm:text-4xl ipad:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 ipad:mb-3'>
              Kanban Board
            </h1>
            <p className='text-sm sm:text-base ipad:text-sm lg:text-lg text-gray-600 max-w-2xl mx-auto'>
              Order Management Dashboard - Drag & Drop to Update Status
            </p>
          </div>

          {/* Pipeline Filter */}
          <div className='mb-4 ipad:mb-5 lg:mb-6 flex flex-col ipad:flex-row items-start ipad:items-center justify-between gap-3 ipad:gap-4'>
            <PipelineFilter
              orders={orders}
              selectedPipeline={selectedPipeline}
              onPipelineChange={setSelectedPipeline}
            />
            <div className='flex gap-2 ipad:gap-3'>
              <ArchiveButton onArchiveComplete={handleRefresh} />
              <Button
                onClick={() => (window.location.href = '/clients')}
                variant='outline'
                size='sm'
                className='btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300 border-gray-300 px-4 py-2'
              >
                👥 Clients
              </Button>
              <Button
                asChild
                className='btn-press bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-2'
              >
                <Link href='/intake'>Create New Order</Link>
              </Button>
            </div>
          </div>

          {/* Interactive Board */}
          <InteractiveBoard
            orders={filteredOrders}
            onOrderUpdate={handleOrderUpdate}
            updatingOrders={updatingOrders}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
