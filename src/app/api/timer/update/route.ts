import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  orderId: z.string().uuid(),
  hours: z.number().min(0).max(999),
  minutes: z.number().min(0).max(59),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { orderId, hours, minutes } = parsed.data;
    const totalSeconds = hours * 3600 + minutes * 60;

    const { data: order, error: fetchError } = await supabase
      .from('order')
      .select('status, is_timer_running')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if ((order as any).status !== 'working') {
      return NextResponse.json(
        { error: 'Can only edit time for orders in progress' },
        { status: 400 }
      );
    }

    if ((order as any).is_timer_running) {
      return NextResponse.json(
        { error: 'Please pause the timer before editing time' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('order')
      .update({
        total_work_seconds: totalSeconds,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating timer:', updateError);
      return NextResponse.json(
        { error: 'Failed to update timer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total_work_seconds: totalSeconds,
    });
  } catch (error) {
    console.error('Timer update error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
