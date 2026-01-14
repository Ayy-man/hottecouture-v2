import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '../../../../../lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: orderId } = await params;

    console.log('🔍 Order Details API: Looking for order ID:', orderId);

    // First, let's check if the order exists with a simple query
    const { data: simpleOrder, error: simpleError } = await supabase
      .from('order')
      .select('id, order_number')
      .eq('id', orderId)
      .single();

    console.log('🔍 Order Details API: Simple query result:', {
      simpleOrder,
      simpleError,
    });

    // Get order with basic information - use the same query as the orders API
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select(
        `
        id,
        order_number,
        type,
        status,
        rush,
        due_date,
        created_at,
        rack_position,
        subtotal_cents,
        tax_cents,
        total_cents,
        rush_fee_cents,
        deposit_cents,
        balance_due_cents,
        work_started_at,
        work_completed_at,
        actual_work_minutes,
        is_timer_running,
        timer_started_at,
        timer_paused_at,
        total_work_seconds,
        notes,
        client:client_id (
          first_name,
          last_name,
          phone,
          email,
          language,
          notes
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log('❌ Order Details API: Order not found', {
        orderError,
        order,
      });
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log('✅ Order Details API: Found order', {
      order_number: (order as any).order_number,
      status: (order as any).status,
      client_name: (order as any).client?.first_name,
    });

    // Get garments for this order
    const { data: garments, error: garmentsError } = await supabase
      .from('garment')
      .select(
        `
        id,
        type,
        color,
        brand,
        notes,
        label_code,
        estimated_minutes,
        photo_path,
        garment_type_id,
        garment_type (
          id,
          name,
          icon,
          category
        )
      `
      )
      .eq('order_id', orderId);

    if (garmentsError) {
      console.error('Error fetching garments:', garmentsError);
    }

    // Get garment services for all garments
    const garmentIds = (garments as any[])?.map(g => g.id) || [];
    const { data: garmentServices, error: serviceError } = await supabase
      .from('garment_service')
      .select(
        `
        *,
        service (
          id,
          name,
          description,
          base_price_cents,
          category,
          estimated_minutes
        )
      `
      )
      .in('garment_id', garmentIds);

    if (serviceError) {
      console.error('Error fetching garment services:', serviceError);
    }

    // Process garments with their services
    const processedGarments =
      (garments as any[])?.map((garment: any) => {
        const garmentServicesForThisGarment =
          (garmentServices as any[])?.filter(
            gs => gs.garment_id === garment.id
          ) || [];

        return {
          id: garment.id,
          type: garment.type,
          color: garment.color,
          brand: garment.brand,
          notes: garment.notes,
          estimated_minutes: garment.estimated_minutes,
          label_code: garment.label_code,
          photo_path: garment.photo_path,
          measurements: garment.measurements,
          garment_type: garment.garment_type,
          services: (garmentServicesForThisGarment as any[]).map(
            (gs: any, index: number) => ({
              id: `gs-${index}`, // Generate a temporary ID
              quantity: gs.quantity,
              custom_price_cents: gs.custom_price_cents,
              custom_service_name: null, // Will be added after migration
              notes: gs.notes,
              estimated_minutes: gs.estimated_minutes, // Include garment_service.estimated_minutes
              service: gs.service,
            })
          ),
        };
      }) || [];

    // Flatten all services for easy access
    const allServices = processedGarments.flatMap(garment =>
      garment.services.map((service: any) => ({
        ...service,
        garment_type: garment.type,
        garment_label: garment.label_code,
      }))
    );

    // Safely handle client data
    let client_name = 'Unknown Client';
    if (
      (order as any).client &&
      (order as any).client.first_name &&
      (order as any).client.last_name
    ) {
      client_name = `${(order as any).client.first_name} ${(order as any).client.last_name}`;
    } else if ((order as any).client && (order as any).client.first_name) {
      client_name = (order as any).client.first_name;
    }

    const client_notes = (order as any).client?.notes || null;

    // Calculate estimated time from services
    // Priority: garment_service.estimated_minutes > service.estimated_minutes
    const totalEstimatedMinutes = allServices.reduce(
      (sum: number, service: any) => {
        const serviceMinutes = service.estimated_minutes || service.service?.estimated_minutes || 60;
        return sum + serviceMinutes * service.quantity;
      },
      0
    );

    // Format time helper
    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    };

    const detailedOrder = {
      ...(order as any),
      client_name,
      client_phone: (order as any).client?.phone || null,
      client_email: (order as any).client?.email || null,
      client_language: (order as any).client?.language || 'fr',
      client_notes,
      garments: processedGarments,
      all_services: allServices,
      // Time tracking
      time_tracking: {
        total_estimated_minutes: totalEstimatedMinutes,
        total_actual_minutes: (order as any).actual_work_minutes || 0,
        is_tracking: (order as any).is_timer_running || false,
        estimated_time: formatTime(totalEstimatedMinutes),
        actual_time: formatTime(
          Math.floor(((order as any).total_work_seconds || 0) / 60)
        ),
        timer_status: {
          is_running: (order as any).is_timer_running || false,
          timer_started_at: (order as any).timer_started_at,
          timer_paused_at: (order as any).timer_paused_at,
          total_work_seconds: (order as any).total_work_seconds || 0,
        },
      },
      // Notes (parse if it's JSON string)
      notes:
        typeof (order as any).notes === 'string'
          ? JSON.parse((order as any).notes || '{}')
          : (order as any).notes || {},
    };

    return NextResponse.json({
      success: true,
      order: detailedOrder,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
