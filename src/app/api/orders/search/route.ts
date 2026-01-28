import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const lastName = searchParams.get('lastName')

    if (!phone || !lastName) {
      return NextResponse.json({ 
        error: 'Phone number and last name are required' 
      }, { status: 400 })
    }

    console.log('🔍 ORDER SEARCH API: Searching for:', { phone, lastName })
    
    const supabase = await createServiceRoleClient()
    
    // First, find the client by phone OR last name
    const { data: clients, error: clientError } = await supabase
      .from('client')
      .select('id, first_name, last_name, phone, email')
      .or(`phone.eq.${phone.trim()},last_name.ilike.%${lastName.trim()}%`) as { data: any[] | null, error: any }

    if (clientError) {
      console.error('❌ Error searching clients:', clientError)
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        orders: [],
        count: 0,
        message: 'No client found with that phone number and last name'
      })
    }

    // Get all orders for the found client(s)
    const clientIds = clients.map(client => client.id)
    const { data: orders, error: ordersError } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        status,
        type,
        rush,
        total_cents,
        created_at,
        due_date,
        work_completed_at,
        client_id
      `)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false }) as { data: any[] | null, error: any }

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        orders: [],
        count: 0,
        message: 'No orders found for this client'
      })
    }

    // Get garments for all orders
    const orderIds = orders.map(order => order.id)
    const { data: garments, error: garmentError } = await supabase
      .from('garment')
      .select(`
        id,
        order_id,
        type,
        color,
        brand,
        label_code
      `)
      .in('order_id', orderIds) as { data: any[] | null, error: any }

    if (garmentError) {
      console.error('❌ Error fetching garments:', garmentError)
    }

    // Get garment services for all garments
    const garmentIds = garments?.map(g => g.id) || []
    const { data: garmentServices, error: serviceError } = await supabase
      .from('garment_service')
      .select(`
        garment_id,
        quantity,
        custom_price_cents,
        service (
          id,
          name,
          description,
          base_price_cents
        )
      `)
      .in('garment_id', garmentIds) as { data: any[] | null, error: any }

    if (serviceError) {
      console.error('❌ Error fetching garment services:', serviceError)
    }

    // Create client map
    const clientMap = new Map(clients.map(client => [client.id, client]))

    // Group garments by order_id
    const garmentsByOrder = new Map()
    garments?.forEach(garment => {
      if (!garmentsByOrder.has(garment.order_id)) {
        garmentsByOrder.set(garment.order_id, [])
      }
      garmentsByOrder.get(garment.order_id).push(garment)
    })

    // Group services by garment_id
    const servicesByGarment = new Map()
    garmentServices?.forEach(gs => {
      if (!servicesByGarment.has(gs.garment_id)) {
        servicesByGarment.set(gs.garment_id, [])
      }
      servicesByGarment.get(gs.garment_id).push(gs)
    })

    // Combine everything
    const ordersWithDetails = orders.map(order => {
      const client = clientMap.get(order.client_id)
      const orderGarments = garmentsByOrder.get(order.id) || []
      
      // Add services to each garment
      const garmentsWithServices = orderGarments.map((garment: any) => ({
        ...garment,
        services: servicesByGarment.get(garment.id) || []
      }))
      
      return {
        ...order,
        client_name: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Unknown Client',
        client_phone: client?.phone || '',
        client_email: client?.email || null,
        garments: garmentsWithServices
      }
    })

    console.log('✅ ORDER SEARCH API: Successfully found', ordersWithDetails.length, 'orders for client')

    const response = NextResponse.json({
      success: true,
      orders: ordersWithDetails,
      count: ordersWithDetails.length
    })
    
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch (error) {
    console.error('❌ ORDER SEARCH API ERROR:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
