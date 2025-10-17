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
}

export function DroppableColumn({
  column,
  orders,
  onOrderClick,
  justMovedOrder,
  updatingOrders = new Set(),
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

  return (
    <div
      ref={setNodeRef}
      className={`
        relative bg-white border-2 border-gray-200 rounded-xl p-3 sm:p-4 ipad-landscape:p-2 lg:p-5 h-[75vh] ipad-landscape:h-[75vh] w-full min-w-0 flex flex-col
        transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl
        ${
          isOver
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-2xl scale-[1.02] ring-4 ring-blue-200 ring-opacity-50'
            : 'hover:border-gray-400 hover:shadow-xl'
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

      <div
        className={`mb-3 ipad-landscape:mb-2 lg:mb-3 flex-shrink-0 transition-colors duration-300 ${isOver ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'bg-white'} rounded-lg p-2 ipad-landscape:p-1.5`}
      >
        <h3
          className={`text-sm sm:text-base ipad-landscape:text-sm lg:text-lg font-bold transition-colors duration-300 ${isOver ? 'text-blue-800' : 'text-gray-800'}`}
        >
          {column.title}
        </h3>
        <p
          className={`text-xs sm:text-sm ipad-landscape:text-xs lg:text-sm transition-colors duration-300 ${isOver ? 'text-blue-600' : 'text-gray-600'} mt-1 ipad-landscape:hidden`}
        >
          {column.description}
        </p>
        <div
          className={`mt-1 text-xs sm:text-sm ipad-landscape:text-xs lg:text-sm font-medium transition-colors duration-300 ${isOver ? 'text-blue-500' : 'text-gray-500'}`}
        >
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className='flex-1 space-y-1 sm:space-y-2 ipad-landscape:space-y-1 lg:space-y-3 overflow-y-auto min-h-0'>
        {orders.map(order => (
          <DraggableOrderCard
            key={order.id}
            order={order}
            onClick={() => onOrderClick(order)}
            isJustMoved={justMovedOrder === order.id}
            isUpdating={updatingOrders.has(order.id)}
          />
        ))}
      </div>

      {orders.length === 0 && (
        <div
          className={`flex-1 flex items-center justify-center transition-colors duration-200 ${isOver ? 'text-blue-500' : 'text-gray-500'}`}
        >
          <div className='flex flex-col items-center space-y-2'>
            <div
              className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
                isOver
                  ? 'border-blue-400 bg-blue-100 animate-pulse scale-110'
                  : 'border-gray-300 hover:border-gray-400 hover:scale-105'
              }`}
            >
              <svg
                className={`w-6 h-6 transition-colors duration-200 ${isOver ? 'text-blue-500' : 'text-gray-400'}`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                />
              </svg>
            </div>
            <p className='text-sm'>No orders in this stage</p>
            {isOver && (
              <p className='text-xs text-blue-600 font-medium animate-bounce'>
                Drop here to move order
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
