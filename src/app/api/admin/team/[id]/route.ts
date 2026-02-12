import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// PATCH: Update a staff member by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { is_active, name, email, phone, pin, role, color, weekly_capacity_hours } = body;

    // Validate id
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Staff id is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};

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

    if (email !== undefined) updates.email = email ? email.trim() : null;
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (pin !== undefined && pin !== '') {
      if (!/^\d{4}$/.test(pin)) {
        return NextResponse.json(
          { success: false, error: 'PIN must be exactly 4 digits' },
          { status: 400 }
        );
      }
      updates.pin_hash = pin;
    }
    if (role !== undefined) updates.role = role;
    if (color !== undefined) updates.color = color;
    if (weekly_capacity_hours !== undefined) {
      updates.weekly_capacity_hours = weekly_capacity_hours;
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
        .ilike('name', updates.name as string)
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

// DELETE: Hard delete a staff member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate id
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Staff id is required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Check if staff member has any assignments
    const { data: assignments, error: assignmentError } = await supabase
      .from('garment_service')
      .select('id')
      .eq('assigned_seamstress_id', id)
      .limit(1);

    if (assignmentError) {
      console.error('Error checking assignments:', assignmentError);
      return NextResponse.json(
        { success: false, error: 'Failed to check staff assignments' },
        { status: 500 }
      );
    }

    // Prevent deletion if staff has assignments
    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete staff member with existing assignments. Please reassign or remove assignments first.',
        },
        { status: 400 }
      );
    }

    // Hard delete the staff member
    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting staff:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete staff member' },
      { status: 500 }
    );
  }
}
