export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatRequest {
  query: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const SYSTEM_PROMPT = `Tu es l'assistant intelligent de Hotte Couture, une boutique de couture sur mesure et retouches à Mont-Tremblant.

## Informations de l'entreprise
- Nom: Hotte Couture / Hotte Design
- Adresse: 1278, rue de Saint-Jovite, Mont-Tremblant (QC) J8E 3J9
- Téléphone: (819) 717-1424
- Courriel: info@hottecouture.ca
- Heures: Lundi-Vendredi 9h-17h

## Équipe
- Audrey Hotte - Propriétaire, gère les prises de commandes et la facturation
- Solange - Couturière, effectue les retouches et confections

## Tarification
- Retouches: 15$-60$ selon la complexité, délai 10 jours ouvrables
- Création sur mesure: 750$-1500$ en moyenne, délai 4 semaines, dépôt 50% requis
- Service express: +30$ (simple) ou +60$ (complet/robe de soirée)
- Consultation: Gratuite
- Taxes: TPS 5% + TVQ 9.975%

## Exemples de prix retouches
- Ourlet pantalon: 15$-20$
- Raccourcir manches: 20$-35$
- Ajuster taille: 25$-40$
- Fermeture éclair: 20$-45$
- Doublure: 35$-60$

## Instructions
1. Réponds dans la MÊME LANGUE que l'utilisateur (français ou anglais)
2. Sois concis - Audrey et Solange ont besoin de réponses rapides
3. Utilise les outils disponibles pour consulter la base de données quand nécessaire
4. Pour les questions de prix, donne une fourchette réaliste basée sur tes connaissances
5. Utilise des emojis avec modération
6. Tu peux modifier les commandes (statut, date, assignation, priorité, notes) quand demandé`;

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_order',
      description: 'Get details of a specific order by order number. Use this when user asks about a specific order like "order #65" or "commande 72".',
      parameters: {
        type: 'object',
        properties: {
          order_number: {
            type: 'integer',
            description: 'The order number to look up'
          }
        },
        required: ['order_number']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_overdue_orders',
      description: 'Get all orders that are past their due date and not yet delivered. Use this when user asks about late orders, overdue orders, or orders behind schedule.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_orders_by_status',
      description: 'Get orders filtered by status. Statuses are: pending (waiting to start), working (in progress), done (completed), ready (ready for pickup), delivered.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'working', 'done', 'ready', 'delivered'],
            description: 'The status to filter by'
          }
        },
        required: ['status']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_todays_orders',
      description: 'Get orders that are due today or were created today. Use this when user asks about today\'s work or today\'s orders.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_clients',
      description: 'Search for clients by name or phone number.',
      parameters: {
        type: 'object',
        properties: {
          search_term: {
            type: 'string',
            description: 'Name or phone number to search for'
          }
        },
        required: ['search_term']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_stats',
      description: 'Get order statistics including counts by status and today\'s revenue. Use this when user asks how many orders, stats, or summary.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_order_status',
      description: 'Update the status of an order. Use when user wants to move an order to a different stage like "mets commande 65 en cours" or "mark order 72 as ready".',
      parameters: {
        type: 'object',
        properties: {
          order_number: {
            type: 'integer',
            description: 'The order number to update'
          },
          new_status: {
            type: 'string',
            enum: ['pending', 'working', 'done', 'ready', 'delivered'],
            description: 'The new status: pending (en attente), working (en cours), done (terminé), ready (prêt), delivered (livré)'
          }
        },
        required: ['order_number', 'new_status']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_order_details',
      description: 'Update order details like due date, priority, assignment, or rush status. Use when user wants to reschedule, reassign, or change priority.',
      parameters: {
        type: 'object',
        properties: {
          order_number: {
            type: 'integer',
            description: 'The order number to update'
          },
          due_date: {
            type: 'string',
            description: 'New due date in YYYY-MM-DD format'
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
            description: 'New priority level'
          },
          assigned_to: {
            type: 'string',
            enum: ['Audrey', 'Solange'],
            description: 'Reassign to Audrey or Solange'
          },
          rush: {
            type: 'boolean',
            description: 'Set rush status (true = rush order, false = normal)'
          }
        },
        required: ['order_number']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_order_note',
      description: 'Add a note to an order. Use when user wants to add a comment or note to an order.',
      parameters: {
        type: 'object',
        properties: {
          order_number: {
            type: 'integer',
            description: 'The order number to add note to'
          },
          note: {
            type: 'string',
            description: 'The note text to add'
          }
        },
        required: ['order_number', 'note']
      }
    }
  }
];

