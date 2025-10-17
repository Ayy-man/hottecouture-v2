import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  getCorrelationId,
  logEvent,
  validateRequest,
  NotFoundError,
  ConflictError,
} from '@/lib/api/error-handler';
import { orderStageSchema, OrderStage, OrderStageResponse } from '@/lib/dto';
import { sendSMSNotification } from '@/lib/webhooks/sms-webhook';
// Simple time tracking: just record timestamps

// Valid status transitions - more flexible for Kanban board
const validTransitions: Record<string, string[]> = {
  pending: ['working', 'done', 'ready', 'delivered', 'archived'], // Allow direct transitions
  working: ['pending', 'done', 'ready', 'delivered', 'archived'],
  done: ['pending', 'working', 'ready', 'delivered', 'archived'],
  ready: ['pending', 'working', 'done', 'delivered', 'archived'],
  delivered: ['pending', 'working', 'done', 'ready', 'archived'],
  archived: ['pending'], // Allow unarchiving
};

async function handleOrderStage(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<OrderStageResponse> {
  const correlationId = getCorrelationId(request);
  const supabase = await createServiceRoleClient();

  // Validate authentication (skip for development)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log(
      '🔧 Development mode: Skipping authentication for order stage update'
    );
    // In development, we'll allow the update to proceed without authentication
  }

  // Parse and validate request body
  const body = await request.json();
  const validatedData = validateRequest(
    orderStageSchema,
    body,
    correlationId
  ) as OrderStage;

  const orderId = params.id;
  const newStage = validatedData.stage;

  // Get current order status and client info for SMS notifications
  const { data: order, error: orderError } = await supabase
    .from('order')
    .select(
      `
      id, 
      status, 
      client_id,
      client:client_id (
        id,
        ghl_contact_id
      )
    `
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new NotFoundError('Order', correlationId);
  }

  const currentStatus = (order as any).status;
  console.log('🔍 Stage API: Order status check:', {
    orderId,
    currentStatus,
    order,
  });

  // Validate status transition
  const allowedTransitions = validTransitions[currentStatus] || [];
  if (!allowedTransitions.includes(newStage)) {
    throw new ConflictError(
      `Invalid status transition from ${currentStatus} to ${newStage}. Allowed transitions: ${allowedTransitions.join(', ')}`,
      correlationId
    );
  }

  // Update order status
  const { error: updateError } = await (supabase as any)
    .from('order')
    .update({ status: newStage })
    .eq('id', orderId);

  if (updateError) {
    throw new Error(`Failed to update order status: ${updateError.message}`);
  }

  // Note: Automatic time tracking removed - now using manual timer controls
  // Time tracking is now handled via dedicated timer API endpoints

  // Check if all tasks are complete (for automatic status updates)
  let allTasksComplete = false;
  if (newStage === 'done' || newStage === 'ready') {
    // First get garments for this order, then get tasks for those garments
    const { data: garments, error: garmentsError } = await (supabase as any)
      .from('garment')
      .select('id')
      .eq('order_id', orderId);

    if (garmentsError) {
      console.warn('Failed to get garments for order:', garmentsError.message);
    } else if (garments && garments.length > 0) {
      const garmentIds = garments.map((g: any) => g.id);
      const { data: tasks, error: tasksError } = await (supabase as any)
        .from('task')
        .select('id, stage')
        .in('garment_id', garmentIds)
        .in('stage', ['pending', 'working']);

      if (tasksError) {
        console.warn('Failed to check task completion:', tasksError.message);
      } else {
        allTasksComplete = !tasks || tasks.length === 0;
      }
    } else {
      // No garments found, consider tasks complete
      allTasksComplete = true;
    }
  }

  // Note: Removed automatic advancement from 'done' to 'ready'
  // Orders should stay in 'done' status until manually moved to 'ready'
  // This allows for proper quality control and review process

  // Send SMS notifications for ready/delivered status changes
  const client = (order as any).client;
  const ghlContactId = client?.ghl_contact_id;

  if (ghlContactId && (newStage === 'ready' || newStage === 'delivered')) {
    try {
      const smsData = {
        contactId: ghlContactId,
        action: newStage === 'ready' ? 'add' : ('remove' as 'add' | 'remove'),
      };

      const smsResult = await sendSMSNotification(smsData);
      if (smsResult.success) {
        console.log(
          `✅ SMS notification sent for order ${orderId} (${newStage}):`,
          smsData
        );
      } else {
        console.warn(
          `⚠️ SMS notification failed for order ${orderId} (${newStage}):`,
          smsResult.error
        );
      }
    } catch (smsError) {
      console.warn(
        `⚠️ SMS notification error for order ${orderId} (${newStage}):`,
        smsError
      );
      // Don't fail the order update if SMS fails
    }
  } else if (newStage === 'ready' || newStage === 'delivered') {
    console.log(
      `ℹ️ No GHL contact ID found for order ${orderId}, skipping SMS notification`
    );
  }

  // Log the event
  await logEvent('order', orderId, 'status_changed', {
    correlationId,
    fromStatus: currentStatus,
    toStatus: newStage,
    allTasksComplete,
    notes: validatedData.notes,
  });

  const response: OrderStageResponse = {
    orderId,
    status: newStage,
    allTasksComplete,
    message: `Order status updated from ${currentStatus} to ${newStage}`,
  };

  return response;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    () => handleOrderStage(request, { params }),
    request
  );
}
