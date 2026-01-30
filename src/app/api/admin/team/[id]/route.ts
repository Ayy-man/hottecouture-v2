import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// DELETE: Hard delete a staff member
export async function DELETE(
  request: NextRequest,
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
