export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

type SmsTemplate = 
  | 'ready_for_pickup'
  | 'reminder_3_weeks'
  | 'reminder_1_month'
  | 'payment_received';

interface SmsRequest {
  template: SmsTemplate;
  order_id: string;
  language?: 'fr' | 'en';
}

interface OrderWithClient {
  id: string;
  order_number: number;
  total_cents: number;
  notification_count?: number;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    language: 'fr' | 'en';
  } | null;
}

const TEMPLATES = {
  fr: {
    ready_for_pickup: `Bonjour {name}, ici Hotte Design & Couture 🧵
Vos altérations sont prêtes à être récupérées.
Nous sommes ouverts du lundi au vendredi de 9h à 17h.
À bientôt! ☺️`,
    reminder_3_weeks: `Bonjour {name}, ici Hotte Design & Couture 🧵
Juste un petit rappel que vos altérations sont prêtes depuis 3 semaines.
Nous sommes ouverts du lundi au vendredi de 9h à 17h.
À bientôt! ☺️`,
    reminder_1_month: `Bonjour {name}, ici Hotte Design & Couture 🧵
Rappel final: vos articles seront donnés à une œuvre de charité si non réclamés dans les 7 prochains jours.
SVP contactez-nous au (819) 717-1424.`,
    payment_received: `Bonjour {name}, ici Hotte Design & Couture 🧵
Merci! Votre paiement de {amount} a été reçu.
Votre commande #{order_number} est confirmée.`,
  },
  en: {
    ready_for_pickup: `Hi {name}, this is Hotte Design & Couture 🧵
Your alterations are ready for pickup!
We're open Monday to Friday, 9am to 5pm.
See you soon! ☺️`,
    reminder_3_weeks: `Hi {name}, this is Hotte Design & Couture 🧵
Just a reminder that your alterations have been ready for 3 weeks.
We're open Monday to Friday, 9am to 5pm.
See you soon! ☺️`,
    reminder_1_month: `Hi {name}, this is Hotte Design & Couture 🧵
Final reminder: your items will be donated to charity if not claimed within 7 days.
Please contact us at (819) 717-1424.`,
    payment_received: `Hi {name}, this is Hotte Design & Couture 🧵
Thank you! Your payment of {amount} has been received.
Your order #{order_number} is confirmed.`,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: SmsRequest = await request.json();
    const { template, order_id, language } = body;

    if (!template || !order_id) {
      return NextResponse.json(
        { error: 'Missing required fields: template and order_id' },
        { status: 400 }
      );
    }

    if (!TEMPLATES.fr[template]) {
      return NextResponse.json(
        { error: `Invalid template: ${template}` },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: orderData, error: orderError } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        total_cents,
        client:client_id (
          id,
          first_name,
          last_name,
          phone,
          language
        )
      `)
      .eq('id', order_id)
      .single() as { data: OrderWithClient | null; error: unknown };

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderData;
    const client = order.client;

    if (!client?.phone) {
      return NextResponse.json(
        { error: 'Client has no phone number' },
        { status: 400 }
      );
    }

    const lang = language || client.language || 'fr';
    let message = TEMPLATES[lang][template];
    
    message = message
      .replace('{name}', client.first_name)
      .replace('{order_number}', String(order.order_number))
      .replace('{amount}', `$${((order.total_cents || 0) / 100).toFixed(2)}`);

    const n8nWebhookUrl = process.env.N8N_SMS_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { error: 'SMS webhook not configured (N8N_SMS_WEBHOOK_URL)' },
        { status: 500 }
      );
    }

    const n8nPayload = {
      phone: client.phone,
      message,
      template,
      order_id,
      order_number: order.order_number,
      client_name: `${client.first_name} ${client.last_name}`,
      language: lang,
    };

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
    });

    const n8nResult = await n8nResponse.json().catch(() => ({}));

    if (n8nResponse.ok) {
      return NextResponse.json({
        success: true,
        message_id: n8nResult.message_id || n8nResult.execution_id || 'sent',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send SMS via n8n', details: n8nResult },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('SMS notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
