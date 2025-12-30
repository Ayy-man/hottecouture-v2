import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PATCH - Update garment notes and/or estimated_minutes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: garmentId } = await params;
    const body = await request.json();
    const { notes, estimated_minutes } = body;

    if (!garmentId) {
      return NextResponse.json(
        { error: 'Garment ID is required' },
        { status: 400 }
      );
    }

    if (notes !== undefined && typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Notes must be a string' },
        { status: 400 }
      );
    }

    if (estimated_minutes !== undefined && (typeof estimated_minutes !== 'number' || estimated_minutes < 0)) {
      return NextResponse.json(
        { error: 'Estimated minutes must be a non-negative number' },
        { status: 400 }
      );
    }

    const { data: existingGarment, error: checkError } = await (
      supabase.from('garment') as any
    )
      .select('id, order_id')
      .eq('id', garmentId)
      .single();

    if (checkError || !existingGarment) {
      return NextResponse.json({ error: 'Garment not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (notes !== undefined) {
      updateData.notes = notes || null;
    }
    if (estimated_minutes !== undefined) {
      updateData.estimated_minutes = estimated_minutes;
    }

    console.log('🔧 Garment PATCH: Updating garment', garmentId, 'with data:', updateData);

    const { data: updatedGarment, error: updateError } = await (
      supabase.from('garment') as any
    )
      .update(updateData)
      .eq('id', garmentId)
      .select('id, notes, type, color, brand, label_code, estimated_minutes')
      .single();

    if (updateError) {
      console.error('❌ Error updating garment:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update garment',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    console.log('✅ Garment PATCH: Updated successfully:', updatedGarment);

    return NextResponse.json(
      {
        success: true,
        garment: updatedGarment,
        message: 'Garment updated successfully',
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
