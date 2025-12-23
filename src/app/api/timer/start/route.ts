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
      return NextResponse.json(
        { error: 'No garments found for this order. Cannot start timer.' },
        { status: 400 }
      );
    }

    // Check if already running
    if (garment.is_active) {
      return NextResponse.json({ error: 'Timer already running' }, { status: 400 });
    }

    // Start the timer on garment
    const { error: updateError } = await supabase
      .from('garment')
      .update({
        is_active: true,
        started_at: now,
        stage: 'working'
      })
      .eq('id', garment.id);

    if (updateError) {
      console.error('Garment update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Timer started successfully',
      timer_started_at: now,
      total_work_seconds: (garment.actual_minutes || 0) * 60
    });

  } catch (error) {
    console.error('Timer start error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
