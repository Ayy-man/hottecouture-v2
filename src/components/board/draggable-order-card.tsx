'use client';

import { useDraggable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { RushOrderCard } from '@/components/rush-orders/rush-indicator';

interface DraggableOrderCardProps {
  order: any;
  onClick: () => void;
  isJustMoved?: boolean;
  isUpdating?: boolean;
}

export function DraggableOrderCard({
  order,
  onClick,
  isJustMoved = false,
  isUpdating = false,
}: DraggableOrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: order.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };

  return (
    <RushOrderCard
      isRush={order.rush || false}
      orderType={order.type || 'alteration'}
      className={`
        kanban-card cursor-grab active:cursor-grabbing
        hover:shadow-lg transition-all duration-300 touch-manipulation select-none
        ${
          isDragging
            ? 'opacity-70 shadow-2xl scale-105 rotate-1 z-50'
            : isJustMoved
              ? 'ring-2 ring-green-400 ring-opacity-60 bg-gradient-to-br from-green-50 to-green-100 animate-pulse'
              : isUpdating
                ? 'ring-2 ring-blue-400 ring-opacity-60 bg-gradient-to-br from-blue-50 to-blue-100 opacity-90'
                : 'hover:scale-[1.02] hover:shadow-xl'
        }
      `}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`p-2 sm:p-3 ipad-landscape:p-2 lg:p-4 transition-all duration-300 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onClick={() => {
          // Only trigger click if not dragging
          if (!isDragging) {
            onClick();
          }
        }}
      >
        {/* iPad Landscape: Simplified Layout */}
        <div className='ipad-landscape:hidden'>
          <div className='flex justify-between items-start mb-1.5 ipad:mb-1 lg:mb-2'>
            <div className='flex items-center gap-1.5 ipad:gap-1 lg:gap-2'>
              <div className='text-gray-400 text-xs cursor-grab active:cursor-grabbing hover:text-gray-600 transition-colors duration-200'>
                ⋮⋮
              </div>
              <h4 className='font-semibold text-xs sm:text-sm ipad:text-xs lg:text-base'>
                #{order.order_number}
              </h4>
              {isUpdating && (
                <div className='flex items-center gap-1'>
                  <div className='w-1.5 h-1.5 ipad:w-2 ipad:h-2 bg-blue-500 rounded-full animate-pulse'></div>
                  <span className='text-xs text-blue-600'>Updating...</span>
                </div>
              )}
            </div>
          </div>

          <p className='text-xs ipad:text-xs lg:text-sm text-gray-600 mb-0.5 ipad:mb-1 lg:mb-1'>
            {order.client_name || 'Unknown Client'}
          </p>

          <p className='text-xs text-gray-500 mb-0.5 ipad:mb-1 lg:mb-1'>
            {order.garments?.map((g: any) => g.type).join(', ') ||
              'No garments'}
          </p>

          {order.due_date && (
            <p className='text-xs text-gray-500 mb-0.5 ipad:mb-1 lg:mb-1'>
              Due: {new Date(order.due_date).toLocaleDateString()}
            </p>
          )}

          {order.rack_position && (
            <p className='text-xs text-blue-600 font-medium mb-1'>
              Rack: {order.rack_position}
            </p>
          )}

          <div className='mt-1.5 ipad:mt-1 lg:mt-2 pt-1.5 ipad:pt-1 lg:pt-2 border-t border-gray-100'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full text-xs ipad:text-xs lg:text-sm py-1 ipad:py-1.5 lg:py-2 btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300'
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onClick();
              }}
            >
              View Details
            </Button>
          </div>
        </div>

        {/* iPad Landscape: Ultra-Compact Layout */}
        <div className='hidden ipad-landscape:block'>
          <div className='flex justify-between items-center mb-1'>
            <div className='flex items-center gap-1'>
              <div className='text-gray-400 text-xs cursor-grab active:cursor-grabbing hover:text-gray-600 transition-colors duration-200'>
                ⋮⋮
              </div>
              <h4 className='font-semibold text-xs'>#{order.order_number}</h4>
              {isUpdating && (
                <div className='w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse'></div>
              )}
            </div>
          </div>

          <p className='text-xs text-gray-600 mb-1 truncate'>
            {order.client_name || 'Unknown Client'}
          </p>

          <p className='text-xs text-gray-500 mb-1 truncate'>
            {order.garments?.map((g: any) => g.type).join(', ') ||
              'No garments'}
          </p>

          {order.due_date && (
            <p className='text-xs text-gray-500 mb-1'>
              Due:{' '}
              {new Date(order.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}

          {order.rack_position && (
            <p className='text-xs text-blue-600 font-medium mb-1'>
              Rack: {order.rack_position}
            </p>
          )}

          <div className='mt-1 pt-1 border-t border-gray-100'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full text-xs py-1 btn-press bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-300'
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onClick();
              }}
            >
              Details
            </Button>
          </div>
        </div>
      </div>
    </RushOrderCard>
  );
}
