/**
 * Data consistency (spec §5.18, ADR 0006): every service and the seed run shared data through
 * these functions before saving, so the same value is always stored the same way.
 * The database repeats the most important checks as CHECK constraints.
 */

/** Names of people, organisations, departments, awards, categories: trimmed, single spaces. Case is kept. */
export function normalizeName(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Email addresses: trimmed and lower case. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** PAN, GSTIN and CIN: upper case, spaces and hyphens removed. */
export function normalizeTaxId(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

/** 5 letters, 4 digits, 1 letter. */
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * 2-digit state code, the 10-character PAN, an entity number, "Z", and a check character.
 * The check character's checksum is NOT verified (see docs/ai-notes.md): a wrong checksum rule
 * would reject genuine organisations.
 */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidPan(pan: string): boolean {
  return PAN_PATTERN.test(pan);
}

export function isValidGstin(gstin: string): boolean {
  return GSTIN_PATTERN.test(gstin);
}

/** Characters 3 to 12 of a GSTIN are the PAN (spec §5.2). */
export function gstinMatchesPan(gstin: string, pan: string): boolean {
  return gstin.slice(2, 12) === pan;
}

/** The first two digits of a GSTIN: the GST state code. */
export function gstinStateCode(gstin: string): string {
  return gstin.slice(0, 2);
}

/**
 * Indian phone numbers, stored as "+91" and 10 digits. Accepts "+91 98765 43210",
 * "098765 43210", "9876543210" or "022-2345 6789". Returns null if it isn't 10 digits.
 */
export function normalizePhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return /^[1-9][0-9]{9}$/.test(digits) ? `+91${digits}` : null;
}

/** PIN codes: exactly 6 digits, never starting with 0. Returns null if invalid. */
export function normalizePincode(value: string): string | null {
  const digits = value.replace(/\s/g, "");
  return /^[1-9][0-9]{5}$/.test(digits) ? digits : null;
}
