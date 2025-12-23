import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  orderId: z.string().uuid(),
  garmentId: z.string().uuid().optional(),
  hours: z.number().min(0).max(999),
  minutes: z.number().min(0).max(59),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }
    const body = await request.json();

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { orderId, garmentId, hours, minutes } = parsed.data;
    const totalMinutes = hours * 60 + minutes;

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
        { error: 'No garment found' },
        { status: 404 }
      );
    }

    // Check if timer is running
    if (garment.is_active) {
      return NextResponse.json(
        { error: 'Please pause timer before editing' },
        { status: 400 }
      );
    }

    // Update the actual_minutes
    const { error: updateError } = await supabase
      .from('garment')
      .update({
        actual_minutes: totalMinutes
      })
      .eq('id', garment.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      total_work_seconds: totalMinutes * 60,
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
