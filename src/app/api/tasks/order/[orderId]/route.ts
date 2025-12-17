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

    // First, get all garment IDs for this order
    const { data: garments, error: garmentError } = await supabase
      .from('garment')
      .select('id')
      .eq('order_id', orderId);

    if (garmentError) {
      console.error('Error fetching garments:', garmentError);
      return NextResponse.json(
        { error: 'Failed to fetch garments', details: garmentError.message },
        { status: 500 }
      );
    }

    // If no garments, return empty
    if (!garments || garments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          tasks: [],
          tasksByGarment: {},
          summary: {
            totalTasks: 0,
            completedTasks: 0,
            totalPlannedMinutes: 0,
            totalActualMinutes: 0,
            totalVarianceMinutes: 0,
            progressPercentage: 0,
          },
        },
      });
    }

    const garmentIds = garments.map((g: { id: string }) => g.id);

    // Fetch all tasks for these garments with garment and service details
    const { data: tasks, error } = await supabase
      .from('task')
      .select(`
        id,
        garment_id,
        service_id,
        operation,
        stage,
        planned_minutes,
        actual_minutes,
        is_active,
        assignee,
        started_at,
        stopped_at,
        created_at,
        updated_at,
        garment (
          id,
          type,
          color,
          brand,
          label_code,
          order_id
        ),
        service (
          id,
          name,
          code,
          category
        )
      `)
      .in('garment_id', garmentIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: error.message },
        { status: 500 }
      );
    }

    // Group tasks by garment for easier consumption
    const tasksByGarment: Record<string, any[]> = {};

    (tasks || []).forEach((task: any) => {
      const garmentId = task.garment_id;
      if (!tasksByGarment[garmentId]) {
        tasksByGarment[garmentId] = [];
      }
      tasksByGarment[garmentId].push({
        ...task,
        timeVariance: (task.actual_minutes || 0) - (task.planned_minutes || 0),
        isActiveTimer: task.is_active && task.started_at && !task.stopped_at,
      });
    });

    // Calculate summary statistics
    const totalPlannedMinutes = (tasks || []).reduce(
      (sum: number, task: any) => sum + (task.planned_minutes || 0),
      0
    );
    const totalActualMinutes = (tasks || []).reduce(
      (sum: number, task: any) => sum + (task.actual_minutes || 0),
      0
    );
    const completedTasks = (tasks || []).filter(
      (task: any) => task.stage === 'done'
    ).length;
    const totalTasks = (tasks || []).length;

    return NextResponse.json({
      success: true,
      data: {
        tasks: tasks || [],
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