'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { DroppableColumn } from './droppable-column';
import { OrderDetailModal } from './order-detail-modal';

import { RushOrderCard } from '@/components/rush-orders/rush-indicator';

const COLUMNS = [
  {
    id: 'pending',
    title: 'Pending',
    description: 'New orders awaiting assignment',
  },
  {
    id: 'working',
    title: 'Working',
    description: 'Orders currently in progress',
  },
  { id: 'done', title: 'Done', description: 'Completed work awaiting review' },
  { id: 'ready', title: 'Ready', description: 'Ready for pickup or delivery' },
  {
    id: 'delivered',
    title: 'Delivered',
    description: 'Completed and delivered',
  },
];

interface InteractiveBoardProps {
  orders: any[];
  onOrderUpdate?: (orderId: string, newStatus: string) => void;
  updatingOrders?: Set<string>;
}

export function InteractiveBoard({
  orders,
  onOrderUpdate,
  updatingOrders = new Set(),
  initialOrderNumber,
}: InteractiveBoardProps & { initialOrderNumber?: string | null }) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [justMovedOrder, setJustMovedOrder] = useState<string | null>(null);
  const [hasOpenedInitial, setHasOpenedInitial] = useState(false);

  console.log('🎯 InteractiveBoard: Received orders count:', orders.length);

  // Auto-open order from URL if present
  if (initialOrderNumber && !hasOpenedInitial && orders.length > 0) {
    const targetOrder = orders.find(o => o.order_number.toString() === initialOrderNumber);
    if (targetOrder) {
      console.log('🎯 Auto-opening order from URL:', targetOrder.order_number);
      setSelectedOrder(targetOrder);
      setIsModalOpen(true);
      setHasOpenedInitial(true);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Group orders by status
  const ordersByStatus = orders.reduce(
    (acc, order) => {
      const status = getOrderStatus(order);
      console.log(
        `🎯 Grouping order ${order.order_number}: status="${order.status}" -> mapped="${status}"`
      );
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(order);
      return acc;
    },
    {} as Record<string, any[]>
  );

  console.log('🎯 InteractiveBoard: Orders grouped by status:', ordersByStatus);
  console.log(
    '🎯 InteractiveBoard: Status counts:',
    Object.keys(ordersByStatus).map(
      status => `${status}: ${ordersByStatus[status].length}`
    )
  );
  console.log(
    '🎯 InteractiveBoard: Available columns:',
    COLUMNS.map(c => c.id)
  );

  function getOrderStatus(order: any): string {
    // Map order status to column IDs
    switch (order.status) {
      case 'pending':
        return 'pending';
      case 'working':
      case 'in_progress':
        return 'working';
      case 'done': // Fixed: map 'done' to 'done' column
      case 'completed': // Keep 'completed' for backward compatibility
        return 'done';
      case 'ready':
        return 'ready';
      case 'delivered':
        return 'delivered';
      default:
        return 'pending';
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    console.log('🎯 Drag started:', { activeId: active.id });
    const order = orders.find(o => o.id === active.id);
    setActiveOrder(order);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    console.log('🔄 Drag end:', {
      activeId: active.id,
      overId: over?.id,
      over,
    });
    setActiveOrder(null);

    if (!over) {
      console.log('❌ No drop target found');
      return;
    }

    const orderId = active.id as string;
    const newStatus = over.id as string;

    console.log('🎯 Drop detected:', { orderId, newStatus });

    // Map column IDs back to order statuses
    const statusMap: Record<string, string> = {
      pending: 'pending',
      working: 'working',
      done: 'done', // Fixed: was 'completed', should be 'done'
      ready: 'ready',
      delivered: 'delivered',
    };

    const mappedStatus = statusMap[newStatus];
    console.log('🔄 Status mapping:', { newStatus, mappedStatus });

    if (mappedStatus && onOrderUpdate) {
      console.log('✅ Updating order status:', { orderId, mappedStatus });
      onOrderUpdate(orderId, mappedStatus);

      // Show success animation
      setJustMovedOrder(orderId);
      setTimeout(() => setJustMovedOrder(null), 2000);
    } else {
      console.log('❌ No update needed:', {
        orderId,
        newStatus,
        mappedStatus,
        hasOnOrderUpdate: !!onOrderUpdate,
      });
    }
  }

  function handleOrderClick(order: any) {
    setSelectedOrder(order);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedOrder(null);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Board content - Horizontally scrollable on mobile, grid on desktop */}
        <div className='h-full min-h-0 overflow-x-auto overflow-y-auto'>
          <div className='flex md:grid md:grid-cols-5 gap-2 md:gap-2 lg:gap-4 min-w-max md:min-w-0 md:w-full'>
            {COLUMNS.map(column => (
              <DroppableColumn
                key={column.id}
                column={column}
                orders={ordersByStatus[column.id] || []}
                onOrderClick={handleOrderClick}
                justMovedOrder={justMovedOrder}
                updatingOrders={updatingOrders}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className='transform rotate-3 scale-105 shadow-2xl ring-2 ring-blue-200 ring-opacity-50'>
              <RushOrderCard
                isRush={activeOrder.rush || false}
                orderType={activeOrder.type || 'alteration'}
                className='opacity-90'
              >
                <div className='p-2 sm:p-3'>
                  <div className='flex justify-between items-start mb-2'>
                    <div className='flex items-center gap-2'>
                      <div className='text-muted-foreground/70 text-xs'>⋮⋮</div>
                      <h4 className='font-semibold text-sm sm:text-base'>
                        #{activeOrder.order_number}
                      </h4>
                    </div>
                  </div>

                  <p className='text-xs sm:text-sm text-muted-foreground mb-1'>
                    {activeOrder.client_name || 'Unknown Client'}
                  </p>

                  <p className='text-xs text-muted-foreground mb-1'>
                    {activeOrder.garments?.map((g: any) => g.type).join(', ') ||
                      'No garments'}
                  </p>

                  {activeOrder.due_date && (
                    <p className='text-xs text-muted-foreground mb-1'>
                      Due: {new Date(activeOrder.due_date).toLocaleDateString()}
                    </p>
                  )}

                  {activeOrder.rack_position && (
                    <p className='text-xs text-blue-600 font-medium'>
                      Rack: {activeOrder.rack_position}
                    </p>
                  )}

                  <div className='mt-2 pt-2 border-t border-border'>
                    <div className='w-full text-xs sm:text-sm py-1 sm:py-2 text-center text-blue-600 font-medium'>
                      Moving to new stage...
                    </div>
                  </div>
                </div>
              </RushOrderCard>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onOrderUpdate={onOrderUpdate || (() => { })}
      />
    </>
  );
}
