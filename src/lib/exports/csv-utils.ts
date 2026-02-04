/**
 * CSV Export Utilities
 *
 * Shared functions for generating and downloading CSV files.
 */

/**
 * Escapes a cell value for CSV format.
 * - Handles null/undefined
 * - Wraps in double quotes if contains comma, quote, or newline
 * - Doubles internal double quotes
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if value needs escaping (contains comma, double quote, or newline)
  const needsEscaping =
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r');

  if (needsEscaping) {
    // Double any existing double quotes and wrap in double quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generates a CSV string from headers and row data.
 * @param headers - Array of column header strings
 * @param rows - 2D array of cell values (each inner array is a row)
 * @returns Complete CSV string with headers and data
 */
export function generateCsv(headers: string[], rows: unknown[][]): string {
  // Escape headers
  const headerLine = headers.map(escapeCsvCell).join(',');

  // Escape and join each row
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','));

  // Combine headers and data with newlines
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Triggers a browser download of CSV content.
 * Creates a Blob, generates object URL, clicks hidden anchor, and cleans up.
 *
 * Note: This function only works in browser environment.
 * @param csvContent - The CSV string content to download
 * @param filename - The filename for the downloaded file
 */
export function triggerDownload(csvContent: string, filename: string): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('triggerDownload can only be called in a browser environment');
    return;
  }

  // Create Blob with UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // Create object URL
  const url = URL.createObjectURL(blob);

  // Create hidden anchor element
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Append, click, and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke object URL to free memory
  URL.revokeObjectURL(url);
}

/**
 * Formats minutes into a human-readable time string.
 * @param minutes - Number of minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes === 0) {
    return '-';
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Formats cents to a dollar string.
 * @param cents - Amount in cents
 * @returns Formatted string like "$25.00"
 */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '-';
  }

  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Sanitizes a string for use in a filename.
 * Replaces non-alphanumeric characters with underscores.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}
