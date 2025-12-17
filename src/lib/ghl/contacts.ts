/**
 * GHL Contacts Module
 *
 * Handle contact lookup, creation, and updates in GoHighLevel.
 */

import { ghlFetch, getLocationId, formatPhoneE164 } from './client';
import {
  GHLContact,
  GHLContactCreate,
  GHLContactUpdate,
  GHLContactLookupResponse,
  GHLContactResponse,
  GHLResult,
  AppClient,
  GHLTag,
} from './types';

/**
 * Look up a contact by email
 */
export async function lookupContactByEmail(
  email: string
): Promise<GHLResult<GHLContact | null>> {
  const locationId = getLocationId();

  const result = await ghlFetch<GHLContactLookupResponse>({
    method: 'GET',
    path: '/contacts/',
    queryParams: {
      locationId,
      query: email,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Lookup failed' };
  }

  const contacts = result.data?.contacts || [];
  const firstContact = contacts[0] ?? null;
  return {
    success: true,
    data: firstContact,
  };
}

/**
 * Look up a contact by phone
 */
export async function lookupContactByPhone(
  phone: string
): Promise<GHLResult<GHLContact | null>> {
  const locationId = getLocationId();
  const formattedPhone = formatPhoneE164(phone);

  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }

  const result = await ghlFetch<GHLContactLookupResponse>({
    method: 'GET',
    path: '/contacts/',
    queryParams: {
      locationId,
      query: formattedPhone,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Lookup failed' };
  }

  const contacts = result.data?.contacts || [];
  const firstContact = contacts[0] ?? null;
  return {
    success: true,
    data: firstContact,
  };
}

/**
 * Create a new contact in GHL
 */
export async function createContact(
  data: Omit<GHLContactCreate, 'locationId'>
): Promise<GHLResult<GHLContact>> {
  const locationId = getLocationId();

  const contactData: GHLContactCreate = {
    locationId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: formatPhoneE164(data.phone) || undefined,
    tags: data.tags,
    source: data.source || 'Hotte Couture App',
  };

  const result = await ghlFetch<GHLContactResponse>({
    method: 'POST',
    path: '/contacts/',
    body: contactData,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Create failed' };
  }

  const contact = result.data?.contact;
  if (!contact) {
    return { success: false, error: 'No contact returned from API' };
  }

  return {
    success: true,
    data: contact,
  };
}

/**
 * Update an existing contact in GHL
 */
export async function updateContact(
  contactId: string,
  data: GHLContactUpdate
): Promise<GHLResult<GHLContact>> {
  const updateData: GHLContactUpdate = {
    ...data,
    phone: data.phone ? formatPhoneE164(data.phone) || undefined : undefined,
  };

  const result = await ghlFetch<GHLContactResponse>({
    method: 'PUT',
    path: `/contacts/${contactId}`,
    body: updateData,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Update failed' };
  }

  const contact = result.data?.contact;
  if (!contact) {
    return { success: false, error: 'No contact returned from API' };
  }

  return {
    success: true,
    data: contact,
  };
}

/**
 * Find or create a contact from app client data
 * Returns the GHL contact ID
 */
export async function findOrCreateContact(
  client: AppClient,
  tags?: GHLTag[]
): Promise<GHLResult<string>> {
  // If we already have a GHL contact ID, just return it
  if (client.ghl_contact_id) {
    console.log('📇 Using existing GHL contact ID:', client.ghl_contact_id);
    return { success: true, data: client.ghl_contact_id };
  }

  // Try to find by email first
  if (client.email) {
    const emailLookup = await lookupContactByEmail(client.email);
    if (emailLookup.success && emailLookup.data) {
      console.log('📇 Found GHL contact by email:', emailLookup.data.id);
      return { success: true, data: emailLookup.data.id };
    }
  }

  // Try to find by phone
  if (client.phone) {
    const phoneLookup = await lookupContactByPhone(client.phone);
    if (phoneLookup.success && phoneLookup.data) {
      console.log('📇 Found GHL contact by phone:', phoneLookup.data.id);
      return { success: true, data: phoneLookup.data.id };
    }
  }

  // Create new contact
  console.log('📇 Creating new GHL contact for:', client.first_name, client.last_name);

  const createResult = await createContact({
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email || undefined,
    phone: client.phone || undefined,
    tags: tags,
    source: 'Hotte Couture App',
  });

  if (!createResult.success || !createResult.data) {
    return {
      success: false,
      error: createResult.error || 'Failed to create contact',
    };
  }

  console.log('📇 Created new GHL contact:', createResult.data.id);
  return { success: true, data: createResult.data.id };
}

/**
 * Sync a client to GHL (create or update)
 * This is the main function called during order creation
 */
export async function syncClientToGHL(
  client: AppClient,
  options: {
    isNewClient: boolean;
    orderType: 'alteration' | 'custom';
    totalCents: number;
  }
): Promise<GHLResult<string>> {
  // Calculate tags based on client/order
  const tags: GHLTag[] = [];

  if (options.isNewClient) {
    tags.push('nouveau_client');
    tags.push('sequence_bienvenue');
  } else {
    tags.push('client_fidele');
  }

  if (options.orderType === 'custom') {
    tags.push('client_creation');
  } else {
    tags.push('client_alteration');
  }

  // VIP for orders $500+
  if (options.totalCents >= 50000) {
    tags.push('client_vip');
  }

  return findOrCreateContact(client, tags);
}
