import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { serviceNames } = body;

    if (
      !serviceNames ||
      !Array.isArray(serviceNames) ||
      serviceNames.length === 0
    ) {
      return NextResponse.json(
        { error: 'serviceNames array is required' },
        { status: 400 }
      );
    }

    // First, find the services by name
    const { data: services, error: findError } = await (
      supabase.from('service') as any
    )
      .select('id, name, base_price_cents')
      .in('name', serviceNames);

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
          error: 'No services found with the provided names',
          searchedNames: serviceNames,
          foundServices: [],
        },
        { status: 404 }
      );
    }

    // Check if any services are missing
    const foundNames = services.map((s: any) => s.name);
    const missingNames = serviceNames.filter(
      name => !foundNames.includes(name)
    );

    // Delete the services
    const serviceIds = services.map((s: any) => s.id);
    const { data: deletedServices, error: deleteError } = await (
      supabase.from('service') as any
    )
      .delete()
      .in('id', serviceIds)
      .select('id, name, base_price_cents');

    if (deleteError) {
      console.error('Error deleting services:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete services', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: deletedServices || [],
      deletedCount: deletedServices?.length || 0,
      missingNames: missingNames.length > 0 ? missingNames : undefined,
      message: `Successfully deleted ${deletedServices?.length || 0} service(s)`,
    });
  } catch (error) {
    console.error('Error in delete-services API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
