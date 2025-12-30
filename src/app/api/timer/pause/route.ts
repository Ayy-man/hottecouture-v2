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

      if (error) {
        console.error('Error fetching garment:', error);
        throw new Error(error.message);
      }
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

      if (error) {
        console.error('Error fetching active garment:', error);
        throw new Error(error.message);
      }
      garment = data;
    }

    if (!garment) {
      return NextResponse.json({ error: 'No active timer found' }, { status: 404 });
    }

    // Permission check: You can only pause your own timer
    // We allow admins (if we had admin auth) or if assignee is not set (legacy)
    if (staffName && garment.assignee && garment.assignee !== staffName) {
      return NextResponse.json(
        {
          error: `Permission denied. This task is assigned to ${garment.assignee}.`,
          code: 'permission_denied'
        },
        { status: 403 }
      );
    }

    // Calculate elapsed minutes (only if started_at exists)
    let elapsedSeconds = 0;
    let newActualMinutes = garment.actual_minutes || 0;

    if (garment.started_at) {
      const startTime = new Date(garment.started_at);

      // Validate start time
      if (isNaN(startTime.getTime())) {
        console.warn('⚠️ Invalid started_at date found:', garment.started_at);
        // Don't add any time if start date is invalid to prevent data corruption
      } else {
        elapsedSeconds = Math.max(0, (now.getTime() - startTime.getTime()) / 1000);
        const elapsedMinutes = elapsedSeconds / 60;

        if (isNaN(elapsedMinutes) || !isFinite(elapsedMinutes)) {
          console.error('❌ Calculated invalid elapsed minutes:', elapsedMinutes);
        } else {
          newActualMinutes += elapsedMinutes;
        }
      }
    }

    // Safety check for final value
    if (isNaN(newActualMinutes) || !isFinite(newActualMinutes)) {
      console.error('❌ Invalid final actual_minutes:', newActualMinutes);
      newActualMinutes = garment.actual_minutes || 0; // Fallback to previous value
    }

    // Update garment - keep assignee but mark as paused
    const { error: updateError } = await supabase
      .from('garment')
      .update({
        is_active: false,
        stopped_at: now.toISOString(),
        actual_minutes: newActualMinutes,
        started_at: null
      })
      .eq('id', garment.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

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
