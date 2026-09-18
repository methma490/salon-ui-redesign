/** Number-only money for table/list cells (currency belongs in the column header). */
export function formatMoneyAmount(
  value: number | string | null | undefined,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const n = Number(value ?? 0);
  const min = options?.minimumFractionDigits ?? 0;
  const max = options?.maximumFractionDigits ?? 2;
  return n.toLocaleString('en-LK', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

/** Standalone display with currency — cards, totals, detail summaries, messages. */
export function formatMoneyLkr(
  value: number | string | null | undefined,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  return `LKR ${formatMoneyAmount(value, options)}`;
}

/** Column / form label helper: `Amount (LKR)`. */
export function moneyHeader(label: string, currency = 'LKR'): string {
  return `${label} (${currency})`;
}
