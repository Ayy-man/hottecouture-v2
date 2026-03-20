import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { recalculateOrderPricing } from '@/lib/pricing/calcTotal';
import type { PricingItem } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';

/**
 * POST - Add a service to a garment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: garmentId } = await params;
    const body = await request.json();
    const { service_id, quantity = 1, price_cents } = body;

    if (!service_id) {
      return NextResponse.json(
        { error: 'service_id is required' },
        { status: 400 }
      );
    }

    // Verify the garment exists and get its order_id
    const { data: garment, error: garmentError } = await supabase
      .from('garment')
      .select('id, order_id')
      .eq('id', garmentId)
      .single();

    if (garmentError || !garment) {
      return NextResponse.json(
        { error: 'Garment not found' },
        { status: 404 }
      );
    }

    // Get the service info
    const { data: service, error: serviceError } = await supabase
      .from('service')
      .select('id, name, base_price_cents, description, category, estimated_minutes')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Insert the garment_service
    const insertData: Record<string, unknown> = {
      garment_id: garmentId,
      service_id,
      quantity,
    };

    // If a custom price was provided, set it as final_price_cents
    if (price_cents !== undefined && price_cents !== null) {
      insertData.final_price_cents = price_cents;
    }

    const { data: garmentService, error: insertError } = await supabase
      .from('garment_service')
      .insert(insertData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating garment_service:', insertError);
      return NextResponse.json(
        { error: 'Failed to add service', details: insertError.message },
        { status: 500 }
      );
    }

    // Recalculate order totals
    const orderId = (garment as any).order_id;
    const { data: allGarments } = await supabase
      .from('garment')
      .select('id')
      .eq('order_id', orderId);

    const garmentIds = (allGarments || []).map((g: any) => g.id);

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

    const totals = recalculateOrderPricing(orderId, items, (order as any)?.rush || false);

    const { error: orderUpdateError } = await supabase
      .from('order')
      .update({
        subtotal_cents: totals.subtotal_cents,
        tax_cents: totals.tax_cents,
        tps_cents: totals.tps_cents,
        tvq_cents: totals.tvq_cents,
        total_cents: totals.total_cents,
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      console.error('Error updating order totals:', orderUpdateError);
    }

    return NextResponse.json({
      success: true,
      garment_service: {
        ...(garmentService as any),
        service: service,
      },
      order: {
        id: orderId,
        subtotal_cents: totals.subtotal_cents,
        tax_cents: totals.tax_cents,
        total_cents: totals.total_cents,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/garment/[id]/services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
