import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const garmentId = searchParams.get('garmentId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (garmentId) {
      // Garment Task Logic
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .select('*')
        .eq('garment_id', garmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (taskError && taskError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Task fetch error:', taskError);
        // Fallback to idle if no task
      }

      const task = taskData || {};
      const isRunning = task.is_active || false;
      let currentSessionSeconds = 0;

      if (isRunning && task.started_at) {
        const startTime = new Date(task.started_at);
        const now = new Date();
        currentSessionSeconds = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000
        );
      }

      const actualMinutes = task.actual_minutes || 0;
      const totalSeconds = (actualMinutes * 60) + currentSessionSeconds;

      // Determine state for UI
      const isCompleted = task.stage === 'completed';
      const isPaused = !isRunning && (!!task.stopped_at || actualMinutes > 0) && !isCompleted;

      return NextResponse.json({
        success: true,
        is_running: isRunning,
        is_paused: isPaused,
        is_completed: isCompleted,
        timer_started_at: task.started_at,
        timer_paused_at: task.stopped_at,
        work_completed_at: isCompleted ? task.stopped_at : null,
        total_work_seconds: actualMinutes * 60,
        current_session_seconds: currentSessionSeconds,
        total_seconds: totalSeconds,
      });

    } else {
      // No garmentId - find first garment and check its task status
      const { data: garments, error: garmentError } = await supabase
        .from('garment')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);

      if (garmentError || !garments || garments.length === 0) {
        // No garments - return idle state
        return NextResponse.json({
          success: true,
          is_running: false,
          is_paused: false,
          is_completed: false,
          timer_started_at: null,
          timer_paused_at: null,
          work_completed_at: null,
          total_work_seconds: 0,
          current_session_seconds: 0,
          total_seconds: 0,
        });
      }

      const firstGarmentId = garments[0].id;

      // Get task for this garment
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .select('*')
        .eq('garment_id', firstGarmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (taskError && taskError.code !== 'PGRST116') {
        console.error('Task fetch error:', taskError);
      }

      const task = taskData || {};
      const isRunning = task.is_active || false;
      let currentSessionSeconds = 0;

      if (isRunning && task.started_at) {
        const startTime = new Date(task.started_at);
        const now = new Date();
        currentSessionSeconds = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000
        );
      }

      const actualMinutes = task.actual_minutes || 0;
      const totalSeconds = (actualMinutes * 60) + currentSessionSeconds;
      const isCompleted = task.stage === 'completed';
      const isPaused = !isRunning && (!!task.stopped_at || actualMinutes > 0) && !isCompleted;

      return NextResponse.json({
        success: true,
        is_running: isRunning,
        is_paused: isPaused,
        is_completed: isCompleted,
        timer_started_at: task.started_at || null,
        timer_paused_at: task.stopped_at || null,
        work_completed_at: isCompleted ? task.stopped_at : null,
        total_work_seconds: actualMinutes * 60,
        current_session_seconds: currentSessionSeconds,
        total_seconds: totalSeconds,
      });
    }
  } catch (error) {
    console.error('Timer status error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
