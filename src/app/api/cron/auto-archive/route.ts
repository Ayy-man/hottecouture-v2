import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const DAYS_OLD = 10

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

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_OLD)

  console.log(`🔄 Auto-archive cron: archiving orders delivered before ${cutoffDate.toISOString()}`)

  const { data: oldDeliveredOrders, error: fetchError } = await supabase
    .from('order')
    .select('id, order_number')
    .eq('status', 'delivered')
    .lt('created_at', cutoffDate.toISOString())

  if (fetchError) {
    console.error('Error fetching old delivered orders:', fetchError)
    return NextResponse.json(
      { error: 'Failed to fetch old delivered orders' },
      { status: 500 }
    )
  }

  if (!oldDeliveredOrders || oldDeliveredOrders.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No orders to auto-archive',
      archived_count: 0,
      timestamp: now.toISOString()
    })
  }

  const { error: updateError } = await supabase
    .from('order')
    .update({ status: 'archived', is_archived: true, archived_at: new Date().toISOString() })
    .in('id', oldDeliveredOrders.map(o => o.id))

  if (updateError) {
    console.error('Error auto-archiving orders:', updateError)
    return NextResponse.json(
      { error: 'Failed to auto-archive orders' },
      { status: 500 }
    )
  }

  const archivedOrderNumbers = oldDeliveredOrders.map(o => o.order_number)
  console.log(`✅ Auto-archived ${archivedOrderNumbers.length} orders:`, archivedOrderNumbers)

  return NextResponse.json({
    success: true,
    archived_count: archivedOrderNumbers.length,
    archived_orders: archivedOrderNumbers,
    timestamp: now.toISOString()
  })
}
