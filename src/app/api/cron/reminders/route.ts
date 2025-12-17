import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPickupReminder, isGHLConfigured, type AppClient } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  if (!isGHLConfigured()) {
    return NextResponse.json({ error: 'GHL not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  const results: { order: number; type: string; success: boolean }[] = [];

  // Find orders ready for 3+ weeks (notification_count = 1 means initial ready notification sent)
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const { data: ordersFor3Week } = await supabase
    .from('order')
    .select(`
      id,
      order_number,
      client:client_id (
        id,
        first_name,
        last_name,
        email,
        phone,
        language,
        preferred_contact,
        ghl_contact_id
      )
    `)
    .eq('status', 'ready')
    .eq('notification_count', 1)
    .lt('last_notification_sent_at', threeWeeksAgo.toISOString());

  // Find orders ready for 1+ month (notification_count = 2 means 3-week reminder sent)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { data: ordersFor1Month } = await supabase
    .from('order')
    .select(`
      id,
      order_number,
      client:client_id (
        id,
        first_name,
        last_name,
        email,
        phone,
        language,
        preferred_contact,
        ghl_contact_id
      )
    `)
    .eq('status', 'ready')
    .eq('notification_count', 2)
    .lt('last_notification_sent_at', oneMonthAgo.toISOString());

  // Send 3-week reminders
  for (const order of ordersFor3Week || []) {
    const clientData = order.client as unknown;
    const client = (Array.isArray(clientData) ? clientData[0] : clientData) as AppClient | null;

    if (client?.phone || client?.email) {
      try {
        const result = await sendPickupReminder(client, order.order_number, '3week');

        if (result.success) {
          await supabase
            .from('order')
            .update({
              last_notification_sent_at: now.toISOString(),
              notification_count: 2,
            })
            .eq('id', order.id);

          results.push({ order: order.order_number, type: '3week', success: true });
          console.log(`📱 3-week reminder sent for order #${order.order_number}`);
        } else {
          results.push({ order: order.order_number, type: '3week', success: false });
          console.error(`Failed to send 3-week reminder for order #${order.order_number}:`, result.error);
        }
      } catch (err) {
        console.error('Failed to send 3-week reminder:', err);
        results.push({ order: order.order_number, type: '3week', success: false });
      }
    }
  }

  // Send 1-month (final) reminders
  for (const order of ordersFor1Month || []) {
    const clientData = order.client as unknown;
    const client = (Array.isArray(clientData) ? clientData[0] : clientData) as AppClient | null;

    if (client?.phone || client?.email) {
      try {
        const result = await sendPickupReminder(client, order.order_number, '1month');

        if (result.success) {
          await supabase
            .from('order')
            .update({
              last_notification_sent_at: now.toISOString(),
              notification_count: 3,
            })
            .eq('id', order.id);

          results.push({ order: order.order_number, type: '1month', success: true });
          console.log(`📱 1-month reminder sent for order #${order.order_number}`);
        } else {
          results.push({ order: order.order_number, type: '1month', success: false });
          console.error(`Failed to send 1-month reminder for order #${order.order_number}:`, result.error);
        }
      } catch (err) {
        console.error('Failed to send 1-month reminder:', err);
        results.push({ order: order.order_number, type: '1month', success: false });
      }
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    processed: results.length,
    successful,
    failed,
    results,
    timestamp: now.toISOString(),
  });
}
