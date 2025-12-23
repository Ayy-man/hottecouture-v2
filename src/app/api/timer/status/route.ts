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

    let garment = null;

    if (garmentId) {
      // Get specific garment
      const { data, error } = await supabase
        .from('garment')
        .select('id, type, stage, is_active, started_at, stopped_at, actual_minutes, assignee')
        .eq('id', garmentId)
        .maybeSingle();

      if (error) console.error('Garment fetch error:', error);
      garment = data;
    } else {
      // Get first garment for this order
      const { data, error } = await supabase
        .from('garment')
        .select('id, type, stage, is_active, started_at, stopped_at, actual_minutes, assignee')
        .eq('order_id', orderId)
        .limit(1)
        .maybeSingle();

      if (error) console.error('Garment fetch error:', error);
      garment = data;
    }

    // If no garment found, return idle state
    if (!garment) {
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

    const isRunning = garment.is_active || false;
    let currentSessionSeconds = 0;

    if (isRunning && garment.started_at) {
      const startTime = new Date(garment.started_at);
      const now = new Date();
      currentSessionSeconds = Math.floor(
        (now.getTime() - startTime.getTime()) / 1000
      );
    }

    const actualMinutes = garment.actual_minutes || 0;
    const totalSeconds = (actualMinutes * 60) + currentSessionSeconds;

    // Determine state for UI
    const isCompleted = garment.stage === 'done';
    const isPaused = !isRunning && (!!garment.stopped_at || actualMinutes > 0) && !isCompleted;

    return NextResponse.json({
      success: true,
      is_running: isRunning,
      is_paused: isPaused,
      is_completed: isCompleted,
      timer_started_at: garment.started_at,
      timer_paused_at: garment.stopped_at,
      work_completed_at: isCompleted ? garment.stopped_at : null,
      total_work_seconds: actualMinutes * 60,
      current_session_seconds: currentSessionSeconds,
      total_seconds: totalSeconds,
    });

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
