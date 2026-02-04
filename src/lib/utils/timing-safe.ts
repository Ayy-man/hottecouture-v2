import { timingSafeEqual } from 'crypto';

/**
 * Compares two strings in constant time to prevent timing attacks.
 *
 * Timing attacks can reveal secret length and content by measuring
 * how long string comparison takes. This function always takes the
 * same amount of time regardless of where strings differ.
 *
 * @param a - First string to compare
 * @param b - Second string to compare (typically the secret)
 * @returns true if strings are equal, false otherwise
 */
export function safeCompare(a: string | undefined | null, b: string | undefined | null): boolean {
  // Handle null/undefined cases without timing leak
  if (!a || !b) {
    return false;
  }

  // Strings of different lengths would leak timing info,
  // so we pad the shorter one (but still return false)
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  // If lengths differ, pad the shorter one but still return false
  if (aBuffer.length !== bBuffer.length) {
    // Create buffers of equal length to avoid timing leak
    const maxLength = Math.max(aBuffer.length, bBuffer.length);
    const paddedA = Buffer.alloc(maxLength);
    const paddedB = Buffer.alloc(maxLength);
    aBuffer.copy(paddedA);
    bBuffer.copy(paddedB);

    // Compare padded buffers (will return false but in constant time)
    timingSafeEqual(paddedA, paddedB);
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Validates a Bearer token from Authorization header against expected secret.
 *
 * @param authHeader - The Authorization header value (e.g., "Bearer secret123")
 * @param expectedSecret - The expected secret value
 * @returns true if valid, false otherwise
 */
export function validateBearerToken(
  authHeader: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!authHeader || !expectedSecret) {
    return false;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return safeCompare(token, expectedSecret);
}

/**
 * Validates a webhook secret from a custom header.
 *
 * @param headerValue - The header value containing the secret
 * @param expectedSecret - The expected secret value
 * @returns true if valid, false otherwise
 */
export function validateWebhookSecret(
  headerValue: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!headerValue || !expectedSecret) {
    return false;
  }

  return safeCompare(headerValue, expectedSecret);
}
