import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // optional category filter

    const supabase = await createServiceRoleClient();

    // Build the query - get all orders in "working" status
    const query = supabase
      .from('order')
      .select(
        `
        id,
        order_number,
        status,
        due_date,
        created_at,
        client:client_id (
          first_name,
          last_name,
          phone,
          email
        ),
        garments:garment (
          id,
          type,
          garment_type_id,
          color,
          brand,
          notes,
          services:garment_service (
            id,
            quantity,
            custom_price_cents,
            notes,
            service:service_id (
              id,
              name,
              category,
              base_price_cents
            )
          )
        )
      `
      )
      .eq('status', 'working')
      .order('created_at', { ascending: true });

    // Apply category filter if provided
    if (category && category !== 'all') {
      // This is a complex query - we need to filter by service category
      // For now, we'll get all orders and filter in the application
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching work list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('🔍 Worklist Export Debug:', {
      category,
      totalOrdersFound: orders?.length || 0,
      orderNumbers: (orders as any[])?.map(o => o.order_number) || [],
    });

    interface WorklistOrder {
      order_number: number;
      status: string;
      due_date: string | null;
      client: { first_name: string; last_name: string; phone: string | null; email: string | null } | null;
      garments: Array<{
        type: string;
        color: string | null;
        brand: string | null;
        notes: string | null;
        services: Array<{
          quantity: number;
          custom_price_cents: number | null;
          notes: string | null;
          service: { name: string; category: string | null; base_price_cents: number } | null;
        }>;
      }>;
    }

    // Filter by category if specified
    let filteredOrders = (orders || []) as WorklistOrder[];
    if (category && category !== 'all') {
      filteredOrders = filteredOrders.filter((order: WorklistOrder) =>
        order.garments?.some((garment) =>
          garment.services?.some(
            (service) => service.service?.category === category
          )
        )
      );
    }

    // Generate work list data
    const workList = {
      category: category || 'all',
      generatedAt: new Date().toISOString(),
      totalOrders: filteredOrders.length,
      orders: filteredOrders.map((order: any) => ({
        orderNumber: order.order_number,
        status: order.status,
        dueDate: order.due_date,
        client: order.client
          ? {
              name: `${order.client.first_name} ${order.client.last_name}`,
              phone: order.client.phone,
              email: order.client.email,
            }
          : null,
        garments:
          order.garments?.map((garment: any) => ({
            type: garment.type,
            color: garment.color,
            brand: garment.brand,
            notes: garment.notes,
            services:
              garment.services?.map((service: any) => ({
                name: service.service?.name || 'Unknown Service',
                category: service.service?.category || 'Unknown',
                quantity: service.quantity,
                price:
                  service.custom_price_cents ||
                  service.service?.base_price_cents ||
                  0,
                notes: service.notes,
              })) || [],
          })) || [],
      })),
    };

    // Generate CSV content
    const csvHeaders = [
      'Order Number',
      'Status',
      'Due Date',
      'Client Name',
      'Client Phone',
      'Client Email',
      'Garment Type',
      'Garment Color',
      'Garment Brand',
      'Service Name',
      'Service Category',
      'Quantity',
      'Price (Cents)',
      'Notes',
    ];

    const csvRows = [];
    for (const order of workList.orders) {
      for (const garment of order.garments) {
        for (const service of garment.services) {
          csvRows.push([
            order.orderNumber,
            order.status,
            order.dueDate,
            order.client?.name || '',
            order.client?.phone || '',
            order.client?.email || '',
            garment.type,
            garment.color || '',
            garment.brand || '',
            service.name,
            service.category,
            service.quantity,
            service.price,
            service.notes || '',
          ]);
        }
      }
    }

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return NextResponse.json({
      success: true,
      workList,
      csvContent,
      filename: `working-tasks${category && category !== 'all' ? `-${category}` : ''}.csv`,
    });
  } catch (error) {
    console.error('Error generating work list:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
