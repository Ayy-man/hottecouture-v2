import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * DELETE - Delete all orders from the database
 * WARNING: This is a destructive operation that will delete:
 * - All orders
 * - All garments (cascades)
 * - All tasks (cascades)
 * - All garment_services (cascades)
 * - All documents (cascades)
 *
 * This cannot be undone!
 */
export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();

    // First, get count of orders to delete
    const { count, error: countError } = await supabase
      .from('order')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting orders:', countError);
      return NextResponse.json(
        { error: 'Failed to count orders', details: countError.message },
        { status: 500 }
      );
    }

    const orderCount = count || 0;

    if (orderCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to delete',
        deletedCount: 0,
      });
    }

    // Delete all orders (cascades will handle related records)
    const { error: deleteError } = await supabase
      .from('order')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)

    if (deleteError) {
      console.error('Error deleting orders:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete orders', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(
      `✅ Successfully deleted ${orderCount} orders and all related records`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${orderCount} orders and all related records`,
      deletedCount: orderCount,
    });
  } catch (error) {
    console.error('Error in delete-all-orders API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
