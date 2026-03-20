/**
 * GHL Messaging Module
 *
 * Send SMS and Email messages through GoHighLevel.
 * Includes bilingual message templates for Hotte Couture.
 */

import { ghlFetch, centsToDollars } from './client';
import {
  GHLSendMessageRequest,
  GHLSendMessageResponse,
  GHLResult,
  MessagingAction,
  MessageData,
  SendMessageParams,
  AppClient,
  AppOrder,
  GHLTag,
} from './types';
import { addTags, removeTags } from './tags';
import { findOrCreateContact } from './contacts';

// ============================================================================
// Message Templates
// ============================================================================

const MESSAGE_TEMPLATES = {
  ORDER_CREATED: {
    fr: (data: MessageData) =>
      `Bonjour ${data.firstName}, Haute Couture a bien reçu votre commande #${data.orderNumber}. Suivez l'avancement ici : ${data.trackingUrl}`,
    en: (data: MessageData) =>
      `Hello ${data.firstName}, Haute Couture has received your order #${data.orderNumber}. Track it here: ${data.trackingUrl}`,
  },

  DEPOSIT_REQUEST: {
    fr: (data: MessageData) =>
      `Bonjour ${data.firstName},

Votre commande #${data.orderNumber} nécessite un dépôt de ${data.deposit}$.

Payez ici: ${data.paymentUrl}

Suivez votre commande: ${data.trackingUrl}

Merci,
Hotte Couture`,
    en: (data: MessageData) =>
      `Hello ${data.firstName},

Your order #${data.orderNumber} requires a deposit of $${data.deposit}.

Pay here: ${data.paymentUrl}

Track your order: ${data.trackingUrl}

Thank you,
Hotte Couture`,
  },

  READY_PICKUP: {
    fr: (data: MessageData) =>
      `Bonjour ${data.firstName},

Votre commande #${data.orderNumber} est prête!

Solde à payer: ${data.balance}$

Payez ici: ${data.paymentUrl}

Suivez votre commande: ${data.trackingUrl}

Merci,
Hotte Couture`,
    en: (data: MessageData) =>
      `Hello ${data.firstName},

Your order #${data.orderNumber} is ready!

Balance due: $${data.balance}

Pay here: ${data.paymentUrl}

Track your order: ${data.trackingUrl}

Thank you,
Hotte Couture`,
  },

  READY_PICKUP_PAID: {
    fr: (data: MessageData) =>
      `Bonjour ${data.firstName},

Bonne nouvelle! Votre commande #${data.orderNumber} est prête à ramasser.

Suivez votre commande: ${data.trackingUrl}

Merci,
Hotte Couture`,
    en: (data: MessageData) =>
      `Hello ${data.firstName},

Great news! Your order #${data.orderNumber} is ready for pickup.

Track your order: ${data.trackingUrl}

Thank you,
Hotte Couture`,
  },

  // PAYMENT_RECEIVED doesn't send a message - tags only
  PAYMENT_RECEIVED: {
    fr: () => '',
    en: () => '',
  },

  REMINDER_3WEEK: {
    fr: (data: MessageData) =>
      `Bonjour ${data.firstName},

Rappel: Votre commande #${data.orderNumber} est prête depuis 3 semaines.

Passez la récupérer chez Hotte Design & Couture.

Merci,
Hotte Couture`,
    en: (data: MessageData) =>
      `Hello ${data.firstName},

Reminder: Your order #${data.orderNumber} has been ready for 3 weeks.

Please pick it up at Hotte Design & Couture.

Thank you,
Hotte Couture`,
  },

  REMINDER_1MONTH: {
    fr: (data: MessageData) =>
      `Bonjour ${data.firstName},

Dernier rappel: Votre commande #${data.orderNumber} est prête depuis plus d'un mois.

Les articles non récupérés seront donnés à une œuvre de charité.

Merci,
Hotte Couture`,
    en: (data: MessageData) =>
      `Hello ${data.firstName},

Final reminder: Your order #${data.orderNumber} has been ready for over a month.

Unclaimed items will be donated to charity.

Thank you,
Hotte Couture`,
  },
};

const EMAIL_SUBJECTS = {
  fr: 'Nouvelle mise à jour de Hotte Couture',
  en: 'Hotte Couture - Order Update',
};

// ============================================================================
// Core Messaging Functions
// ============================================================================

/**
 * Send an SMS message to a contact
 */
export async function sendSMS(
  contactId: string,
  message: string
): Promise<GHLResult<GHLSendMessageResponse>> {
  if (!message.trim()) {
    return { success: false, error: 'Message cannot be empty' };
  }

  const result = await ghlFetch<GHLSendMessageResponse>({
    method: 'POST',
    path: '/conversations/messages',
    body: {
      type: 'SMS',
      contactId,
      message,
    } as GHLSendMessageRequest,
  });

  return result;
}

