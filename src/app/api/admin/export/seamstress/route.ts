import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import {
  generateCsv,
  formatDuration,
  sanitizeFilename,
} from '@/lib/exports/csv-utils';

/**
 * GET /api/admin/export/seamstress
 *
 * Exports a CSV of all garment services assigned to a specific seamstress.
 * Implements EXP-01 and EXP-02 requirements.
 *
 * Query params:
 * - seamstressId (required): UUID of the staff member
 *
 * Returns:
 * - success: boolean
 * - csvContent: string (CSV data)
 * - filename: string (suggested filename)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seamstressId = searchParams.get('seamstressId');

    // Validate required parameter
    if (!seamstressId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: seamstressId' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Get seamstress name for filename
    const { data: staffMember, error: staffError } = await supabase
      .from('staff')
      .select('name')
      .eq('id', seamstressId)
      .single();

    if (staffError) {
      console.error('Error fetching staff member:', staffError);
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Query garment_service with nested data
    const { data: garmentServices, error: queryError } = await supabase
      .from('garment_service')
      .select(
        `
        id,
        quantity,
        notes,
        garment:garment_id (
          id,
          type,
          color,
          order:order_id (
            id,
            order_number,
            status,
            due_date,
            client:client_id (
              first_name,
              last_name
            )
          )
        ),
        service:service_id (
          id,
          name,
          base_price_cents,
          category
        ),
        custom_service_name
      `
      )
      .eq('assigned_seamstress_id', seamstressId);

    if (queryError) {
      console.error('Error fetching garment services:', queryError);
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 }
      );
    }

    // Define CSV columns per EXP-02
    const headers = [
      'Client',
      'Order#',
      'Item',
      'Service',
      'Status',
      'Due',
      'Est Time',
      'Actual Time',
    ];

    // Build rows from data
    interface GarmentServiceRow {
      id: string;
      quantity: number;
      notes: string | null;
      custom_service_name: string | null;
      garment: {
        id: string;
        type: string;
        color: string | null;
        order: {
          id: string;
          order_number: number;
          status: string;
          due_date: string | null;
          client: {
            first_name: string;
            last_name: string;
          } | null;
        } | null;
      } | null;
      service: {
        id: string;
        name: string;
        base_price_cents: number;
        category: string | null;
      } | null;
    }

    const rows: unknown[][] = (garmentServices as GarmentServiceRow[]).map(
      (gs) => {
        const garment = gs.garment;
        const order = garment?.order;
        const client = order?.client;
        const service = gs.service;

        // Client name
        const clientName = client
          ? `${client.first_name} ${client.last_name}`
          : '-';

        // Order number
        const orderNumber = order?.order_number ?? '-';

        // Item (garment type)
        const itemType = garment?.type ?? '-';

        // Service name (custom or standard)
        const serviceName = gs.custom_service_name || service?.name || 'Custom';

        // Status
        const status = order?.status ?? '-';

        // Due date
        const dueDate = order?.due_date
          ? format(new Date(order.due_date), 'yyyy-MM-dd')
          : '-';

        // Estimated time - service doesn't have estimated_minutes in schema
        // We'll show '-' for now as the schema doesn't have this field
        const estTime = formatDuration(null);

        // Actual time - garment doesn't have actual_minutes in schema
        // We'll show '-' for now as the schema doesn't have this field
        const actualTime = formatDuration(null);

        return [
          clientName,
          orderNumber,
          itemType,
          serviceName,
          status,
          dueDate,
          estTime,
          actualTime,
        ];
      }
    );

    // Generate CSV content
    const csvContent = generateCsv(headers, rows);

    // Generate filename with sanitized seamstress name and date
    const sanitizedName = sanitizeFilename(staffMember.name);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `projects_${sanitizedName}_${dateStr}.csv`;

    return NextResponse.json({
      success: true,
      csvContent,
      filename,
      totalItems: garmentServices?.length ?? 0,
    });
  } catch (error) {
    console.error('Error in seamstress export:', error);
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
