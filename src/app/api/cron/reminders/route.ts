import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const now = new Date()
  const results: { order: number; type: string }[] = []
  
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)
  const { data: ordersFor3Week } = await supabase
    .from('order')
    .select('id, order_number, client:client_id(first_name, phone)')
    .eq('status', 'ready')
    .eq('notification_count', 1)
    .lt('last_notification_sent_at', threeWeeksAgo.toISOString())
  
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const { data: ordersFor1Month } = await supabase
    .from('order')
    .select('id, order_number, client:client_id(first_name, phone)')
    .eq('status', 'ready')
    .eq('notification_count', 2)
    .lt('last_notification_sent_at', oneMonthAgo.toISOString())

  const webhookUrl = process.env.N8N_SMS_WEBHOOK_URL
  
  for (const order of ordersFor3Week || []) {
    const clientData = order.client as unknown
    const client = (Array.isArray(clientData) ? clientData[0] : clientData) as { first_name: string; phone: string } | null
    if (client?.phone && webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'reminder_3week',
            phone: client.phone,
            firstName: client.first_name,
            orderNumber: order.order_number
          })
        })
        
        await supabase
          .from('order')
          .update({ 
            last_notification_sent_at: now.toISOString(),
            notification_count: 2
          })
          .eq('id', order.id)
        
        results.push({ order: order.order_number, type: '3week' })
      } catch (err) {
        console.error('Failed to send 3-week reminder:', err)
      }
    }
  }
  
  for (const order of ordersFor1Month || []) {
    const clientData = order.client as unknown
    const client = (Array.isArray(clientData) ? clientData[0] : clientData) as { first_name: string; phone: string } | null
    if (client?.phone && webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'reminder_1month',
            phone: client.phone,
            firstName: client.first_name,
            orderNumber: order.order_number
          })
        })
        
        await supabase
          .from('order')
          .update({ 
            last_notification_sent_at: now.toISOString(),
            notification_count: 3
          })
          .eq('id', order.id)
        
        results.push({ order: order.order_number, type: '1month' })
      } catch (err) {
        console.error('Failed to send 1-month reminder:', err)
      }
    }
  }

  return NextResponse.json({ 
    success: true, 
    processed: results.length,
    results,
    timestamp: now.toISOString()
  })
}
