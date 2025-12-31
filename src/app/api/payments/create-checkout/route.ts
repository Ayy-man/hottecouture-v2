import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  isGHLConfigured,
  findOrCreateContact,
  findInvoiceForOrder,
  getInvoice,
  createText2PayInvoice,
  centsToDollars,
  type AppClient,
  type GHLInvoice,
  type GHLInvoiceItem,
} from '@/lib/ghl';
import { calculateDepositCents } from '@/lib/payments/deposit-calculator';

interface CreateCheckoutRequest {
  orderId: string;
  type: 'deposit' | 'balance' | 'full';
  sendSms?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    console.log('💳 [1] create-checkout called');
    const body: CreateCheckoutRequest = await request.json();
    const { orderId, type, sendSms = true } = body;
    console.log('💳 [2] Request body:', { orderId, type, sendSms });

    if (!orderId || !type) {
      return NextResponse.json(
        { error: 'Missing orderId or type' },
        { status: 400 }
      );
    }

    // Check GHL is configured
    console.log('💳 [3] Checking GHL config...');
    if (!isGHLConfigured()) {
      return NextResponse.json(
        { error: 'GHL is not configured. Please set GHL_API_KEY and GHL_LOCATION_ID.' },
        { status: 503 }
      );
    }
    console.log('💳 [4] GHL is configured');

    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }
    console.log('💳 [5] Supabase client created');

    // Fetch order with client details
    console.log('💳 [6] Fetching order:', orderId);
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
    // Ensure order_number is a regular number (not BigInt from BIGSERIAL)
    const orderNumber = Number(order.order_number);
    const totalCents = Number(order.total_cents) || 0;

    console.log('💳 [7] Order fetched:', {
      order_number: orderNumber,
      total_cents: totalCents,
      type: order.type,
      due_date: order.due_date,
      hasClient: !!order.client,
    });

    const client = order.client as any;
    if (!client) {
      return NextResponse.json({ error: 'Client not found for order' }, { status: 404 });
    }
    console.log('💳 [8] Client data:', {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      ghl_contact_id: client.ghl_contact_id,
    });

    // Validate order has total_cents
    if (!totalCents || totalCents <= 0) {
      return NextResponse.json(
        { error: 'Order has no valid total amount. Please add services first.' },
        { status: 400 }
      );
    }
    console.log('💳 [9] Total cents validated:', totalCents);

    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client';
    console.log('💳 [10] Client name:', clientName);

    // Ensure we have a GHL contact ID
    let ghlContactId = client.ghl_contact_id;
    console.log('💳 [11] Existing GHL contact ID:', ghlContactId);

    if (!ghlContactId) {
      console.log('💳 [12] Creating GHL contact...');
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
      console.log('💳 [12.1] GHL client object:', ghlClient);

      const contactResult = await findOrCreateContact(ghlClient);
      console.log('💳 [12.2] Contact result:', { success: contactResult.success, data: contactResult.data, error: contactResult.error });

      if (!contactResult.success || !contactResult.data) {
        console.error('Failed to find/create GHL contact:', contactResult.error);
        return NextResponse.json(
          { error: 'Failed to create contact in GHL. Please check client phone/email.' },
          { status: 400 }
        );
      }

      // findOrCreateContact returns the contact ID directly as a string
      ghlContactId = contactResult.data;
      console.log('💳 [12.3] New GHL contact ID:', ghlContactId);

      // Update client with GHL contact ID
      await supabase
        .from('client')
        .update({ ghl_contact_id: ghlContactId })
        .eq('id', client.id);
    }

    // Calculate amount based on type
    console.log('💳 [13] Calculating amount for type:', type);
    let amountCents: number;

    switch (type) {
      case 'deposit':
        // 50% deposit for custom orders (uses centralized calculator)
        amountCents = calculateDepositCents(totalCents);
        break;
      case 'balance':
        // Remaining balance (total - deposit already paid)
        const depositPaid = order.deposit_paid_at
          ? (Number(order.deposit_cents) || calculateDepositCents(totalCents))
          : 0;
        amountCents = totalCents - depositPaid;
        break;
      case 'full':
        // Full amount
        amountCents = totalCents;
        break;
      default:
        return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }
    console.log('💳 [14] Amount cents calculated:', amountCents);

    if (amountCents <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount - nothing to pay' },
        { status: 400 }
      );
    }

    // Find or create GHL Invoice based on payment type
    console.log('💳 [15] Processing due date:', order.due_date);
    const dueDate = order.due_date ? new Date(order.due_date) : undefined;
    console.log('💳 [16] Due date object:', dueDate, 'isValid:', dueDate ? !isNaN(dueDate.getTime()) : 'N/A');

    // Check for existing invoice first (find-or-create pattern)
    console.log('💳 [17] Checking for existing invoice...');
    const existingResult = await findInvoiceForOrder(ghlContactId, orderNumber, type);

    let invoice: GHLInvoice;

    // If we failed to check for existing invoices, don't blindly create (would cause duplicates)
    if (!existingResult.success) {
      console.error('❌ Could not check for existing invoices:', existingResult.error);
      return NextResponse.json(
        { error: `Could not verify invoice status: ${existingResult.error}` },
        { status: 500 }
      );
    }

    if (existingResult.data) {
      // Use existing invoice - but fetch full details to get invoiceUrl
      const existingInvoice = existingResult.data;
      console.log(`✅ Found existing invoice: ${existingInvoice.invoiceNumber} (${existingInvoice.status})`);

      // Fetch full invoice details (list API doesn't include invoiceUrl)
      const fullInvoiceResult = await getInvoice(existingInvoice._id);
      if (fullInvoiceResult.success && fullInvoiceResult.data) {
        invoice = fullInvoiceResult.data;
        console.log(`✅ Fetched invoice details, invoiceUrl: ${invoice.invoiceUrl || 'N/A'}`);
      } else {
        // Fall back to the partial data we have
        invoice = existingInvoice;
        console.warn(`⚠️ Could not fetch full invoice details: ${fullInvoiceResult.error}`);
      }
    } else {
      // Create AND send invoice using Text2Pay (one API call)
      console.log('💳 [18] Creating Text2Pay invoice for type:', type);

      // Build invoice name and number based on type
      let invoiceName: string;
      let invoiceNumber: string;

      if (type === 'deposit') {
        invoiceName = `Dépôt - Commande #${orderNumber}`;
        invoiceNumber = `HC-${orderNumber}-DEPOSIT`;
      } else if (type === 'balance') {
        invoiceName = `Solde - Commande #${orderNumber}`;
        invoiceNumber = `HC-${orderNumber}-BALANCE`;
      } else {
        invoiceName = `Commande #${orderNumber} - ${clientName}`;
        invoiceNumber = `HC-${orderNumber}`;
      }

      // Build items - convert cents to dollars for GHL
      const amountDollars = Number(centsToDollars(amountCents));
      const items: GHLInvoiceItem[] = [{
        name: invoiceName,
        description: type === 'deposit'
          ? `Dépôt de 50% pour ${clientName}`
          : type === 'balance'
          ? `Solde dû pour ${clientName}`
          : `Services pour ${clientName}`,
        quantity: 1,
        price: amountDollars,
      }];

      console.log('💳 [19] Text2Pay params:', {
        contactId: ghlContactId,
        clientName,
        orderNumber,
        invoiceNumber,
        amountDollars,
        hasDueDate: !!dueDate,
        hasPhone: !!client.phone,
        hasEmail: !!client.email,
      });

      const invoiceResult = await createText2PayInvoice({
        contactId: ghlContactId,
        contactName: clientName,
        contactEmail: client.email || undefined,
        contactPhone: client.phone || undefined,
        name: invoiceName,
        items,
        dueDate,
        orderNumber,
        invoiceNumber,
      });

      if (!invoiceResult.success || !invoiceResult.data) {
        console.error('❌ Text2Pay failed:', invoiceResult.error);
        return NextResponse.json(
          { error: `Failed to create invoice: ${invoiceResult.error || 'Unknown error'}` },
          { status: 500 }
        );
      }

      invoice = invoiceResult.data;
      // Log full response to see what Text2Pay returns
      console.log('📋 Text2Pay full response:', JSON.stringify(invoice, null, 2));

      // Text2Pay may return different field names - check for _id or id
      const invoiceId = invoice._id || (invoice as any).id || (invoice as any).invoiceId || 'unknown';
      // Don't fail if no ID - Text2Pay succeeded, invoice exists in GHL
      invoice._id = invoiceId;
      console.log(`✅ Text2Pay Invoice created: ${invoiceId} for order #${orderNumber}`);
    }

    // Get invoice URL - Text2Pay may use different field names
    let invoiceUrl = invoice.invoiceUrl || (invoice as any).paymentLink || (invoice as any).checkoutUrl || (invoice as any).url;
    console.log(`📋 Invoice URL from response: ${invoiceUrl || 'N/A'}`);

    // Fallback URL construction if needed
    if (!invoiceUrl) {
      const locationId = process.env.GHL_LOCATION_ID;
      if (invoice._id && invoice._id !== 'unknown') {
        // Try payment URL pattern
        invoiceUrl = `https://payments.leadconnectorhq.com/v2/preview/${locationId}/${invoice._id}`;
      } else {
        // Last resort: link to GHL invoices page
        invoiceUrl = `https://app.gohighlevel.com/v2/location/${locationId}/payments/invoices`;
      }
      console.log(`🔧 Constructed fallback URL: ${invoiceUrl}`);
    }

    // Get invoice number - use our generated one as fallback
    const finalInvoiceNumber = invoice.invoiceNumber || (invoice as any).number ||
      (type === 'deposit' ? `HC-${orderNumber}-DEPOSIT` : type === 'balance' ? `HC-${orderNumber}-BALANCE` : `HC-${orderNumber}`);

    // Update order with invoice info and pending status
    const updateData: Record<string, any> = {
      invoice_url: invoiceUrl,
      invoice_number: finalInvoiceNumber,
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

    console.log(`✅ Invoice created for order ${orderNumber}, type: ${type}, amount: $${centsToDollars(amountCents)}`);

    return NextResponse.json({
      success: true,
      invoiceId: invoice._id,
      invoiceNumber: finalInvoiceNumber,
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
