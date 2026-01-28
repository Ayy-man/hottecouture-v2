/**
 * Centralized deposit and balance calculation utilities
 *
 * This module provides a single source of truth for:
 * - Deposit amount calculation (currently 50%)
 * - Balance due calculation
 * - Payment type metadata encoding/parsing for GHL invoices
 */

export type PaymentType = 'deposit' | 'balance' | 'full';

/**
 * Deposit percentage for custom orders.
 * Change this single value to update the deposit ratio across the entire system.
 */
export const DEPOSIT_PERCENTAGE = 50;

/**
 * Calculate the deposit amount in cents for a given total.
 * Uses Math.ceil to round up fractional cents.
 *
 * @param totalCents - The total order amount in cents
 * @returns The deposit amount in cents (50% of total, rounded up)
 *
 * @example
 * calculateDepositCents(10000) // returns 5000
 * calculateDepositCents(10001) // returns 5001 (rounds up)
 */
export function calculateDepositCents(totalCents: number): number {
  return Math.ceil(totalCents * (DEPOSIT_PERCENTAGE / 100));
}

/**
 * Calculate the balance due after a deposit has been paid.
 *
 * @param totalCents - The total order amount in cents
 * @param depositPaidCents - The deposit amount already paid in cents
 * @returns The remaining balance in cents
 *
 * @example
 * calculateBalanceCents(10000, 5000) // returns 5000
 */
export function calculateBalanceCents(totalCents: number, depositPaidCents: number): number {
  return totalCents - depositPaidCents;
}

/**
 * Parse the payment type from GHL invoice termsNotes metadata.
 * Looks for the pattern [PAYMENT_TYPE:deposit|balance|full]
 *
 * @param termsNotes - The termsNotes field from a GHL invoice
 * @returns The payment type if found, null otherwise
 *
 * @example
 * parsePaymentTypeFromMetadata('Merci!\n[PAYMENT_TYPE:deposit]') // returns 'deposit'
 * parsePaymentTypeFromMetadata('No metadata here') // returns null
 */
export function parsePaymentTypeFromMetadata(
  termsNotes: string | null | undefined
): PaymentType | null {
  if (!termsNotes) return null;
  const match = termsNotes.match(/\[PAYMENT_TYPE:(\w+)\]/);
  if (!match?.[1]) return null;

  const paymentType = match[1].toLowerCase();
  if (paymentType === 'deposit' || paymentType === 'balance' || paymentType === 'full') {
    return paymentType as PaymentType;
  }
  return null;
}

/**
 * Encode payment type metadata into invoice termsNotes.
 * Appends a machine-readable tag that can be parsed by the webhook.
 *
 * @param notes - The human-readable notes for the invoice
 * @param paymentType - The type of payment (deposit, balance, or full)
 * @returns The notes with payment type metadata appended
 *
 * @example
 * encodePaymentTypeMetadata('Merci!', 'deposit')
 * // returns 'Merci!\n[PAYMENT_TYPE:deposit]'
 */
export function encodePaymentTypeMetadata(notes: string, paymentType: PaymentType): string {
  return `${notes}\n[PAYMENT_TYPE:${paymentType}]`;
}
