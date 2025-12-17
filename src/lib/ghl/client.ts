/**
 * GHL API Client
 *
 * Core client for making authenticated requests to GoHighLevel API v2.
 * Uses Private Integration Token (PIT) for authentication.
 */

import { GHLResult } from './types';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

// Environment variables
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

if (!GHL_API_KEY) {
  console.warn('⚠️ GHL_API_KEY not configured - GHL integration disabled');
}

if (!GHL_LOCATION_ID) {
  console.warn('⚠️ GHL_LOCATION_ID not configured - GHL integration disabled');
}

export function getLocationId(): string {
  if (!GHL_LOCATION_ID) {
    throw new Error('GHL_LOCATION_ID environment variable is not set');
  }
  return GHL_LOCATION_ID;
}

export function isGHLConfigured(): boolean {
  return !!(GHL_API_KEY && GHL_LOCATION_ID);
}

interface FetchOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
  queryParams?: Record<string, string>;
}

/**
 * Make an authenticated request to GHL API
 */
export async function ghlFetch<T>(options: FetchOptions): Promise<GHLResult<T>> {
  if (!GHL_API_KEY) {
    return {
      success: false,
      error: 'GHL_API_KEY not configured',
    };
  }

  const { method, path, body, queryParams } = options;

  // Build URL with query params
  let url = `${GHL_BASE_URL}${path}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${GHL_API_KEY}`,
    'Version': GHL_API_VERSION,
    'Content-Type': 'application/json',
  };

  try {
    console.log(`📤 GHL API: ${method} ${path}`);

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    const responseText = await response.text();
    let data: any;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { rawResponse: responseText };
    }

    if (!response.ok) {
      const errorMessage = data.message || data.error || `HTTP ${response.status}`;
      console.error(`❌ GHL API Error: ${method} ${path}`, {
        status: response.status,
        error: errorMessage,
        data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log(`✅ GHL API Success: ${method} ${path}`);

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ GHL API Exception: ${method} ${path}`, error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Ensure phone number is in E.164 format with + prefix
 */
export function formatPhoneE164(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Ensure + prefix
  if (!cleaned.startsWith('+')) {
    // Assume North American if 10 digits
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }

  return cleaned;
}

/**
 * Format cents to dollars string (e.g., 1234 -> "12.34")
 */
export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}
