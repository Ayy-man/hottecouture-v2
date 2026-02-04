import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { generateCsv, formatCents } from '@/lib/exports/csv-utils';

/**
 * GET /api/admin/export/orders
 *
 * Exports a CSV of ALL orders (not just 'working' status like worklist-export).
 * Implements EXP-03 requirement.
 *
 * Returns:
 * - success: boolean
 * - csvContent: string (CSV data)
 * - filename: string (suggested filename)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // Optional status filter

    const supabase = await createServiceRoleClient();

    // Build query for all orders with nested data
    let query = supabase
      .from('order')
      .select(
        `
        id,
        order_number,
        status,
        created_at,
        due_date,
        total_cents,
        client:client_id (
          first_name,
          last_name,
          phone,
          email
        ),
        garments:garment (
          id,
          type,
          services:garment_service (
            id,
            quantity,
            service:service_id (
              name
            )
          )
        )
      `
      )
      .order('created_at', { ascending: false });

    // Apply optional status filter
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: orders, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching orders:', queryError);
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 }
      );
    }

    // Define CSV columns
    const headers = [
      'Order#',
      'Status',
      'Created',
      'Due',
      'Client',
      'Phone',
      'Email',
      'Items',
      'Total',
    ];

    // Build rows from data
    interface OrderRow {
      id: string;
      order_number: number;
      status: string;
      created_at: string;
      due_date: string | null;
      total_cents: number;
      client: {
        first_name: string;
        last_name: string;
        phone: string | null;
        email: string | null;
      } | null;
      garments: Array<{
        id: string;
        type: string;
        services: Array<{
          id: string;
          quantity: number;
          service: { name: string } | null;
        }>;
      }>;
    }

    const rows: unknown[][] = ((orders as OrderRow[]) || []).map((order) => {
      const client = order.client;

      // Client name
      const clientName = client
        ? `${client.first_name} ${client.last_name}`
        : '-';

      // Count total items (garments)
      const itemCount = order.garments?.length ?? 0;

      // Format dates
      const createdDate = format(new Date(order.created_at), 'yyyy-MM-dd');
      const dueDate = order.due_date
        ? format(new Date(order.due_date), 'yyyy-MM-dd')
        : '-';

      // Format total
      const total = formatCents(order.total_cents);

      return [
        order.order_number,
        order.status,
        createdDate,
        dueDate,
        clientName,
        client?.phone ?? '-',
        client?.email ?? '-',
        itemCount,
        total,
      ];
    });

    // Generate CSV content
    const csvContent = generateCsv(headers, rows);

    // Generate filename with date
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `orders_${dateStr}.csv`;

    return NextResponse.json({
      success: true,
      csvContent,
      filename,
      totalOrders: orders?.length ?? 0,
    });
  } catch (error) {
    console.error('Error in orders export:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
