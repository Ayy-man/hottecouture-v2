export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  query: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  session_id?: string;
}

const SYSTEM_PROMPT = `Tu es l'assistant intelligent de Hotte Couture, une boutique de couture sur mesure et retouches.

## Informations de l'entreprise
- **Nom:** Hotte Couture / Hotte Design
- **Adresse:** 1278, rue de Saint-Jovite, Mont-Tremblant (QC) J8E 3J9
- **Téléphone:** (819) 717-1424
- **Courriel:** info@hottecouture.ca
- **Heures:** Lundi-Vendredi 9h-17h

## Équipe
- **Audrey Hotte** - Propriétaire, gère les prises de commandes et la facturation
- **Solange** - Couturière, effectue les retouches et confections

## Tarification
- **Retouches:** 15$-60$ selon la complexité, délai 10 jours ouvrables
- **Création sur mesure:** 750$-1500$ en moyenne, délai 4 semaines, dépôt 50% requis
- **Service express:** +30$ (simple) ou +60$ (complet/robe de soirée)
- **Consultation:** Gratuite
- **Taxes:** TPS 5% + TVQ 9.975%

## Exemples de prix retouches
- Ourlet pantalon: 15$-20$
- Raccourcir manches: 20$-35$
- Ajuster taille: 25$-40$
- Fermeture éclair: 20$-45$
- Doublure: 35$-60$

## Statuts des commandes
- **pending** = En attente
- **working** = En cours
- **done** = Terminé
- **ready** = Prêt pour ramassage
- **delivered** = Livré

## Instructions
1. Réponds TOUJOURS en français québécois professionnel
2. Sois concis - Audrey et Solange ont besoin de réponses rapides
3. Quand on te donne des données de la base de données, utilise-les pour répondre
4. Pour les questions de prix, donne une fourchette réaliste
5. Si tu ne sais pas, dis-le honnêtement
6. Utilise des emojis avec modération pour rendre les réponses plus lisibles`;

