import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('🚀 NUCLEAR OPTION: Starting...');

    // Create multiple fresh connections
    const supabase1 = await createServiceRoleClient();
    const supabase2 = await createServiceRoleClient();
    const supabase3 = await createServiceRoleClient();

    // Test all connections
    const results = await Promise.all([
      supabase1
        .from('order')
        .select('id, order_number, status, created_at')
        .order('order_number', { ascending: false }),
      supabase2
        .from('order')
        .select('id, order_number, status, created_at')
        .order('order_number', { ascending: false }),
      supabase3
        .from('order')
        .select('id, order_number, status, created_at')
        .order('order_number', { ascending: false }),
    ]);

    console.log('🚀 NUCLEAR: Connection 1:', {
      count: results[0].data?.length || 0,
      orderNumbers: results[0].data?.map((o: any) => o.order_number) || [],
      hasOrder8:
        results[0].data?.some((o: any) => o.order_number === 8) || false,
    });

    console.log('🚀 NUCLEAR: Connection 2:', {
      count: results[1].data?.length || 0,
      orderNumbers: results[1].data?.map((o: any) => o.order_number) || [],
      hasOrder8:
        results[1].data?.some((o: any) => o.order_number === 8) || false,
    });

    console.log('🚀 NUCLEAR: Connection 3:', {
      count: results[2].data?.length || 0,
      orderNumbers: results[2].data?.map((o: any) => o.order_number) || [],
      hasOrder8:
        results[2].data?.some((o: any) => o.order_number === 8) || false,
    });

    // Use the connection that has the most orders
    const bestResult = results.reduce((best, current) => {
      const bestCount = best.data?.length || 0;
      const currentCount = current.data?.length || 0;
      return currentCount > bestCount ? current : best;
    });

    console.log('🚀 NUCLEAR: Best result:', {
      count: bestResult.data?.length || 0,
      orderNumbers: bestResult.data?.map((o: any) => o.order_number) || [],
      hasOrder8:
        bestResult.data?.some((o: any) => o.order_number === 8) || false,
    });

    if (bestResult.error) {
      console.error('🚀 NUCLEAR: Error:', bestResult.error);
      return NextResponse.json(
        { error: bestResult.error.message },
        { status: 500 }
      );
    }

    if (!bestResult.data || bestResult.data.length === 0) {
      return NextResponse.json({
        success: true,
        orders: [],
        count: 0,
        timestamp: new Date().toISOString(),
        source: 'nuclear-option',
      });
    }

    // Get full order data
    const orders = await Promise.all(
      bestResult.data.map(async (order: { id: string; order_number: number; status: string; created_at: string }) => {
        const { data: fullOrder, error: fullError } = await supabase1
          .from('order')
          .select(
            'work_started_at, work_completed_at, subtotal_cents, tax_cents, total_cents, rush_fee_cents, deposit_cents, balance_due_cents, actual_work_minutes, is_timer_running, timer_started_at, timer_paused_at, total_work_seconds, notes, type, rush, due_date, client_id'
          )
          .eq('id', (order as any).id)
          .single();

        if (fullError) {
          console.error(
            `Error fetching full data for order ${(order as any).order_number}:`,
            fullError
          );
          return order;
        }

        return {
          ...(order as any),
          ...(fullOrder as any),
        };
      })
    );

    // Get client data
    const clientIds = [...new Set(orders.map(order => order.client_id))];
    const { data: clients, error: clientError } = await supabase1
      .from('client')
      .select('id, first_name, last_name, phone, email, language')
      .in('id', clientIds);

    if (clientError) {
      console.error('Error fetching clients:', clientError);
    }

    interface ClientData {
      id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      email: string | null;
      language: string | null;
    }
    const clientMap = new Map<string, ClientData>(
      clients?.map((client: ClientData) => [client.id, client])
    );

    // Get garment data
    const ordersWithGarmentsAndClients = await Promise.all(
      orders.map(async order => {
        const { data: garments, error: garmentError } = await supabase1
          .from('garment')
          .select(
            `
          id,
          type,
          color,
          brand,
          notes,
          label_code,
          photo_path,
          measurements,
          garment_type_id,
          garment_type (
            id,
            name,
            icon,
            category
          ),
          garment_service (
            quantity,
            custom_price_cents,
            notes,
            service (
              id,
              name,
              description,
              base_price_cents,
              category,
              estimated_minutes
            )
          )
        `
          )
          .eq('order_id', order.id);

        if (garmentError) {
          console.error(
            `Error fetching garments for order ${order.order_number}:`,
            garmentError
          );
        }

        const processedGarments =
          garments?.map((garment: any) => ({
            id: garment.id,
            type: garment.type,
            color: garment.color,
            brand: garment.brand,
            notes: garment.notes,
            label_code: garment.label_code,
            photo_path: garment.photo_path,
            measurements: garment.measurements,
            garment_type: garment.garment_type,
            services:
              garment.garment_service?.map((gs: any, index: number) => ({
                id: `gs-${index}`,
                quantity: gs.quantity,
                custom_price_cents: gs.custom_price_cents,
                notes: gs.notes,
                service: gs.service,
              })) || [],
          })) || [];

        const allServices = processedGarments.flatMap((garment: { type: string; label_code: string | null; services: Array<{ id: string; quantity: number; custom_price_cents: number | null; notes: string | null; service: unknown }> }) =>
          garment.services.map((service: any) => ({
            ...service,
            garment_type: garment.type,
            garment_label: garment.label_code,
          }))
        );

        const client = clientMap.get(order.client_id) as ClientData | undefined;
        let client_name = 'Unknown Client';
        if (client && client.first_name && client.last_name) {
          client_name = `${client.first_name} ${client.last_name}`;
        } else if (client && client.first_name) {
          client_name = client.first_name;
        }

        const totalEstimatedMinutes = allServices.reduce(
          (sum: number, service: any) => {
            const serviceMinutes = service.service?.estimated_minutes || 60;
            return sum + serviceMinutes * service.quantity;
          },
          0
        );

        return {
          ...order,
          client_name,
          client_phone: client?.phone || null,
          client_email: client?.email || null,
          client_language: client?.language || 'fr',
          garments: processedGarments,
          all_services: allServices,
          time_tracking: {
            total_estimated_minutes: totalEstimatedMinutes,
            total_actual_minutes: order.actual_work_minutes || 0,
            is_tracking: order.is_timer_running || false,
            estimated_time: formatTime(totalEstimatedMinutes),
            actual_time: formatTime(
              Math.floor((order.total_work_seconds || 0) / 60)
            ),
            timer_status: {
              is_running: order.is_timer_running || false,
              timer_started_at: order.timer_started_at,
              timer_paused_at: order.timer_paused_at,
              total_work_seconds: order.total_work_seconds || 0,
            },
          },
          notes:
            typeof order.notes === 'string'
              ? JSON.parse(order.notes || '{}')
              : order.notes || {},
        };
      })
    );

    console.log('🚀 NUCLEAR: Final result:', {
      count: ordersWithGarmentsAndClients.length,
      orderNumbers: ordersWithGarmentsAndClients.map(o => o.order_number),
      hasOrder8: ordersWithGarmentsAndClients.some(o => o.order_number === 8),
    });

    return NextResponse.json({
      success: true,
      orders: ordersWithGarmentsAndClients,
      count: ordersWithGarmentsAndClients.length,
      timestamp: new Date().toISOString(),
      source: 'nuclear-option',
    });
  } catch (error: unknown) {
    console.error('🚀 NUCLEAR: Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
