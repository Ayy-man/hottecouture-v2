import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET: List all staff members (active and inactive)
export async function GET() {
  try {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching staff:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, staff: data });
  } catch (error) {
    console.error('Failed to fetch staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

// POST: Create new staff member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    // Validate name
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Check for duplicate name (case-insensitive)
    const { data: existing } = await supabase
      .from('staff')
      .select('id, name')
      .ilike('name', trimmedName)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Staff member "${existing.name}" already exists` },
        { status: 400 }
      );
    }

    // Insert new staff member
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert({ name: trimmedName, is_active: true })
      .select()
      .single();

    if (error) {
      console.error('Error creating staff:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (error) {
    console.error('Failed to create staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}

// PATCH: Update staff member (toggle active status or update name)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_active, name } = body;

    // Validate id
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Staff id is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: { is_active?: boolean; name?: string } = {};

    if (typeof is_active === 'boolean') {
      updates.is_active = is_active;
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Name must be at least 2 characters' },
          { status: 400 }
        );
      }
      updates.name = trimmedName;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // If updating name, check for duplicates
    if (updates.name) {
      const { data: existing } = await supabase
        .from('staff')
        .select('id, name')
        .ilike('name', updates.name)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Staff member "${existing.name}" already exists` },
          { status: 400 }
        );
      }
    }

    const { data: updatedStaff, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!updatedStaff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, staff: updatedStaff });
  } catch (error) {
    console.error('Failed to update staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update staff member' },
      { status: 500 }
    );
  }
}
