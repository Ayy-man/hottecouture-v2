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
      // Get specific garment
      const { data, error } = await supabase
        .from('garment')
        .select('*')
        .eq('id', garmentId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      garment = data;
    } else {
      // Get first garment for this order
      const { data, error } = await supabase
        .from('garment')
        .select('*')
        .eq('order_id', orderId)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      garment = data;
    }

    if (!garment) {
      return NextResponse.json({ error: 'No garment found' }, { status: 404 });
    }

    let newActualMinutes = garment.actual_minutes || 0;

    // If timer was running, add elapsed time
    if (garment.is_active && garment.started_at) {
      const startTime = new Date(garment.started_at);
      const elapsedSeconds = Math.max(0, (now.getTime() - startTime.getTime()) / 1000);
      newActualMinutes += (elapsedSeconds / 60);
    }

    // Stop and mark as done, clear assignee
    const { error: updateError } = await supabase
      .from('garment')
      .update({
        is_active: false,
        stopped_at: now.toISOString(),
        actual_minutes: newActualMinutes,
        stage: 'done',
        assignee: null,
        started_at: null
      })
      .eq('id', garment.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Timer stopped successfully',
      total_work_seconds: newActualMinutes * 60,
      work_completed_at: now.toISOString()
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
