import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validation schema for request body
const assignSchema = z.object({
  seamstress_id: z.string().uuid().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = assignSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.issues
        },
        { status: 400 }
      );
    }

    const { seamstress_id } = parseResult.data;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify garment_service exists
    const { data: existingService, error: serviceError } = await supabase
      .from('garment_service')
      .select('id')
      .eq('id', id)
      .single();

    if (serviceError || !existingService) {
      return NextResponse.json(
        { error: 'Garment service not found' },
        { status: 404 }
      );
    }

    // If assigning (not unassigning), verify staff exists
    if (seamstress_id !== null) {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, name, is_active')
        .eq('id', seamstress_id)
        .single();

      if (staffError || !staff) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        );
      }

      if (!staff.is_active) {
        return NextResponse.json(
          { error: 'Cannot assign to inactive staff member' },
          { status: 400 }
        );
      }
    }

    // Update the garment_service assignment
    const { data, error } = await supabase
      .from('garment_service')
      .update({ assigned_seamstress_id: seamstress_id })
      .eq('id', id)
      .select(`
        id,
        garment_id,
        service_id,
        custom_service_name,
        quantity,
        custom_price_cents,
        notes,
        assigned_seamstress_id
      `)
      .single();

    if (error) {
      console.error('Error updating garment_service assignment:', error);
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      );
    }

    // Get the staff name if assigned
    let assignedStaffName: string | null = null;
    if (data.assigned_seamstress_id) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('name')
        .eq('id', data.assigned_seamstress_id)
        .single();

      assignedStaffName = staffData?.name || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        assigned_seamstress_name: assignedStaffName,
      },
    });
  } catch (err) {
    console.error('Error in PATCH /api/garment-service/[id]/assign:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
