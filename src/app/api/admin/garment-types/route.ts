import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Maximum number of custom garment types allowed
const MAX_CUSTOM_TYPES = 10;

/**
 * GET - Get usage count for a garment type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const garmentTypeId = searchParams.get('id');
    const checkUsage = searchParams.get('usage') === 'true';

    const supabase = await createServiceRoleClient();

    if (checkUsage && garmentTypeId) {
      // Check how many garments use this type
      const { count, error } = await supabase
        .from('garment')
        .select('id', { count: 'exact', head: true })
        .eq('garment_type_id', garmentTypeId);

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

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error in garment-types API:', error);
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
 * POST - Create a new custom garment type
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { name, category = 'other', icon = '📝' } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Garment type name is required' },
        { status: 400 }
      );
    }

    // Check current count of custom types
    // First check if is_custom column exists by trying a simple query
    let customCount = 0;
    try {
      const { count, error: countError } = await (
        supabase.from('garment_type') as any
      )
        .select('id', { count: 'exact', head: true })
        .eq('is_custom', true)
        .eq('is_active', true);

      if (countError) {
        // If column doesn't exist, check the error code
        if (
          countError.code === '42703' ||
          countError.message?.includes('column') ||
          countError.message?.includes('is_custom')
        ) {
          console.error(
            'is_custom column does not exist. Please run migration 0008_add_custom_garment_type_support.sql'
          );
          return NextResponse.json(
            {
              error: 'Database migration required',
              details:
                'The is_custom column does not exist. Please run the migration: supabase/migrations/0008_add_custom_garment_type_support.sql',
              migrationFile: '0008_add_custom_garment_type_support.sql',
            },
            { status: 500 }
          );
        }
        console.error('Error counting custom types:', countError);
        return NextResponse.json(
          {
            error: 'Failed to check custom types limit',
            details: countError.message,
          },
          { status: 500 }
        );
      }
      customCount = count || 0;
    } catch (error) {
      console.error('Unexpected error counting custom types:', error);
      return NextResponse.json(
        {
          error: 'Failed to check custom types limit',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    if (customCount >= MAX_CUSTOM_TYPES) {
      return NextResponse.json(
        {
          error: `Maximum limit of ${MAX_CUSTOM_TYPES} custom garment types reached`,
          limit: MAX_CUSTOM_TYPES,
          current: customCount || 0,
        },
        { status: 400 }
      );
    }

    // Check if name already exists
    const { data: existing, error: checkError } = await (
      supabase.from('garment_type') as any
    )
      .select('id, name')
      .eq('name', name.trim())
      .eq('is_active', true)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error checking existing type:', checkError);
      return NextResponse.json(
        {
          error: 'Failed to check existing types',
          details: checkError.message,
        },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: `Garment type "${name}" already exists` },
        { status: 400 }
      );
    }

    // Generate a unique code
    const code = `CUSTOM_${name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .substring(0, 15)}_${Date.now().toString().slice(-6)}`;

    // Create the garment type
    const { data: newType, error: createError } = await (
      supabase.from('garment_type') as any
    )
      .insert({
        code,
        name: name.trim(),
        category,
        icon,
        is_custom: true,
        is_common: false,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating garment type:', createError);
      return NextResponse.json(
        {
          error: 'Failed to create garment type',
          details: createError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      garmentType: newType,
      message: 'Garment type created successfully',
    });
  } catch (error) {
    console.error('Error in POST garment-types API:', error);
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
 * PUT - Update a garment type
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { id, name, category, icon } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Garment type ID is required' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Garment type name is required' },
        { status: 400 }
      );
    }

    // Check if name already exists (excluding current type)
    const { data: existing, error: checkError } = await (
      supabase.from('garment_type') as any
    )
      .select('id, name')
      .eq('name', name.trim())
      .eq('is_active', true)
      .neq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing type:', checkError);
      return NextResponse.json(
        {
          error: 'Failed to check existing types',
          details: checkError.message,
        },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: `Garment type "${name}" already exists` },
        { status: 400 }
      );
    }

    // Update the garment type
    const updateData: any = {
      name: name.trim(),
      updated_at: new Date().toISOString(),
    };

    if (category !== undefined) {
      updateData.category = category;
    }

    if (icon !== undefined) {
      updateData.icon = icon;
    }

    const { data: updatedType, error: updateError } = await (
      supabase.from('garment_type') as any
    )
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating garment type:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update garment type',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    if (!updatedType) {
      return NextResponse.json(
        { error: 'Garment type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      garmentType: updatedType,
      message: 'Garment type updated successfully',
    });
  } catch (error) {
    console.error('Error in PUT garment-types API:', error);
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
 * DELETE - Delete a garment type (only if not used)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Garment type ID is required' },
        { status: 400 }
      );
    }

    // Check if garment type exists
    const { data: garmentType, error: fetchError } = await (
      supabase.from('garment_type') as any
    )
      .select('id, name, is_custom')
      .eq('id', id)
      .single();

    if (fetchError || !garmentType) {
      return NextResponse.json(
        { error: 'Garment type not found' },
        { status: 404 }
      );
    }

    // Check usage count
    const { count, error: usageError } = await supabase
      .from('garment')
      .select('id', { count: 'exact', head: true })
      .eq('garment_type_id', id);

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
          error: 'Cannot delete garment type',
          message: `This garment type is used in ${usageCount} order(s). Please remove it from all orders before deleting.`,
          usageCount,
          canDelete: false,
        },
        { status: 400 }
      );
    }

    // Soft delete (set is_active = false) instead of hard delete
    // This preserves data integrity and allows recovery if needed
    const { error: deleteError } = await (supabase.from('garment_type') as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting garment type:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to delete garment type',
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Garment type deleted successfully',
      usageCount: 0,
    });
  } catch (error) {
    console.error('Error in DELETE garment-types API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
