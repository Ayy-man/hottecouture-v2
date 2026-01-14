import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    console.log('🔍 ORDER HISTORY API: Fetching history for client:', clientId)
    
    const supabase = await createServiceRoleClient()
    
    // Get all orders for the client, ordered by creation date (newest first)
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
        client_id
      `)
      .eq('client_id', clientId)
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
        clientId
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
        brand
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
      const orderGarments = garmentsByOrder.get(order.id) || []
      
      // Add services to each garment
      const garmentsWithServices = orderGarments.map((garment: any) => ({
        ...garment,
        services: servicesByGarment.get(garment.id) || []
      }))
      
      return {
        ...order,
        garments: garmentsWithServices
      }
    })

    console.log('✅ ORDER HISTORY API: Successfully processed', ordersWithDetails.length, 'orders for client', clientId)

    const response = NextResponse.json({
      success: true,
      orders: ordersWithDetails,
      count: ordersWithDetails.length,
      clientId
    })
    
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch (error) {
    console.error('❌ ORDER HISTORY API ERROR:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
