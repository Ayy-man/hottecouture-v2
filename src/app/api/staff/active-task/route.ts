import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const staffName = searchParams.get('staffName');

    if (!staffName) {
      return NextResponse.json(
        { error: 'Staff name is required' },
        { status: 400 }
      );
    }

    // Find active garment for this staff member
    // First try to find one assigned to them specifically
    const { data: assignedGarment, error: garmentError } = await supabase
      .from('garment')
      .select(`
        id,
        type,
        is_active,
        started_at,
        actual_minutes,
        stage,
        order_id,
        assignee
      `)
      .eq('assignee', staffName)
      .eq('is_active', true)
      .maybeSingle();

    let garment = assignedGarment;

    // If not found, check for any active task with no assignee (legacy/backwards compat)
    if (!garment && !garmentError) {
      const { data: unassignedGarment, error: unassignedError } = await supabase
        .from('garment')
        .select(`
          id,
          type,
          is_active,
          started_at,
          actual_minutes,
          stage,
          order_id,
          assignee
        `)
        .eq('is_active', true)
        .is('assignee', null)
        .limit(1)
        .maybeSingle();

      if (!unassignedError && unassignedGarment) {
        // Atomically claim this task - only succeeds if still unassigned
        // This prevents race condition where two staff claim same task
        const { data: claimedGarment, error: claimError } = await supabase
          .from('garment')
          .update({ assignee: staffName })
          .eq('id', unassignedGarment.id)
          .is('assignee', null) // Only update if still unassigned
          .select()
          .maybeSingle();

        if (claimError) {
          console.error('Error claiming task:', claimError);
        }

        // Only use this garment if we successfully claimed it
        if (claimedGarment) {
          garment = claimedGarment;
        }
        // If claimedGarment is null, someone else claimed it first - we'll return no active task
      }
    }

    if (garmentError) {
      console.error('Garment fetch error:', garmentError);
      return NextResponse.json(
        { error: 'Failed to fetch active task' },
        { status: 500 }
      );
    }

    if (!garment) {
      return NextResponse.json({
        success: true,
        hasActiveTask: false,
        activeTask: null,
      });
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('id, order_number, client_id')
      .eq('id', garment.order_id)
      .single();

    if (orderError) {
      console.error('Order fetch error:', orderError);
    }

    // Get client name if available
    let clientName = null;
    if (order?.client_id) {
      const { data: client } = await supabase
        .from('client')
        .select('first_name, last_name')
        .eq('id', order.client_id)
        .single();

      if (client) {
        clientName = `${client.first_name} ${client.last_name}`.trim();
      }
    }

    // Calculate elapsed time
    let elapsedSeconds = (garment.actual_minutes || 0) * 60;
    if (garment.started_at) {
      const startTime = new Date(garment.started_at);
      const now = new Date();
      elapsedSeconds += Math.floor((now.getTime() - startTime.getTime()) / 1000);
    }

    return NextResponse.json({
      success: true,
      hasActiveTask: true,
      activeTask: {
        garmentId: garment.id,
        garmentType: garment.type,
        orderId: garment.order_id,
        orderNumber: order?.order_number || null,
        clientName,
        startedAt: garment.started_at,
        elapsedSeconds,
        stage: garment.stage,
      },
    });
  } catch (error) {
    console.error('Active task fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
