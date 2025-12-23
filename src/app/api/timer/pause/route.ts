import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }
    const { orderId, garmentId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    let garment = null;

    if (garmentId) {
      // Get specific garment that's active
      const { data, error } = await supabase
        .from('garment')
        .select('*')
        .eq('id', garmentId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw new Error(error.message);
      garment = data;
    } else {
      // Get first active garment for this order
      const { data, error } = await supabase
        .from('garment')
        .select('*')
        .eq('order_id', orderId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      garment = data;
    }

    if (!garment) {
      return NextResponse.json({ error: 'No active timer found' }, { status: 404 });
    }

    // Calculate elapsed minutes
    const startTime = new Date(garment.started_at);
    const elapsedSeconds = Math.max(0, (now.getTime() - startTime.getTime()) / 1000);
    const elapsedMinutes = elapsedSeconds / 60;
    const newActualMinutes = (garment.actual_minutes || 0) + elapsedMinutes;

    // Update garment
    const { error: updateError } = await supabase
      .from('garment')
      .update({
        is_active: false,
        stopped_at: now.toISOString(),
        actual_minutes: newActualMinutes
      })
      .eq('id', garment.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Timer paused successfully',
      elapsed_seconds: elapsedSeconds,
      total_work_seconds: newActualMinutes * 60,
      timer_paused_at: now.toISOString()
    });

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
