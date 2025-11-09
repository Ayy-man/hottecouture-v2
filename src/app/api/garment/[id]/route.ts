import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PATCH - Update garment notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServiceRoleClient();
    const garmentId = params.id;
    const body = await request.json();
    const { notes } = body;

    if (!garmentId) {
      return NextResponse.json(
        { error: 'Garment ID is required' },
        { status: 400 }
      );
    }

    // Validate notes is a string (can be empty)
    if (notes !== undefined && typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Notes must be a string' },
        { status: 400 }
      );
    }

    // Check if garment exists
    const { data: existingGarment, error: checkError } = await (
      supabase.from('garment') as any
    )
      .select('id, order_id')
      .eq('id', garmentId)
      .single();

    if (checkError || !existingGarment) {
      return NextResponse.json({ error: 'Garment not found' }, { status: 404 });
    }

    // Update garment notes
    const { data: updatedGarment, error: updateError } = await (
      supabase.from('garment') as any
    )
      .update({
        notes: notes || null, // Allow empty string, convert to null for consistency
      })
      .eq('id', garmentId)
      .select('id, notes, type, color, brand, label_code')
      .single();

    if (updateError) {
      console.error('Error updating garment notes:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update garment notes',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        garment: updatedGarment,
        message: 'Garment notes updated successfully',
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
    console.error('Error in PATCH garment API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