async function executeToolCall(name: string, args: Record<string, any>, supabase: any): Promise<string> {
  switch (name) {
    case 'get_order': {
      const { order_number } = args;
      const { data: order, error } = await supabase
        .from('order')
        .select(`
          *,
          client:client_id (first_name, last_name, phone, email),
          garments:garment (
            type,
            garment_services:garment_service (
              quantity,
              service:service_id (name)
            )
          )
        `)
        .eq('order_number', order_number)
        .single();

      if (error || !order) {
        return JSON.stringify({ error: `Order #${order_number} not found` });
      }

      const client = order.client;
      const services = order.garments?.flatMap((g: any) => 
        g.garment_services?.map((gs: any) => gs.service?.name) || []
      ).filter(Boolean) || [];

      return JSON.stringify({
        order_number: order.order_number,
        client_name: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Unknown',
        client_phone: client?.phone || 'N/A',
        client_email: client?.email || 'N/A',
        status: order.status,
        due_date: order.due_date,
        services: services,
        total: `$${((order.total_cents || 0) / 100).toFixed(2)}`,
        deposit: `$${((order.deposit_cents || 0) / 100).toFixed(2)}`,
        assigned_to: order.assigned_to || 'Unassigned'
      });
    }

    case 'get_overdue_orders': {
      const today = new Date().toISOString().split('T')[0];
      const { data: orders, error } = await supabase
        .from('order')
        .select(`*, client:client_id (first_name, last_name, phone)`)
        .lt('due_date', today)
        .not('status', 'in', '("delivered","archived")')
        .eq('is_archived', false)
        .order('due_date', { ascending: true })
        .limit(20);

      if (error) return JSON.stringify({ error: 'Database query failed' });
      
      return JSON.stringify({
        count: orders?.length || 0,
        orders: (orders || []).map((o: any) => ({
          order_number: o.order_number,
          client: o.client ? `${o.client.first_name || ''} ${o.client.last_name || ''}`.trim() : 'Unknown',
          phone: o.client?.phone || 'N/A',
          due_date: o.due_date,
          status: o.status
        }))
      });
    }

    case 'get_orders_by_status': {
      const { status } = args;
      const { data: orders, error } = await supabase
        .from('order')
        .select(`*, client:client_id (first_name, last_name)`)
        .eq('status', status)
        .eq('is_archived', false)
        .order('due_date', { ascending: true })
        .limit(20);

      if (error) return JSON.stringify({ error: 'Database query failed' });
      
      return JSON.stringify({
        status,
        count: orders?.length || 0,
        orders: (orders || []).map((o: any) => ({
          order_number: o.order_number,
          client: o.client ? `${o.client.first_name || ''} ${o.client.last_name || ''}`.trim() : 'Unknown',
          due_date: o.due_date
        }))
      });
    }

    case 'get_todays_orders': {
      const today = new Date().toISOString().split('T')[0];
      const { data: orders, error } = await supabase
        .from('order')
        .select(`*, client:client_id (first_name, last_name)`)
        .or(`due_date.eq.${today},and(created_at.gte.${today}T00:00:00,created_at.lt.${today}T23:59:59)`)
        .eq('is_archived', false)
        .order('due_date', { ascending: true })
        .limit(20);

      if (error) return JSON.stringify({ error: 'Database query failed' });
      
      return JSON.stringify({
        date: today,
        count: orders?.length || 0,
        orders: (orders || []).map((o: any) => ({
          order_number: o.order_number,
          client: o.client ? `${o.client.first_name || ''} ${o.client.last_name || ''}`.trim() : 'Unknown',
          status: o.status,
          due_date: o.due_date
        }))
      });
    }

    case 'search_clients': {
      const { search_term } = args;
      const { data: clients, error } = await supabase
        .from('client')
        .select('id, first_name, last_name, phone, email')
        .or(`first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,phone.ilike.%${search_term}%`)
        .limit(10);

      if (error) return JSON.stringify({ error: 'Database query failed' });
      
      if (!clients || clients.length === 0) {
        return JSON.stringify({ error: `No clients found matching "${search_term}"` });
      }

      return JSON.stringify({
        count: clients.length,
        clients: clients.map((c: any) => ({
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          phone: c.phone || 'N/A',
          email: c.email || 'N/A'
        }))
      });
    }

    case 'get_stats': {
      const { data: orders } = await supabase
        .from('order')
        .select('status, total_cents, created_at')
        .eq('is_archived', false);

      if (!orders) return JSON.stringify({ error: 'Database query failed' });

      const counts: Record<string, number> = {};
      orders.forEach((o: any) => {
        counts[o.status] = (counts[o.status] || 0) + 1;
      });

      const today = new Date().toISOString().split('T')[0];
      const todayRevenue = orders
        .filter((o: any) => o.created_at?.startsWith(today))
        .reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0);

      return JSON.stringify({
        by_status: {
          pending: counts['pending'] || 0,
          working: counts['working'] || 0,
          done: counts['done'] || 0,
          ready: counts['ready'] || 0,
          delivered: counts['delivered'] || 0
        },
        total_active: orders.length,
        today_revenue: `$${(todayRevenue / 100).toFixed(2)}`
      });
    }

    case 'update_order_status': {
      const { order_number, new_status } = args;
      console.log('🔧 update_order_status called:', { order_number, new_status });
      
      const { data: order, error: fetchError } = await supabase
        .from('order')
        .select('id, status')
        .eq('order_number', order_number)
        .single();

      console.log('🔧 Order lookup result:', { order, fetchError });

      if (fetchError || !order) {
        return JSON.stringify({ error: `Order #${order_number} not found` });
      }

      const oldStatus = order.status;
      const { error: updateError } = await supabase
        .from('order')
        .update({ status: new_status, updated_at: new Date().toISOString() })
        .eq('id', order.id);

      console.log('🔧 Update result:', { updateError });

      if (updateError) {
        return JSON.stringify({ error: `Failed to update: ${updateError.message}` });
      }

      const statusLabels: Record<string, string> = {
        pending: 'en attente',
        working: 'en cours',
        done: 'terminé',
        ready: 'prêt pour ramassage',
        delivered: 'livré'
      };

      return JSON.stringify({
        success: true,
        order_number,
        old_status: statusLabels[oldStatus] || oldStatus,
        new_status: statusLabels[new_status] || new_status
      });
    }

    case 'update_order_details': {
      const { order_number, due_date, priority, assigned_to, rush } = args;
      
      const { data: order, error: fetchError } = await supabase
        .from('order')
        .select('id, due_date, priority, assigned_to, rush')
        .eq('order_number', order_number)
        .single();

      if (fetchError || !order) {
        return JSON.stringify({ error: `Order #${order_number} not found` });
      }

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      const changes: string[] = [];

      if (due_date !== undefined) {
        updates.due_date = due_date;
        changes.push(`due_date: ${order.due_date} → ${due_date}`);
      }
      if (priority !== undefined) {
        updates.priority = priority;
        changes.push(`priority: ${order.priority} → ${priority}`);
      }
      if (assigned_to !== undefined) {
        updates.assigned_to = assigned_to;
        changes.push(`assigned_to: ${order.assigned_to || 'none'} → ${assigned_to}`);
      }
      if (rush !== undefined) {
        updates.rush = rush;
        changes.push(`rush: ${order.rush} → ${rush}`);
      }

      if (changes.length === 0) {
        return JSON.stringify({ error: 'No changes specified' });
      }

      const { error: updateError } = await supabase
        .from('order')
        .update(updates)
        .eq('id', order.id);

      if (updateError) {
        return JSON.stringify({ error: `Failed to update: ${updateError.message}` });
      }

      return JSON.stringify({
        success: true,
        order_number,
        changes
      });
    }

    case 'add_order_note': {
      const { order_number, note } = args;
      
      const { data: order, error: fetchError } = await supabase
        .from('order')
        .select('id, notes')
        .eq('order_number', order_number)
        .single();

      if (fetchError || !order) {
        return JSON.stringify({ error: `Order #${order_number} not found` });
      }

      let existingNotes: any = {};
      try {
        existingNotes = order.notes ? JSON.parse(order.notes) : {};
      } catch {
        existingNotes = { legacy: order.notes };
      }

      const timestamp = new Date().toISOString();
      if (!existingNotes.chat_notes) {
        existingNotes.chat_notes = [];
      }
      existingNotes.chat_notes.push({ timestamp, note });

      const { error: updateError } = await supabase
        .from('order')
        .update({ 
          notes: JSON.stringify(existingNotes),
          updated_at: timestamp
        })
        .eq('id', order.id);

      if (updateError) {
        return JSON.stringify({ error: `Failed to add note: ${updateError.message}` });
      }

      return JSON.stringify({
        success: true,
        order_number,
        note_added: note
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { query, history = [] } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({
        response: 'API key not configured. Contact administrator.',
        type: 'error',
        latency_ms: Date.now() - startTime,
      });
    }

    const supabase = await createServiceRoleClient();
    
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    for (const msg of history.slice(-6)) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: query });

    const MAX_ITERATIONS = 5;
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hottecouture.ca',
          'X-Title': 'Hotte Couture Assistant',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages,
          tools: TOOLS,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text();
        console.error('OpenRouter error:', openRouterResponse.status, errorText);
        return NextResponse.json({
          response: `API Error (${openRouterResponse.status}): ${errorText.slice(0, 200)}`,
          type: 'error',
          latency_ms: Date.now() - startTime,
        });
      }

      const result = await openRouterResponse.json();
      const choice = result.choices?.[0];
      
      if (!choice) {
        return NextResponse.json({
          response: 'No response from AI',
          type: 'error',
          latency_ms: Date.now() - startTime,
        });
      }

      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push({
          role: 'assistant',
          content: message.content,
          tool_calls: message.tool_calls,
        });

        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          console.log(`Executing tool: ${toolName}`, toolArgs);
          const toolResult = await executeToolCall(toolName, toolArgs, supabase);
          
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
      } else {
        return NextResponse.json({
          response: message.content || 'No response generated',
          type: 'ai',
          latency_ms: Date.now() - startTime,
        });
      }
    }

    return NextResponse.json({
      response: 'Max iterations reached. Please try a simpler question.',
      type: 'error',
      latency_ms: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Internal chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
