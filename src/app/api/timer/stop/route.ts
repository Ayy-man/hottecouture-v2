import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

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
    const now = new Date().toISOString();
    const { error: updateError } = await (supabase as any)
      .from('order')
      .update({
        is_timer_running: false,
        timer_paused_at: null,
        total_work_seconds: finalTotalSeconds,
        work_completed_at: now,
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
      work_completed_at: now,
    });
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