/**
 * Send an email message to a contact
 */
export async function sendEmail(
  contactId: string,
  subject: string,
  html: string
): Promise<GHLResult<GHLSendMessageResponse>> {
  if (!html.trim()) {
    return { success: false, error: 'Email content cannot be empty' };
  }

  const result = await ghlFetch<GHLSendMessageResponse>({
    method: 'POST',
    path: '/conversations/messages',
    body: {
      type: 'Email',
      contactId,
      subject,
      html,
    } as GHLSendMessageRequest,
  });

  return result;
}

/**
 * Build message content from template
 */
function buildMessage(
  action: MessagingAction,
  language: 'fr' | 'en',
  data: MessageData
): string {
  const template = MESSAGE_TEMPLATES[action];
  if (!template) {
    console.warn(`No template found for action: ${action}`);
    return '';
  }

  return template[language](data);
}

/**
 * Convert plain text message to simple HTML for email
 */
function textToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => `<p>${line || '&nbsp;'}</p>`)
    .join('\n');
}

// ============================================================================
// High-Level Messaging Functions
// ============================================================================

/**
 * Send a notification message and update tags
 * This is the main function called by the app
 */
export async function sendNotification(
  params: SendMessageParams
): Promise<GHLResult<{ messageSent: boolean; tagsUpdated: boolean }>> {
  const {
    action,
    contactId,
    language,
    preferredContact,
    data,
    tagsToAdd = [],
    tagsToRemove = [],
  } = params;

  let messageSent = false;
  let tagsUpdated = false;

  // Build the message
  const message = buildMessage(action, language, data);

  // Send message if there is one (PAYMENT_RECEIVED has no message)
  if (message) {
    if (preferredContact === 'email') {
      const subject = EMAIL_SUBJECTS[language];
      const html = textToHtml(message);
      const emailResult = await sendEmail(contactId, subject, html);

      if (emailResult.success) {
        messageSent = true;
        console.log(`📧 Email sent to contact ${contactId} for ${action}`);
      } else {
        console.warn(`⚠️ Email failed, falling back to SMS:`, emailResult.error);
        // Fallback to SMS
        const smsResult = await sendSMS(contactId, message);
        messageSent = smsResult.success;
        if (messageSent) {
          console.log(`📱 SMS sent (fallback) to contact ${contactId} for ${action}`);
        }
      }
    } else {
      // Default to SMS
      const smsResult = await sendSMS(contactId, message);
      messageSent = smsResult.success;
      if (messageSent) {
        console.log(`📱 SMS sent to contact ${contactId} for ${action}`);
      } else {
        console.warn(`⚠️ SMS failed:`, smsResult.error);
      }
    }
  }

  // Update tags
  if (tagsToRemove.length > 0) {
    const removeResult = await removeTags(contactId, tagsToRemove);
    if (!removeResult.success) {
      console.warn(`⚠️ Failed to remove tags:`, removeResult.error);
    }
  }

  if (tagsToAdd.length > 0) {
    const addResult = await addTags(contactId, tagsToAdd);
    if (addResult.success) {
      tagsUpdated = true;
    } else {
      console.warn(`⚠️ Failed to add tags:`, addResult.error);
    }
  }

  return {
    success: true,
    data: { messageSent, tagsUpdated },
  };
}

// ============================================================================
// Convenience Functions (matching old n8n-webhooks.ts interface)
// ============================================================================

/**
 * Send deposit request notification
 */
export async function sendDepositRequest(
  client: AppClient,
  order: AppOrder,
  checkoutUrl: string
): Promise<GHLResult<{ messageSent: boolean; tagsUpdated: boolean }>> {
  // Find or create GHL contact
  const contactResult = await findOrCreateContact(client);
  if (!contactResult.success || !contactResult.data) {
    return { success: false, error: contactResult.error || 'Contact not found' };
  }

  return sendNotification({
    action: 'DEPOSIT_REQUEST',
    contactId: contactResult.data,
    language: client.language,
    preferredContact: client.preferred_contact,
    data: {
      firstName: client.first_name,
      orderNumber: order.order_number,
      deposit: parseFloat(centsToDollars(order.deposit_cents)),
      paymentUrl: checkoutUrl,
      trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track/${order.id}`,
    },
    tagsToAdd: ['depot_en_attente'],
    tagsToRemove: [],
  });
}

/**
 * Send ready for pickup notification (with payment link)
 */
export async function sendReadyPickup(
  client: AppClient,
  order: AppOrder,
  checkoutUrl: string | null,
  balanceCents: number
): Promise<GHLResult<{ messageSent: boolean; tagsUpdated: boolean }>> {
  // Find or create GHL contact
  const contactResult = await findOrCreateContact(client);
  if (!contactResult.success || !contactResult.data) {
    return { success: false, error: contactResult.error || 'Contact not found' };
  }

  const isPaid = !checkoutUrl || balanceCents === 0;
  const action: MessagingAction = isPaid ? 'READY_PICKUP_PAID' : 'READY_PICKUP';

  const tagsToAdd: GHLTag[] = ['pret_a_ramasser'];
  const tagsToRemove: GHLTag[] = isPaid ? [] : ['depot_recu'];

  return sendNotification({
    action,
    contactId: contactResult.data,
    language: client.language,
    preferredContact: client.preferred_contact,
    data: {
      firstName: client.first_name,
      orderNumber: order.order_number,
      balance: parseFloat(centsToDollars(balanceCents)),
      paymentUrl: checkoutUrl,
      trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track/${order.id}`,
    },
    tagsToAdd,
    tagsToRemove,
  });
}

