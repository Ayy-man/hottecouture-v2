export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    console.log('🔍 OPTIMIZED ORDERS API: Starting...');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const clientId = searchParams.get('client_id');

    const supabase = await createServiceRoleClient();

    if (!supabase) {
      console.error('❌ Failed to create Supabase client');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Use RPC function to get all data in a single query
    const { data: orders, error: ordersError } = await supabase.rpc('get_orders_with_details', {
      p_limit: limit,
      p_offset: offset,
      p_client_id: clientId
    });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    console.log('📊 ORDERS API: Found', orders?.length || 0, 'orders');

    // Get total count for pagination
    let countQuery = supabase
      .from('order')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false);

    if (clientId) {
      countQuery = countQuery.eq('client_id', clientId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('❌ Error getting order count:', countError);
    }

    // Process the data
    const processedOrders = orders?.map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      client_id: order.client_id,
      status: order.status,
      rush: order.rush,
      due_date: order.due_date,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      is_archived: order.is_archived,
      estimated_completion_date: order.estimated_completion_date,
      actual_completion_date: order.actual_completion_date,
      price_cents: order.price_cents,
      is_active: order.is_active,
      client_name: order.client_first_name && order.client_last_name
        ? `${order.client_first_name} ${order.client_last_name}`.trim()
        : order.client_first_name || order.client_last_name || 'Unknown Client',
      client_phone: order.client_phone,
      client_email: order.client_email,
      garments: order.garments || [],
      total_garments: order.total_garments,
      total_services: order.total_services
    })) || [];

    const response = NextResponse.json({
      success: true,
      orders: processedOrders,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      timestamp: new Date().toISOString(),
    });

    // Add caching headers - allow short-term caching for pagination
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    return response;

  } catch (error) {
    console.error('❌ ORDERS API ERROR:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
