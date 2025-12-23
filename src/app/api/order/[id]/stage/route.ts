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
// Note: Auto-create tasks logic removed - garment_service IS the task
import {
  sendReadyPickup,
  isGHLConfigured,
  type AppClient,
  type AppOrder,
} from '@/lib/ghl';
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
  { params }: { params: Promise<{ id: string }> }
): Promise<OrderStageResponse> {
  const correlationId = getCorrelationId(request);
  const supabase = await createServiceRoleClient();

  // Parse and validate request body
  const body = await request.json();
  const validatedData = validateRequest(
    orderStageSchema,
    body,
    correlationId
  ) as OrderStage;

  const { id: orderId } = await params;
  const newStage = validatedData.stage;

  // Get current order with full details for webhooks and SMS notifications
  const { data: order, error: orderError } = await supabase
    .from('order')
    .select(
      `
      id, 
      order_number,
      status,
      type,
      subtotal_cents,
      tps_cents,
      tvq_cents,
      total_cents,
      total_work_seconds,
      client_id,
      client:client_id (
        id,
        first_name,
        last_name,
        phone,
        email,
        language,
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

  // B4: Require final hours when moving to 'ready' or 'done'
  const legacyTotalSeconds = (order as any).total_work_seconds || 0;

  // Calculate time from garments (each garment IS a task)
  let taskTotalSeconds = 0;
  const { data: validationGarments, error: valGarError } = await supabase
    .from('garment')
    .select('id, actual_minutes')
    .eq('order_id', orderId);

  if (valGarError) {
    console.error('Error fetching garments for validation:', valGarError);
  }

  if (validationGarments && validationGarments.length > 0) {
    taskTotalSeconds = validationGarments.reduce((sum: number, g: any) => sum + ((g.actual_minutes || 0) * 60), 0);
  }

  const totalRecordedSeconds = legacyTotalSeconds + taskTotalSeconds;
  console.log(`⏱️ Validation Check: Order ${orderId} -> ${newStage}. Time: ${totalRecordedSeconds}s (Legacy: ${legacyTotalSeconds}s, Tasks: ${taskTotalSeconds}s)`);

  if ((newStage === 'done' || newStage === 'ready') && totalRecordedSeconds <= 1) { // Allow 1s margin of error, basically 0
    console.warn(`⛔️ Validation Failed: blocked moving to ${newStage} with 0s time.`);
    throw new ConflictError(
      `Cannot mark order as ${newStage} without recording work time. Please use the timer to track hours.`,
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

  // Note: Auto-create tasks logic removed - garment_service records ARE the tasks
  // They exist from order creation via intake, no need to create separately

  // Note: Automatic time tracking removed - now using manual timer controls
  // Time tracking is now handled via dedicated timer API endpoints

  // Check if all garments (tasks) are complete
  let allTasksComplete = false;
  if (newStage === 'done' || newStage === 'ready') {
    // Check garment stages directly (each garment IS a task)
    const { data: pendingGarments, error: garmentsError } = await (supabase as any)
      .from('garment')
      .select('id, stage')
      .eq('order_id', orderId)
      .in('stage', ['pending', 'working']);

    if (garmentsError) {
      console.warn('Failed to check garment completion:', garmentsError.message);
    } else {
      allTasksComplete = !pendingGarments || pendingGarments.length === 0;
    }
  }

  // Note: Removed automatic advancement from 'done' to 'ready'
  // Orders should stay in 'done' status until manually moved to 'ready'
  // This allows for proper quality control and review process

  // Get client and notification settings
  const client = (order as any).client;
  const shouldSendNotification = validatedData.sendNotification === true;

  // Trigger order-status webhook for integrations (Agent B: QuickBooks, etc.)
  if (newStage === 'ready' || newStage === 'delivered') {
    try {
      const orderData = order as any;
      const clientData = orderData.client;

      // Fetch garments with services for webhook payload
      const { data: garments } = await supabase
        .from('garment')
        .select(`
          id,
          type,
          garment_service (
            quantity,
            custom_price_cents,
            service (
              name,
              base_price_cents
            )
          )
        `)
        .eq('order_id', orderId);

      const items = (garments || []).map((g: any) => ({
        garment_type: g.type,
        services: (g.garment_service || []).map((gs: any) => gs.service?.name || 'Custom'),
        total_cents: (g.garment_service || []).reduce((sum: number, gs: any) => {
          const price = gs.custom_price_cents || gs.service?.base_price_cents || 0;
          return sum + (price * (gs.quantity || 1));
        }, 0),
      }));

      const webhookPayload = {
        event: 'order.status_changed',
        order_id: orderId,
        order_number: orderData.order_number,
        new_status: newStage,
        client: {
          id: clientData?.id,
          name: clientData ? `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() : 'Unknown',
          phone: clientData?.phone || null,
          email: clientData?.email || null,
          language: clientData?.language || 'fr',
        },
        items,
        totals: {
          subtotal_cents: orderData.subtotal_cents || 0,
          tps_cents: orderData.tps_cents || 0,
          tvq_cents: orderData.tvq_cents || 0,
          total_cents: orderData.total_cents || 0,
        },
        timestamp: new Date().toISOString(),
      };

      // Call internal webhook endpoint (Agent B will handle Make.com integration)
      const webhookResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/order-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        }
      );

      if (webhookResponse.ok) {
        console.log(`✅ Order status webhook triggered for order ${orderId} (${newStage})`);
      } else {
        console.warn(`⚠️ Order status webhook failed for order ${orderId}:`, await webhookResponse.text());
      }
    } catch (webhookError) {
      console.warn(`⚠️ Order status webhook error for order ${orderId}:`, webhookError);
      // Don't fail the order update if webhook fails
    }
  }

  // Auto-send notification when order moves to "Ready"
  if (newStage === 'ready' && shouldSendNotification && isGHLConfigured()) {
    const orderData = order as any;
    const paymentStatus = orderData.payment_status;

    // If payment is not complete, create checkout and send payment link
    if (paymentStatus !== 'paid') {
      try {
        // Determine payment type based on order type and deposit status
        const isCustomOrder = orderData.type === 'custom';
        const depositPaid = orderData.deposit_paid_at !== null;
        const paymentType = isCustomOrder && depositPaid ? 'balance' : (isCustomOrder ? 'balance' : 'full');

        console.log(`💳 Auto-sending payment link for order ${orderId} (type: ${paymentType})`);

        const paymentResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/create-checkout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              type: paymentType,
              sendSms: true, // Auto-send notification via GHL
            }),
          }
        );

        if (paymentResponse.ok) {
          const paymentResult = await paymentResponse.json();
          console.log(`✅ Payment link sent for order ${orderId}: ${paymentResult.checkoutUrl}`);
        } else {
          const errorText = await paymentResponse.text();
          console.warn(`⚠️ Failed to create payment link for order ${orderId}:`, errorText);
        }
      } catch (paymentError) {
        console.warn(`⚠️ Payment link error for order ${orderId}:`, paymentError);
        // Don't fail the stage change if payment link fails
      }
    } else {
      // Order already paid - just send pickup notification without payment link
      console.log(`ℹ️ Order ${orderId} already paid, sending pickup notification only`);
      try {
        const ghlClient: AppClient = {
          id: client?.id || '',
          first_name: client?.first_name || '',
          last_name: client?.last_name || '',
          email: client?.email || null,
          phone: client?.phone || null,
          language: client?.language || 'fr',
          ghl_contact_id: client?.ghl_contact_id || null,
          preferred_contact: client?.preferred_contact || 'sms',
        };

        const ghlOrder: AppOrder = {
          id: orderId,
          order_number: orderData.order_number,
          type: orderData.type || 'alteration',
          status: newStage,
          total_cents: orderData.total_cents || 0,
          deposit_cents: orderData.deposit_cents || 0,
          balance_due_cents: 0, // Already paid
        };

        await sendReadyPickup(ghlClient, ghlOrder, null, 0);
        console.log(`✅ Pickup notification sent for paid order ${orderId}`);
      } catch (notifyError) {
        console.warn(`⚠️ Pickup notification error for order ${orderId}:`, notifyError);
      }
    }
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
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(
    () => handleOrderStage(request, { params }),
    request
  );
}
