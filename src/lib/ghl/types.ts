/**
 * GHL (GoHighLevel) API Types
 * API Version: 2021-07-28
 * Base URL: https://services.leadconnectorhq.com
 */

// ============================================================================
// Contact Types
// ============================================================================

export interface GHLContact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  source?: string;
  dateAdded?: string;
  dateUpdated?: string;
}

export interface GHLContactCreate {
  locationId: string;
  firstName: string;
  lastName: string;
  email?: string | undefined;
  phone?: string | undefined;
  tags?: string[] | undefined;
  source?: string | undefined;
  customFields?: Array<{
    id: string;
    value: string;
  }> | undefined;
}

export interface GHLContactUpdate {
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  tags?: string[] | undefined;
}

export interface GHLContactLookupResponse {
  contacts: GHLContact[];
}

export interface GHLContactResponse {
  contact: GHLContact;
}

// ============================================================================
// Messaging Types
// ============================================================================

export type MessageType = 'SMS' | 'Email' | 'WhatsApp';

export interface GHLSendMessageRequest {
  type: MessageType;
  contactId: string;
  message?: string;           // For SMS
  html?: string;              // For Email
  subject?: string;           // For Email
  emailFrom?: string;         // For Email
}

export interface GHLSendMessageResponse {
  conversationId: string;
  messageId: string;
  message?: any;
}

// ============================================================================
// Tag Types
// ============================================================================

export interface GHLAddTagsRequest {
  tags: string[];
}

export interface GHLTagResponse {
  tags: string[];
}

// ============================================================================
// Hotte Couture Specific Types
// ============================================================================

export type MessagingAction =
  | 'DEPOSIT_REQUEST'
  | 'READY_PICKUP'
  | 'READY_PICKUP_PAID'
  | 'PAYMENT_RECEIVED'
  | 'REMINDER_3WEEK'
  | 'REMINDER_1MONTH';

export type GHLTag =
  | 'nouveau_client'
  | 'client_fidele'
  | 'client_alteration'
  | 'client_creation'
  | 'client_vip'
  | 'sequence_bienvenue'
  | 'depot_en_attente'
  | 'depot_recu'
  | 'pret_a_ramasser'
  | 'paye'
  | 'paiement_comptant';

export interface MessageData {
  firstName: string;
  orderNumber: number;
  deposit?: number;
  balance?: number;
  total?: number;
  paymentUrl?: string | null;
  trackingUrl?: string;
}

export interface SendMessageParams {
  action: MessagingAction;
  contactId: string;
  language: 'fr' | 'en';
  preferredContact: 'sms' | 'email';
  data: MessageData;
  tagsToAdd?: GHLTag[];
  tagsToRemove?: GHLTag[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GHLApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface GHLResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Client Data (from app database)
// ============================================================================

export interface AppClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  language: 'fr' | 'en';
  ghl_contact_id: string | null;
  preferred_contact: 'sms' | 'email';
  newsletter_consent?: boolean;
}

export interface AppOrder {
  id: string;
  order_number: number;
  type: 'alteration' | 'custom';
  status: string;
  total_cents: number;
  deposit_cents: number;
  balance_due_cents: number;
}
