import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds array is required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Unarchive the orders (restore to delivered status)
    const { data, error } = await (supabase as any)
      .from('order')
      .update({
        status: 'delivered',
        is_archived: false,
        archived_at: null,
      })
      .in('id', orderIds)
      .select('id, order_number');

    if (error) {
      console.error('Error unarchiving orders:', error);
      return NextResponse.json(
        { error: 'Failed to unarchive orders' },
        { status: 500 }
      );
    }

    console.log(
      `✅ Unarchived ${data.length} orders:`,
      data.map((o: any) => `#${o.order_number}`)
    );

    return NextResponse.json({
      success: true,
      message: `Successfully unarchived ${data.length} order${data.length !== 1 ? 's' : ''}`,
      unarchivedCount: data.length,
      unarchivedOrders: data,
    });
  } catch (error) {
    console.error('Unarchive API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
