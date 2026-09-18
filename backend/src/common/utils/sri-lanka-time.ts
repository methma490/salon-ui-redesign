/** Sri Lanka Standard Time helpers for backend date logic. */
export const SRI_LANKA_TZ = 'Asia/Colombo';

/** Today's calendar date in Sri Lanka as YYYY-MM-DD. */
export function sriLankaTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Format a calendar or instant date for display in Sri Lanka. */
export function formatSriLankaDate(value: Date | string | null | undefined): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return new Date(`${value.trim()}T12:00:00+05:30`).toLocaleDateString('en-LK', {
      timeZone: SRI_LANKA_TZ,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-LK', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format an instant for display in Sri Lanka time. */
export function formatSriLankaDateTime(value: Date | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-LK', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Normalize a date-only input to YYYY-MM-DD without UTC shift. */
export function toDateOnlyString(value: string | Date | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return sriLankaTodayIso(d);
}
