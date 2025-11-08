import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { fromCategory, toCategory } = body;

    if (!fromCategory || !toCategory) {
      return NextResponse.json(
        { error: 'fromCategory and toCategory are required' },
        { status: 400 }
      );
    }

    // First, find all services in the source category
    const { data: services, error: findError } = await supabase
      .from('service')
      .select('id, name, category')
      .eq('category', fromCategory);

    if (findError) {
      console.error('Error finding services:', findError);
      return NextResponse.json(
        { error: 'Failed to find services', details: findError.message },
        { status: 500 }
      );
    }

    if (!services || services.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: `No services found in category '${fromCategory}'`,
          movedCount: 0,
          movedServices: [],
        },
        { status: 200 }
      );
    }

    // Update all services to the new category
    const serviceIds = services.map(s => s.id);
    const { data: updatedServices, error: updateError } = await supabase
      .from('service')
      .update({ category: toCategory })
      .in('id', serviceIds)
      .select('id, name, category');

    if (updateError) {
      console.error('Error updating services:', updateError);
      return NextResponse.json(
        { error: 'Failed to update services', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully moved ${updatedServices?.length || 0} service(s) from '${fromCategory}' to '${toCategory}'`,
      movedCount: updatedServices?.length || 0,
      movedServices: updatedServices || [],
    });
  } catch (error) {
    console.error('Error in move-services-category API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
