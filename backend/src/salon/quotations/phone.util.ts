/**
 * Normalize phone numbers for messaging (Sri Lanka–aware, international-safe).
 */
export function normalizePhoneE164(
  input: string,
  defaultCountryCode = '94',
): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Keep digits and leading +
  let raw = trimmed.replace(/[^\d+]/g, '');
  if (raw.startsWith('00')) {
    raw = `+${raw.slice(2)}`;
  }

  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Local Sri Lanka: 07XXXXXXXX → +947XXXXXXXX
  if (defaultCountryCode === '94') {
    if (digits.length === 10 && digits.startsWith('0')) {
      return `+94${digits.slice(1)}`;
    }
    if (digits.length === 9 && digits.startsWith('7')) {
      return `+94${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('94')) {
      return `+${digits}`;
    }
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

/** Digits only for wa.me links (no +). */
export function phoneDigitsForWhatsApp(input: string): string | null {
  const e164 = normalizePhoneE164(input);
  if (!e164) return null;
  return e164.replace(/\D/g, '');
}
