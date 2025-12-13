import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
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
      // Legacy Order Logic
      const { data: orderData, error: fetchError } = await supabase
        .from('order')
        .select(
          'is_timer_running, timer_started_at, timer_paused_at, total_work_seconds, work_completed_at'
        )
        .eq('id', orderId)
        .single();

      if (fetchError) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const order = orderData as any;
      let currentSessionSeconds = 0;
      if (order.is_timer_running && order.timer_started_at) {
        const startTime = new Date(order.timer_started_at);
        const now = new Date();
        currentSessionSeconds = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000
        );
      }

      const totalSeconds = order.is_timer_running
        ? (order.total_work_seconds || 0) + currentSessionSeconds
        : order.total_work_seconds || 0;

      return NextResponse.json({
        success: true,
        is_running: order.is_timer_running,
        is_paused: !order.is_timer_running && order.timer_paused_at,
        is_completed: !!order.work_completed_at,
        timer_started_at: order.timer_started_at,
        timer_paused_at: order.timer_paused_at,
        work_completed_at: order.work_completed_at,
        total_work_seconds: order.total_work_seconds || 0,
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
