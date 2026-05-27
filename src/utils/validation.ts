/**
 * Validation utilities for PerFin OS form inputs and transaction payloads.
 * All functions throw a descriptive Error on invalid input.
 */
import { ExpenseLocation, ReceiptAttachment, Transaction } from '../models/finance';

/** Maximum supported monetary value to prevent data corruption. */
export const MAX_MONEY_VALUE = 999999999.99;
/** Maximum number of receipt images that can be attached to a single transaction. */
export const MAX_RECEIPTS_PER_TRANSACTION = 5;
/** Maximum allowed file size per receipt upload (5 MB). */
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
/** RegExp for validating live money input while the user types. */
export const MONEY_INPUT_PATTERN = /^\d{0,9}(\.\d{0,2})?$/;
/** Accepted MIME types for receipt image uploads. */
export const SUPPORTED_RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

/**
 * Strips non-numeric characters (except `.`) from a money input string
 * and enforces 9 integer digits + 2 decimal places.
 * Safe to call on every keystroke.
 *
 * @param value - Raw string from the amount TextInput
 */
export const sanitizeMoneyInput = (value: string) => {
  const sanitized = value.replace(/[^\d.]/g, '');
  const [wholeRaw, ...decimalParts] = sanitized.split('.');
  const whole = wholeRaw.slice(0, 9);
  const decimal = decimalParts.join('').slice(0, 2);
  return sanitized.includes('.') ? `${whole}.${decimal}` : whole;
};

/**
 * Parses and validates a money string. Throws a user-friendly Error on failure.
 *
 * @param value - String to parse (from sanitizeMoneyInput)
 * @param field - Field label used in error messages (default 'Amount')
 * @returns Parsed amount rounded to 2 decimal places
 */
export const parseMoney = (value: string, field = 'Amount') => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  if (!MONEY_INPUT_PATTERN.test(normalized)) throw new Error(`${field} must use numbers with up to 2 decimals`);
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${field} must be greater than 0`);
  if (amount > MAX_MONEY_VALUE) throw new Error(`${field} is above the supported limit`);
  return Math.round(amount * 100) / 100;
};

export const validatePositiveAmount = (amount: number, field = 'Amount') => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${field} must be greater than 0`);
  if (amount > MAX_MONEY_VALUE) throw new Error(`${field} is above the supported limit`);
};

export const validateDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    throw new Error('Date must use YYYY-MM-DD format');
  }
};

export const validateLocation = (location?: ExpenseLocation) => {
  if (!location?.name?.trim()) throw new Error('Select a location before saving');
  if (!location.formattedAddress?.trim() && !location.address?.trim()) throw new Error('Location address is required');
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error('Location coordinates are invalid');
  }
};

export const validateReceipt = (receipt: ReceiptAttachment) => {
  if (!SUPPORTED_RECEIPT_MIME_TYPES.includes(receipt.mimeType)) {
    throw new Error('Receipt must be a JPG, PNG, HEIC, or HEIF image');
  }
  if (receipt.sizeBytes > MAX_RECEIPT_BYTES) {
    throw new Error('Each receipt image must be 5 MB or smaller');
  }
};

export const validateReceipts = (receipts: ReceiptAttachment[] = []) => {
  if (receipts.length > MAX_RECEIPTS_PER_TRANSACTION) {
    throw new Error(`Attach up to ${MAX_RECEIPTS_PER_TRANSACTION} receipt images per transaction`);
  }
  receipts.forEach(validateReceipt);
};

export const validateTransactionInput = (
  input: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'updateCount'>
) => {
  validatePositiveAmount(input.amount);
  if (!input.categoryId) throw new Error('Category is required');
  if (!input.date) throw new Error('Date is required');
  validateDate(input.date);
  if (!input.paymentMethod.trim()) throw new Error('Payment method is required');
  if (!input.merchant.trim()) throw new Error(input.type === 'income' ? 'Income source is required' : 'Merchant is required');
  validateLocation(input.location);
  validateReceipts(input.receipts || []);
};
