import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Auto-generate service code from name
 */
function generateServiceCode(name: string): string {
  // Take first 3 words, uppercase, replace spaces with underscores, limit to 20 chars
  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special chars
    .split(/\s+/)
    .slice(0, 3)
    .join('_');

  return words.substring(0, 20) || 'SVC_' + Date.now().toString().slice(-6);
}

/**
 * GET - List services or check usage
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('id');
    const checkUsage = searchParams.get('usage') === 'true';

    const supabase = await createServiceRoleClient();

    if (checkUsage && serviceId) {
      // Check how many garment_services use this service
      const { count, error } = await supabase
        .from('garment_service')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', serviceId);

      if (error) {
        console.error('Error checking usage:', error);
        return NextResponse.json(
          { error: 'Failed to check usage', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        usageCount: count || 0,
        canDelete: (count || 0) === 0,
      });
    }

    // Get all active services
    const { data: services, error } = await supabase
      .from('service')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json(
        { error: 'Failed to fetch services', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      services: services || [],
    });
  } catch (error) {
    console.error('Error in services API:', error);
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
 * POST - Create a new service
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { name, price, category, unit } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Service price must be greater than 0' },
        { status: 400 }
      );
    }

    // Convert price from dollars to cents
    const priceCents = Math.round(parseFloat(price) * 100);

    // Auto-generate code
    let code = generateServiceCode(name.trim());

    // Ensure code is unique
    let codeExists = true;
    let attempts = 0;
    while (codeExists && attempts < 10) {
      const { data: existing } = await supabase
        .from('service')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) {
        codeExists = false;
      } else {
        code = generateServiceCode(name.trim()) + '_' + attempts;
        attempts++;
      }
    }

    // Check if name already exists in same category
    // Normalize category to lowercase for comparison (handle legacy 'Custom' vs 'custom')
    const normalizedCategory = category ? category.toLowerCase() : null;

    // Query all services with the same name to check for duplicates in the same category
    // Use case-insensitive category comparison
    const { data: existingServices, error: nameCheckError } = await supabase
      .from('service')
      .select('id, name, category')
      .eq('name', name.trim())
      .eq('is_active', true);

    // Filter results to check if any service has the same category (case-insensitive)
    let duplicateFound = false;
    if (existingServices && existingServices.length > 0) {
      duplicateFound = existingServices.some(service => {
        const existingCategory = service.category
          ? service.category.toLowerCase()
          : null;
        return existingCategory === normalizedCategory;
      });
    }

    if (nameCheckError) {
      console.error('Error checking existing service:', nameCheckError);
      return NextResponse.json(
        {
          error: 'Failed to check existing services',
          details: nameCheckError.message,
        },
        { status: 500 }
      );
    }

    if (duplicateFound) {
      return NextResponse.json(
        { error: `Service "${name.trim()}" already exists in this category` },
        { status: 400 }
      );
    }

    // Get next display order for this category
    const { data: lastService, error: orderError } = await supabase
      .from('service')
      .select('display_order')
      .eq('category', category || null)
      .eq('is_active', true)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = lastService?.display_order
      ? lastService.display_order + 1
      : 0;

    // Create the service
    // Normalize category to lowercase to ensure consistency (handle legacy 'Custom' vs 'custom')
    const { data: newService, error: createError } = await supabase
      .from('service')
      .insert({
        code,
        name: name.trim(),
        base_price_cents: priceCents,
        category: normalizedCategory || null,
        unit: unit && unit.trim() ? unit.trim() : null,
        is_custom: false,
        display_order: displayOrder,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating service:', createError);
      return NextResponse.json(
        { error: 'Failed to create service', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      service: newService,
      message: 'Service created successfully',
    });
  } catch (error) {
    console.error('Error in POST services API:', error);
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
 * PUT - Update a service
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { id, name, price, category, unit } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Service price must be greater than 0' },
        { status: 400 }
      );
    }

    // Convert price from dollars to cents
    const priceCents = Math.round(parseFloat(price) * 100);

    // Check if name already exists (excluding current service)
    // Normalize category to lowercase for comparison (handle legacy 'Custom' vs 'custom')
    const normalizedCategory = category ? category.toLowerCase() : null;

    // Query all services with the same name to check for duplicates in the same category
    // Use case-insensitive category comparison
    const { data: existingServices, error: checkError } = await supabase
      .from('service')
      .select('id, name, category')
      .eq('name', name.trim())
      .eq('is_active', true)
      .neq('id', id);

    // Filter results to check if any service has the same category (case-insensitive)
    let duplicateFound = false;
    if (existingServices && existingServices.length > 0) {
      duplicateFound = existingServices.some(service => {
        const existingCategory = service.category
          ? service.category.toLowerCase()
          : null;
        return existingCategory === normalizedCategory;
      });
    }

    if (checkError) {
      console.error('Error checking existing service:', checkError);
      return NextResponse.json(
        {
          error: 'Failed to check existing services',
          details: checkError.message,
        },
        { status: 500 }
      );
    }

    if (duplicateFound) {
      return NextResponse.json(
        { error: `Service "${name.trim()}" already exists in this category` },
        { status: 400 }
      );
    }

    // Update the service
    // Normalize category to lowercase to ensure consistency (handle legacy 'Custom' vs 'custom')
    const updateData: any = {
      name: name.trim(),
      base_price_cents: priceCents,
      category: normalizedCategory || null,
      unit: unit && unit.trim() ? unit.trim() : null,
    };

    const { data: updatedService, error: updateError } = await supabase
      .from('service')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating service:', updateError);
      return NextResponse.json(
        { error: 'Failed to update service', details: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      service: updatedService,
      message: 'Service updated successfully',
    });
  } catch (error) {
    console.error('Error in PUT services API:', error);
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
 * DELETE - Delete a service (only if not used)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    // Get service info
    const { data: service, error: fetchError } = await supabase
      .from('service')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check usage count
    const { count, error: usageError } = await supabase
      .from('garment_service')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', id);

    if (usageError) {
      console.error('Error checking usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to check usage', details: usageError.message },
        { status: 500 }
      );
    }

    const usageCount = count || 0;

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete service',
          message: `This service is used in ${usageCount} garment(s). Please remove it from all garments before deleting.`,
          usageCount,
          canDelete: false,
        },
        { status: 400 }
      );
    }

    // Soft delete (set is_active = false)
    const { error: deleteError } = await supabase
      .from('service')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting service:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete service', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully',
      usageCount: 0,
    });
  } catch (error) {
    console.error('Error in DELETE services API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
