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
        .eq('is_archived', false);

      if (fetchError) {
        console.error('Error fetching delivered orders:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch delivered orders' },
          { status: 500 }
        );
      }

      targetOrderIds = (deliveredOrders || []).map((order: any) => order.id);
    } else {
      targetOrderIds = Array.isArray(orderIds) ? orderIds : [orderIds];
    }

    if (targetOrderIds.length === 0) {
      return NextResponse.json(
        { message: 'No orders to archive', archivedCount: 0 },
        { status: 200 }
      );
    }

    // Archive the orders
    const { data, error } = await supabase
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
      data.map(o => `#${o.order_number}`)
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
