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
      .select('is_timer_running, timer_paused_at, total_work_seconds')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if ((orderData as any).is_timer_running) {
      return NextResponse.json(
        { error: 'Timer is already running for this order' },
        { status: 400 }
      );
    }

    // Resume the timer
    const now = new Date().toISOString();
    const { error: updateError } = await (supabase as any)
      .from('order')
      .update({
        is_timer_running: true,
        timer_started_at: now,
        timer_paused_at: null,
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to resume timer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Timer resumed successfully',
      timer_started_at: now,
      total_work_seconds: (orderData as any).total_work_seconds || 0,
    });
  } catch (error) {
    console.error('Timer resume error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
