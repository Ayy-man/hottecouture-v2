import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { recalculateOrderPricing } from '@/lib/pricing/calcTotal';
import type { PricingItem } from '@/lib/pricing/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validation schema for request body
const priceUpdateSchema = z.object({
  new_price_cents: z.number().int().min(0),
  changed_by: z.string().min(1),
  reason: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: garmentServiceId } = await params;

  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = priceUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.issues
        },
        { status: 400 }
      );
    }

    const { new_price_cents, changed_by, reason } = parseResult.data;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get current item with price info and order_id
    const { data: current, error: fetchError } = await supabase
      .from('garment_service')
      .select(`
        id,
        final_price_cents,
        custom_price_cents,
        garment:garment_id (
          order_id
        ),
        service:service_id (
          base_price_cents
        )
      `)
      .eq('id', garmentServiceId)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Supabase returns nested relations - handle both array and object forms
    const garmentData = Array.isArray(current.garment) ? current.garment[0] : current.garment;
    const serviceData = Array.isArray(current.service) ? current.service[0] : current.service;
    const orderId = (garmentData as { order_id: string })?.order_id;
    const oldPrice = current.final_price_cents
      ?? current.custom_price_cents
      ?? (serviceData as { base_price_cents: number } | null)?.base_price_cents;

    // 2. Update the final price
    const { error: updateError } = await supabase
      .from('garment_service')
      .update({ final_price_cents: new_price_cents })
      .eq('id', garmentServiceId);

    if (updateError) {
      console.error('Error updating final_price_cents:', updateError);
      return NextResponse.json(
        { error: 'Failed to update price' },
        { status: 500 }
      );
    }

    // 3. Log the price change (audit trail)
    let auditLogId: string | null = null;
    const { data: auditLog, error: logError } = await supabase
      .from('price_change_log')
      .insert({
        garment_service_id: garmentServiceId,
        order_id: orderId,
        changed_by,
        old_price_cents: oldPrice,
        new_price_cents: new_price_cents,
        reason: reason || null,
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to log price change:', logError);
      // Don't fail the request, but log the issue
    } else {
      auditLogId = auditLog?.id || null;
    }

    // 4. Get all items for this order to recalculate totals
    const { data: allGarments } = await supabase
      .from('garment')
      .select('id')
      .eq('order_id', orderId);

    const garmentIds = (allGarments || []).map(g => g.id);

    const { data: orderItems } = await supabase
      .from('garment_service')
      .select(`
        id,
        garment_id,
        service_id,
        quantity,
        custom_price_cents,
        final_price_cents,
        service:service_id (
          base_price_cents
        )
      `)
      .in('garment_id', garmentIds);

    // 5. Get order rush status
    const { data: order } = await supabase
      .from('order')
      .select('rush, rush_fee_cents')
      .eq('id', orderId)
      .single();

    // 6. Calculate new totals using recalculateOrderPricing
    const items: PricingItem[] = (orderItems || []).map(item => {
      const serviceData = Array.isArray(item.service) ? item.service[0] : item.service;
      return {
        garment_id: item.garment_id,
        service_id: item.service_id || '',
        quantity: item.quantity,
        custom_price_cents: item.custom_price_cents,
        final_price_cents: item.final_price_cents,
        base_price_cents: (serviceData as { base_price_cents: number } | null)?.base_price_cents || 0,
      };
    });

    const totals = recalculateOrderPricing(orderId, items, order?.rush || false);

    // 7. Update order totals in database
    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from('order')
      .update({
        subtotal_cents: totals.subtotal_cents,
        tax_cents: totals.tax_cents,
        tps_cents: totals.tps_cents,
        tvq_cents: totals.tvq_cents,
        total_cents: totals.total_cents,
      })
      .eq('id', orderId)
      .select('id, subtotal_cents, tax_cents, total_cents')
      .single();

    if (orderUpdateError) {
      console.error('Error updating order totals:', orderUpdateError);
      return NextResponse.json(
        { error: 'Failed to update order totals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      garment_service: {
        id: garmentServiceId,
        final_price_cents: new_price_cents,
      },
      order: {
        id: orderId,
        subtotal_cents: updatedOrder.subtotal_cents,
        tax_cents: updatedOrder.tax_cents,
        total_cents: updatedOrder.total_cents,
      },
      audit_log_id: auditLogId,
    });

  } catch (err) {
    console.error('Error in PATCH /api/garment-service/[id]/price:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
