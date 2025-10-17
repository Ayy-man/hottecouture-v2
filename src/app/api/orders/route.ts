export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('🔍 SIMPLE ORDERS API: Starting fresh approach...');

    const supabase = await createServiceRoleClient();

    // Step 1: Get ALL non-archived orders with stable sorting
    const { data: orders, error: ordersError } = (await supabase
      .from('order')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })) as {
      data: any[] | null;
      error: any;
    };

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    console.log('📊 SIMPLE ORDERS API: Found', orders?.length || 0, 'orders');
    console.log('📊 Order numbers:', orders?.map(o => o.order_number) || []);

    if (!orders || orders.length === 0) {
      const response = NextResponse.json({
        success: true,
        orders: [],
        count: 0,
        timestamp: new Date().toISOString(),
      });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    // Step 2: Get client data for all orders
    const clientIds = [...new Set(orders.map(order => order.client_id))];
    const { data: clients, error: clientError } = (await supabase
      .from('client')
      .select('id, first_name, last_name, phone, email')
      .in('id', clientIds)) as { data: any[] | null; error: any };

    if (clientError) {
      console.error('❌ Error fetching clients:', clientError);
    }

    const clientMap = new Map(
      clients?.map(client => [client.id, client]) || []
    );

    // Step 3: Get garment data for all orders
    const orderIds = orders.map(order => order.id);
    const { data: garments, error: garmentError } = (await supabase
      .from('garment')
      .select('id, order_id, type, color, brand, notes, label_code, photo_path')
      .in('order_id', orderIds)) as { data: any[] | null; error: any };

    if (garmentError) {
      console.error('❌ Error fetching garments:', garmentError);
    }

    // Group garments by order_id
    const garmentsByOrder = new Map();
    garments?.forEach(garment => {
      if (!garmentsByOrder.has(garment.order_id)) {
        garmentsByOrder.set(garment.order_id, []);
      }
      garmentsByOrder.get(garment.order_id).push(garment);
    });

    // Step 4: Get garment services for all garments
    const garmentIds = garments?.map(g => g.id) || [];
    const { data: garmentServices, error: serviceError } = (await supabase
      .from('garment_service')
      .select(
        `
        garment_id,
        quantity,
        custom_price_cents,
        notes,
        service (
          id,
          name,
          description,
          base_price_cents,
          estimated_minutes
        )
      `
      )
      .in('garment_id', garmentIds)) as { data: any[] | null; error: any };

    if (serviceError) {
      console.error('❌ Error fetching garment services:', serviceError);
    }

    // Group services by garment_id
    const servicesByGarment = new Map();
    garmentServices?.forEach(gs => {
      if (!servicesByGarment.has(gs.garment_id)) {
        servicesByGarment.set(gs.garment_id, []);
      }
      servicesByGarment.get(gs.garment_id).push(gs);
    });

    // Step 5: Combine everything
    const ordersWithDetails = orders.map(order => {
      const client = clientMap.get(order.client_id);
      const orderGarments = garmentsByOrder.get(order.id) || [];

      // Add services to each garment
      const garmentsWithServices = orderGarments.map((garment: any) => ({
        ...garment,
        services: servicesByGarment.get(garment.id) || [],
      }));

      return {
        ...order,
        client_name: client
          ? `${client.first_name || ''} ${client.last_name || ''}`.trim()
          : 'Unknown Client',
        client_phone: client?.phone || null,
        client_email: client?.email || null,
        garments: garmentsWithServices,
      };
    });

    console.log(
      '✅ SIMPLE ORDERS API: Successfully processed',
      ordersWithDetails.length,
      'orders'
    );

    const response = NextResponse.json({
      success: true,
      orders: ordersWithDetails,
      count: ordersWithDetails.length,
      timestamp: new Date().toISOString(),
    });

    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('❌ SIMPLE ORDERS API ERROR:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
