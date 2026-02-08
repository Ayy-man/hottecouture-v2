'use client';

import { useDroppable } from '@dnd-kit/core';
import { DraggableOrderCard } from './draggable-order-card';

interface DroppableColumnProps {
  column: {
    id: string;
    title: string;
    description: string;
  };
  orders: any[];
  onOrderClick: (order: any) => void;
  justMovedOrder?: string | null;
  updatingOrders?: Set<string>;
  selectedOrderForMove?: string | null | undefined;
  onColumnTap?: ((columnId: string) => void) | undefined;
  isMobile?: boolean | undefined;
  onSelectForMove?: ((orderId: string) => void) | undefined;
}

export function DroppableColumn({
  column,
  orders,
  onOrderClick,
  justMovedOrder,
  updatingOrders = new Set(),
  selectedOrderForMove,
  onColumnTap,
  isMobile = false,
  onSelectForMove,
}: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  });

  console.log(`📋 Column ${column.id}:`, {
    isOver,
    ordersCount: orders.length,
    orders: orders.map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
    })),
  });

  // Check if selected order is already in this column
  const selectedOrderInThisColumn = selectedOrderForMove
    ? orders.some(o => o.id === selectedOrderForMove)
    : false;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex min-h-0 flex-col rounded-2xl border bg-white shadow-sm
        min-w-[260px] md:min-w-0 w-full h-full
        transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl
        ${
          isOver
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-2xl scale-[1.02] ring-4 ring-blue-200 ring-opacity-50'
            : 'hover:border-border hover:shadow-xl'
        }
      `}
    >
      {/* Drop indicator overlay */}
      {isOver && (
        <div className='absolute inset-0 bg-blue-100 bg-opacity-40 rounded-lg border-2 border-dashed border-blue-400 animate-pulse z-10'>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-bounce'>
              Drop here to move to {column.title}
            </div>
          </div>
        </div>
      )}

      {/* Mobile tap-to-move banner */}
      {isMobile && selectedOrderForMove && (
        <div
          onClick={() => onColumnTap?.(column.id)}
          className={`flex-shrink-0 text-xs text-center py-1.5 font-medium cursor-pointer ${
            selectedOrderInThisColumn
              ? 'bg-gray-50 border-b border-gray-300 text-gray-500'
              : 'bg-blue-50 border-b border-blue-300 text-blue-600'
          }`}
        >
          {selectedOrderInThisColumn ? 'Selected card is here' : 'Tap to move here'}
        </div>
      )}

      {/* Column header - Same as intake form */}
      <div className='flex-shrink-0 border-b bg-white/90 backdrop-blur p-3 lg:p-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold'>{column.title}</h3>
          <span className='text-xs text-zinc-500'>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>
      </div>

      {/* Column list - Same as intake form */}
      <div className='flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 space-y-3'>
        {orders.length > 0 ? (
          orders.map(order => (
            <DraggableOrderCard
              key={order.id}
              order={order}
              onClick={() => onOrderClick(order)}
              isJustMoved={justMovedOrder === order.id}
              isUpdating={updatingOrders.has(order.id)}
              selectedOrderForMove={selectedOrderForMove}
              onSelectForMove={onSelectForMove}
              isMobile={isMobile}
            />
          ))
        ) : (
          <div
            className={`py-8 text-center transition-colors duration-200 ${isOver ? 'text-blue-500' : 'text-muted-foreground/70'}`}
          >
            <p className='text-xs'>No orders</p>
            {isOver && (
              <p className='text-xs text-blue-600 font-medium mt-1 animate-bounce'>
                Drop here
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
