/**
 * n8n Webhook Integration
 *
 * Centralized helper functions for calling n8n webhooks.
 *
 * Two n8n instances are used:
 * - GHL Contact Sync: otomato456321.app.n8n.cloud (existing workflow)
 * - Payment flows: upnorthwatches.app.n8n.cloud (new workflows)
 *
 * Endpoints:
 * - GHL sync: /webhook/e7b5e81d-53e1-496f-a8d1-1d5100b653a2
 * - /demande-depot - Send deposit request with Stripe link
 * - /pret-ramassage - Send ready notification with payment link
 * - /paiement-recu - Notify payment received (updates GHL tags)
 */

// GHL Contact Sync webhook (order creation)
const GHL_SYNC_WEBHOOK_URL = process.env.N8N_CRM_WEBHOOK_URL || 'https://otomato456321.app.n8n.cloud/webhook/e7b5e81d-53e1-496f-a8d1-1d5100b653a2';

// Unified messaging webhook (handles all SMS/email notifications)
const N8N_MESSAGING_WEBHOOK_URL = process.env.N8N_MESSAGING_WEBHOOK_URL || 'https://otomato456321.app.n8n.cloud/webhook/hotte-couture-messaging';

// Action types for the messaging webhook switch node
export type MessagingAction =
  | 'DEPOSIT_REQUEST'      // Custom order needs deposit
  | 'READY_PICKUP'         // Order ready, balance due
  | 'READY_PICKUP_PAID'    // Order ready, already paid
  | 'PAYMENT_RECEIVED';    // Payment confirmed (tags only)

// ============================================================================
// Types - Aligned with n8n workflow expectations
// ============================================================================

/**
 * Client data structure expected by n8n GHL sync workflow
 * Note: workflow expects combined 'name' field, not separate first/last
 */
export interface GHLSyncClient {
  id: string;
  name: string;  // Combined "First Last" - workflow splits it
  email: string | null;
  phone: string | null;  // E.164 format with country code
  communication_preference: 'sms' | 'email';
  newsletter_consent: boolean;
}

/**
 * Order data structure expected by n8n GHL sync workflow
 */
export interface GHLSyncOrder {
  id: string;
  order_number: number;
  total_cents: number;
  is_custom_order: boolean;  // Note: workflow expects is_custom_order, not is_custom
  deposit_cents: number;
}

export interface N8nService {
  name: string;
  category: string;
  price_cents: number;
}

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

// ============================================================================
// Payload Interfaces - Aligned with n8n workflow
// ============================================================================

/**
 * Payload for GHL Contact Sync webhook
 * Must match the structure expected by the n8n "Extract & Format Data" node
 */
export interface GHLSyncContactPayload {
  event: 'order.created';
  order: GHLSyncOrder;
  client: GHLSyncClient;
  services: N8nService[];
  tags: GHLTag[];
}