/**
 * Update tags when payment is received (no message sent)
 */
export async function recordPaymentReceived(
  client: AppClient,
  paymentType: 'deposit' | 'balance' | 'full',
  paymentMethod: 'stripe' | 'cash' | 'card_terminal'
): Promise<GHLResult<{ messageSent: boolean; tagsUpdated: boolean }>> {
  // Find or create GHL contact
  const contactResult = await findOrCreateContact(client);
  if (!contactResult.success || !contactResult.data) {
    return { success: false, error: contactResult.error || 'Contact not found' };
  }

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

  return sendNotification({
    action: 'PAYMENT_RECEIVED',
    contactId: contactResult.data,
    language: client.language,
    preferredContact: client.preferred_contact,
    data: {
      firstName: client.first_name,
      orderNumber: 0, // Not used for PAYMENT_RECEIVED
    },
    tagsToAdd,
    tagsToRemove,
  });
}

/**
 * Send a pickup reminder (3 week or 1 month)
 * Used by the cron job
 */
export async function sendPickupReminder(
  client: AppClient,
  orderNumber: number,
  reminderType: '3week' | '1month'
): Promise<GHLResult<{ messageSent: boolean }>> {
  // Find or create GHL contact
  const contactResult = await findOrCreateContact(client);
  if (!contactResult.success || !contactResult.data) {
    return { success: false, error: contactResult.error || 'Contact not found' };
  }

  const action: MessagingAction = reminderType === '3week' ? 'REMINDER_3WEEK' : 'REMINDER_1MONTH';

  const result = await sendNotification({
    action,
    contactId: contactResult.data,
    language: client.language,
    preferredContact: client.preferred_contact,
    data: {
      firstName: client.first_name,
      orderNumber,
    },
    tagsToAdd: [],
    tagsToRemove: [],
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to send reminder',
    };
  }

  return {
    success: true,
    data: { messageSent: result.data?.messageSent || false },
  };
}

/**
 * Send welcome SMS when an order is created (pending status)
 * Called by intake route after GHL contact sync succeeds.
 * Uses the GHL contactId directly to avoid a redundant findOrCreateContact lookup.
 */
export async function sendWelcomeSms(
  contactId: string,
  client: Pick<AppClient, 'first_name' | 'language'>,
  orderNumber: number
): Promise<GHLResult<{ messageSent: boolean }>> {
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hottecouture.ca'}/portal?order=${orderNumber}`;
  const message = buildMessage('ORDER_CREATED', client.language, {
    firstName: client.first_name,
    orderNumber,
    trackingUrl,
  });

  if (!message) {
    return { success: false, error: 'Failed to build welcome message' };
  }

  const result = await sendSMS(contactId, message);
  if (result.success) {
    console.log(`Welcome SMS sent for order #${orderNumber}`);
    return { success: true, data: { messageSent: true } };
  } else {
    console.warn(`Welcome SMS failed for order #${orderNumber}:`, result.error);
    return { success: false, error: result.error || 'SMS send failed' };
  }
}

/**
 * Trigger a GHL voice broadcast when an order reaches ready status.
 * Requires GHL_VOICE_CAMPAIGN_ID env var to be set.
 * Gracefully skips (returns success) if the env var is absent — Audrey has not yet
 * recorded the script and the campaign may not exist in the GHL account.
 */
export async function sendVoiceBroadcast(
  contactId: string
): Promise<GHLResult<{ called: boolean }>> {
  const campaignId = process.env.GHL_VOICE_CAMPAIGN_ID;
  if (!campaignId) {
    console.warn('GHL_VOICE_CAMPAIGN_ID not set — skipping voice broadcast');
    return { success: true, data: { called: false } };
  }

  const result = await ghlFetch<any>({
    method: 'POST',
    path: `/contacts/${contactId}/campaigns/${campaignId}/trigger`,
    body: {},
  });

  if (result.success) {
    console.log(`Voice broadcast triggered for contact ${contactId}`);
    return { success: true, data: { called: true } };
  } else {
    console.warn(`Voice broadcast failed for contact ${contactId}:`, result.error);
    return { success: false, error: result.error || 'Voice broadcast failed' };
  }
}
