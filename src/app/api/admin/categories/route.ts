import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Maximum number of categories allowed
const MAX_CATEGORIES = 8;

/**
 * Auto-generate category key from name
 */
function generateCategoryKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

/**
 * Auto-assign icon based on category name
 */
function getIconForCategory(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes('alter') || lower.includes('hem') || lower.includes('sew'))
    return '✂️';
  if (lower.includes('accessor') || lower.includes('trim')) return '🧵';
  if (
    lower.includes('fabric') ||
    lower.includes('textile') ||
    lower.includes('material')
  )
    return '🪡';
  if (
    lower.includes('curtain') ||
    lower.includes('blind') ||
    lower.includes('drape')
  )
    return '🪟';
  if (
    lower.includes('custom') ||
    lower.includes('special') ||
    lower.includes('other')
  )
    return '⚙️';
  if (
    lower.includes('home') ||
    lower.includes('decor') ||
    lower.includes('furnish')
  )
    return '🏠';
  if (
    lower.includes('outdoor') ||
    lower.includes('camp') ||
    lower.includes('gear')
  )
    return '🏕️';
  if (
    lower.includes('formal') ||
    lower.includes('evening') ||
    lower.includes('wedding')
  )
    return '👔';
  if (
    lower.includes('active') ||
    lower.includes('sport') ||
    lower.includes('athletic')
  )
    return '🏃';

  return '📦'; // Default icon
}

/**
 * GET - List all categories or check usage
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryKey = searchParams.get('key');
    const checkUsage = searchParams.get('usage') === 'true';

    const supabase = await createServiceRoleClient();

    if (checkUsage && categoryKey) {
      // Check how many services use this category
      const { count, error } = await supabase
        .from('service')
        .select('id', { count: 'exact', head: true })
        .or(
          `category.eq.${categoryKey},category.eq.${categoryKey}s,category.ilike.${categoryKey}%`
        );

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

    // Get all active categories
    const { data: categories, error } = await (supabase.from('category') as any)
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: error.message },
        { status: 500 }
      );
    }

    // Add cache-control headers to prevent caching in production
    return NextResponse.json(
      {
        success: true,
        categories: categories || [],
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error in categories API:', error);
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
 * POST - Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check current count of categories
    const { count: categoryCount, error: countError } = await (
      supabase.from('category') as any
    )
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (countError) {
      console.error('Error counting categories:', countError);
      return NextResponse.json(
        {
          error: 'Failed to check categories limit',
          details: countError.message,
        },
        { status: 500 }
      );
    }

    if ((categoryCount || 0) >= MAX_CATEGORIES) {
      return NextResponse.json(
        {
          error: `Maximum limit of ${MAX_CATEGORIES} categories reached`,
          limit: MAX_CATEGORIES,
          current: categoryCount || 0,
        },
        { status: 400 }
      );
    }

    // Auto-generate key and icon
    const key = generateCategoryKey(name.trim());
    const icon = getIconForCategory(name.trim());

    // Check if key already exists
    const { data: existing, error: checkError } = await (
      supabase.from('category') as any
    )
      .select('id, key, name')
      .eq('key', key)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error checking existing category:', checkError);
      return NextResponse.json(
        {
          error: 'Failed to check existing categories',
          details: checkError.message,
        },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: `Category with key "${key}" already exists` },
        { status: 400 }
      );
    }

    // Check if name already exists
    const { data: existingName, error: nameCheckError } = await (
      supabase.from('category') as any
    )
      .select('id, name')
      .eq('name', name.trim())
      .eq('is_active', true)
      .single();

    if (nameCheckError && nameCheckError.code !== 'PGRST116') {
      console.error('Error checking existing category name:', nameCheckError);
      return NextResponse.json(
        {
          error: 'Failed to check existing categories',
          details: nameCheckError.message,
        },
        { status: 500 }
      );
    }

    if (existingName) {
      return NextResponse.json(
        { error: `Category "${name.trim()}" already exists` },
        { status: 400 }
      );
    }

    // Get next display order
    const { data: lastCategory } = (await supabase
      .from('category')
      .select('display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()) as {
      data: { display_order: number } | null;
      error: null;
    };

    const displayOrder = lastCategory?.display_order
      ? lastCategory.display_order + 1
      : 1;

    // Create the category
    const { data: newCategory, error: createError } = await (
      supabase.from('category') as any
    )
      .insert({
        key,
        name: name.trim(),
        icon,
        display_order: displayOrder,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating category:', createError);
      return NextResponse.json(
        { error: 'Failed to create category', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: 'Category created successfully',
    });
  } catch (error) {
    console.error('Error in POST categories API:', error);
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
 * PUT - Update a category
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if name already exists (excluding current category)
    const { data: existing, error: checkError } = await (
      supabase.from('category') as any
    )
      .select('id, name')
      .eq('name', name.trim())
      .eq('is_active', true)
      .neq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing category:', checkError);
      return NextResponse.json(
        {
          error: 'Failed to check existing categories',
          details: checkError.message,
        },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: `Category "${name.trim()}" already exists` },
        { status: 400 }
      );
    }

    // Auto-update icon based on new name
    const icon = getIconForCategory(name.trim());

    // Update the category
    const { data: updatedCategory, error: updateError } = await (
      supabase.from('category') as any
    )
      .update({
        name: name.trim(),
        icon,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating category:', updateError);
      return NextResponse.json(
        { error: 'Failed to update category', details: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error in PUT categories API:', error);
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
 * DELETE - Delete a category (only if not used)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Get category info
    const { data: category, error: fetchError } = await (
      supabase.from('category') as any
    )
      .select('id, key, name')
      .eq('id', id)
      .single();

    if (fetchError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check usage count - check multiple variations of the category key
    const { count, error: usageError } = await supabase
      .from('service')
      .select('id', { count: 'exact', head: true })
      .or(
        `category.eq.${category.key},category.eq.${category.key}s,category.ilike.${category.key}%`
      );

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
          error: 'Cannot delete category',
          message: `This category is used by ${usageCount} service(s). Please remove or reassign these services before deleting.`,
          usageCount,
          canDelete: false,
        },
        { status: 400 }
      );
    }

    // Soft delete (set is_active = false)
    const { error: deleteError } = await (supabase.from('category') as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete category', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
      usageCount: 0,
    });
  } catch (error) {
    console.error('Error in DELETE categories API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
