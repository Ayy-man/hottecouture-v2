import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

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
        'is_timer_running, timer_started_at, timer_paused_at, total_work_seconds, work_completed_at'
      )
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let currentSessionSeconds = 0;
    if (orderData.is_timer_running && orderData.timer_started_at) {
      const startTime = new Date(orderData.timer_started_at);
      const now = new Date();
      currentSessionSeconds = Math.floor(
        (now.getTime() - startTime.getTime()) / 1000
      );
    }

    // Calculate total seconds: when running, add current session; when paused/completed, just use saved total
    const totalSeconds = orderData.is_timer_running
      ? (orderData.total_work_seconds || 0) + currentSessionSeconds
      : orderData.total_work_seconds || 0;

    return NextResponse.json({
      success: true,
      is_running: orderData.is_timer_running,
      is_paused: !orderData.is_timer_running && orderData.timer_paused_at,
      is_completed: !!orderData.work_completed_at,
      timer_started_at: orderData.timer_started_at,
      timer_paused_at: orderData.timer_paused_at,
      work_completed_at: orderData.work_completed_at,
      total_work_seconds: orderData.total_work_seconds || 0,
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
