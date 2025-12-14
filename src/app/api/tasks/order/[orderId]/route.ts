import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createServiceRoleClient();
    const orderId = params.orderId;

    // Validate orderId
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Fetch all tasks for this order with garment and service details
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
          label_code
        ),
        service (
          id,
          name,
          code,
          category
        )
      `)
      .eq('garment.order_id', orderId)
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

    (tasks || []).forEach(task => {
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
      (sum, task) => sum + (task.planned_minutes || 0),
      0
    );
    const totalActualMinutes = (tasks || []).reduce(
      (sum, task) => sum + (task.actual_minutes || 0),
      0
    );
    const completedTasks = (tasks || []).filter(
      task => task.stage === 'done'
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