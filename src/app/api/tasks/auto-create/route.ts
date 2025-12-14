import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const requestSchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { orderId } = requestSchema.parse(body);

    console.log(`🔧 Auto-creating tasks for order: ${orderId}`);

    // 1. Get all garments for this order
    const { data: garments, error: garmentsError } = await supabase
      .from('garment')
      .select(`
        id,
        garment_service (
          service_id,
          quantity,
          custom_price_cents,
          service (
            id,
            name,
            estimated_minutes
          )
        )
      `)
      .eq('order_id', orderId);

    if (garmentsError) {
      console.error('Error fetching garments:', garmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch garments', details: garmentsError.message },
        { status: 500 }
      );
    }

    if (!garments || garments.length === 0) {
      console.log(`No garments found for order ${orderId}`);
      return NextResponse.json({
        success: true,
        message: 'No garments found',
        tasksCreated: 0,
      });
    }

    // 2. Check if tasks already exist
    const garmentIds = garments.map((g: any) => g.id);
    const { data: existingTasks, error: tasksError } = await supabase
      .from('task')
      .select('garment_id, service_id')
      .in('garment_id', garmentIds);

    if (tasksError) {
      console.error('Error checking existing tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to check existing tasks', details: tasksError.message },
        { status: 500 }
      );
    }

    // Create a Set of existing (garment_id, service_id) pairs
    const existingTaskPairs = new Set(
      (existingTasks || []).map((t: any) => `${t.garment_id}-${t.service_id}`)
    );

    // 3. Create tasks for each garment-service combination
    const tasksToCreate = [];
    let totalTasksCreated = 0;

    for (const garment of garments) {
      const garmentServices = garment.garment_service || [];

      for (const garmentService of garmentServices) {
        const service = garmentService.service;
        if (!service) continue;

        const taskKey = `${garment.id}-${service.id}`;

        // Skip if task already exists
        if (existingTaskPairs.has(taskKey)) {
          console.log(`Task already exists for garment ${garment.id}, service ${service.id}`);
          continue;
        }

        // Calculate total planned minutes (quantity * estimated_minutes)
        const plannedMinutes = (service.estimated_minutes || 0) * (garmentService.quantity || 1);

        tasksToCreate.push({
          garment_id: garment.id,
          service_id: service.id,
          operation: service.name, // Use service name as operation
          stage: 'pending',
          planned_minutes: plannedMinutes,
          actual_minutes: 0,
          is_active: false,
        });

        console.log(`Will create task: ${service.name} for garment ${garment.id} (${plannedMinutes} minutes)`);
        totalTasksCreated++;
      }

      // If no services found for garment, create a general task
      if (garmentServices.length === 0) {
        const taskKey = `${garment.id}-null`;
        if (!existingTaskPairs.has(taskKey)) {
          tasksToCreate.push({
            garment_id: garment.id,
            service_id: null,
            operation: 'General Work',
            stage: 'pending',
            planned_minutes: 60, // Default 1 hour
            actual_minutes: 0,
            is_active: false,
          });
          totalTasksCreated++;
          console.log(`Will create general task for garment ${garment.id}`);
        }
      }
    }

    // 4. Insert all tasks in a single batch
    if (tasksToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('task')
        .insert(tasksToCreate);

      if (insertError) {
        console.error('Error creating tasks:', insertError);
        return NextResponse.json(
          { error: 'Failed to create tasks', details: insertError.message },
          { status: 500 }
        );
      }

      console.log(`✅ Successfully created ${tasksToCreate.length} tasks for order ${orderId}`);
    }

    return NextResponse.json({
      success: true,
      message: `Task auto-creation complete`,
      orderId,
      tasksCreated: totalTasksCreated,
      garmentsProcessed: garments.length,
    });

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