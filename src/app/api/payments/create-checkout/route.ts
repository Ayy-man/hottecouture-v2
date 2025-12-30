import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  isGHLConfigured,
  findOrCreateContact,
  createDepositInvoice,
  createBalanceInvoice,
  createFullInvoice,
  sendInvoice,
  centsToDollars,
  type AppClient,
} from '@/lib/ghl';
import { calculateDepositCents } from '@/lib/payments/deposit-calculator';

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

    // Check GHL is configured
    if (!isGHLConfigured()) {
      return NextResponse.json(
        { error: 'GHL is not configured. Please set GHL_API_KEY and GHL_LOCATION_ID.' },
        { status: 503 }
      );
    }

    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

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
        rush_fee_cents,
        due_date,
        client:client_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          language,
          ghl_contact_id,
          preferred_contact
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const client = order.client as any;
    if (!client) {
      return NextResponse.json({ error: 'Client not found for order' }, { status: 404 });
    }

    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client';

    // Ensure we have a GHL contact ID
    let ghlContactId = client.ghl_contact_id;

    if (!ghlContactId) {
      // Try to find or create the contact in GHL
      const ghlClient: AppClient = {
        id: client.id,
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || null,
        phone: client.phone || null,
        language: client.language || 'fr',
        ghl_contact_id: null,
        preferred_contact: client.preferred_contact || 'sms',
      };

      const contactResult = await findOrCreateContact(ghlClient);
      if (!contactResult.success || !contactResult.data) {
        console.error('Failed to find/create GHL contact:', contactResult.error);
        return NextResponse.json(
          { error: 'Failed to create contact in GHL. Please check client phone/email.' },
          { status: 400 }
        );
      }

      // findOrCreateContact returns the contact ID directly as a string
      ghlContactId = contactResult.data;

      // Update client with GHL contact ID
      await supabase
        .from('client')
        .update({ ghl_contact_id: ghlContactId })
        .eq('id', client.id);
    }

    // Calculate amount based on type
    let amountCents: number;

    switch (type) {
      case 'deposit':
        // 50% deposit for custom orders (uses centralized calculator)
        amountCents = calculateDepositCents(order.total_cents);
        break;
      case 'balance':
        // Remaining balance (total - deposit already paid)
        const depositPaid = order.deposit_paid_at
          ? (order.deposit_cents || calculateDepositCents(order.total_cents))
          : 0;
        amountCents = order.total_cents - depositPaid;
        break;
      case 'full':
        // Full amount
        amountCents = order.total_cents;
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

    // Create GHL Invoice based on payment type
    let invoiceResult;
    const dueDate = order.due_date ? new Date(order.due_date) : undefined;

    if (type === 'deposit') {
      invoiceResult = await createDepositInvoice({
        contactId: ghlContactId,
        clientName,
        orderNumber: order.order_number,
        totalCents: order.total_cents,
        depositCents: amountCents,
        dueDate,
      });
    } else if (type === 'balance') {
      invoiceResult = await createBalanceInvoice({
        contactId: ghlContactId,
        clientName,
        orderNumber: order.order_number,
        balanceCents: amountCents,
        dueDate,
      });
    } else {
      // Full invoice - fetch garment services for line items
      const { data: garments } = await supabase
        .from('garment')
        .select(`
          id,
          type,
          garment_service (
            id,
            quantity,
            custom_price_cents,
            service:service_id (
              name,
              base_price_cents
            ),
            custom_service_name
          )
        `)
        .eq('order_id', orderId);

      // Build line items from garment services
      const items: Array<{
        name: string;
        description?: string | undefined;
        priceCents: number;
        quantity?: number | undefined;
      }> = [];

      if (garments) {
        for (const garment of garments) {
          const garmentServices = (garment.garment_service || []) as any[];
          for (const gs of garmentServices) {
            const serviceName = gs.service?.name || gs.custom_service_name || 'Service';
            const priceCents = gs.custom_price_cents || gs.service?.base_price_cents || 0;
            const item: typeof items[number] = {
              name: serviceName,
              priceCents: priceCents * (gs.quantity || 1),
              quantity: 1,
            };
            if (garment.type) {
              item.description = `Pour ${garment.type}`;
            }
            items.push(item);
          }
        }
      }

      // If no items found, create a single line item for the total
      if (items.length === 0) {
        items.push({
          name: `Commande #${order.order_number}`,
          priceCents: order.total_cents - (order.rush_fee_cents || 0),
        });
      }

      invoiceResult = await createFullInvoice({
        contactId: ghlContactId,
        clientName,
        orderNumber: order.order_number,
        items,
        rushFeeCents: order.rush_fee_cents || 0,
        dueDate,
      });
    }

    if (!invoiceResult.success || !invoiceResult.data) {
      console.error('Failed to create GHL invoice:', invoiceResult.error);
      return NextResponse.json(
        { error: `Failed to create invoice: ${invoiceResult.error}` },
        { status: 500 }
      );
    }

    const invoice = invoiceResult.data;
    console.log(`✅ GHL Invoice created: ${invoice._id} for order #${order.order_number}`);

    // Send the invoice if requested
    let invoiceUrl = invoice.invoiceUrl;
    if (sendSms) {
      const sendResult = await sendInvoice(invoice._id);
      if (sendResult.success && sendResult.data) {
        invoiceUrl = sendResult.data.invoiceUrl || invoiceUrl;
        console.log(`✅ Invoice sent to ${clientName}`);
      } else {
        console.warn(`⚠️ Failed to send invoice:`, sendResult.error);
      }
    }

    // Update order with invoice info and pending status
    const updateData: Record<string, any> = {
      invoice_url: invoiceUrl,
      invoice_number: invoice.invoiceNumber,
    };

    if (type === 'deposit') {
      updateData.payment_status = 'deposit_pending';
      updateData.deposit_cents = amountCents;
    } else {
      updateData.payment_status = 'pending';
    }

    await supabase
      .from('order')
      .update(updateData)
      .eq('id', orderId);

    console.log(`✅ Invoice created for order ${order.order_number}, type: ${type}, amount: $${centsToDollars(amountCents)}`);

    return NextResponse.json({
      success: true,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceUrl: invoiceUrl,
      amount_cents: amountCents,
      type,
    });
  } catch (error) {
    console.error('❌ Create invoice error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
