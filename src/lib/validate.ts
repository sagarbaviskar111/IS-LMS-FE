// Client-side mirror of Backend/utils/validators.js, for instant feedback.
// The server re-checks everything — this only saves a round trip.

export function normalizePhone(raw: string): string | null {
  let s = raw.trim().replace(/[\s\-().]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  if (s.startsWith("+")) {
    if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
    if (s.startsWith("+91")) return /^\+91[6-9]\d{9}$/.test(s) ? s.slice(3) : null;
    return s;
  }

  if (!/^\d+$/.test(s)) return null;
  if (s.length === 12 && s.startsWith("91")) s = s.slice(2);
  else if (s.length === 11 && s.startsWith("0")) s = s.slice(1);
  return /^[6-9]\d{9}$/.test(s) ? s : null;
}

export function normalizeEmail(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s || s.length > 254 || s.includes("..")) return null;
  return /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(s) ? s : null;
}

export function normalizeName(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, " ");
  return /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,99}$/u.test(s) ? s : null;
}

export function normalizeNamePart(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, " ");
  return /^[\p{L}\p{M}][\p{L}\p{M} .'-]{0,49}$/u.test(s) ? s : null;
}

export const PHONE_ERROR = "Enter a valid 10-digit mobile number (or a full number with country code, like +14155552671)";
export const EMAIL_ERROR = "Enter a valid email address, like name@example.com";
export const NAME_ERROR = "Enter a valid name (letters only, at least 2 characters)";
export const FIRST_NAME_ERROR = "Enter your first name (letters only)";
export const LAST_NAME_ERROR = "Enter your last name (letters only)";
