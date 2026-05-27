/**
 * Formats a number as a currency string without decimal places.
 * Safe for zero/non-finite values (renders as $0).
 *
 * @param value - Numeric amount
 * @param currency - ISO 4217 currency code (default 'USD')
 */
export const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

/**
 * Formats a number as a currency string with exactly 2 decimal places.
 * Use for transaction amounts where precision matters.
 *
 * @param value - Numeric amount
 * @param currency - ISO 4217 currency code (default 'USD')
 */
export const formatCurrencyPrecise = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

/**
 * Returns a YYYY-MM month key for the given date (defaults to now).
 * Used as the primary grouping key for transactions, budgets, and reports.
 *
 * @param date - Date to derive the key from (default: current date)
 */
export const getMonthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * Converts a YYYY-MM month key into a human-readable string (e.g. "May 2026").
 *
 * @param monthKey - Month in YYYY-MM format
 */
export const readableMonth = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  );
};

/** Returns today's date as an ISO-8601 date string (YYYY-MM-DD). */
export const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Clamps a number to the [min, max] range.
 *
 * @param value - Input value
 * @param min - Lower bound (default 0)
 * @param max - Upper bound (default 100)
 */
export const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));
