'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InteractiveBoard } from '@/components/board/interactive-board';
import { OrderListView } from '@/components/board/order-list-view';
import { PipelineFilter } from '@/components/board/pipeline-filter';
import { AssigneeFilter } from '@/components/board/assignee-filter';
import { useToast } from '@/components/ui/toast';
import { OrderType } from '@/lib/types/database';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoadingLogo } from '@/components/ui/loading-logo';
import { MuralBackground } from '@/components/ui/mural-background';
import { WorkListExport } from '@/components/board/worklist-export';
import { LayoutGrid, List, Users, MoreHorizontal, Archive, FileSpreadsheet } from 'lucide-react';
import { triggerDownload } from '@/lib/exports/csv-utils';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useStaffSession } from '@/components/staff';
import { useTranslations } from 'next-intl';

export default function BoardPage() {
  console.log('🎯 Board page rendering...');
  const t = useTranslations('board');
  const toast = useToast();
  const { currentStaff, isLoading: isStaffLoading } = useStaffSession();
  const isSeamstress = currentStaff?.staffRole === 'seamstress';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<OrderType | 'all'>(
    'all'
  );
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [refreshKey] = useState(0);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [showWorkListExport, setShowWorkListExport] = useState(false);
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
    if (isStaffLoading) return;
    setLoading(true);
    try {
      // Fetch with proper cache busting
      let url = `/api/orders?ts=${Date.now()}`;
      if (isSeamstress && currentStaff?.staffId) {
        url += `&seamstressId=${currentStaff.staffId}`;
      }
      const response = await fetch(url, {
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
    // Gate on staff session resolution to prevent double-fetch during localStorage hydration.
    // While isStaffLoading is true, isSeamstress would be false (session is null),
    // causing an unfiltered fetch followed by a filtered one once session resolves.
    if (isStaffLoading) return;

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

        // Build fetch URL — append seamstressId for seamstress role to get API-level filtering
        let url = `/api/orders?ts=${Date.now()}`;
        if (isSeamstress && currentStaff?.staffId) {
          url += `&seamstressId=${currentStaff.staffId}`;
          console.log('🔍 Board: Fetching seamstress-filtered orders for:', currentStaff.staffId);
        }
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
  }, [refreshKey, isStaffLoading, isSeamstress, currentStaff?.staffId]);

  const handleOrderUpdate = async (orderId: string, newStatus: string) => {
    console.log(`🔄 Updating order ${orderId} to status: ${newStatus}`);
    // All status changes (including ready) proceed immediately.
    // Notifications are now auto-fired server-side in the stage handler.
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

      const result = await response.json();
      // Use actual status from API response (handles auto-archive/unarchive cases)
      const actualStatus = result.status || newStatus;
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: actualStatus } : order
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
      if (errorMessage.includes('work time')) {
        toast.error(t('errors.recordWorkHoursFirst'));
      }
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen bg-background'>
        <LoadingLogo />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen bg-background'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>
            {t('errors.unableToLoad')}
          </h1>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={() => window.location.reload()}>{t('errors.tryAgain')}</Button>
        </div>
      </div>
    );
  }

  // Export handlers - BUG-001: improved error messages
  const handleExportSeamstress = async (seamstressId: string, seamstressName: string) => {
    try {
      const response = await fetch(`/api/admin/export/seamstress?seamstressId=${seamstressId}`);
      const data = await response.json();
      if (data.success) {
        triggerDownload(data.csvContent, data.filename);
        toast.success(t('actions.exportedTasks', { name: seamstressName }));
      } else {
        toast.error(data.error || t('actions.exportFailed'));
        console.error('Export error details:', data);
      }
    } catch (error) {
      toast.error(t('actions.exportNetworkError'));
      console.error('Export network error:', error);
    }
  };

  const handleExportOrders = async () => {
    try {
      const response = await fetch('/api/admin/export/orders');
      const data = await response.json();
      if (data.success) {
        triggerDownload(data.csvContent, data.filename);
        toast.success(t('actions.ordersExported'));
      } else {
        toast.error(data.error || t('actions.exportFailed'));
        console.error('Export error details:', data);
      }
    } catch (error) {
      toast.error(t('actions.exportNetworkError'));
      console.error('Export network error:', error);
    }
  };

  const handleExportCapacity = async () => {
    try {
      const response = await fetch('/api/admin/export/capacity');
      const data = await response.json();
      if (data.success) {
        triggerDownload(data.csvContent, data.filename);
        toast.success(t('actions.capacityExported'));
      } else {
        toast.error(data.error || t('actions.exportFailed'));
        console.error('Export error details:', data);
      }
    } catch (error) {
      toast.error(t('actions.exportNetworkError'));
      console.error('Export network error:', error);
    }
  };

  // Filter orders helper function
  const filterOrders = (ordersToFilter: any[]) => {
    return ordersToFilter.filter(o => {
      // Pipeline filter
      if (selectedPipeline !== 'all' && o.type !== selectedPipeline) {
        return false;
      }

      // Assignee filter
      if (selectedAssigneeId) {
        if (selectedAssigneeId === 'unassigned') {
          // Show orders with NO assigned items
          const hasAssignment = (o.garments || []).some((g: any) =>
            (g.services || []).some((s: any) => s.assigned_seamstress_id)
          );
          return !hasAssignment;
        } else {
          // Show orders that have at least one item assigned to the selected seamstress
          const hasMatchingAssignment = (o.garments || []).some((g: any) =>
            (g.services || []).some((s: any) => s.assigned_seamstress_id === selectedAssigneeId)
          );
          return hasMatchingAssignment;
        }
      }

      return true;
    });
  };

  const filteredOrders = filterOrders(orders);

  return (
    <AuthGuard>
      <div className='h-full bg-background overflow-hidden'>
        <MuralBackground>
          <div className='flex flex-col h-full relative z-10 overflow-y-auto'>
            {/* Header */}
            <header className='sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4 shadow-sm'>
              <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 max-w-[1920px] mx-auto w-full'>
                <div className='flex items-center gap-4'>
                  <h1 className='text-xl sm:text-2xl font-bold text-foreground tracking-tight'>
                    {t('title')}
                  </h1>
                  <div className='h-6 w-px bg-border hidden sm:block' />
                  <div className='flex bg-muted p-1 rounded-lg border border-border'>
                    <Button
                      variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                      size='sm'
                      onClick={() => setViewMode('kanban')}
                      className={`gap-2 h-8 ${viewMode === 'kanban' ? 'shadow-sm ring-1 ring-black/5' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <LayoutGrid className='w-4 h-4' />
                      <span className='hidden sm:inline'>{t('viewMode.board')}</span>
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size='sm'
                      onClick={() => setViewMode('list')}
                      className={`gap-2 h-8 ${viewMode === 'list' ? 'shadow-sm ring-1 ring-black/5' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <List className='w-4 h-4' />
                      <span className='hidden sm:inline'>{t('viewMode.list')}</span>
                    </Button>
                  </div>
                  <div className='hidden md:flex items-center gap-2'>
                    <PipelineFilter
                      orders={orders}
                      selectedPipeline={selectedPipeline}
                      onPipelineChange={setSelectedPipeline}
                    />
                    {!isSeamstress && (
                      <AssigneeFilter
                        orders={orders}
                        selectedAssigneeId={selectedAssigneeId}
                        onAssigneeChange={setSelectedAssigneeId}
                        onExportSeamstress={handleExportSeamstress}
                      />
                    )}
                  </div>
                </div>

                <div className='flex items-center gap-2 w-full sm:w-auto'>
                  <div className='md:hidden flex-1 flex items-center gap-2'>
                    <PipelineFilter
                      orders={orders}
                      selectedPipeline={selectedPipeline}
                      onPipelineChange={setSelectedPipeline}
                    />
                    {!isSeamstress && (
                      <AssigneeFilter
                        orders={orders}
                        selectedAssigneeId={selectedAssigneeId}
                        onAssigneeChange={setSelectedAssigneeId}
                        onExportSeamstress={handleExportSeamstress}
                      />
                    )}
                  </div>
                  {!isSeamstress && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          className='hidden sm:flex border-border hover:bg-background h-8 px-2'
                        >
                          <MoreHorizontal className='w-4 h-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem asChild>
                          <Link href='/board/workload' className='flex items-center gap-2'>
                            <Users className='w-4 h-4' />
                            <span>{t('menu.workload')}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href='/archived' className='flex items-center gap-2'>
                            <Archive className='w-4 h-4' />
                            <span>{t('menu.archivedOrders')}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportOrders}>
                          <FileSpreadsheet className='w-4 h-4 mr-2' />
                          <span>{t('menu.exportOrders')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportCapacity}>
                          <FileSpreadsheet className='w-4 h-4 mr-2' />
                          <span>{t('menu.exportCapacity')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {!isSeamstress && (
                    <Button asChild size='sm' className='bg-foreground hover:bg-black text-white shadow-lg shadow-foreground/20 h-8'>
                      <Link href='/intake'>{t('menu.newOrder')}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </header>

            {/* Board Area */}
            <main className='flex-1 relative'>
              <div className='h-full w-full max-w-[1920px] mx-auto p-4 sm:p-6'>
                {viewMode === 'kanban' ? (
                  <InteractiveBoard
                    orders={filteredOrders}
                    onOrderUpdate={handleOrderUpdate}
                    updatingOrders={updatingOrders}
                    initialOrderNumber={initialOrderNumber}
                  />
                ) : (
                  <OrderListView
                    orders={filteredOrders}
                    onOrderUpdate={handleOrderUpdate}
                    updatingOrders={updatingOrders}
                  />
                )}
              </div>
            </main>
          </div>

          {/* Export Button (Bottom Left) - above mobile nav on small screens — hidden for seamstresses */}
          {!isSeamstress && (
            <div className='fixed bottom-20 md:bottom-8 left-4 md:left-6 z-40'>
              <Button
                variant='secondary'
                size='sm'
                className='bg-white/90 backdrop-blur border border-border shadow-sm hover:bg-white text-xs touch-target-sm text-foreground'
                onClick={() => setShowWorkListExport(true)}
              >
                {t('menu.exportOrders')}
              </Button>
            </div>
          )}

          {/* Export Modal */}
          {showWorkListExport && (
            <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
              <div className='bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto'>
                <div className='p-4 border-b border-border'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-lg font-semibold text-foreground'>
                      {t('menu.exportOrders')}
                    </h3>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setShowWorkListExport(false)}
                      className='text-muted-foreground/70 hover:text-muted-foreground'
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
