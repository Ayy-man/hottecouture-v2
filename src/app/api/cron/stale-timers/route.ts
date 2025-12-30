import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateBearerToken } from '@/lib/utils/timing-safe';

export const dynamic = 'force-dynamic';

// Auto-terminate timers running longer than 10 hours
const MAX_HOURS = 10;
const MAX_MINUTES = MAX_HOURS * 60;

export async function GET(request: Request) {
  // Use timing-safe comparison
  const authHeader = request.headers.get('authorization');
  if (!validateBearerToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();

  // Find timers running for more than MAX_HOURS
  const cutoffTime = new Date(now.getTime() - MAX_HOURS * 60 * 60 * 1000);

  console.log(`🔄 Stale timers cron: finding timers started before ${cutoffTime.toISOString()}`);

  const { data: staleGarments, error: fetchError } = await supabase
    .from('garment')
    .select('id, order_id, type, assignee, started_at, actual_minutes')
    .eq('is_active', true)
    .lt('started_at', cutoffTime.toISOString());

  if (fetchError) {
    console.error('Error fetching stale timers:', fetchError);
    return NextResponse.json(
      { error: 'Failed to fetch stale timers' },
      { status: 500 }
    );
  }

  if (!staleGarments || staleGarments.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No stale timers found',
      terminated_count: 0,
      timestamp: now.toISOString()
    });
  }

  const results: { garmentId: string; assignee: string | null; cappedMinutes: number }[] = [];

  for (const garment of staleGarments) {
    // Cap the elapsed time at MAX_HOURS instead of recording days
    const currentMinutes = garment.actual_minutes || 0;
    const cappedTotalMinutes = currentMinutes + MAX_MINUTES;

    const { error: updateError } = await supabase
      .from('garment')
      .update({
        is_active: false,
        stopped_at: now.toISOString(),
        actual_minutes: cappedTotalMinutes,
        stage: 'done',
        assignee: null,
        started_at: null
      })
      .eq('id', garment.id);

    if (updateError) {
      console.error(`Failed to terminate timer for garment ${garment.id}:`, updateError);
      continue;
    }

    // Log the auto-termination
    await supabase.from('event_log').insert({
      actor: 'cron-stale-timers',
      entity: 'garment',
      entity_id: garment.id,
      action: 'timer_auto_terminated',
      details: {
        reason: `Timer exceeded ${MAX_HOURS} hour limit`,
        original_started_at: garment.started_at,
        assignee: garment.assignee,
        capped_at_minutes: MAX_MINUTES,
        final_actual_minutes: cappedTotalMinutes
      }
    });

    results.push({
      garmentId: garment.id,
      assignee: garment.assignee,
      cappedMinutes: cappedTotalMinutes
    });

    console.log(`⏱️ Auto-terminated timer for garment ${garment.id} (${garment.type}), capped at ${MAX_HOURS}h`);
  }

  console.log(`✅ Terminated ${results.length} stale timers`);

  return NextResponse.json({
    success: true,
    terminated_count: results.length,
    terminated: results,
    max_hours: MAX_HOURS,
    timestamp: now.toISOString()
  });
}
