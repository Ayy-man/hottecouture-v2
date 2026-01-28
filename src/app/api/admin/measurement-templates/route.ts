import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Valid categories for measurement templates
const VALID_CATEGORIES = ['body', 'curtain', 'upholstery', 'bedding'];

/**
 * Auto-generate internal name from French name
 */
function generateInternalName(nameFr: string): string {
  return nameFr
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

/**
 * GET - List all measurement templates (optionally filtered by category)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const checkUsage = searchParams.get('usage') === 'true';
    const templateId = searchParams.get('id');

    const supabase = await createServiceRoleClient();

    // Check usage for a specific template
    if (checkUsage && templateId) {
      // Check how many client_measurement and order_measurement records use this template
      const [clientResult, orderResult] = await Promise.all([
        supabase
          .from('client_measurement')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', templateId),
        supabase
          .from('order_measurement')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', templateId),
      ]);

      if (clientResult.error || orderResult.error) {
        console.error('Error checking usage:', clientResult.error || orderResult.error);
        return NextResponse.json(
          { error: 'Failed to check usage' },
          { status: 500 }
        );
      }

      const totalUsage = (clientResult.count || 0) + (orderResult.count || 0);

      return NextResponse.json({
        success: true,
        usageCount: totalUsage,
        clientUsage: clientResult.count || 0,
        orderUsage: orderResult.count || 0,
        canDelete: totalUsage === 0,
      });
    }

    // Build query for templates
    let query = supabase
      .from('measurement_template')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name_fr', { ascending: true });

    if (category && VALID_CATEGORIES.includes(category)) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching measurement templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        templates: templates || [],
        categories: VALID_CATEGORIES,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error in measurement-templates API:', error);
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
 * POST - Create a new measurement template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { name_fr, category, unit = 'cm' } = body;

    if (!name_fr || !name_fr.trim()) {
      return NextResponse.json(
        { error: 'Measurement name (name_fr) is required' },
        { status: 400 }
      );
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Auto-generate internal name
    const name = generateInternalName(name_fr.trim());

    // Check if name already exists in the same category
    const { data: existing, error: checkError } = await supabase
      .from('measurement_template')
      .select('id, name_fr')
      .eq('name', name)
      .eq('category', category)
      .eq('is_active', true)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing template:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing templates', details: checkError.message },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: `Measurement "${name_fr.trim()}" already exists in ${category} category` },
        { status: 400 }
      );
    }

    // Get next display order for this category
    const { data: lastTemplate } = await supabase
      .from('measurement_template')
      .select('display_order')
      .eq('category', category)
      .eq('is_active', true)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const displayOrder = lastTemplate?.display_order ? lastTemplate.display_order + 1 : 1;

    // Create the template
    const { data: newTemplate, error: createError } = await supabase
      .from('measurement_template')
      .insert({
        name,
        name_fr: name_fr.trim(),
        category,
        unit: unit.trim() || 'cm',
        display_order: displayOrder,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating measurement template:', createError);
      return NextResponse.json(
        { error: 'Failed to create template', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: newTemplate,
      message: 'Measurement template created successfully',
    });
  } catch (error) {
    console.error('Error in POST measurement-templates API:', error);
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
 * PUT - Update a measurement template
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { id, name_fr, unit, display_order } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (name_fr !== undefined) {
      if (!name_fr.trim()) {
        return NextResponse.json(
          { error: 'Measurement name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name_fr = name_fr.trim();
      updateData.name = generateInternalName(name_fr.trim());
    }

    if (unit !== undefined) {
      updateData.unit = unit.trim() || 'cm';
    }

    if (display_order !== undefined) {
      updateData.display_order = display_order;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Check for duplicate name if updating name_fr
    if (updateData.name_fr) {
      const { data: currentTemplate } = await supabase
        .from('measurement_template')
        .select('category')
        .eq('id', id)
        .single();

      if (currentTemplate) {
        const { data: existing } = await supabase
          .from('measurement_template')
          .select('id')
          .eq('name', updateData.name)
          .eq('category', currentTemplate.category)
          .eq('is_active', true)
          .neq('id', id)
          .maybeSingle();

        if (existing) {
          return NextResponse.json(
            { error: `Measurement "${updateData.name_fr}" already exists in this category` },
            { status: 400 }
          );
        }
      }
    }

    // Update the template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('measurement_template')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating measurement template:', updateError);
      return NextResponse.json(
        { error: 'Failed to update template', details: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Error in PUT measurement-templates API:', error);
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
 * DELETE - Delete a measurement template (soft delete, only if unused)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Check usage count
    const [clientResult, orderResult] = await Promise.all([
      supabase
        .from('client_measurement')
        .select('id', { count: 'exact', head: true })
        .eq('template_id', id),
      supabase
        .from('order_measurement')
        .select('id', { count: 'exact', head: true })
        .eq('template_id', id),
    ]);

    if (clientResult.error || orderResult.error) {
      console.error('Error checking usage:', clientResult.error || orderResult.error);
      return NextResponse.json(
        { error: 'Failed to check usage' },
        { status: 500 }
      );
    }

    const totalUsage = (clientResult.count || 0) + (orderResult.count || 0);

    if (totalUsage > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete measurement template',
          message: `This template is used by ${totalUsage} measurement(s). Please remove these measurements before deleting.`,
          usageCount: totalUsage,
          canDelete: false,
        },
        { status: 400 }
      );
    }

    // Soft delete (set is_active = false)
    const { error: deleteError } = await supabase
      .from('measurement_template')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting measurement template:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete template', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Measurement template deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE measurement-templates API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