// Types for internal app use (before transformation)
export interface N8nClient {
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

export interface N8nOrder {
  id: string;
  order_number: number;
  type: 'alteration' | 'custom';
  status: string;
  total_cents: number;
  deposit_cents: number;
  balance_due_cents: number;
  is_custom: boolean;
  deposit_required: boolean;
}

export interface DemandeDepotPayload {
  order: N8nOrder;
  client: N8nClient;
  checkout_url: string;
  deposit_amount_cents: number;
}

export interface PretRamassagePayload {
  order: N8nOrder;
  client: N8nClient;
  checkout_url: string | null; // null if already paid
  balance_amount_cents: number;
}

export interface PaiementRecuPayload {
  payment_type: 'deposit' | 'balance' | 'full';
  payment_method: 'stripe' | 'cash' | 'card_terminal';
  amount_cents: number;
  order: {
    id: string;
    order_number: number;
  };
  client: {
    ghl_contact_id: string | null;
  };
}

/**
 * Unified messaging webhook payload
 * Used by switch node to route to different message templates
 */
export interface MessagingWebhookPayload {
  action: MessagingAction;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    communication_preference: 'sms' | 'email';
    language: 'fr' | 'en';
  };
  order: {
    id: string;
    order_number: number;
    total_cents: number;
    deposit_cents: number;
    balance_cents: number;
  };
  payment_url: string | null;
  tags_to_add: GHLTag[];
  tags_to_remove: GHLTag[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate GHL tags based on order and client data
 */
export function calculateGHLTags(
  order: N8nOrder,
  _client: N8nClient,
  services: N8nService[],
  isNewClient: boolean
): GHLTag[] {
  const tags: GHLTag[] = [];

  // Client status tags
  if (isNewClient) {
    tags.push('nouveau_client');
  } else {
    tags.push('client_fidele');
  }

  // Service type tags
  const hasAlteration = services.some(s =>
    s.category === 'alteration' || s.category === 'hemming' || s.category === 'repair'
  );
  const hasCustom = services.some(s => s.category === 'custom');

  if (hasAlteration) {
    tags.push('client_alteration');
  }
  if (hasCustom) {
    tags.push('client_creation');
  }

  // VIP tag for high-value orders
  if (order.total_cents >= 50000) { // $500+
    tags.push('client_vip');
  }

  return tags;
}

/**
 * Determine if an order is a custom order (requires deposit)
 */
export function isCustomOrder(services: N8nService[]): boolean {
  return services.some(s => s.category === 'custom');
}

// ============================================================================
// Webhook Functions
// ============================================================================

interface WebhookResult {
  success: boolean;
  data?: any;
  error?: string;
}

async function callWebhook(
  url: string,
  payload: any,
  label: string
): Promise<WebhookResult> {
  try {
    console.log(`📤 Calling n8n webhook: ${label}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ n8n webhook failed: ${label}`, errorText);
      return {
        success: false,
        error: `Webhook failed: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    console.log(`✅ n8n webhook success: ${label}`);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`❌ n8n webhook error: ${label}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync contact to GHL when order is created
 * Uses the existing n8n workflow at otomato456321.app.n8n.cloud
 *
 * @param client - App client data (will be transformed)
 * @param order - App order data (will be transformed)
 * @param services - Service list
 * @param tags - GHL tags to apply
 */
export async function syncContactToGHL(payload: {
  client: N8nClient;
  order: N8nOrder;
  services: N8nService[];
  tags: GHLTag[];
  is_new_client: boolean;
}): Promise<WebhookResult> {
  // Transform payload to match n8n workflow expectations
  const webhookPayload: GHLSyncContactPayload = {
    event: 'order.created',
    order: {
      id: payload.order.id,
      order_number: payload.order.order_number,
      total_cents: payload.order.total_cents,
      // Map is_custom to is_custom_order (what workflow expects)
      is_custom_order: payload.order.is_custom,
      deposit_cents: payload.order.deposit_cents,
    },
    client: {
      id: payload.client.id,
      // Combine first + last name (workflow will split it)
      name: `${payload.client.first_name} ${payload.client.last_name}`.trim(),
      email: payload.client.email,
      // Ensure E.164 format with + prefix
      phone: payload.client.phone ? (payload.client.phone.startsWith('+') ? payload.client.phone : `+${payload.client.phone}`) : null,
      // Map preferred_contact to communication_preference
      communication_preference: payload.client.preferred_contact || 'sms',
      newsletter_consent: payload.client.newsletter_consent || false,
    },
    services: payload.services,
    tags: payload.tags,
  };

  return callWebhook(GHL_SYNC_WEBHOOK_URL, webhookPayload, 'GHL Contact Sync');
}

/**
 * Unified messaging webhook - handles all SMS/email notifications
 * Routes to different message templates via switch node based on action
 */
export async function sendMessage(
  payload: MessagingWebhookPayload
): Promise<WebhookResult> {
  // Ensure phone has + prefix for E.164
  const normalizedPayload = {
    ...payload,
    client: {
      ...payload.client,
      phone: payload.client.phone
        ? (payload.client.phone.startsWith('+') ? payload.client.phone : `+${payload.client.phone}`)
        : null,
    },
  };

  return callWebhook(N8N_MESSAGING_WEBHOOK_URL, normalizedPayload, `Message: ${payload.action}`);
}

/**
 * Send deposit request notification with Stripe checkout URL
 */
export async function sendDemandeDepot(
  client: N8nClient,
  order: N8nOrder,
  checkoutUrl: string
): Promise<WebhookResult> {
  return sendMessage({
    action: 'DEPOSIT_REQUEST',
    client: {
      id: client.id,
      name: `${client.first_name} ${client.last_name}`.trim(),
      email: client.email,
      phone: client.phone,
      communication_preference: client.preferred_contact || 'sms',
      language: client.language || 'fr',
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
      deposit_cents: order.deposit_cents,
      balance_cents: order.balance_due_cents,
    },
    payment_url: checkoutUrl,
    tags_to_add: ['depot_en_attente'],
    tags_to_remove: [],
  });
}

/**
 * Send ready for pickup notification with optional payment link
 */
export async function sendPretRamassage(
  client: N8nClient,
  order: N8nOrder,
  checkoutUrl: string | null,
  balanceCents: number
): Promise<WebhookResult> {
  const isPaid = checkoutUrl === null || balanceCents === 0;

  return sendMessage({
    action: isPaid ? 'READY_PICKUP_PAID' : 'READY_PICKUP',
    client: {
      id: client.id,
      name: `${client.first_name} ${client.last_name}`.trim(),
      email: client.email,
      phone: client.phone,
      communication_preference: client.preferred_contact || 'sms',
      language: client.language || 'fr',
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
      deposit_cents: order.deposit_cents,
      balance_cents: balanceCents,
    },
    payment_url: checkoutUrl,
    tags_to_add: ['pret_a_ramasser'],
    tags_to_remove: isPaid ? [] : ['depot_recu'],
  });
}

/**
 * Notify that payment was received (updates GHL tags)
 */
export async function sendPaiementRecu(
  client: N8nClient,
  order: N8nOrder,
  paymentType: 'deposit' | 'balance' | 'full',
  paymentMethod: 'stripe' | 'cash' | 'card_terminal'
): Promise<WebhookResult> {
  // Determine tags based on payment type
  let tagsToAdd: GHLTag[] = [];
  let tagsToRemove: GHLTag[] = [];

  if (paymentType === 'deposit') {
    tagsToAdd = ['depot_recu'];
    tagsToRemove = ['depot_en_attente'];
  } else {
    // balance or full payment
    tagsToAdd = paymentMethod === 'cash' ? ['paye', 'paiement_comptant'] : ['paye'];
    tagsToRemove = ['pret_a_ramasser', 'depot_en_attente'];
  }

  return sendMessage({
    action: 'PAYMENT_RECEIVED',
    client: {
      id: client.id,
      name: `${client.first_name} ${client.last_name}`.trim(),
      email: client.email,
      phone: client.phone,
      communication_preference: client.preferred_contact || 'sms',
      language: client.language || 'fr',
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
      deposit_cents: order.deposit_cents,
      balance_cents: order.balance_due_cents,
    },
    payment_url: null,
    tags_to_add: tagsToAdd,
    tags_to_remove: tagsToRemove,
  });
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Build order data for n8n webhooks from database order
 */
export function buildN8nOrder(dbOrder: any): N8nOrder {
  const isCustom = dbOrder.type === 'custom';
  const depositRequired = isCustom && !dbOrder.deposit_paid_at;

  return {
    id: dbOrder.id,
    order_number: dbOrder.order_number,
    type: dbOrder.type || 'alteration',
    status: dbOrder.status,
    total_cents: dbOrder.total_cents || 0,
    deposit_cents: dbOrder.deposit_cents || Math.ceil((dbOrder.total_cents || 0) / 2),
    balance_due_cents: dbOrder.balance_due_cents || dbOrder.total_cents || 0,
    is_custom: isCustom,
    deposit_required: depositRequired,
  };
}

/**
 * Build client data for n8n webhooks from database client
 */
export function buildN8nClient(dbClient: any): N8nClient {
  return {
    id: dbClient.id,
    first_name: dbClient.first_name || '',
    last_name: dbClient.last_name || '',
    email: dbClient.email || null,
    phone: dbClient.phone || null,
    language: dbClient.language || 'fr',
    ghl_contact_id: dbClient.ghl_contact_id || null,
    preferred_contact: dbClient.preferred_contact || 'sms',
    newsletter_consent: dbClient.newsletter_consent || false,
  };
}
