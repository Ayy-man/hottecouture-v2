import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { daysOld = 10 } = await request.json();

    const supabase = await createServiceRoleClient();

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    console.log(
      `🔄 Auto-archiving orders delivered before ${cutoffDate.toISOString()}`
    );

    // Get delivered orders older than the cutoff date
    const { data: oldDeliveredOrders, error: fetchError } = await supabase
      .from('order')
      .select('id, order_number, status')
      .eq('status', 'delivered')
      .lt('created_at', cutoffDate.toISOString());

    if (fetchError) {
      console.error('Error fetching old delivered orders:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch old delivered orders' },
        { status: 500 }
      );
    }

    if (!oldDeliveredOrders || oldDeliveredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to auto-archive',
        archivedCount: 0,
        cutoffDate: cutoffDate.toISOString(),
      });
    }

    // Archive the old delivered orders
    const { data, error } = await (supabase as any)
      .from('order')
      .update({
        status: 'archived',
      })
      .in(
        'id',
        oldDeliveredOrders.map((o: any) => o.id)
      )
      .select('id, order_number');

    if (error) {
      console.error('Error auto-archiving orders:', error);
      return NextResponse.json(
        { error: 'Failed to auto-archive orders' },
        { status: 500 }
      );
    }

    console.log(
      `✅ Auto-archived ${data.length} orders:`,
      data.map((o: any) => `#${o.order_number}`)
    );

    return NextResponse.json({
      success: true,
      message: `Auto-archived ${data.length} order${data.length !== 1 ? 's' : ''} older than ${daysOld} days`,
      archivedCount: data.length,
      cutoffDate: cutoffDate.toISOString(),
      archivedOrders: data,
    });
  } catch (error) {
    console.error('Auto-archive API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
