import { SupabaseClient } from '@supabase/supabase-js';

interface AutoCreateResult {
  success: boolean;
  message: string;
  orderId: string;
  tasksCreated: number;
  garmentsProcessed: number;
  error?: string;
}

/**
 * Auto-create tasks for an order based on its garments and services.
 * Called when order moves to "working" status.
 */
export async function autoCreateTasks(
  supabase: SupabaseClient,
  orderId: string
): Promise<AutoCreateResult> {
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
    return {
      success: false,
      message: 'Failed to fetch garments',
      orderId,
      tasksCreated: 0,
      garmentsProcessed: 0,
      error: garmentsError.message,
    };
  }

  if (!garments || garments.length === 0) {
    console.log(`No garments found for order ${orderId}`);
    return {
      success: true,
      message: 'No garments found',
      orderId,
      tasksCreated: 0,
      garmentsProcessed: 0,
    };
  }

  // 2. Check if tasks already exist
  const garmentIds = garments.map((g: any) => g.id);
  const { data: existingTasks, error: tasksError } = await supabase
    .from('task')
    .select('garment_id, service_id')
    .in('garment_id', garmentIds);

  if (tasksError) {
    console.error('Error checking existing tasks:', tasksError);
    return {
      success: false,
      message: 'Failed to check existing tasks',
      orderId,
      tasksCreated: 0,
      garmentsProcessed: 0,
      error: tasksError.message,
    };
  }

  // Create a Set of existing (garment_id, service_id) pairs
  const existingTaskPairs = new Set(
    (existingTasks || []).map((t: any) => `${t.garment_id}-${t.service_id}`)
  );

  // 3. Create tasks for each garment-service combination
  const tasksToCreate = [];
  let totalTasksCreated = 0;

  for (const garment of garments) {
    const garmentServices = (garment as any).garment_service || [];

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
      return {
        success: false,
        message: 'Failed to create tasks',
        orderId,
        tasksCreated: 0,
        garmentsProcessed: garments.length,
        error: insertError.message,
      };
    }

    console.log(`✅ Successfully created ${tasksToCreate.length} tasks for order ${orderId}`);
  }

  return {
    success: true,
    message: 'Task auto-creation complete',
    orderId,
    tasksCreated: totalTasksCreated,
    garmentsProcessed: garments.length,
  };
}
