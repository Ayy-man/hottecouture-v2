export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const STATUS_LABELS = {
  fr: {
    pending: 'En attente',
    working: 'En cours',
    done: 'Terminé',
    ready: 'Prêt à récupérer',
    delivered: 'Livré',
    archived: 'Archivé',
  },
  en: {
    pending: 'Pending',
    working: 'In Progress',
    done: 'Completed',
    ready: 'Ready for Pickup',
    delivered: 'Delivered',
    archived: 'Archived',
  },
} as const;

interface OrderWithGarments {
  order_number: number;
  status: string;
  due_date: string | null;
  created_at: string;
  garment: Array<{ id: string }>;
}

interface ClientResult {
  id: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const orderNumber = searchParams.get('order');
    const lang = (searchParams.get('lang') as 'fr' | 'en') || 'fr';

    if (!phone && !orderNumber) {
      return NextResponse.json(
        { error: 'Please provide phone or order number', found: false },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    if (orderNumber) {
      const { data, error } = await supabase
        .from('order')
        .select(`
          order_number,
          status,
          due_date,
          created_at,
          garment (id)
        `)
        .eq('order_number', parseInt(orderNumber))
        .eq('is_archived', false)
        .limit(1) as { data: OrderWithGarments[] | null; error: unknown };

      if (error || !data || data.length === 0) {
        return NextResponse.json({
          found: false,
          orders: [],
          message: lang === 'fr' 
            ? 'Aucune commande trouvée' 
            : 'No orders found',
        });
      }

      const sanitizedOrders = data.map(order => ({
        order_number: order.order_number,
        status: order.status,
        status_label: STATUS_LABELS[lang][order.status as keyof typeof STATUS_LABELS['fr']] || order.status,
        items_count: Array.isArray(order.garment) ? order.garment.length : 0,
        estimated_completion: order.due_date,
        created_at: order.created_at?.split('T')[0],
      }));

      return NextResponse.json({
        found: true,
        orders: sanitizedOrders,
      });
    }

    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      const last10 = cleanPhone.slice(-10);

      const { data: clients } = await supabase
        .from('client')
        .select('id')
        .ilike('phone', `%${last10}%`) as { data: ClientResult[] | null; error: unknown };

      if (!clients || clients.length === 0) {
        return NextResponse.json({
          found: false,
          orders: [],
          message: lang === 'fr' 
            ? 'Aucune commande trouvée pour ce numéro' 
            : 'No orders found for this phone number',
        });
      }

      const clientIds = clients.map(c => c.id);
      
      const { data: orders, error } = await supabase
        .from('order')
        .select(`
          order_number,
          status,
          due_date,
          created_at,
          garment (id)
        `)
        .in('client_id', clientIds)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(5) as { data: OrderWithGarments[] | null; error: unknown };

      if (error || !orders || orders.length === 0) {
        return NextResponse.json({
          found: false,
          orders: [],
          message: lang === 'fr' 
            ? 'Aucune commande trouvée' 
            : 'No orders found',
        });
      }

      const sanitizedOrders = orders.map(order => ({
        order_number: order.order_number,
        status: order.status,
        status_label: STATUS_LABELS[lang][order.status as keyof typeof STATUS_LABELS['fr']] || order.status,
        items_count: Array.isArray(order.garment) ? order.garment.length : 0,
        estimated_completion: order.due_date,
        created_at: order.created_at?.split('T')[0],
      }));

      return NextResponse.json({
        found: true,
        orders: sanitizedOrders,
      });
    }

    return NextResponse.json({
      found: false,
      orders: [],
      message: lang === 'fr' ? 'Paramètre manquant' : 'Missing parameter',
    });
  } catch (error) {
    console.error('Status lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', found: false },
      { status: 500 }
    );
  }
}
