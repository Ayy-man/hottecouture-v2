import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { format, startOfWeek, endOfWeek, parseISO, addDays } from 'date-fns';
import { generateCsv, formatDuration } from '@/lib/exports/csv-utils';

/**
 * GET /api/admin/export/capacity
 *
 * Exports a CSV of weekly staff workload/capacity.
 * Implements EXP-04 requirement.
 *
 * Query params:
 * - weekStart (optional): ISO date string for week start (defaults to current week Monday)
 *
 * Returns:
 * - success: boolean
 * - csvContent: string (CSV data)
 * - filename: string (suggested filename)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get('weekStart');

    // Calculate week range
    const baseDate = weekStartParam ? parseISO(weekStartParam) : new Date();
    const weekStartDate = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
    const weekEndDate = endOfWeek(baseDate, { weekStartsOn: 1 }); // Sunday

    const supabase = await createServiceRoleClient();

    // Get all active staff
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json(
        { success: false, error: staffError.message },
        { status: 500 }
      );
    }

    // Get orders due this week
    const { data: orders, error: ordersError } = await supabase
      .from('order')
      .select(
        `
        id,
        order_number,
        due_date,
        garments:garment (
          id,
          services:garment_service (
            id,
            assigned_seamstress_id
          )
        )
      `
      )
      .gte('due_date', format(weekStartDate, 'yyyy-MM-dd'))
      .lte('due_date', format(addDays(weekEndDate, 1), 'yyyy-MM-dd'))
      .not('due_date', 'is', null);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { success: false, error: ordersError.message },
        { status: 500 }
      );
    }

    // Build staff workload map
    interface StaffWorkload {
      name: string;
      assignedItems: number;
      totalEstMinutes: number;
      ordersCount: Set<string>;
    }

    const workloadMap = new Map<string, StaffWorkload>();

    // Initialize all staff with zero values
    (staff || []).forEach((s: { id: string; name: string }) => {
      workloadMap.set(s.id, {
        name: s.name,
        assignedItems: 0,
        totalEstMinutes: 0,
        ordersCount: new Set(),
      });
    });

    // Add "Unassigned" entry
    workloadMap.set('unassigned', {
      name: 'Unassigned',
      assignedItems: 0,
      totalEstMinutes: 0,
      ordersCount: new Set(),
    });

    // Process orders and count assigned items
    interface OrderWithGarments {
      id: string;
      order_number: number;
      due_date: string | null;
      garments: Array<{
        id: string;
        services: Array<{
          id: string;
          assigned_seamstress_id: string | null;
        }>;
      }>;
    }

    ((orders as OrderWithGarments[]) || []).forEach((order) => {
      (order.garments || []).forEach((garment) => {
        (garment.services || []).forEach((service) => {
          const seamstressId = service.assigned_seamstress_id || 'unassigned';
          const workload = workloadMap.get(seamstressId);

          if (workload) {
            workload.assignedItems += 1;
            workload.ordersCount.add(order.id);
            // Note: estimated_minutes not in current schema, using 0
          } else if (seamstressId !== 'unassigned') {
            // Staff member exists but not in active list
            // Add them with this assignment
            workloadMap.set(seamstressId, {
              name: `Unknown (${seamstressId.slice(0, 8)})`,
              assignedItems: 1,
              totalEstMinutes: 0,
              ordersCount: new Set([order.id]),
            });
          }
        });
      });
    });

    // Define CSV columns
    const headers = [
      'Staff Name',
      'Assigned Items',
      'Total Est Hours',
      'Orders Count',
    ];

    // Build rows from workload data
    const rows: unknown[][] = Array.from(workloadMap.values())
      .filter((w) => w.assignedItems > 0 || w.name !== 'Unassigned')
      .sort((a, b) => {
        // Sort: Unassigned last, then by name
        if (a.name === 'Unassigned') return 1;
        if (b.name === 'Unassigned') return -1;
        return a.name.localeCompare(b.name);
      })
      .map((workload) => [
        workload.name,
        workload.assignedItems,
        formatDuration(workload.totalEstMinutes),
        workload.ordersCount.size,
      ]);

    // Generate CSV content
    const csvContent = generateCsv(headers, rows);

    // Generate filename with week range
    const weekStartStr = format(weekStartDate, 'yyyy-MM-dd');
    const weekEndStr = format(weekEndDate, 'yyyy-MM-dd');
    const filename = `capacity_${weekStartStr}_${weekEndStr}.csv`;

    return NextResponse.json({
      success: true,
      csvContent,
      filename,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      staffCount: staff?.length ?? 0,
      ordersInWeek: orders?.length ?? 0,
    });
  } catch (error) {
    console.error('Error in capacity export:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
