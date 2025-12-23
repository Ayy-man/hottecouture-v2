import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const supabase = await createServiceRoleClient();

    // Get archived orders with client details (using status for now)
    const { data: orders, error } = await supabase
      .from('order')
      .select(
        `
        id,
        order_number,
        type,
        priority,
        status,
        due_date,
        rush,
        rush_fee_cents,
        subtotal_cents,
        tax_cents,
        total_cents,
        deposit_cents,
        balance_due_cents,
        rack_position,
        created_at,
        client:client_id (
          id,
          first_name,
          last_name,
          phone,
          email
        ),
        garments:garment (
          id,
          type,
          notes
        )
      `
      )
      .eq('status', 'archived')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching archived orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch archived orders' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('order')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'archived');

    if (countError) {
      console.error('Error counting archived orders:', countError);
    }

    // Transform the data to match the expected format
    const transformedOrders =
      orders?.map((order: any) => ({
        ...order,
        client_name: order.client
          ? `${order.client.first_name} ${order.client.last_name}`
          : 'Unknown Client',
        client_phone: order.client?.phone || '',
        client_email: order.client?.email || '',
        garments: order.garments || [],
      })) || [];

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Archived orders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
