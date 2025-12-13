import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { orderId, garmentId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const now = new Date();

    if (garmentId) {
      // Garment Task Logic
      const { data: task, error: fetchError } = await supabase
        .from('task')
        .select('*')
        .eq('garment_id', garmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      let newActualMinutes = task.actual_minutes || 0;

      if (task.is_active) {
        const startTime = new Date(task.started_at);
        const elapsedSeconds = Math.max(0, (now.getTime() - startTime.getTime()) / 1000);
        newActualMinutes += (elapsedSeconds / 60);
      }

      const { error: updateError } = await supabase
        .from('task')
        .update({
          is_active: false,
          stopped_at: now.toISOString(),
          actual_minutes: newActualMinutes,
          stage: 'completed'
        })
        .eq('id', task.id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: 'Timer stopped successfully',
        total_work_seconds: newActualMinutes * 60,
        work_completed_at: now.toISOString()
      });

    } else {
      // Legacy Order Logic
      // Get current timer state
      const { data: orderData, error: fetchError } = await supabase
        .from('order')
        .select(
          'is_timer_running, timer_started_at, timer_paused_at, total_work_seconds'
        )
        .eq('id', orderId)
        .single();

      if (fetchError) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      let finalTotalSeconds = (orderData as any).total_work_seconds || 0;

      // If timer is running, add the current session time
      if ((orderData as any).is_timer_running) {
        const startTime = new Date((orderData as any).timer_started_at);
        const stopTime = new Date();
        const elapsedSeconds = Math.floor(
          (stopTime.getTime() - startTime.getTime()) / 1000
        );
        // Ensure elapsed time is non-negative (handle timezone issues)
        const safeElapsedSeconds = Math.max(0, elapsedSeconds);
        finalTotalSeconds = Math.max(0, finalTotalSeconds + safeElapsedSeconds);
      }

      // Stop the timer
      const { error: updateError } = await (supabase as any)
        .from('order')
        .update({
          is_timer_running: false,
          timer_paused_at: null,
          total_work_seconds: finalTotalSeconds,
          work_completed_at: now.toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to stop timer' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Timer stopped successfully',
        total_work_seconds: finalTotalSeconds,
        work_completed_at: now.toISOString(),
      });
    }
  } catch (error) {
    console.error('Timer stop error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
