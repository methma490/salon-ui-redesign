/** Sri Lanka Standard Time — use for all user-facing dates/times. */
export const SRI_LANKA_TZ = 'Asia/Colombo';
export const SRI_LANKA_LOCALE = 'en-LK';

function toDate(value: string | Date | number | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
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

/** Display date: 18 Sep 2026 */
export function formatSriLankaDate(value: string | Date | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  // Date-only strings (YYYY-MM-DD) — anchor at noon Colombo to avoid day shift
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00+05:30`).toLocaleDateString(SRI_LANKA_LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: SRI_LANKA_TZ,
    });
  }
  return d.toLocaleDateString(SRI_LANKA_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: SRI_LANKA_TZ,
  });
}

/** Display date+time in Sri Lanka: 18 Sep 2026, 04:14 pm */
export function formatSriLankaDateTime(value: string | Date | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString(SRI_LANKA_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: SRI_LANKA_TZ,
  });
}
