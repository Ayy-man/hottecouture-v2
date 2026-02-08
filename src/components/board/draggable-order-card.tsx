'use client';

import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { RushOrderCard } from '@/components/rush-orders/rush-indicator';

interface DraggableOrderCardProps {
  order: any;
  onClick: () => void;
  isJustMoved?: boolean;
  isUpdating?: boolean;
  selectedOrderForMove?: string | null;
  onSelectForMove?: (orderId: string) => void;
  isMobile?: boolean;
}

export function DraggableOrderCard({
  order,
  onClick,
  isJustMoved = false,
  isUpdating = false,
  selectedOrderForMove,
  onSelectForMove,
  isMobile = false,
}: DraggableOrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: order.id });

  const isSelected = selectedOrderForMove === order.id;

  // Extract item-level assignments from garment services
  const { uniqueAssignees, assigneeGroups, hasUnassigned } = useMemo(() => {
    const itemAssignments = (order.garments || [])
      .flatMap((g: any) =>
        (g.services || []).map((s: any) => ({
          assigneeName: s.assigned_seamstress_name,
          assigneeId: s.assigned_seamstress_id,
        }))
      );

    // Group by assignee for display
    const groups = itemAssignments
      .filter((item: any) => item.assigneeName)
      .reduce(
        (acc: Record<string, any[]>, item: any) => {
          const name = item.assigneeName!;
          if (!acc[name]) acc[name] = [];
          acc[name].push(item);
          return acc;
        },
        {} as Record<string, any[]>
      );

    const unique = Object.keys(groups);
    const unassigned = itemAssignments.some((item: any) => !item.assigneeId);

    return {
      uniqueAssignees: unique,
      assigneeGroups: groups,
      hasUnassigned: unassigned,
    };
  }, [order.garments]);

  const hasItemLevelAssignees = uniqueAssignees.length > 0 || hasUnassigned;

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
        kanban-card ${isMobile ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
        hover:shadow-lg transition-all duration-300 touch-manipulation select-none
        ${
          isDragging
            ? 'opacity-70 shadow-2xl scale-105 rotate-1 z-50'
            : isSelected
              ? 'ring-2 ring-blue-500 bg-blue-50/50 scale-[1.02]'
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
        {...(isMobile ? {} : attributes)}
        {...(isMobile ? {} : listeners)}
        className={`p-2 sm:p-3 ipad-landscape:p-2 lg:p-4 transition-all duration-300 ${
          isMobile ? 'cursor-pointer' : (isDragging ? 'cursor-grabbing' : 'cursor-grab')
        }`}
        onClick={() => {
          if (isMobile && onSelectForMove) {
            // On mobile: tap to select for moving
            onSelectForMove(order.id);
          } else if (!isDragging) {
            // On desktop: only open modal if not dragging
            onClick();
          }
        }}
      >
        {/* iPad Landscape: Simplified Layout */}
        <div className='ipad-landscape:hidden'>
          <div className='flex justify-between items-start mb-1.5 ipad:mb-1 lg:mb-2'>
            <div className='flex items-center gap-1.5 ipad:gap-1 lg:gap-2'>
              {!isMobile && (
                <div className='text-muted-foreground/70 text-xs cursor-grab active:cursor-grabbing hover:text-muted-foreground transition-colors duration-200'>
                  ⋮⋮
                </div>
              )}
              <h4 className='font-semibold text-xs sm:text-sm ipad:text-xs lg:text-base'>
                #{order.order_number}
              </h4>
              {order.type && (
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                  order.type === 'alteration'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {order.type === 'alteration' ? 'Alt' : 'Sur m.'}
                </span>
              )}
              {isUpdating && (
                <div className='flex items-center gap-1'>
                  <div className='w-1.5 h-1.5 ipad:w-2 ipad:h-2 bg-blue-500 rounded-full animate-pulse'></div>
                  <span className='text-xs text-blue-600'>Updating...</span>
                </div>
              )}
            </div>
          </div>

          <p className='text-xs ipad:text-xs lg:text-sm text-muted-foreground mb-0.5 ipad:mb-1 lg:mb-1'>
            {order.client_name || 'Unknown Client'}
          </p>

          <p className='text-xs text-muted-foreground mb-0.5 ipad:mb-1 lg:mb-1'>
            {order.garments?.map((g: any) => g.type).join(', ') ||
              'No garments'}
          </p>

          {order.due_date && (
            <p className='text-xs text-muted-foreground mb-0.5 ipad:mb-1 lg:mb-1'>
              Due: {new Date(order.due_date).toLocaleDateString()}
            </p>
          )}

          {order.rack_position && ['ready', 'delivered'].includes(order.status) && (
            <p className='text-xs text-blue-600 font-medium mb-1 flex items-center gap-1'>
              <span>📍</span> {order.rack_position}
            </p>
          )}

          {/* Item-Level Assignments */}
          {hasItemLevelAssignees && (
            <div className='mb-1 text-xs'>
              {uniqueAssignees.map(name => (
                <div key={name} className='flex items-center gap-1'>
                  <span className='w-1.5 h-1.5 rounded-full bg-primary' />
                  <span className='font-medium'>{name}</span>
                  <span className='text-muted-foreground'>
                    ({assigneeGroups[name]?.length || 0})
                  </span>
                </div>
              ))}
              {hasUnassigned && (
                <div className='flex items-center gap-1 text-amber-600'>
                  <span className='w-1.5 h-1.5 rounded-full bg-amber-400' />
                  <span>Unassigned items</span>
                </div>
              )}
            </div>
          )}

          {/* Show warning if completely unassigned */}
          {!hasItemLevelAssignees && (
            <p className='text-xs text-amber-600 mb-1'>Unassigned</p>
          )}

          <div className='mt-1.5 ipad:mt-1 lg:mt-2 pt-1.5 ipad:pt-1 lg:pt-2 border-t border-border'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full text-xs ipad:text-xs lg:text-sm py-1 ipad:py-1.5 lg:py-2 btn-press bg-gradient-to-r from-muted to-muted/80 hover:from-muted/80 hover:to-muted/60 text-muted-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300'
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onClick();
              }}
            >
              Voir détails
            </Button>
          </div>
        </div>

        {/* iPad Landscape: Ultra-Compact Layout */}
        <div className='hidden ipad-landscape:block'>
          <div className='flex justify-between items-center mb-1'>
            <div className='flex items-center gap-1'>
              {!isMobile && (
                <div className='text-muted-foreground/70 text-xs cursor-grab active:cursor-grabbing hover:text-muted-foreground transition-colors duration-200'>
                  ⋮⋮
                </div>
              )}
              <h4 className='font-semibold text-xs'>#{order.order_number}</h4>
              {order.type && (
                <span className={`px-1 py-0.5 text-[10px] font-medium rounded-full ${
                  order.type === 'alteration'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {order.type === 'alteration' ? 'Alt' : 'Sur m.'}
                </span>
              )}
              {isUpdating && (
                <div className='w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse'></div>
              )}
            </div>
          </div>

          <p className='text-xs text-muted-foreground mb-1 truncate'>
            {order.client_name || 'Unknown Client'}
          </p>

          <p className='text-xs text-muted-foreground mb-1 truncate'>
            {order.garments?.map((g: any) => g.type).join(', ') ||
              'No garments'}
          </p>

          {order.due_date && (
            <p className='text-xs text-muted-foreground mb-1'>
              Due:{' '}
              {new Date(order.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}

          {order.rack_position && ['ready', 'delivered'].includes(order.status) && (
            <p className='text-xs text-blue-600 font-medium mb-1 flex items-center gap-1'>
              <span>📍</span> {order.rack_position}
            </p>
          )}

          {/* Item-Level Assignments - iPad Landscape */}
          {hasItemLevelAssignees && (
            <div className='mb-1 text-[10px]'>
              {uniqueAssignees.slice(0, 2).map(name => (
                <div key={name} className='flex items-center gap-1'>
                  <span className='w-1 h-1 rounded-full bg-primary' />
                  <span className='font-medium truncate'>{name}</span>
                  <span className='text-muted-foreground'>
                    ({assigneeGroups[name]?.length || 0})
                  </span>
                </div>
              ))}
              {uniqueAssignees.length > 2 && (
                <span className='text-muted-foreground'>+{uniqueAssignees.length - 2} more</span>
              )}
              {hasUnassigned && (
                <div className='flex items-center gap-1 text-amber-600'>
                  <span className='w-1 h-1 rounded-full bg-amber-400' />
                  <span>Unassigned</span>
                </div>
              )}
            </div>
          )}

          {!hasItemLevelAssignees && (
            <p className='text-[10px] text-amber-600 mb-1'>Unassigned</p>
          )}

          <div className='mt-1 pt-1 border-t border-border'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full text-xs py-1 btn-press bg-gradient-to-r from-muted to-muted/80 hover:from-muted/80 hover:to-muted/60 text-muted-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300'
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onClick();
              }}
            >
              Détails
            </Button>
          </div>
        </div>
      </div>
    </RushOrderCard>
  );
}
