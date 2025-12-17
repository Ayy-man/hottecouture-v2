import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CreateCheckoutRequest {
  orderId: string;
  type: 'deposit' | 'balance' | 'full';
  sendSms?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateCheckoutRequest = await request.json();
    const { orderId, type, sendSms = true } = body;

    if (!orderId || !type) {
      return NextResponse.json(
        { error: 'Missing orderId or type' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Fetch order with client details
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        type,
        total_cents,
        deposit_cents,
        balance_due_cents,
        payment_status,
        deposit_paid_at,
        client:client_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          language
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Calculate amount based on type
    let amountCents: number;
    let description: string;

    switch (type) {
      case 'deposit':
        // 50% deposit for custom orders
        amountCents = Math.ceil(order.total_cents / 2);
        description = `Dépôt 50% - Commande #${order.order_number}`;
        break;
      case 'balance':
        // Remaining balance (total - deposit already paid)
        const depositPaid = order.deposit_paid_at ? (order.deposit_cents || Math.ceil(order.total_cents / 2)) : 0;
        amountCents = order.total_cents - depositPaid;
        description = `Solde - Commande #${order.order_number}`;
        break;
      case 'full':
        // Full amount
        amountCents = order.total_cents;
        description = `Commande #${order.order_number}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    if (amountCents <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount - nothing to pay' },
        { status: 400 }
      );
    }

    const client = order.client as any;
    const clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'Client';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: description,
              description: `Client: ${clientName}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hottecouture-v2.vercel.app'}/portal?order=${order.order_number}&payment=success&type=${type}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hottecouture-v2.vercel.app'}/portal?order=${order.order_number}&payment=cancelled`,
      customer_email: client?.email || undefined,
      metadata: {
        order_id: orderId,
        order_number: order.order_number.toString(),
        payment_type: type,
      },
      locale: client?.language === 'en' ? 'en' : 'fr-CA',
    });

    // Update order with checkout session ID and pending status
    const updateData: Record<string, any> = {
      stripe_checkout_session_id: session.id,
    };

    if (type === 'deposit') {
      updateData.payment_status = 'deposit_pending';
      // Pre-set the deposit amount
      updateData.deposit_cents = amountCents;
    } else {
      updateData.payment_status = 'pending';
    }

    await supabase
      .from('order')
      .update(updateData)
      .eq('id', orderId);

    // Send SMS with payment link if requested
    if (sendSms && client?.phone && process.env.N8N_SMS_WEBHOOK_URL) {
      const amountFormatted = (amountCents / 100).toFixed(2);

      let smsPayload: Record<string, any>;

      if (type === 'deposit') {
        smsPayload = {
          phone: client.phone,
          template: 'deposit_request',
          firstName: client.first_name || 'Client',
          orderNumber: order.order_number,
          amount: amountFormatted,
          paymentUrl: session.url,
          language: client.language || 'fr',
          // Fallback message if template not found
          message: client.language === 'en'
            ? `Hello ${client.first_name || 'Client'}, your order #${order.order_number} requires a 50% deposit ($${amountFormatted}) before we can begin. Pay here: ${session.url}`
            : `Bonjour ${client.first_name || 'Client'}, votre commande #${order.order_number} nécessite un dépôt de 50% (${amountFormatted}$) avant de commencer. Payez ici: ${session.url}`,
        };
      } else {
        smsPayload = {
          phone: client.phone,
          template: 'payment_ready',
          firstName: client.first_name || 'Client',
          orderNumber: order.order_number,
          amount: amountFormatted,
          paymentUrl: session.url,
          language: client.language || 'fr',
          // Fallback message if template not found
          message: client.language === 'en'
            ? `Hello ${client.first_name || 'Client'}, your alterations (Order #${order.order_number}) are ready! Amount: $${amountFormatted}. Pay here: ${session.url}`
            : `Bonjour ${client.first_name || 'Client'}, vos retouches (Commande #${order.order_number}) sont prêtes! Montant: ${amountFormatted}$. Payez ici: ${session.url}`,
        };
      }

      try {
        const smsResponse = await fetch(process.env.N8N_SMS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(smsPayload),
        });

        if (smsResponse.ok) {
          console.log(`✅ SMS sent for ${type} payment request, order ${order.order_number}`);
        } else {
          console.warn(`⚠️ SMS send failed:`, await smsResponse.text());
        }
      } catch (smsError) {
        console.warn('⚠️ Failed to send SMS:', smsError);
        // Don't fail the checkout creation if SMS fails
      }
    }

    console.log(`✅ Checkout session created for order ${order.order_number}, type: ${type}, amount: $${(amountCents / 100).toFixed(2)}`);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      amount_cents: amountCents,
      type,
    });
  } catch (error) {
    console.error('❌ Create checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
