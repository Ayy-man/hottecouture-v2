/**
 * GHL Invoice API Module
 *
 * Create, manage, and send invoices via GoHighLevel.
 * Stripe is connected to GHL, so payments flow through GHL's invoicing system.
 */

import { ghlFetch, getLocationId, centsToDollars, formatPhoneE164 } from './client';
import { GHLResult } from './types';
import { encodePaymentTypeMetadata } from '@/lib/payments/deposit-calculator';

// ============================================================================
// Invoice Types
// ============================================================================

export interface GHLInvoiceItem {
  name: string;
  description?: string | undefined;
  quantity: number;
  price: number; // In dollars (not cents)
  currency?: string | undefined;
}

export interface GHLInvoiceDiscount {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface GHLBusinessDetails {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

/**
 * GHL API Request Structure - matches the official GHL Invoice API
 * See: https://marketplace.gohighlevel.com/docs/ghl/invoices/create-invoice/
 */
export interface GHLInvoiceCreateRequest {
  altId: string; // Location ID
  altType: 'location';
  name: string;
  // contactDetails is required - NOT contactId at top level
  contactDetails: {
    id: string;
    name?: string;
    email?: string;
    phoneNo?: string;
    address?: string;
  };
  businessDetails: {
    name: string;
    phoneNo?: string;
    address?: string;
  };
  currency: string;
  // items use qty/amount, NOT quantity/price
  items: Array<{
    name: string;
    description?: string;
    qty: number;
    amount: number;
  }>;
  discount: {
    value: number;
    type: 'percentage' | 'fixed';
  };
  issueDate: string; // YYYY-MM-DD format - REQUIRED
  dueDate?: string; // YYYY-MM-DD format
  sentTo: {
    email: string[];
    phoneNo: string[];
  };
  liveMode: boolean;
  termsNotes?: string;
  invoiceNumber?: string;
  title?: string;
}

export interface GHLInvoice {
  _id: string;
  status: 'draft' | 'sent' | 'paid' | 'void' | 'partially_paid';
  liveMode: boolean;
  amountPaid: number;
  amountDue: number;
  total: number;
  altId: string;
  altType: string;
  name: string;
  invoiceNumber: string;
  currency: string;
  contactDetails: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  sentAt?: string;
  paidAt?: string;
  invoiceUrl?: string;
}

export interface GHLInvoiceResponse {
  invoice: GHLInvoice;
}

export interface GHLInvoiceListResponse {
  invoices: GHLInvoice[];
  total: number;
}

export interface GHLInvoiceNumberResponse {
  invoiceNumber: string;
}

// ============================================================================
// Invoice Functions
// ============================================================================

/**
 * Get the next invoice number for the location
 */
export async function getNextInvoiceNumber(): Promise<GHLResult<string>> {
  const locationId = getLocationId();

  const result = await ghlFetch<GHLInvoiceNumberResponse>({
    method: 'GET',
    path: `/invoices/generate-invoice-number`,
    queryParams: {
      altId: locationId,
      altType: 'location',
    },
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to generate invoice number' };
  }

  return { success: true, data: result.data.invoiceNumber };
}

/**
 * Create a new invoice in GHL
 */
export async function createInvoice(params: {
  contactId: string;
  contactName?: string | undefined;
  contactEmail?: string | undefined;
  contactPhone?: string | undefined;
  name: string;
  items: GHLInvoiceItem[];
  dueDate?: Date | undefined;
  orderNumber?: number | undefined;
  invoiceNumber?: string | undefined; // Custom invoice number (overrides auto-generated)
  notes?: string | undefined;
  sendNotification?: boolean | undefined;
}): Promise<GHLResult<GHLInvoice>> {
  try {
    // Ensure orderNumber is a regular number (defensive against BigInt)
    const safeOrderNumber = params.orderNumber !== undefined ? Number(params.orderNumber) : undefined;

    console.log('📧 [1] createInvoice called with:', {
      contactId: params.contactId,
      name: params.name,
      itemCount: params.items?.length ?? 'undefined',
      orderNumber: safeOrderNumber,
      hasDueDate: !!params.dueDate,
    });

    // Validate required params
    if (!params.contactId) {
      return { success: false, error: 'Missing contactId' };
    }
    if (!params.name) {
      return { success: false, error: 'Missing invoice name' };
    }
    if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
      return { success: false, error: 'Missing or empty items array' };
    }

    console.log('📧 [2] Getting location ID...');
    const locationId = getLocationId();
    console.log('📧 [3] Location ID:', locationId);

    console.log('📧 [4] Building request body...');
    // Build items array using GHL API field names: qty and amount (not quantity/price)
    // IMPORTANT: Each item MUST have a currency field
    const invoiceItems = params.items.map((item, idx) => {
      console.log(`📧 [4.${idx}] Processing item:`, item);
      const invoiceItem: { name: string; qty: number; amount: number; currency: string; description?: string } = {
        name: String(item.name || 'Service'),
        qty: Number(item.quantity) || 1,
        amount: Number(item.price) || 0,
        currency: 'CAD', // Required by GHL API
      };
      // Only add optional fields if they have values
      if (item.description) {
        invoiceItem.description = String(item.description);
      }
      return invoiceItem;
    });

    // Format dates as YYYY-MM-DD (required by GHL API)
    const todayISO = new Date().toISOString();
    const today = todayISO.substring(0, 10); // YYYY-MM-DD
    const dueDateStr = params.dueDate && params.dueDate instanceof Date && !isNaN(params.dueDate.getTime())
      ? params.dueDate.toISOString().substring(0, 10)
      : undefined;

    // Build contactDetails with all available info
    // Phone MUST be E.164 format (e.g., +15149876543)
    const contactDetails: GHLInvoiceCreateRequest['contactDetails'] = {
      id: String(params.contactId || ''),
    };
    if (params.contactName) contactDetails.name = params.contactName;
    if (params.contactEmail) contactDetails.email = params.contactEmail;
    if (params.contactPhone) {
      const formattedPhone = formatPhoneE164(params.contactPhone);
      if (formattedPhone) contactDetails.phoneNo = formattedPhone;
    }

    const requestBody: GHLInvoiceCreateRequest = {
      altId: locationId,
      altType: 'location',
      name: String(params.name || ''),
      // GHL requires contactDetails object, NOT contactId at top level
      contactDetails,
      // businessDetails is required
      businessDetails: {
        name: 'Hotte Couture',
      },
      currency: 'CAD',
      items: invoiceItems,
      // discount is required (default to 0%)
      discount: {
        value: 0,
        type: 'percentage',
      },
      // issueDate is REQUIRED
      issueDate: today,
      // sentTo - populate with contact info for send functionality
      sentTo: {
        email: contactDetails.email ? [contactDetails.email] : [],
        phoneNo: contactDetails.phoneNo ? [contactDetails.phoneNo] : [],
      },
      liveMode: true,
    };

    console.log('📧 [5] Processing due date...');
    // Add due date if provided and valid
    if (dueDateStr) {
      requestBody.dueDate = dueDateStr;
      console.log('📧 [5.1] Due date set:', requestBody.dueDate);
    }

    console.log('📧 [6] Processing invoice number...');
    // Use custom invoice number if provided, otherwise generate from order number
    if (params.invoiceNumber) {
      requestBody.invoiceNumber = params.invoiceNumber;
      console.log('📧 [6.1] Custom invoice number set:', requestBody.invoiceNumber);
    } else if (safeOrderNumber !== undefined && safeOrderNumber !== null && !isNaN(safeOrderNumber)) {
      requestBody.invoiceNumber = `HC-${safeOrderNumber}`;
      console.log('📧 [6.1] Auto invoice number set:', requestBody.invoiceNumber);
    }

    console.log('📧 [7] Processing notes...');
    // Add notes/terms
    if (params.notes) {
      requestBody.termsNotes = String(params.notes);
    }

    console.log('📧 [8] Request body built with required GHL fields');

    // Log the final request body for debugging
    try {
      console.log('📧 [9] Final request body:', JSON.stringify(requestBody, null, 2));
    } catch (e) {
      console.error('📧 [9] Failed to stringify request body:', e);
    }

    console.log('📧 [10] Calling ghlFetch...');
    const result = await ghlFetch<GHLInvoiceResponse>({
      method: 'POST',
      path: '/invoices/',
      body: requestBody,
    });

    console.log('📧 [11] ghlFetch result:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error,
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to create invoice' };
    }

    // Validate the invoice object exists in the response
    console.log('📧 [12] Validating response...');
    const invoice = result.data.invoice;
    if (!invoice || !invoice._id) {
      console.error('❌ GHL API returned unexpected response:', JSON.stringify(result.data));
      return { success: false, error: 'GHL API returned invalid invoice response' };
    }

    console.log('📧 [13] Invoice created successfully:', invoice._id);
    return { success: true, data: invoice };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack';
    console.error('❌ createInvoice EXCEPTION:', errorMessage);
    console.error('❌ Stack trace:', errorStack);
    return { success: false, error: `Invoice creation failed: ${errorMessage}` };
  }
}

/**
 * Send an invoice to the customer (via email/SMS)
 */
export async function sendInvoice(invoiceId: string): Promise<GHLResult<GHLInvoice>> {
  const locationId = getLocationId();

  const result = await ghlFetch<GHLInvoiceResponse>({
    method: 'POST',
    path: `/invoices/${invoiceId}/send`,
    queryParams: {
      altId: locationId,
      altType: 'location',
    },
    body: {
      liveMode: true,
    },
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to send invoice' };
  }

  return { success: true, data: result.data.invoice };
}

/**
 * Get an invoice by ID
 * Note: GET returns invoice data directly, not wrapped in { invoice: ... }
 */
export async function getInvoice(invoiceId: string): Promise<GHLResult<GHLInvoice>> {
  const locationId = getLocationId();

  const result = await ghlFetch<GHLInvoice>({
    method: 'GET',
    path: `/invoices/${invoiceId}`,
    queryParams: {
      altId: locationId,
      altType: 'location',
    },
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to get invoice' };
  }

  // GET returns invoice directly (not wrapped like POST does)
  return { success: true, data: result.data };
}

/**
 * List invoices for a contact
 */
export async function listInvoicesByContact(contactId: string): Promise<GHLResult<GHLInvoice[]>> {
  const locationId = getLocationId();

  const result = await ghlFetch<GHLInvoiceListResponse>({
    method: 'GET',
    path: '/invoices/',
    queryParams: {
      altId: locationId,
      altType: 'location',
      contactId,
      limit: '100',  // Required by GHL API
      offset: '0',   // Required by GHL API
    },
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to list invoices' };
  }

  return { success: true, data: result.data.invoices };
}

/**
 * Find an existing invoice for an order by type (deposit, balance, or full)
 * Returns null if not found (so we can create a new one)
 */
export async function findInvoiceForOrder(
  contactId: string,
  orderNumber: number,
  type: 'deposit' | 'balance' | 'full'
): Promise<GHLResult<GHLInvoice | null>> {
  // Build expected invoice number based on type
  const expectedNumber = type === 'full'
    ? `HC-${orderNumber}`
    : `HC-${orderNumber}-${type.toUpperCase()}`;

  console.log(`🔍 Looking for invoice: ${expectedNumber} for contact ${contactId}`);

  const listResult = await listInvoicesByContact(contactId);
  if (!listResult.success) {
    // If we can't list invoices, log and return error
    console.error(`❌ Failed to list invoices for contact ${contactId}:`, listResult.error);
    return { success: false, error: listResult.error || 'Failed to list invoices' };
  }

  const invoices = listResult.data || [];
  console.log(`📋 Found ${invoices.length} invoices for contact. Invoice numbers:`,
    invoices.map(inv => `${inv.invoiceNumber} (${inv.status})`));

  // Find matching invoice by number (GHL may prefix with INV-)
  const existing = invoices.find(inv =>
    inv.invoiceNumber === expectedNumber ||
    inv.invoiceNumber === `INV-${expectedNumber}`
  );

  // Skip voided invoices - we'll create a new one
  if (existing && existing.status !== 'void') {
    console.log(`✅ Found existing invoice: ${existing.invoiceNumber} (${existing.status})`);
    return { success: true, data: existing };
  }

  console.log(`📝 No existing invoice found matching ${expectedNumber} or INV-${expectedNumber}`);
  return { success: true, data: null };
}

/**
 * Void an invoice
 */
export async function voidInvoice(invoiceId: string): Promise<GHLResult<GHLInvoice>> {
  const locationId = getLocationId();

  const result = await ghlFetch<GHLInvoiceResponse>({
    method: 'POST',
    path: `/invoices/${invoiceId}/void`,
    queryParams: {
      altId: locationId,
      altType: 'location',
    },
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to void invoice' };
  }

  return { success: true, data: result.data.invoice };
}

/**
 * Record a manual payment for an invoice (cash, check, etc.)
 */
export async function recordManualPayment(
  invoiceId: string,
  amount: number,
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'other',
  notes?: string
): Promise<GHLResult<GHLInvoice>> {
  const locationId = getLocationId();

  const result = await ghlFetch<GHLInvoiceResponse>({
    method: 'POST',
    path: `/invoices/${invoiceId}/record-payment`,
    queryParams: {
      altId: locationId,
      altType: 'location',
    },
    body: {
      amount,
      paymentMethod,
      notes,
    },
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to record payment' };
  }

  return { success: true, data: result.data.invoice };
}

// ============================================================================
// Helper Functions for Hotte Couture
// ============================================================================

/**
 * Create a deposit invoice (50% of total for custom orders)
 */
export async function createDepositInvoice(params: {
  contactId: string;
  clientName: string;
  clientEmail?: string | undefined;
  clientPhone?: string | undefined;
  orderNumber: number;
  totalCents: number;
  depositCents: number;
  dueDate?: Date | undefined;
}): Promise<GHLResult<GHLInvoice>> {
  const depositDollars = Number(centsToDollars(params.depositCents));

  return createInvoice({
    contactId: params.contactId,
    contactName: params.clientName,
    contactEmail: params.clientEmail,
    contactPhone: params.clientPhone,
    name: `Dépôt - Commande #${params.orderNumber}`,
    orderNumber: params.orderNumber,
    invoiceNumber: `HC-${params.orderNumber}-DEPOSIT`,
    items: [
      {
        name: `Dépôt pour commande #${params.orderNumber}`,
        description: `Dépôt de 50% pour ${params.clientName}`,
        quantity: 1,
        price: depositDollars,
      },
    ],
    dueDate: params.dueDate,
    notes: encodePaymentTypeMetadata(
      'Merci pour votre confiance. Le solde sera dû à la livraison.',
      'deposit'
    ),
    sendNotification: true,
  });
}

/**
 * Create a balance invoice (remaining amount after deposit)
 */
export async function createBalanceInvoice(params: {
  contactId: string;
  clientName: string;
  clientEmail?: string | undefined;
  clientPhone?: string | undefined;
  orderNumber: number;
  balanceCents: number;
  dueDate?: Date | undefined;
}): Promise<GHLResult<GHLInvoice>> {
  const balanceDollars = Number(centsToDollars(params.balanceCents));

  return createInvoice({
    contactId: params.contactId,
    contactName: params.clientName,
    contactEmail: params.clientEmail,
    contactPhone: params.clientPhone,
    name: `Solde - Commande #${params.orderNumber}`,
    orderNumber: params.orderNumber,
    invoiceNumber: `HC-${params.orderNumber}-BALANCE`,
    items: [
      {
        name: `Solde pour commande #${params.orderNumber}`,
        description: `Solde dû pour ${params.clientName}`,
        quantity: 1,
        price: balanceDollars,
      },
    ],
    dueDate: params.dueDate,
    notes: encodePaymentTypeMetadata(
      'Votre commande est prête! Merci de régler ce solde pour la récupération.',
      'balance'
    ),
    sendNotification: true,
  });
}

/**
 * Create a full invoice (for alterations or custom orders without deposit)
 */
export async function createFullInvoice(params: {
  contactId: string;
  clientName: string;
  clientEmail?: string | undefined;
  clientPhone?: string | undefined;
  orderNumber: number;
  items: Array<{
    name: string;
    description?: string | undefined;
    priceCents: number;
    quantity?: number | undefined;
  }>;
  rushFeeCents?: number | undefined;
  taxCents?: number | undefined;
  dueDate?: Date | undefined;
}): Promise<GHLResult<GHLInvoice>> {
  const invoiceItems: GHLInvoiceItem[] = params.items.map((item) => ({
    name: item.name || 'Service',
    description: item.description || undefined,
    quantity: item.quantity || 1,
    price: Number(centsToDollars(item.priceCents)) || 0,
  }));

  // Add rush fee if applicable
  if (params.rushFeeCents && params.rushFeeCents > 0) {
    invoiceItems.push({
      name: 'Frais express',
      description: 'Service prioritaire',
      quantity: 1,
      price: Number(centsToDollars(params.rushFeeCents)),
    });
  }

  // Note: GHL should handle taxes automatically based on location settings
  // If not, we might need to add tax as a line item

  return createInvoice({
    contactId: params.contactId,
    contactName: params.clientName,
    contactEmail: params.clientEmail,
    contactPhone: params.clientPhone,
    name: `Commande #${params.orderNumber} - ${params.clientName}`,
    orderNumber: params.orderNumber,
    invoiceNumber: `HC-${params.orderNumber}`,
    items: invoiceItems,
    dueDate: params.dueDate,
    notes: encodePaymentTypeMetadata('Merci pour votre confiance!', 'full'),
    sendNotification: true,
  });
}
