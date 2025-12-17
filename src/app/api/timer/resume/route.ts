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

    const now = new Date().toISOString();

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

      if (task.is_active) {
        return NextResponse.json({ error: 'Timer already running' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('task')
        .update({
          is_active: true,
          started_at: now
        })
        .eq('id', task.id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: 'Timer resumed successfully',
        timer_started_at: now,
        total_work_seconds: (task.actual_minutes || 0) * 60
      });

    } else {
      // No garmentId - find first garment and resume its task
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

      if (task.is_active) {
        return NextResponse.json({ error: 'Timer already running' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('task')
        .update({
          is_active: true,
          started_at: now
        })
        .eq('id', task.id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: 'Timer resumed successfully',
        timer_started_at: now,
        total_work_seconds: (task.actual_minutes || 0) * 60
      });
    }
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
