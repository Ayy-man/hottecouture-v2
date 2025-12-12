export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface ChatRequest {
  query: string;
  session_id?: string;
}

type IntentType = 
  | 'order_status'
  | 'orders_today'
  | 'orders_pending'
  | 'orders_overdue'
  | 'client_orders'
  | 'unknown';

interface OrderResult {
  id: string;
  order_number: number;
  status: string;
  due_date: string | null;
  total_cents: number;
  created_at: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    language: 'fr' | 'en';
  } | null;
}

interface ClientResult {
  id: string;
}

function parseIntent(query: string): { intent: IntentType; params: Record<string, string> } {
  const lowerQuery = query.toLowerCase().trim();
  
  const orderNumberMatch = lowerQuery.match(/(?:order|commande|#)\s*#?(\d+)/i) 
    ?? lowerQuery.match(/^#?(\d+)$/);
  if (orderNumberMatch && orderNumberMatch[1]) {
    return { intent: 'order_status', params: { order_number: orderNumberMatch[1] } };
  }

  if (lowerQuery.includes('status') || lowerQuery.includes('statut')) {
    const numMatch = lowerQuery.match(/(\d+)/);
    if (numMatch && numMatch[1]) {
      return { intent: 'order_status', params: { order_number: numMatch[1] } };
    }
  }

  if (lowerQuery.includes('today') || lowerQuery.includes("aujourd'hui") || lowerQuery.includes('aujourdhui')) {
    return { intent: 'orders_today', params: {} };
  }

  if (lowerQuery.includes('pending') || lowerQuery.includes('en attente') || lowerQuery.includes('attente')) {
    return { intent: 'orders_pending', params: {} };
  }

  if (lowerQuery.includes('overdue') || lowerQuery.includes('retard') || lowerQuery.includes('late')) {
    return { intent: 'orders_overdue', params: {} };
  }

  const phoneMatch = lowerQuery.match(/(\+?\d[\d\s-]{8,})/);
  if (phoneMatch && phoneMatch[1]) {
    return { intent: 'client_orders', params: { phone: phoneMatch[1].replace(/[\s-]/g, '') } };
  }

  return { intent: 'unknown', params: {} };
}

function formatOrderResponse(order: OrderResult): string {
  const status = order.status;
  const statusLabels: Record<string, string> = {
    pending: '⏳ En attente / Pending',
    working: '🔧 En cours / In Progress',
    done: '✅ Terminé / Done',
    ready: '📦 Prêt / Ready for Pickup',
    delivered: '🎉 Livré / Delivered',
    archived: '📁 Archivé / Archived',
  };

  const client = order.client;
  const clientName = client 
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim() 
    : 'Unknown';
  const clientPhone = client?.phone || 'N/A';
  
  const dueDate = order.due_date 
    ? new Date(order.due_date).toLocaleDateString('fr-CA') 
    : 'Non défini';

  return `**Commande #${order.order_number}**
• Client: ${clientName}
• Téléphone: ${clientPhone}
• Statut: ${statusLabels[status] || status}
• Date limite: ${dueDate}
• Total: $${((order.total_cents || 0) / 100).toFixed(2)}`;
}

function formatOrderList(orders: OrderResult[], title: string): string {
  if (orders.length === 0) {
    return `${title}\n\nAucune commande trouvée / No orders found.`;
  }

  const lines = orders.slice(0, 10).map(o => {
    const client = o.client;
    const clientName = client 
      ? `${client.first_name || ''} ${client.last_name || ''}`.trim() 
      : 'Unknown';
    const dueDate = o.due_date 
      ? new Date(o.due_date).toLocaleDateString('fr-CA') 
      : 'N/A';
    return `• #${o.order_number} - ${clientName} - ${o.status} - Due: ${dueDate}`;
  });

  const countNote = orders.length > 10 
    ? `\n\n... et ${orders.length - 10} autres commandes` 
    : '';

  return `${title}\n\n${lines.join('\n')}${countNote}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { query, session_id } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query' },
        { status: 400 }
      );
    }

    const { intent, params } = parseIntent(query);
    const supabase = await createServiceRoleClient();

    let response = '';
    let data: unknown = null;

    switch (intent) {
      case 'order_status': {
        const orderNumber = parseInt(params.order_number || '0');
        const { data: orderData, error } = await supabase
          .from('order')
          .select(`
            *,
            client:client_id (id, first_name, last_name, phone, email, language)
          `)
          .eq('order_number', orderNumber)
          .single() as { data: OrderResult | null; error: unknown };

        if (error || !orderData) {
          response = `Commande #${params.order_number} non trouvée.\nOrder #${params.order_number} not found.`;
        } else {
          response = formatOrderResponse(orderData);
          data = orderData;
        }
        break;
      }

      case 'orders_today': {
        const today = new Date().toISOString().split('T')[0];
        const { data: orders, error } = await supabase
          .from('order')
          .select(`
            *,
            client:client_id (id, first_name, last_name, phone)
          `)
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)
          .eq('is_archived', false)
          .order('created_at', { ascending: false }) as { data: OrderResult[] | null; error: unknown };

        if (error) {
          response = 'Erreur lors de la recherche / Error searching orders.';
        } else {
          response = formatOrderList(
            orders || [], 
            `📅 Commandes aujourd'hui / Today's Orders (${orders?.length || 0})`
          );
          data = orders;
        }
        break;
      }

      case 'orders_pending': {
        const { data: orders, error } = await supabase
          .from('order')
          .select(`
            *,
            client:client_id (id, first_name, last_name, phone)
          `)
          .eq('status', 'pending')
          .eq('is_archived', false)
          .order('due_date', { ascending: true }) as { data: OrderResult[] | null; error: unknown };

        if (error) {
          response = 'Erreur lors de la recherche / Error searching orders.';
        } else {
          response = formatOrderList(
            orders || [], 
            `⏳ Commandes en attente / Pending Orders (${orders?.length || 0})`
          );
          data = orders;
        }
        break;
      }

      case 'orders_overdue': {
        const today = new Date().toISOString().split('T')[0];
        const { data: orders, error } = await supabase
          .from('order')
          .select(`
            *,
            client:client_id (id, first_name, last_name, phone)
          `)
          .lt('due_date', today)
          .not('status', 'in', '("delivered","archived")')
          .eq('is_archived', false)
          .order('due_date', { ascending: true }) as { data: OrderResult[] | null; error: unknown };

        if (error) {
          response = 'Erreur lors de la recherche / Error searching orders.';
        } else {
          response = formatOrderList(
            orders || [], 
            `🚨 Commandes en retard / Overdue Orders (${orders?.length || 0})`
          );
          data = orders;
        }
        break;
      }

      case 'client_orders': {
        const phone = params.phone || '';
        
        const { data: clients } = await supabase
          .from('client')
          .select('id')
          .ilike('phone', `%${phone.slice(-10)}%`) as { data: ClientResult[] | null; error: unknown };

        if (!clients || clients.length === 0) {
          response = `Aucune commande trouvée pour ce numéro.\nNo orders found for this phone number.`;
          break;
        }

        const clientIds = clients.map(c => c.id);
        
        const { data: orders, error } = await supabase
          .from('order')
          .select(`
            *,
            client:client_id (id, first_name, last_name, phone)
          `)
          .in('client_id', clientIds)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(5) as { data: OrderResult[] | null; error: unknown };

        if (error || !orders || orders.length === 0) {
          response = `Aucune commande trouvée pour ce numéro.\nNo orders found for this phone number.`;
        } else {
          response = formatOrderList(
            orders, 
            `📱 Commandes pour ${phone} (${orders.length})`
          );
          data = orders;
        }
        break;
      }

      default:
        response = `Je ne comprends pas votre demande. Essayez:
• "Status of order #12345" - voir une commande
• "Today's orders" - commandes du jour
• "Pending orders" - commandes en attente
• "Overdue orders" - commandes en retard
• Un numéro de téléphone - voir commandes d'un client`;
    }

    const latencyMs = Date.now() - startTime;

    if (session_id) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('chat_log')
          .insert({
            session_id,
            type: 'internal',
            query,
            response,
            latency_ms: latencyMs,
          });
      } catch {
        // Silently fail - table may not exist yet
      }
    }

    return NextResponse.json({
      response,
      type: intent,
      data,
      latency_ms: latencyMs,
    });
  } catch (error) {
    console.error('Internal chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
