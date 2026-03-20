import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { recalculateOrderPricing } from '@/lib/pricing/calcTotal';
import type { PricingItem } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PATCH - Update garment notes, estimated_minutes, and/or actual_minutes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: garmentId } = await params;
    const body = await request.json();
    const { notes, estimated_minutes, actual_minutes } = body;

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

    if (actual_minutes !== undefined && (typeof actual_minutes !== 'number' || actual_minutes < 0)) {
      return NextResponse.json(
        { error: 'Actual minutes must be a non-negative number' },
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
    if (actual_minutes !== undefined) {
      updateData.actual_minutes = actual_minutes;
    }

    console.log('🔧 Garment PATCH: Updating garment', garmentId, 'with data:', updateData);

    const { data: updatedGarment, error: updateError } = await (
      supabase.from('garment') as any
    )
      .update(updateData)
      .eq('id', garmentId)
      .select('id, notes, type, color, brand, label_code, estimated_minutes, actual_minutes')
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

/**
 * DELETE - Remove a garment and its associated garment_services
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: garmentId } = await params;

    if (!garmentId) {
      return NextResponse.json(
        { error: 'Garment ID is required' },
        { status: 400 }
      );
    }

    // Get the garment to find order_id for recalculation
    const { data: existingGarment, error: checkError } = await (
      supabase.from('garment') as any
    )
      .select('id, order_id')
      .eq('id', garmentId)
      .single();

    if (checkError || !existingGarment) {
      return NextResponse.json({ error: 'Garment not found' }, { status: 404 });
    }

    const orderId = existingGarment.order_id;

    // Delete associated garment_services first
    const { error: deleteServicesError } = await supabase
      .from('garment_service')
      .delete()
      .eq('garment_id', garmentId);

    if (deleteServicesError) {
      console.error('Error deleting garment services:', deleteServicesError);
      return NextResponse.json(
        { error: 'Failed to delete garment services' },
        { status: 500 }
      );
    }

    // Delete the garment
    const { error: deleteError } = await supabase
      .from('garment')
      .delete()
      .eq('id', garmentId);

    if (deleteError) {
      console.error('Error deleting garment:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete garment' },
        { status: 500 }
      );
    }

    // Recalculate order totals
    const { data: remainingGarments } = await supabase
      .from('garment')
      .select('id')
      .eq('order_id', orderId);

    const remainingIds = (remainingGarments || []).map((g: any) => g.id);

    let orderTotals = { subtotal_cents: 0, tax_cents: 0, tps_cents: 0, tvq_cents: 0, total_cents: 0 };

    if (remainingIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('garment_service')
        .select(`
          id, garment_id, service_id, quantity,
          custom_price_cents, final_price_cents,
          service:service_id ( base_price_cents )
        `)
        .in('garment_id', remainingIds);

      const { data: order } = await supabase
        .from('order')
        .select('rush')
        .eq('id', orderId)
        .single();

      const items: PricingItem[] = (orderItems || []).map((item: any) => {
        const svcData = Array.isArray(item.service) ? item.service[0] : item.service;
        return {
          garment_id: item.garment_id,
          service_id: item.service_id || '',
          quantity: item.quantity,
          custom_price_cents: item.custom_price_cents,
          final_price_cents: item.final_price_cents,
          base_price_cents: svcData?.base_price_cents || 0,
        };
      });

      const totals = recalculateOrderPricing(orderId, items, order?.rush || false);
      orderTotals = {
        subtotal_cents: totals.subtotal_cents,
        tax_cents: totals.tax_cents,
        tps_cents: totals.tps_cents,
        tvq_cents: totals.tvq_cents,
        total_cents: totals.total_cents,
      };
    }

    // Update order totals
    await supabase
      .from('order')
      .update(orderTotals)
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        ...orderTotals,
      },
    });
  } catch (error) {
    console.error('Error in DELETE garment API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
