import { createClient } from '@/lib/supabase/server';

export interface MakeWebhookPayload {
  event: 'order.status_changed' | 'order.payment_received';
  order_id: string;
  order_number: number;
  new_status?: string;
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    language: string;
  };
  items: Array<{
    garment_type: string;
    services: string[];
    total_cents: number;
  }>;
  totals: {
    subtotal_cents: number;
    tps_cents: number;
    tvq_cents: number;
    total_cents: number;
  };
  timestamp: string;
}

export interface MakeWebhookResponse {
  success: boolean;
  invoice_url?: string;
  invoice_number?: string;
  error?: string;
}

export async function sendToMake(
  payload: MakeWebhookPayload
): Promise<MakeWebhookResponse> {
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

  if (!makeWebhookUrl) {
    console.warn('⚠️ MAKE_WEBHOOK_URL not configured');
    return { success: false, error: 'Make.com webhook URL not configured' };
  }

  try {
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Make.com webhook failed:', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('✅ Make.com webhook successful:', result);

    return {
      success: true,
      invoice_url: result.invoice_url,
      invoice_number: result.invoice_number,
    };
  } catch (error) {
    console.error('❌ Make.com webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateOrderWithInvoice(
  orderId: string,
  invoiceUrl: string,
  invoiceNumber: string
): Promise<void> {
  const supabase = await createClient();

  await (supabase
    .from('order') as ReturnType<typeof supabase.from>)
    .update({
      invoice_url: invoiceUrl,
      invoice_number: invoiceNumber,
    })
    .eq('id', orderId);
}

export async function triggerQuickBooksInvoice(orderId: string): Promise<MakeWebhookResponse> {
  const supabase = await createClient();

  interface OrderQueryResult {
    id: string;
    order_number: number;
    status: string;
    subtotal_cents: number;
    tps_cents: number;
    tvq_cents: number;
    total_cents: number;
    client: {
      id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      email: string | null;
      language: string;
    };
    garment: Array<{
      type: string;
      garment_service: Array<{
        quantity: number;
        custom_price_cents: number | null;
        service: { name: string } | null;
      }>;
    }>;
  }

  const { data, error } = await supabase
    .from('order')
    .select(`
      id,
      order_number,
      status,
      subtotal_cents,
      tps_cents,
      tvq_cents,
      total_cents,
      client:client_id (
        id,
        first_name,
        last_name,
        phone,
        email,
        language
      ),
      garment (
        id,
        type,
        garment_service (
          id,
          quantity,
          custom_price_cents,
          service:service_id (
            name
          )
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Order not found' };
  }

  const order = data as unknown as OrderQueryResult;
  const client = order.client;
  const garments = order.garment;

  const payload: MakeWebhookPayload = {
    event: 'order.status_changed',
    order_id: order.id,
    order_number: order.order_number,
    new_status: order.status,
    client: {
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      phone: client.phone,
      email: client.email,
      language: client.language,
    },
    items: garments.map(g => ({
      garment_type: g.type,
      services: g.garment_service
        .filter(gs => gs.service)
        .map(gs => gs.service!.name),
      total_cents: g.garment_service.reduce(
        (sum, gs) => sum + (gs.custom_price_cents || 0) * gs.quantity,
        0
      ),
    })),
    totals: {
      subtotal_cents: order.subtotal_cents,
      tps_cents: order.tps_cents,
      tvq_cents: order.tvq_cents,
      total_cents: order.total_cents,
    },
    timestamp: new Date().toISOString(),
  };

  const result = await sendToMake(payload);

  if (result.success && result.invoice_url) {
    await updateOrderWithInvoice(orderId, result.invoice_url, result.invoice_number || '');
  }

  return result;
}
