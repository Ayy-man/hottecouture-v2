import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      console.error('Failed to create Supabase client - check env vars');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }
    const { orderId } = await params;

    // Validate orderId
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Fetch all garments for this order - each garment IS a task
    const { data: garments, error } = await supabase
      .from('garment')
      .select(`
        id,
        order_id,
        type,
        color,
        brand,
        label_code,
        notes,
        stage,
        is_active,
        started_at,
        stopped_at,
        actual_minutes,
        assignee,
        garment_service (
          id,
          quantity,
          notes,
          service:service_id (
            id,
            name,
            category,
            estimated_minutes
          )
        )
      `)
      .eq('order_id', orderId);

    if (error) {
      console.error('Error fetching garments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: error.message },
        { status: 500 }
      );
    }

    // Transform garments into task format
    const tasks = (garments || []).map((g: any) => {
      // Calculate estimated minutes from all services on this garment
      const estimatedMinutes = (g.garment_service || []).reduce((sum: number, gs: any) => {
        return sum + ((gs.service?.estimated_minutes || 0) * (gs.quantity || 1));
      }, 0);

      // Build operation name from services
      const serviceNames = (g.garment_service || [])
        .map((gs: any) => gs.service?.name)
        .filter(Boolean)
        .join(', ');

      return {
        id: g.id,
        garment_id: g.id, // For compatibility
        operation: serviceNames || g.type,
        stage: g.stage || 'pending',
        planned_minutes: estimatedMinutes,
        actual_minutes: g.actual_minutes || 0,
        is_active: g.is_active || false,
        assignee: g.assignee,
        started_at: g.started_at,
        stopped_at: g.stopped_at,
        notes: g.notes,
        garment: {
          id: g.id,
          type: g.type,
          color: g.color,
          brand: g.brand,
          label_code: g.label_code,
          order_id: g.order_id,
        },
        services: g.garment_service || [],
        timeVariance: (g.actual_minutes || 0) - estimatedMinutes,
        isActiveTimer: g.is_active && g.started_at && !g.stopped_at,
      };
    });

    // Group tasks by garment (each garment is its own task, so 1:1 mapping)
    const tasksByGarment: Record<string, any[]> = {};
    tasks.forEach((task: any) => {
      const garmentId = task.garment_id;
      if (!tasksByGarment[garmentId]) {
        tasksByGarment[garmentId] = [];
      }
      tasksByGarment[garmentId].push(task);
    });

    // Calculate summary statistics
    const totalPlannedMinutes = tasks.reduce(
      (sum: number, task: any) => sum + (task.planned_minutes || 0),
      0
    );
    const totalActualMinutes = tasks.reduce(
      (sum: number, task: any) => sum + (task.actual_minutes || 0),
      0
    );
    const completedTasks = tasks.filter(
      (task: any) => task.stage === 'done'
    ).length;
    const totalTasks = tasks.length;

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        tasksByGarment,
        summary: {
          totalTasks,
          completedTasks,
          totalPlannedMinutes,
          totalActualMinutes,
          totalVarianceMinutes: totalActualMinutes - totalPlannedMinutes,
          progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
      },
    });

  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
