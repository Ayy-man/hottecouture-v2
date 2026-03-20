import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST - Add a new garment to an existing order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: orderId } = await params;
    const body = await request.json();
    const { garment_type_id, notes } = body;

    if (!garment_type_id) {
      return NextResponse.json(
        { error: 'garment_type_id is required' },
        { status: 400 }
      );
    }

    // Verify the order exists
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('id, order_number')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get the garment type info for the type name
    const { data: garmentType, error: gtError } = await supabase
      .from('garment_type')
      .select('id, name, icon, category')
      .eq('id', garment_type_id)
      .single();

    if (gtError || !garmentType) {
      return NextResponse.json(
        { error: 'Garment type not found' },
        { status: 404 }
      );
    }

    // Generate a label code for the new garment
    const { data: existingGarments } = await supabase
      .from('garment')
      .select('label_code')
      .eq('order_id', orderId);

    const nextIndex = (existingGarments?.length || 0) + 1;
    const labelCode = `${(order as any).order_number}-${nextIndex}`;

    // Insert the garment
    const { data: garment, error: insertError } = await supabase
      .from('garment')
      .insert({
        order_id: orderId,
        garment_type_id,
        type: (garmentType as any).name,
        label_code: labelCode,
        notes: notes || null,
      })
      .select('id, type, color, brand, notes, label_code, estimated_minutes, photo_path, garment_type_id')
      .single();

    if (insertError) {
      console.error('Error creating garment:', insertError);
      return NextResponse.json(
        { error: 'Failed to create garment', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      garment: {
        ...(garment as any),
        garment_type: garmentType,
        services: [],
      },
    });
  } catch (error) {
    console.error('Error in POST /api/order/[id]/garments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
