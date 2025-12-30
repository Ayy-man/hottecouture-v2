/**
 * GHL Invoice API Module
 *
 * Create, manage, and send invoices via GoHighLevel.
 * Stripe is connected to GHL, so payments flow through GHL's invoicing system.
 */

import { ghlFetch, getLocationId, centsToDollars } from './client';
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

export interface GHLInvoiceCreateRequest {
  altId: string; // Location ID
  altType: 'location';
  name: string;
  contactId: string;
  title?: string;
  dueDate?: string; // ISO date string
  issueDate?: string;
  items: GHLInvoiceItem[];
  discount?: GHLInvoiceDiscount;
  currency?: string;
  termsNotes?: string;
  invoiceNumber?: string;
  sendNotification?: boolean;
  liveMode?: boolean;
  businessDetails?: GHLBusinessDetails;
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
  name: string;
  items: GHLInvoiceItem[];
  dueDate?: Date | undefined;
  orderNumber?: number | undefined;
  notes?: string | undefined;
  sendNotification?: boolean | undefined;
}): Promise<GHLResult<GHLInvoice>> {
  const locationId = getLocationId();

  const requestBody: GHLInvoiceCreateRequest = {
    altId: locationId,
    altType: 'location',
    name: params.name,
    contactId: params.contactId,
    items: params.items,
    currency: 'CAD',
    liveMode: true,
    sendNotification: params.sendNotification ?? false,
  };

  // Add due date if provided and valid
  if (params.dueDate && params.dueDate instanceof Date && !isNaN(params.dueDate.getTime())) {
    requestBody.dueDate = params.dueDate.toISOString();
  }

  // Add invoice number based on order number
  if (params.orderNumber) {
    requestBody.invoiceNumber = `HC-${params.orderNumber}`;
  }

  // Add notes/terms
  if (params.notes) {
    requestBody.termsNotes = params.notes;
  }

  // Business details for Hotte Couture
  requestBody.businessDetails = {
    name: 'Hotte Couture',
    address: '1234 Rue Example',
    city: 'Montréal',
    state: 'QC',
    postalCode: 'H2X 1Y2',
    country: 'CA',
    phone: '+15141234567',
    email: 'info@hottecouture.com',
  };

  console.log('📧 Creating GHL invoice:', {
    contactId: params.contactId,
    name: params.name,
    itemCount: params.items.length,
  });

  const result = await ghlFetch<GHLInvoiceResponse>({
    method: 'POST',
    path: '/invoices/',
    body: requestBody,
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to create invoice' };
  }

  // Validate the invoice object exists in the response
  const invoice = result.data.invoice;
  if (!invoice || !invoice._id) {
    console.error('❌ GHL API returned unexpected response:', JSON.stringify(result.data));
    return { success: false, error: 'GHL API returned invalid invoice response' };
  }

  return { success: true, data: invoice };
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
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to send invoice' };
  }

  return { success: true, data: result.data.invoice };
}

/**
 * Get an invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<GHLResult<GHLInvoice>> {
  const locationId = getLocationId();

  const result = await ghlFetch<GHLInvoiceResponse>({
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

  return { success: true, data: result.data.invoice };
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
    },
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to list invoices' };
  }

  return { success: true, data: result.data.invoices };
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
  orderNumber: number;
  totalCents: number;
  depositCents: number;
  dueDate?: Date | undefined;
}): Promise<GHLResult<GHLInvoice>> {
  const depositDollars = Number(centsToDollars(params.depositCents));

  return createInvoice({
    contactId: params.contactId,
    name: `Dépôt - Commande #${params.orderNumber}`,
    orderNumber: params.orderNumber,
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
  orderNumber: number;
  balanceCents: number;
  dueDate?: Date | undefined;
}): Promise<GHLResult<GHLInvoice>> {
  const balanceDollars = Number(centsToDollars(params.balanceCents));

  return createInvoice({
    contactId: params.contactId,
    name: `Solde - Commande #${params.orderNumber}`,
    orderNumber: params.orderNumber,
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
    name: `Commande #${params.orderNumber} - ${params.clientName}`,
    orderNumber: params.orderNumber,
    items: invoiceItems,
    dueDate: params.dueDate,
    notes: encodePaymentTypeMetadata('Merci pour votre confiance!', 'full'),
    sendNotification: true,
  });
}
