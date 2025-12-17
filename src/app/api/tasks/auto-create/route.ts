import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { autoCreateTasks } from '@/lib/tasks/auto-create';

const requestSchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }
    const body = await request.json();
    const { orderId } = requestSchema.parse(body);

    const result = await autoCreateTasks(supabase, orderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Auto-create tasks error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}