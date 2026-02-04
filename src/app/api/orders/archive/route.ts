import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { orderIds, archiveAllDelivered = false } = await request.json();

    if (!orderIds && !archiveAllDelivered) {
      return NextResponse.json(
        { error: 'Either orderIds or archiveAllDelivered must be provided' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    let targetOrderIds: string[] = [];

    if (archiveAllDelivered) {
      // Get all delivered orders that are not already archived
      const { data: deliveredOrders, error: fetchError } = await supabase
        .from('order')
        .select('id')
        .eq('status', 'delivered')
        .neq('status', 'archived'); // Ensure not already archived

      if (fetchError) {
        console.error('Error fetching delivered orders:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch delivered orders' },
          { status: 500 }
        );
      }

      targetOrderIds = (deliveredOrders || []).map((order: any) => order.id);
    } else {
      // Direct archive by orderIds - archive any non-archived order regardless of current status
      const providedIds = Array.isArray(orderIds) ? orderIds : [orderIds];

      // Filter out already archived orders
      const { data: activeOrders, error: fetchError } = await supabase
        .from('order')
        .select('id')
        .in('id', providedIds)
        .neq('status', 'archived');

      if (fetchError) {
        console.error('Error fetching orders:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch orders' },
          { status: 500 }
        );
      }

      targetOrderIds = (activeOrders || []).map((order: any) => order.id);
    }

    if (targetOrderIds.length === 0) {
      return NextResponse.json(
        { message: 'No orders to archive', archivedCount: 0 },
        { status: 200 }
      );
    }

    // Archive the orders with timestamp
    const { data, error } = await (supabase as any)
      .from('order')
      .update({
        status: 'archived',
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .in('id', targetOrderIds)
      .select('id, order_number');

    if (error) {
      console.error('Error archiving orders:', error);
      return NextResponse.json(
        { error: 'Failed to archive orders' },
        { status: 500 }
      );
    }

    console.log(
      `✅ Archived ${data.length} orders:`,
      data.map((o: any) => `#${o.order_number}`)
    );

    return NextResponse.json({
      success: true,
      message: `Successfully archived ${data.length} order${data.length !== 1 ? 's' : ''}`,
      archivedCount: data.length,
      archivedOrders: data,
    });
  } catch (error) {
    console.error('Archive API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
