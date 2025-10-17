import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds array is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get current user for audit trail
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Unarchive the orders (restore to delivered status)
    const { data, error } = await supabase
      .from('order')
      .update({
        status: 'delivered',
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
      data.map(o => `#${o.order_number}`)
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
