import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/orders/[id]/measurements
 * Fetch all measurements for an order with template info
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('order_measurement')
      .select(
        `
        id,
        value,
        notes,
        created_at,
        template:measurement_template (
          id,
          name,
          name_fr,
          category,
          unit,
          display_order
        )
      `
      )
      .eq('order_id', orderId);

    if (error) {
      console.error('Error fetching order measurements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch order measurements', details: error.message },
        { status: 500 }
      );
    }

    // Group measurements by category for easier display
    const grouped: Record<string, any[]> = {};
    for (const m of data || []) {
      const template = m.template as any;
      const category = template?.category || 'body';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        id: m.id,
        name: template?.name,
        name_fr: template?.name_fr,
        value: m.value,
        unit: template?.unit,
        notes: m.notes,
        created_at: m.created_at,
        template_id: template?.id,
        display_order: template?.display_order,
      });
    }

    // Sort each category by display_order
    for (const category of Object.keys(grouped)) {
      grouped[category]?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }

    const response = NextResponse.json({ success: true, data: grouped, raw: data });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('API ERROR - order measurements GET:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/measurements
 * Save measurements for an order
 * Body: {
 *   measurements: { [templateName]: number },
 *   save_to_client?: boolean,
 *   client_id?: string,
 *   measured_by?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { measurements, save_to_client, client_id, measured_by } = body;

    if (!measurements || typeof measurements !== 'object') {
      return NextResponse.json(
        { error: 'Measurements object is required' },
        { status: 400 }
      );
    }

    // Get templates to map names to IDs
    const { data: templates, error: templatesError } = await supabase
      .from('measurement_template')
      .select('id, name')
      .eq('is_active', true);

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json(
        { error: 'Failed to fetch templates', details: templatesError.message },
        { status: 500 }
      );
    }

    const templateMap = new Map(templates?.map((t: { name: string; id: string }) => [t.name, t.id]) || []);

    // Prepare order measurement data
    const orderMeasurements: any[] = [];
    const clientMeasurements: any[] = [];
    const now = new Date().toISOString();

    for (const [name, value] of Object.entries(measurements)) {
      // Skip if value is empty, null, or undefined
      if (value === null || value === undefined || value === '' || value === 0) {
        continue;
      }

      const templateId = templateMap.get(name);
      if (!templateId) {
        console.warn(`Unknown measurement template: ${name}`);
        continue;
      }

      const numValue = typeof value === 'string' ? parseFloat(value) : value;

      orderMeasurements.push({
        order_id: orderId,
        template_id: templateId,
        value: numValue,
      });

      // Prepare client measurements if save_to_client is true
      if (save_to_client && client_id) {
        clientMeasurements.push({
          client_id: client_id,
          template_id: templateId,
          value: numValue,
          measured_at: now,
          measured_by: measured_by || null,
          updated_at: now,
        });
      }
    }

    if (orderMeasurements.length === 0) {
      return NextResponse.json({ success: true, message: 'No measurements to save' });
    }

    // Upsert order measurements
    const { data: orderData, error: orderError } = await supabase
      .from('order_measurement')
      .upsert(orderMeasurements, { onConflict: 'order_id,template_id' })
      .select();

    if (orderError) {
      console.error('Error saving order measurements:', orderError);
      return NextResponse.json(
        { error: 'Failed to save order measurements', details: orderError.message },
        { status: 500 }
      );
    }

    // Also save to client profile if requested
    let clientData = null;
    if (save_to_client && client_id && clientMeasurements.length > 0) {
      const { data, error: clientError } = await supabase
        .from('client_measurement')
        .upsert(clientMeasurements, { onConflict: 'client_id,template_id' })
        .select();

      if (clientError) {
        console.warn('Error saving client measurements:', clientError);
        // Don't fail the request, just log the warning
      } else {
        clientData = data;
      }
    }

    const response = NextResponse.json({
      success: true,
      message: `Saved ${orderMeasurements.length} measurements`,
      order_data: orderData,
      client_data: clientData,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('API ERROR - order measurements POST:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
