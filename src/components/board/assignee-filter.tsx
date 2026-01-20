'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Users, Check, X } from 'lucide-react';
import { useStaff } from '@/lib/hooks/useStaff';

interface AssigneeFilterProps {
  orders: any[];
  selectedAssigneeId: string | null;
  onAssigneeChange: (assigneeId: string | null) => void;
}

export function AssigneeFilter({
  orders,
  selectedAssigneeId,
  onAssigneeChange,
}: AssigneeFilterProps) {
  const { staff, loading } = useStaff();

  // Count orders per assignee (orders with at least one item assigned to them)
  const assigneeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    orders.forEach(order => {
      const assignees = new Set<string>();
      (order.garments || []).forEach((g: any) => {
        (g.services || []).forEach((s: any) => {
          if (s.assigned_seamstress_id) {
            assignees.add(s.assigned_seamstress_id);
          }
        });
      });

      assignees.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });

    return counts;
  }, [orders]);

  // Count unassigned orders
  const unassignedCount = useMemo(() => {
    return orders.filter(order => {
      const hasAssignment = (order.garments || []).some((g: any) =>
        (g.services || []).some((s: any) => s.assigned_seamstress_id)
      );
      return !hasAssignment;
    }).length;
  }, [orders]);

  const selectedStaff = staff.find(s => s.id === selectedAssigneeId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={selectedAssigneeId ? 'default' : 'outline'}
          size='sm'
          className={`gap-2 h-8 text-xs ${
            selectedAssigneeId
              ? 'bg-primary text-white'
              : 'border-border hover:bg-background'
          }`}
        >
          <Users className='w-3 h-3' />
          <span className='hidden sm:inline'>
            {selectedStaff ? selectedStaff.name : 'Assignee'}
          </span>
          {selectedAssigneeId && (
            <span
              className='ml-1 hover:bg-white/20 rounded p-0.5'
              onClick={e => {
                e.stopPropagation();
                onAssigneeChange(null);
              }}
            >
              <X className='w-3 h-3' />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-48'>
        <DropdownMenuItem
          onClick={() => onAssigneeChange(null)}
          className='flex items-center justify-between'
        >
          <span>All Assignees</span>
          {!selectedAssigneeId && <Check className='w-4 h-4' />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {loading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : (
          <>
            {staff.map(member => (
              <DropdownMenuItem
                key={member.id}
                onClick={() => onAssigneeChange(member.id)}
                className='flex items-center justify-between'
              >
                <span>{member.name}</span>
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-muted-foreground'>
                    {assigneeCounts[member.id] || 0}
                  </span>
                  {selectedAssigneeId === member.id && <Check className='w-4 h-4' />}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAssigneeChange('unassigned')}
              className='flex items-center justify-between text-amber-600'
            >
              <span>Unassigned</span>
              <div className='flex items-center gap-2'>
                <span className='text-xs'>{unassignedCount}</span>
                {selectedAssigneeId === 'unassigned' && <Check className='w-4 h-4' />}
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
