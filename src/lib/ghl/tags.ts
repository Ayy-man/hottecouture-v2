/**
 * GHL Tags Module
 *
 * Manage contact tags in GoHighLevel.
 */

import { ghlFetch } from './client';
import { GHLAddTagsRequest, GHLTagResponse, GHLResult, GHLTag } from './types';

/**
 * Add tags to a contact
 */
export async function addTags(
  contactId: string,
  tags: GHLTag[]
): Promise<GHLResult<string[]>> {
  if (tags.length === 0) {
    return { success: true, data: [] };
  }

  console.log(`🏷️ Adding tags to contact ${contactId}:`, tags);

  const result = await ghlFetch<GHLTagResponse>({
    method: 'POST',
    path: `/contacts/${contactId}/tags`,
    body: {
      tags,
    } as GHLAddTagsRequest,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Failed to add tags' };
  }

  return {
    success: true,
    data: result.data?.tags || [...tags],
  };
}

/**
 * Remove a single tag from a contact
 * Note: GHL API removes tags one at a time
 */
export async function removeTag(
  contactId: string,
  tag: GHLTag
): Promise<GHLResult<void>> {
  console.log(`🏷️ Removing tag from contact ${contactId}:`, tag);

  const result = await ghlFetch<void>({
    method: 'DELETE',
    path: `/contacts/${contactId}/tags`,
    body: {
      tags: [tag],
    },
  });

  return result;
}

/**
 * Remove multiple tags from a contact
 */
export async function removeTags(
  contactId: string,
  tags: GHLTag[]
): Promise<GHLResult<void>> {
  if (tags.length === 0) {
    return { success: true };
  }

  console.log(`🏷️ Removing tags from contact ${contactId}:`, tags);

  // GHL API can handle multiple tags in one call
  const result = await ghlFetch<void>({
    method: 'DELETE',
    path: `/contacts/${contactId}/tags`,
    body: {
      tags,
    },
  });

  return result;
}

/**
 * Calculate tags for a new order
 */
export function calculateOrderTags(options: {
  isNewClient: boolean;
  orderType: 'alteration' | 'custom';
  totalCents: number;
  serviceCategories?: string[];
}): GHLTag[] {
  const tags: GHLTag[] = [];

  // Client status
  if (options.isNewClient) {
    tags.push('nouveau_client');
    tags.push('sequence_bienvenue');
  } else {
    tags.push('client_fidele');
  }

  // Order type
  if (options.orderType === 'custom') {
    tags.push('client_creation');
  } else {
    tags.push('client_alteration');
  }

  // VIP status for $500+ orders
  if (options.totalCents >= 50000) {
    tags.push('client_vip');
  }

  return tags;
}
