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
      // No garmentId - find first garment and pause its task
      const { data: garments, error: garmentError } = await supabase
        .from('garment')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);

      if (garmentError || !garments || garments.length === 0) {
        return NextResponse.json({ error: 'No garments found' }, { status: 404 });
      }

      const firstGarmentId = garments[0].id;

      const { data: task, error: fetchError } = await supabase
        .from('task')
        .select('*')
        .eq('garment_id', firstGarmentId)
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
      const elapsedMinutes = elapsedSeconds / 60;
      const newActualMinutes = (task.actual_minutes || 0) + elapsedMinutes;

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
