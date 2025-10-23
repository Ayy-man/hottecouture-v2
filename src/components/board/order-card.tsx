'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// import { useTranslations } from 'next-intl'
import { format, parseISO, isAfter, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BoardOrder } from '@/lib/board/types';
import { TimerButton } from '@/components/timer/timer-button';

interface OrderCardProps {
  order: BoardOrder;
  isUpdating?: boolean;
  isDragging?: boolean;
  onAssign?: (orderId: string) => void;
}

export function OrderCard({
  order,
  isUpdating = false,
  isDragging = false,
  onAssign,
}: OrderCardProps) {
  // const t = useTranslations('board.card')
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: order.id,
    disabled: isUpdating,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const isOverdue =
    order.due_date && isAfter(new Date(), parseISO(order.due_date));
  const isDueToday = order.due_date && isToday(parseISO(order.due_date));

  const garmentTypes = order.garments.map(g => g.type).join(', ');
  const assignees = Array.from(
    new Set(order.tasks.map(t => t.assignee).filter(Boolean))
  );

  // Extract service names from garments
  const serviceNames = order.garments
    .flatMap(garment => garment.services || [])
    .map(
      service =>
        service.service?.name || service.custom_service_name || 'Custom Service'
    )
    .filter((name, index, array) => array.indexOf(name) === index) // Remove duplicates
    .slice(0, 3); // Show max 3 services

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing transition-all ${
        isUpdating ? 'opacity-50' : ''
      } ${isDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'}`}
    >
      <CardContent className='p-4'>
        {/* Header */}
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center space-x-2'>
            <h4 className='font-semibold text-lg'>#{order.order_number}</h4>
            {order.rush && (
              <span className='px-2 py-1 text-xs font-bold text-white bg-gradient-to-r from-accent-contrast to-primary-500 rounded'>
                Rush
              </span>
            )}
          </div>
          {order.rack_position && (
            <span className='px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded'>
              Rack: {order.rack_position}
            </span>
          )}
        </div>

        {/* Client */}
        <div className='mb-2'>
          <p className='text-sm font-medium text-gray-900'>
            {order.client_name || 'Unknown Client'}
          </p>
        </div>

        {/* Garments */}
        <div className='mb-2'>
          <p className='text-sm text-gray-600'>
            <span className='font-medium'>Garments:</span> {garmentTypes}
          </p>
        </div>

        {/* Services */}
        <div className='mb-2'>
          <p className='text-sm text-gray-600'>
            <span className='font-medium'>Services:</span>{' '}
            {serviceNames.length > 0 ? (
              <span>
                {serviceNames.join(', ')}
                {order.services_count > serviceNames.length &&
                  ` (+${order.services_count - serviceNames.length} more)`}
              </span>
            ) : (
              order.services_count
            )}
          </p>
        </div>

        {/* Due date */}
        {order.due_date && (
          <div className='mb-2'>
            <p
              className={`text-sm ${
                isOverdue
                  ? 'text-red-600 font-medium'
                  : isDueToday
                    ? 'text-orange-600 font-medium'
                    : 'text-gray-600'
              }`}
            >
              <span className='font-medium'>Due:</span>{' '}
              {format(parseISO(order.due_date), 'MMM dd, yyyy')}
              {isOverdue && ' (Overdue)'}
              {isDueToday && ' (Today)'}
            </p>
          </div>
        )}

        {/* Assignees */}
        {assignees.length > 0 && (
          <div className='mb-3'>
            <p className='text-sm text-gray-600'>
              <span className='font-medium'>Assignee:</span>{' '}
              {assignees.join(', ')}
            </p>
          </div>
        )}

        {/* Timer */}
        <div className='mb-3'>
          <TimerButton orderId={order.id} orderStatus={order.status} />
        </div>

        {/* Actions */}
        <div className='flex space-x-2'>
          <Button
            size='sm'
            variant='outline'
            className='flex-1 text-xs'
            disabled={isUpdating}
          >
            View Details
          </Button>
          {assignees.length === 0 && onAssign && (
            <Button
              size='sm'
              variant='outline'
              className='flex-1 text-xs'
              disabled={isUpdating}
              onClick={() => onAssign(order.id)}
            >
              Assign to Me
            </Button>
          )}
        </div>

        {/* Loading indicator */}
        {isUpdating && (
          <div className='absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg'>
            <div className='text-sm text-gray-600'>Updating...</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
