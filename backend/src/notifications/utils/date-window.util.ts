export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Returns the calendar date string in YYYY-MM-DD for Asia/Colombo time.
 */
export function getColomboDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns a UTC midnight Date object representing the calendar day in Asia/Colombo.
 */
export function getColomboToday(date: Date = new Date()): Date {
  const dateStr = getColomboDateString(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Calculates the integer difference in calendar days (target - reference) in Asia/Colombo timezone.
 */
export function diffColomboDays(targetDate: Date, referenceDate: Date = new Date()): number {
  const targetStr = getColomboDateString(targetDate);
  const refStr = getColomboDateString(referenceDate);

  const [tY, tM, tD] = targetStr.split('-').map(Number);
  const [rY, rM, rD] = refStr.split('-').map(Number);

  const tUtc = Date.UTC(tY, tM - 1, tD);
  const rUtc = Date.UTC(rY, rM - 1, rD);

  return Math.round((tUtc - rUtc) / (1000 * 60 * 60 * 24));
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-LK', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

