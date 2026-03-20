import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { recalculateOrderPricing } from '@/lib/pricing/calcTotal';
import type { PricingItem } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';

/**
 * Helper: recalculate and update order totals after garment_service changes
 */
async function recalcAndUpdateOrder(supabase: any, orderId: string) {
  const { data: allGarments } = await supabase
    .from('garment')
    .select('id')
    .eq('order_id', orderId);

  const garmentIds = (allGarments || []).map((g: any) => g.id);

  if (garmentIds.length === 0) {
    // No garments left — zero out the order
    await supabase
      .from('order')
      .update({ subtotal_cents: 0, tax_cents: 0, tps_cents: 0, tvq_cents: 0, total_cents: 0 })
      .eq('id', orderId);
    return { subtotal_cents: 0, tax_cents: 0, total_cents: 0 };
  }

  const { data: orderItems } = await supabase
    .from('garment_service')
    .select(`
      id, garment_id, service_id, quantity,
      custom_price_cents, final_price_cents,
      service:service_id ( base_price_cents )
    `)
    .in('garment_id', garmentIds);

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

  await supabase
    .from('order')
    .update({
      subtotal_cents: totals.subtotal_cents,
      tax_cents: totals.tax_cents,
      tps_cents: totals.tps_cents,
      tvq_cents: totals.tvq_cents,
      total_cents: totals.total_cents,
    })
    .eq('id', orderId);

  return {
    subtotal_cents: totals.subtotal_cents,
    tax_cents: totals.tax_cents,
    total_cents: totals.total_cents,
  };
}

/**
 * PATCH - Update quantity and/or final_price_cents on a garment_service
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: garmentServiceId } = await params;
    const body = await request.json();
    const { quantity, final_price_cents } = body;

    // Verify it exists
    const { data: existing, error: checkError } = await supabase
      .from('garment_service')
      .select('id, garment_id, garment:garment_id ( order_id )')
      .eq('id', garmentServiceId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Garment service not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (quantity !== undefined) {
      if (typeof quantity !== 'number' || quantity < 1) {
        return NextResponse.json(
          { error: 'Quantity must be a positive number' },
          { status: 400 }
        );
      }
      updateData.quantity = quantity;
    }
    if (final_price_cents !== undefined) {
      if (typeof final_price_cents !== 'number' || final_price_cents < 0) {
        return NextResponse.json(
          { error: 'Price must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.final_price_cents = final_price_cents;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('garment_service')
      .update(updateData)
      .eq('id', garmentServiceId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating garment_service:', updateError);
      return NextResponse.json(
        { error: 'Failed to update garment service' },
        { status: 500 }
      );
    }

    // Recalculate order totals
    const garmentData = Array.isArray((existing as any).garment)
      ? (existing as any).garment[0]
      : (existing as any).garment;
    const orderId = garmentData?.order_id;

    let orderTotals = null;
    if (orderId) {
      orderTotals = await recalcAndUpdateOrder(supabase, orderId);
    }

    return NextResponse.json({
      success: true,
      garment_service: updated,
      order: orderTotals ? { id: orderId, ...orderTotals } : null,
    });
  } catch (error) {
    console.error('Error in PATCH /api/garment-service/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a garment_service record
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: garmentServiceId } = await params;

    // Get the garment_service to find the order for recalculation
    const { data: existing, error: checkError } = await supabase
      .from('garment_service')
      .select('id, garment_id, garment:garment_id ( order_id )')
      .eq('id', garmentServiceId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Garment service not found' },
        { status: 404 }
      );
    }

    const garmentData = Array.isArray((existing as any).garment)
      ? (existing as any).garment[0]
      : (existing as any).garment;
    const orderId = garmentData?.order_id;

    // Delete the record
    const { error: deleteError } = await supabase
      .from('garment_service')
      .delete()
      .eq('id', garmentServiceId);

    if (deleteError) {
      console.error('Error deleting garment_service:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete garment service' },
        { status: 500 }
      );
    }

    // Recalculate order totals
    let orderTotals = null;
    if (orderId) {
      orderTotals = await recalcAndUpdateOrder(supabase, orderId);
    }

    return NextResponse.json({
      success: true,
      order: orderTotals ? { id: orderId, ...orderTotals } : null,
    });
  } catch (error) {
    console.error('Error in DELETE /api/garment-service/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
