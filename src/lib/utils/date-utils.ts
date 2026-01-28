/**
 * Date utility functions for business day calculations
 */

/**
 * Add business days to a given date, excluding weekends (Saturday and Sunday)
 * @param startDate - The starting date
 * @param businessDays - Number of business days to add
 * @returns The calculated end date
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  if (businessDays <= 0) {
    return new Date(startDate);
  }

  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);

    // Check if the day is not a weekend (Saturday = 6, Sunday = 0)
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * Calculate the number of business days between two dates
 * @param startDate - The starting date
 * @param endDate - The ending date
 * @returns Number of business days between the dates
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return 0;
  }

  let businessDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return businessDays;
}

/**
 * Check if a given date is a business day (not weekend)
 * @param date - The date to check
 * @returns True if it's a business day, false otherwise
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6;
}

/**
 * Get the next business day from a given date
 * @param date - The starting date
 * @returns The next business day
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);

  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Format a date for display in the UI
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateForDisplay(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Get a default due date (10 business days from today)
 * @returns Date object representing 10 business days from today
 */
export function getDefaultDueDate(): Date {
  return addBusinessDays(new Date(), 10);
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}
