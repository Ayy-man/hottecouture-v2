import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  const orderNumber = searchParams.get('orderNumber')

  if (!phone && !orderNumber) {
    return NextResponse.json(
      { error: 'Veuillez fournir un numéro de téléphone ou de commande.' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    let query = supabase
      .from('order')
      .select(`
        order_number,
        status,
        due_date,
        created_at,
        client:client_id(phone),
        garment(id)
      `)
      .not('status', 'eq', 'archived')
      .order('created_at', { ascending: false })
      .limit(10)

    if (orderNumber) {
      query = query.eq('order_number', parseInt(orderNumber, 10))
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Portal lookup error:', error)
      return NextResponse.json({ error: 'Erreur de recherche.' }, { status: 500 })
    }

    let filteredOrders = orders || []

    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '')
      filteredOrders = filteredOrders.filter(order => {
        const clientData = order.client as unknown
        const client = (Array.isArray(clientData) ? clientData[0] : clientData) as { phone: string } | null
        if (!client?.phone) return false
        const orderPhone = client.phone.replace(/\D/g, '')
        return orderPhone.includes(normalizedPhone) || normalizedPhone.includes(orderPhone.slice(-7))
      })
    }

    const results = filteredOrders.map(order => ({
      order_number: order.order_number,
      status: order.status,
      due_date: order.due_date,
      created_at: order.created_at,
      garment_count: Array.isArray(order.garment) ? order.garment.length : 0,
    }))

    return NextResponse.json({ orders: results })
  } catch (err) {
    console.error('Portal lookup exception:', err)
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 })
  }
}
