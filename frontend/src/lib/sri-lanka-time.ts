/** Sri Lanka Standard Time — accurate helpers for all user-facing dates and times. */
export const SRI_LANKA_TZ = 'Asia/Colombo';
export const SRI_LANKA_LOCALE = 'en-LK';

/**
 * Normalizes input date/time values (strings, Dates, numbers)
 * without corrupting local timestamps.
 */
export function parseSriLankaDate(value: string | Date | number | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  let str = String(value).trim();
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Calendar date in Sri Lanka (YYYY-MM-DD). */
export function sriLankaTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Display date: Sep 29, 2026 */
export function formatSriLankaDate(value: string | Date | number | null | undefined): string {
  const d = parseSriLankaDate(value);
  if (!d) return '—';
  return d.toLocaleDateString(SRI_LANKA_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Display time in Sri Lanka: 9:05 AM */
export function formatSriLankaTime(value: string | Date | number | null | undefined): string {
  const d = parseSriLankaDate(value);
  if (!d) return '';
  return d.toLocaleTimeString(SRI_LANKA_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
}

/** Display date + time in Sri Lanka: Sep 29, 2026 · 9:05 AM */
export function formatSriLankaDateTime(value: string | Date | number | null | undefined): string {
  const d = parseSriLankaDate(value);
  if (!d) return '—';
  const dateStr = d.toLocaleDateString(SRI_LANKA_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const timeStr = d.toLocaleTimeString(SRI_LANKA_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
  return `${dateStr} · ${timeStr}`;
}