async function queryDatabase(query: string, supabase: any): Promise<string | null> {
  const lowerQuery = query.toLowerCase();
  
  const orderNumberMatch = lowerQuery.match(/(?:commande|order|#)\s*#?(\d+)/i) 
    ?? lowerQuery.match(/^#?(\d{1,5})$/);
  
  if (orderNumberMatch && orderNumberMatch[1]) {
    const orderNumber = parseInt(orderNumberMatch[1]);
    const { data: order, error } = await supabase
      .from('order')
      .select(`
        *,
        client:client_id (first_name, last_name, phone, email),
        garments:garment (
          type,
          garment_services:garment_service (
            quantity,
            service:service_id (name, base_price_cents)
          )
        )
      `)
      .eq('order_number', orderNumber)
      .single();

    if (error || !order) {
      return `[DB] Commande #${orderNumber} non trouvée.`;
    }

    const client = order.client;
    const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Inconnu';
    const services = order.garments?.flatMap((g: any) => 
      g.garment_services?.map((gs: any) => gs.service?.name) || []
    ).filter(Boolean).join(', ') || 'Aucun service';

    return `[DB] Commande #${order.order_number}:
- Client: ${clientName}
- Téléphone: ${client?.phone || 'N/A'}
- Statut: ${order.status}
- Date limite: ${order.due_date || 'Non définie'}
- Services: ${services}
- Total: ${((order.total_cents || 0) / 100).toFixed(2)}$
- Dépôt: ${((order.deposit_cents || 0) / 100).toFixed(2)}$`;
  }

  if (lowerQuery.includes('aujourd') || lowerQuery.includes('today') || 
      (lowerQuery.includes('commande') && lowerQuery.includes('jour'))) {
    const today = new Date().toISOString().split('T')[0];
    const { data: orders, error } = await supabase
      .from('order')
      .select(`*, client:client_id (first_name, last_name)`)
      .or(`due_date.eq.${today},and(created_at.gte.${today}T00:00:00,created_at.lt.${today}T23:59:59)`)
      .in('status', ['pending', 'working'])
      .eq('is_archived', false)
      .order('due_date', { ascending: true })
      .limit(15);

    if (error) return '[DB] Erreur de requête.';
    
    if (!orders || orders.length === 0) {
      return '[DB] Aucune commande active pour aujourd\'hui.';
    }

    const list = orders.map((o: any) => {
      const name = o.client ? `${o.client.first_name || ''} ${o.client.last_name || ''}`.trim() : 'Inconnu';
      return `- #${o.order_number}: ${name} (${o.status})`;
    }).join('\n');

    return `[DB] ${orders.length} commande(s) du jour:\n${list}`;
  }

  if (lowerQuery.includes('retard') || lowerQuery.includes('overdue') || lowerQuery.includes('late')) {
    const today = new Date().toISOString().split('T')[0];
    const { data: orders, error } = await supabase
      .from('order')
      .select(`*, client:client_id (first_name, last_name, phone)`)
      .lt('due_date', today)
      .not('status', 'in', '("delivered","archived")')
      .eq('is_archived', false)
      .order('due_date', { ascending: true })
      .limit(15);

    if (error) return '[DB] Erreur de requête.';
    
    if (!orders || orders.length === 0) {
      return '[DB] Aucune commande en retard! 🎉';
    }

    const list = orders.map((o: any) => {
      const name = o.client ? `${o.client.first_name || ''} ${o.client.last_name || ''}`.trim() : 'Inconnu';
      const phone = o.client?.phone || 'N/A';
      return `- #${o.order_number}: ${name} (${phone}) - dû: ${o.due_date}`;
    }).join('\n');

    return `[DB] ⚠️ ${orders.length} commande(s) en retard:\n${list}`;
  }

  if (lowerQuery.includes('prêt') || lowerQuery.includes('ready') || lowerQuery.includes('ramassage') || lowerQuery.includes('pickup')) {
    const { data: orders, error } = await supabase
      .from('order')
      .select(`*, client:client_id (first_name, last_name, phone)`)
      .eq('status', 'ready')
      .eq('is_archived', false)
      .order('due_date', { ascending: true })
      .limit(15);

    if (error) return '[DB] Erreur de requête.';
    
    if (!orders || orders.length === 0) {
      return '[DB] Aucune commande prête pour ramassage.';
    }

    const list = orders.map((o: any) => {
      const name = o.client ? `${o.client.first_name || ''} ${o.client.last_name || ''}`.trim() : 'Inconnu';
      const phone = o.client?.phone || 'N/A';
      return `- #${o.order_number}: ${name} (${phone})`;
    }).join('\n');

    return `[DB] 📦 ${orders.length} commande(s) prête(s) pour ramassage:\n${list}`;
  }

  if (lowerQuery.includes('attente') || lowerQuery.includes('pending')) {
    const { data: orders, error } = await supabase
      .from('order')
      .select(`*, client:client_id (first_name, last_name)`)
      .eq('status', 'pending')
      .eq('is_archived', false)
      .order('due_date', { ascending: true })
      .limit(15);

    if (error) return '[DB] Erreur de requête.';
    
    if (!orders || orders.length === 0) {
      return '[DB] Aucune commande en attente.';
    }

    const list = orders.map((o: any) => {
      const name = o.client ? `${o.client.first_name || ''} ${o.client.last_name || ''}`.trim() : 'Inconnu';
      return `- #${o.order_number}: ${name} - dû: ${o.due_date || 'N/A'}`;
    }).join('\n');

    return `[DB] ⏳ ${orders.length} commande(s) en attente:\n${list}`;
  }

  if ((lowerQuery.includes('cherche') || lowerQuery.includes('client') || lowerQuery.includes('search')) && 
      !lowerQuery.includes('commande')) {
    const nameMatch = lowerQuery.match(/(?:cherche|client|search)\s+(.+)/i);
    if (nameMatch && nameMatch[1]) {
      const searchTerm = nameMatch[1].trim();
      const { data: clients, error } = await supabase
        .from('client')
        .select('id, first_name, last_name, phone, email')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(5);

      if (error || !clients || clients.length === 0) {
        return `[DB] Aucun client trouvé pour "${searchTerm}".`;
      }

      const list = clients.map((c: any) => 
        `- ${c.first_name || ''} ${c.last_name || ''}: ${c.phone || 'N/A'} / ${c.email || 'N/A'}`
      ).join('\n');

      return `[DB] ${clients.length} client(s) trouvé(s):\n${list}`;
    }
  }

  if (lowerQuery.includes('stats') || lowerQuery.includes('statistique') || 
      (lowerQuery.includes('combien') && lowerQuery.includes('commande'))) {
    const { data: statusCounts } = await supabase
      .from('order')
      .select('status')
      .eq('is_archived', false);

    if (!statusCounts) return '[DB] Erreur de requête.';

    const counts: Record<string, number> = {};
    statusCounts.forEach((o: any) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });

    const today = new Date().toISOString().split('T')[0];
    const { data: todayOrders } = await supabase
      .from('order')
      .select('total_cents')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    const todayRevenue = todayOrders?.reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0) || 0;

    return `[DB] 📊 Statistiques:
- En attente: ${counts['pending'] || 0}
- En cours: ${counts['working'] || 0}
- Terminé: ${counts['done'] || 0}
- Prêt: ${counts['ready'] || 0}
- Livré: ${counts['delivered'] || 0}
- Total actif: ${statusCounts.length}
- Revenus aujourd'hui: ${(todayRevenue / 100).toFixed(2)}$`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { query, history = [] } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();
    
    const dbContext = await queryDatabase(query, supabase);

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    let userContent = query;
    if (dbContext) {
      userContent = `${query}\n\n---\nDonnées de la base de données:\n${dbContext}`;
    }
    messages.push({ role: 'user', content: userContent });

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured');
      return NextResponse.json({
        response: dbContext || 'Configuration manquante. Contactez l\'administrateur.',
        type: 'error',
        latency_ms: Date.now() - startTime,
      });
    }

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hottecouture.ca',
        'X-Title': 'Hotte Couture Assistant',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter error:', errorText);
      
      if (dbContext) {
        return NextResponse.json({
          response: dbContext.replace('[DB] ', ''),
          type: 'db_fallback',
          latency_ms: Date.now() - startTime,
        });
      }
      
      return NextResponse.json({
        response: 'Désolé, je rencontre des difficultés techniques. Réessayez dans un moment.',
        type: 'error',
        latency_ms: Date.now() - startTime,
      });
    }

    const aiResult = await openRouterResponse.json();
    const assistantResponse = aiResult.choices?.[0]?.message?.content || 
      'Désolé, je n\'ai pas pu générer une réponse.';

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      response: assistantResponse,
      type: 'ai',
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
