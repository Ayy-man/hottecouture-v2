'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// import { useTranslations } from 'next-intl'
import { format, parseISO, isAfter, isToday } from 'date-fns';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BoardOrder } from '@/lib/board/types';

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

  // Extract item-level assignments from garment services
  const { uniqueAssignees, assigneeGroups, assigneeColors, hasUnassigned, unassignedItems } = useMemo(() => {
    const itemAssignments = order.garments
      .flatMap(g =>
        (g.services || []).map(s => ({
          garmentType: g.type,
          serviceName: s.service?.name || s.custom_service_name || 'Service',
          assigneeName: s.assigned_seamstress_name,
          assigneeId: s.assigned_seamstress_id,
          assigneeColor: s.assigned_seamstress_color,
        }))
      );

    // Group by assignee for display
    const groups = itemAssignments
      .filter(item => item.assigneeName)
      .reduce(
        (acc, item) => {
          const name = item.assigneeName!;
          if (!acc[name]) acc[name] = [];
          acc[name].push(item);
          return acc;
        },
        {} as Record<string, typeof itemAssignments>
      );

    // Map assignee name -> color
    const colorMap: Record<string, string> = {};
    itemAssignments.forEach(item => {
      if (item.assigneeName && item.assigneeColor) {
        colorMap[item.assigneeName] = item.assigneeColor;
      }
    });

    const unique = Object.keys(groups);
    const unassignedList = itemAssignments.filter(item => !item.assigneeId);
    const unassigned = unassignedList.length > 0;

    return {
      uniqueAssignees: unique,
      assigneeGroups: groups,
      assigneeColors: colorMap,
      hasUnassigned: unassigned,
      unassignedItems: unassignedList,
    };
  }, [order.garments]);

  // Fall back to task-based assignees if no item-level assignments exist
  const legacyAssignees = useMemo(() => {
    return Array.from(
      new Set(order.tasks.map(t => t.assignee).filter(Boolean))
    );
  }, [order.tasks]);

  // Use item-level assignees if available, otherwise fall back to legacy
  const hasItemLevelAssignees = uniqueAssignees.length > 0 || hasUnassigned;

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
            <span className='text-sm text-muted-foreground font-medium truncate max-w-[150px]'>
              {order.client_name || 'Unknown Client'}
            </span>
            {order.type && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                order.type === 'alteration'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {order.type === 'alteration' ? 'Alteration' : 'Sur mesure'}
              </span>
            )}
            {order.rush && (
              <span className='px-2 py-1 text-xs font-bold text-white bg-gradient-to-r from-accent-contrast to-primary-500 rounded'>
                Rush
              </span>
            )}
          </div>
          {order.rack_position && (
            <span className='px-2 py-1 text-xs bg-muted text-muted-foreground rounded'>
              Rack: {order.rack_position}
            </span>
          )}
        </div>

        {/* Garments */}
        <div className='mb-2'>
          <p className='text-sm text-muted-foreground'>
            <span className='font-medium'>Garments:</span> {garmentTypes}
          </p>
        </div>

        {/* Services */}
        <div className='mb-2'>
          <p className='text-sm text-muted-foreground'>
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
                    : 'text-muted-foreground'
              }`}
            >
              <span className='font-medium'>Due:</span>{' '}
              {format(parseISO(order.due_date), 'MMM dd, yyyy')}
              {isOverdue && ' (Overdue)'}
              {isDueToday && ' (Today)'}
            </p>
          </div>
        )}

        {/* Item-Level Assignments */}
        {hasItemLevelAssignees && (
          <div className='mb-3'>
            <p className='text-sm font-medium text-muted-foreground mb-1'>Assigned:</p>
            <div className='space-y-1'>
              {uniqueAssignees.map(name => (
                <div
                  key={name}
                  className='flex items-center text-sm'
                  title={assigneeGroups[name]?.map(item => `${item.garmentType} — ${item.serviceName}`).join('\n')}
                >
                  <span
                    className='w-2 h-2 rounded-full mr-2 flex-shrink-0'
                    style={{ backgroundColor: assigneeColors[name] || '#6366f1' }}
                  />
                  <span className='font-medium'>{name}</span>
                  <span className='text-muted-foreground ml-1'>
                    ({assigneeGroups[name]?.length || 0} item
                    {(assigneeGroups[name]?.length || 0) > 1 ? 's' : ''})
                  </span>
                </div>
              ))}
              {hasUnassigned && (
                <div
                  className='flex items-center text-sm text-amber-600'
                  title={unassignedItems.map(item => `${order.client_name || 'Client'}: ${item.garmentType} — ${item.serviceName}`).join('\n')}
                >
                  <span className='w-2 h-2 rounded-full bg-amber-400 mr-2' />
                  <span>Unassigned ({unassignedItems.length})</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show unassigned warning if no assignees at all (no item-level, no legacy) */}
        {!hasItemLevelAssignees && legacyAssignees.length === 0 && (
          <div className='mb-3'>
            <p className='text-sm text-amber-600'>
              <span className='font-medium'>Unassigned</span>
            </p>
          </div>
        )}

        {/* Legacy Assignees (fallback when no item-level assignments) */}
        {!hasItemLevelAssignees && legacyAssignees.length > 0 && (
          <div className='mb-3'>
            <p className='text-sm text-muted-foreground'>
              <span className='font-medium'>Assignee:</span>{' '}
              {legacyAssignees.join(', ')}
            </p>
          </div>
        )}

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
          {/* Show "Assign to Me" only when there are unassigned items and onAssign is provided */}
          {((hasItemLevelAssignees && hasUnassigned) ||
            (!hasItemLevelAssignees && legacyAssignees.length === 0)) &&
            onAssign && (
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
          <div className='absolute inset-0 bg-card bg-opacity-75 flex items-center justify-center rounded-lg'>
            <div className='text-sm text-muted-foreground'>Updating...</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
