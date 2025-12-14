import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { orderId, garmentId, serviceId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (garmentId) {
      // Garment Task Logic
      // Check for existing task (service-specific if serviceId provided)
      let taskQuery = supabase
        .from('task')
        .select('*')
        .eq('garment_id', garmentId);

      if (serviceId) {
        taskQuery = taskQuery.eq('service_id', serviceId);
      }

      const { data: existingTask, error: fetchError } = await taskQuery
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(fetchError.message);
      }

      if (existingTask) {
        // Resume/Start existing task
        if (existingTask.is_active) {
          return NextResponse.json({ error: 'Timer already running' }, { status: 400 });
        }

        const { error: updateError } = await supabase
          .from('task')
          .update({
            is_active: true,
            started_at: now,
            stage: 'working'
          })
          .eq('id', existingTask.id);

        if (updateError) {
          console.error('Task update error:', updateError);
          throw updateError;
        }
      } else {
        // Create new task
        console.log('Creating new task for garment:', garmentId, 'service:', serviceId);

        // Get service details if serviceId provided
        let operation = 'General Work';
        let plannedMinutes = 60;

        if (serviceId) {
          const { data: service, error: serviceError } = await supabase
            .from('service')
            .select('name, estimated_minutes')
            .eq('id', serviceId)
            .single();

          if (!serviceError && service) {
            operation = service.name;
            plannedMinutes = service.estimated_minutes || 60;
          }
        }

        const { error: insertError } = await supabase
          .from('task')
          .insert({
            garment_id: garmentId,
            service_id: serviceId || null,
            operation: operation,
            stage: 'working',
            is_active: true,
            started_at: now,
            actual_minutes: 0,
            planned_minutes: plannedMinutes
          });

        if (insertError) {
          console.error('Task insert error:', insertError);
          throw insertError;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Timer started successfully',
        timer_started_at: now,
        total_work_seconds: existingTask ? (existingTask.actual_minutes || 0) * 60 : 0
      });

    } else {
      // Legacy Order Logic
      // Check if timer is already running for this order
      const { data: orderData, error: fetchError } = await supabase
        .from('order')
        .select('is_timer_running, timer_started_at, total_work_seconds')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if ((orderData as any).is_timer_running) {
        return NextResponse.json(
          { error: 'Timer is already running for this order' },
          { status: 400 }
        );
      }

      // Start the timer
      const { error: updateError } = await (supabase as any)
        .from('order')
        .update({
          is_timer_running: true,
          timer_started_at: now,
          timer_paused_at: null,
        })
        .eq('id', orderId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to start timer' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Timer started successfully',
        timer_started_at: now,
        total_work_seconds: (orderData as any).total_work_seconds || 0,
      });
    }
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
