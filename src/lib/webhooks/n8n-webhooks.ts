/**
 * n8n Webhook Integration
 *
 * Centralized helper functions for calling n8n webhooks.
 * Base URL: https://upnorthwatches.app.n8n.cloud/webhook
 *
 * Endpoints:
 * - /ghl-sync-contact - Sync contact to GHL on order create
 * - /demande-depot - Send deposit request with Stripe link
 * - /pret-ramassage - Send ready notification with payment link
 * - /paiement-recu - Notify payment received (updates GHL tags)
 */

const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL || 'https://upnorthwatches.app.n8n.cloud/webhook';

// ============================================================================
// Types
// ============================================================================

export interface N8nClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  language: 'fr' | 'en';
  ghl_contact_id: string | null;
  preferred_contact: 'sms' | 'email';
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
  | 'depot_en_attente'
  | 'depot_recu'
  | 'pret_a_ramasser'
  | 'paye';

// ============================================================================
// Payload Interfaces
// ============================================================================

export interface GHLSyncContactPayload {
  order: N8nOrder;
  client: N8nClient;
  services: N8nService[];
  tags: GHLTag[];
  is_new_client: boolean;
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate GHL tags based on order and client data
 */
export function calculateGHLTags(
  order: N8nOrder,
  _client: N8nClient, // Prefixed with underscore to indicate intentionally unused
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
  const hasAlteration = services.some(s => s.category === 'alteration' || s.category === 'hemming' || s.category === 'repair');
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

async function callN8nWebhook(
  endpoint: string,
  payload: any
): Promise<WebhookResult> {
  const url = `${N8N_WEBHOOK_BASE_URL}${endpoint}`;

  try {
    console.log(`📤 Calling n8n webhook: ${endpoint}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ n8n webhook failed: ${endpoint}`, errorText);
      return {
        success: false,
        error: `Webhook failed: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    console.log(`✅ n8n webhook success: ${endpoint}`);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`❌ n8n webhook error: ${endpoint}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync contact to GHL when order is created
 * Endpoint: POST /ghl-sync-contact
 */
export async function syncContactToGHL(
  payload: GHLSyncContactPayload
): Promise<WebhookResult> {
  return callN8nWebhook('/ghl-sync-contact', payload);
}

/**
 * Send deposit request notification with Stripe checkout URL
 * Endpoint: POST /demande-depot
 */
export async function sendDemandeDepot(
  payload: DemandeDepotPayload
): Promise<WebhookResult> {
  return callN8nWebhook('/demande-depot', payload);
}

/**
 * Send ready for pickup notification with payment link
 * Endpoint: POST /pret-ramassage
 */
export async function sendPretRamassage(
  payload: PretRamassagePayload
): Promise<WebhookResult> {
  return callN8nWebhook('/pret-ramassage', payload);
}

/**
 * Notify that payment was received (updates GHL tags)
 * Endpoint: POST /paiement-recu
 */
export async function sendPaiementRecu(
  payload: PaiementRecuPayload
): Promise<WebhookResult> {
  return callN8nWebhook('/paiement-recu', payload);
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
  };
}
