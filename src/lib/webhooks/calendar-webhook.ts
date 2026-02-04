interface CalendarEventData {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  assignee: string;
  order_id: string;
  order_number: number;
  client_name: string;
  estimated_hours?: number;
}

export async function createCalendarEvent(eventData: CalendarEventData) {
  const webhookUrl = process.env.N8N_CALENDAR_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️ N8N_CALENDAR_WEBHOOK_URL not configured');
    return {
      success: false,
      error: 'Calendar webhook not configured (N8N_CALENDAR_WEBHOOK_URL)',
    };
  }

  try {
    console.log('📅 Creating calendar event:', eventData);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        ...eventData,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Calendar webhook failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json().catch(() => ({}));
    console.log('✅ Calendar event created successfully:', result);

    return {
      success: true,
      data: result,
      eventId: result.eventId || result.event_id || null,
    };
  } catch (error) {
    console.error('❌ Calendar webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function formatOrderForCalendar(order: {
  id: string;
  order_number: number;
  due_date?: string;
  assigned_to?: string;
  type: string;
  client?: {
    first_name: string;
    last_name: string;
  };
  garments?: Array<{ services?: Array<{ service?: { estimated_minutes?: number } }> }>;
}): CalendarEventData | null {
  if (!order.assigned_to || !order.due_date) {
    return null;
  }

  let totalMinutes = 0;
  if (order.garments) {
    for (const garment of order.garments) {
      for (const service of garment.services || []) {
        totalMinutes += service.service?.estimated_minutes || 0;
      }
    }
  }

  const clientName = order.client
    ? `${order.client.first_name} ${order.client.last_name}`.trim()
    : 'Unknown Client';

  const result: CalendarEventData = {
    title: `Order #${order.order_number} - ${clientName}`,
    description: `${order.type.charAt(0).toUpperCase() + order.type.slice(1)} order for ${clientName}`,
    start_date: order.due_date,
    assignee: order.assigned_to,
    order_id: order.id,
    order_number: order.order_number,
    client_name: clientName,
  };

  if (totalMinutes > 0) {
    result.estimated_hours = Math.ceil(totalMinutes / 60);
  }

  return result;
}
