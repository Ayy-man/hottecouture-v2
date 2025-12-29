import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }
    const { orderId, garmentId, staffName } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let garment = null;

    if (garmentId) {
      // Get specific garment that's paused
      const { data, error } = await supabase
        .from('garment')
        .select('*')
        .eq('id', garmentId)
        .eq('is_active', false)
        .not('stopped_at', 'is', null)
        .maybeSingle();

      if (error) {
        console.error('Error fetching garment for resume:', error);
        throw new Error(error.message);
      }
      garment = data;
    } else {
      // Get first paused garment for this order
      const { data, error } = await supabase
        .from('garment')
        .select('*')
        .eq('order_id', orderId)
        .eq('is_active', false)
        .not('stopped_at', 'is', null)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching garment for resume:', error);
        throw new Error(error.message);
      }
      garment = data;
    }

    if (!garment) {
      return NextResponse.json({ error: 'No paused timer found' }, { status: 404 });
    }

    // Permission check
    if (staffName && garment.assignee && garment.assignee !== staffName) {
      return NextResponse.json(
        {
          error: `Permission denied. This task is assigned to ${garment.assignee}.`,
          code: 'permission_denied'
        },
        { status: 403 }
      );
    }

    if (garment.is_active) {
      return NextResponse.json({ error: 'Timer already running' }, { status: 400 });
    }

    // Resume the timer
    const { error: updateError } = await supabase
      .from('garment')
      .update({
        is_active: true,
        started_at: now,
        stage: 'working'
      })
      .eq('id', garment.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Timer resumed successfully',
      timer_started_at: now,
      total_work_seconds: (garment.actual_minutes || 0) * 60
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
