/**
 * GHL (GoHighLevel) Integration
 *
 * Direct API integration for:
 * - Contact management (create, update, lookup)
 * - Messaging (SMS, Email)
 * - Tag management
 *
 * Replaces n8n webhook middleware for simpler, faster integration.
 */

// Re-export everything
export * from './types';
export * from './client';
export * from './contacts';
export * from './messaging';
export * from './tags';
export * from './invoices';

// Named exports for common functions
export {
  // Client
  isGHLConfigured,
  getLocationId,
  formatPhoneE164,
  centsToDollars,
} from './client';

export {
  // Contacts
  lookupContactByEmail,
  lookupContactByPhone,
  createContact,
  updateContact,
  findOrCreateContact,
  syncClientToGHL,
} from './contacts';

export {
  // Messaging
  sendSMS,
  sendEmail,
  sendNotification,
  sendDepositRequest,
  sendReadyPickup,
  recordPaymentReceived,
  sendPickupReminder,
} from './messaging';

export {
  // Tags
  addTags,
  removeTag,
  removeTags,
  calculateOrderTags,
} from './tags';

export {
  // Invoices
  createInvoice,
  sendInvoice,
  getInvoice,
  listInvoicesByContact,
  voidInvoice,
  recordManualPayment,
  createDepositInvoice,
  createBalanceInvoice,
  createFullInvoice,
  getNextInvoiceNumber,
} from './invoices';
