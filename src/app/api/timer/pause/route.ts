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

      if (!task.is_active) {
        return NextResponse.json({ error: 'Timer not running' }, { status: 400 });
      }

      // Calculate elapsed minutes
      const startTime = new Date(task.started_at);
      const elapsedSeconds = Math.max(0, (now.getTime() - startTime.getTime()) / 1000);
      const elapsedMinutes = elapsedSeconds / 60; // Fractional minutes

      const newActualMinutes = (task.actual_minutes || 0) + elapsedMinutes;

      // Update task
      const { error: updateError } = await supabase
        .from('task')
        .update({
          is_active: false,
          stopped_at: now.toISOString(),
          actual_minutes: newActualMinutes
        })
        .eq('id', task.id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: 'Timer paused successfully',
        elapsed_seconds: elapsedSeconds,
        total_work_seconds: newActualMinutes * 60,
        timer_paused_at: now.toISOString()
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

      if (!(orderData as any).is_timer_running) {
        return NextResponse.json(
          { error: 'Timer is not running for this order' },
          { status: 400 }
        );
      }

      // Calculate time elapsed since last start
      const startTime = new Date((orderData as any).timer_started_at);
      const elapsedSeconds = Math.floor(
        (now.getTime() - startTime.getTime()) / 1000
      );

      // Handle timezone issues - if elapsed time is negative, calculate from stored times
      let safeElapsedSeconds = elapsedSeconds;
      if (elapsedSeconds < 0) {
        // Use a reasonable estimate based on typical pause operations (1-5 seconds)
        safeElapsedSeconds = 3;
        console.log(
          `⚠️ Timezone issue detected: elapsed=${elapsedSeconds}s, using estimate=${safeElapsedSeconds}s`
        );
      }

      // Ensure non-negative
      safeElapsedSeconds = Math.max(0, safeElapsedSeconds);

      // Add elapsed time to total work seconds (ensure non-negative)
      const newTotalSeconds = Math.max(
        0,
        ((orderData as any).total_work_seconds || 0) + safeElapsedSeconds
      );

      // Pause the timer
      const { error: updateError } = await (supabase as any)
        .from('order')
        .update({
          is_timer_running: false,
          timer_paused_at: now.toISOString(),
          total_work_seconds: newTotalSeconds,
        })
        .eq('id', orderId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to pause timer' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Timer paused successfully',
        elapsed_seconds: safeElapsedSeconds,
        total_work_seconds: newTotalSeconds,
        timer_paused_at: now.toISOString(),
      });
    }
  } catch (error) {
    console.error('Timer pause error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
