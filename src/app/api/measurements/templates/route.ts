import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/measurements/templates
 * Fetch measurement templates, optionally filtered by category
 * Query params: ?category=body|curtain|upholstery|bedding
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabase
      .from('measurement_template')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('display_order');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching measurement templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch measurement templates', details: error.message },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true, data });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('API ERROR - measurement templates:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
