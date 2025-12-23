import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/clients/[id]/measurements
 * Fetch all measurements for a client with template info
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('client_measurement')
      .select(
        `
        id,
        value,
        notes,
        measured_at,
        measured_by,
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
      .eq('client_id', clientId)
      .order('measured_at', { ascending: false });

    if (error) {
      console.error('Error fetching client measurements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch client measurements', details: error.message },
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
        measured_at: m.measured_at,
        measured_by: m.measured_by,
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
    console.error('API ERROR - client measurements GET:', error);
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
 * POST /api/clients/[id]/measurements
 * Save/update measurements for a client
 * Body: { measurements: { [templateName]: number }, measured_by?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { measurements, measured_by } = body;

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

    // Prepare upsert data
    const upsertData: any[] = [];
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

      upsertData.push({
        client_id: clientId,
        template_id: templateId,
        value: typeof value === 'string' ? parseFloat(value) : value,
        measured_at: now,
        measured_by: measured_by || null,
        updated_at: now,
      });
    }

    if (upsertData.length === 0) {
      return NextResponse.json({ success: true, message: 'No measurements to save' });
    }

    // Upsert measurements (update if exists, insert if new)
    const { data, error } = await supabase
      .from('client_measurement')
      .upsert(upsertData, { onConflict: 'client_id,template_id' })
      .select();

    if (error) {
      console.error('Error saving client measurements:', error);
      return NextResponse.json(
        { error: 'Failed to save measurements', details: error.message },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: `Saved ${upsertData.length} measurements`,
      data,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('API ERROR - client measurements POST:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
