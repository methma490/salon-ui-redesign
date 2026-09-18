import { sriLankaTodayIso, toDateOnlyString } from '../../common/utils/sri-lanka-time';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type QuotationLineInput = {
  quantity: number;
  quotationUnitPrice: number;
  discountAmount?: number;
};

export function calculateQuotationTotals(
  lines: QuotationLineInput[],
  discountAmount = 0,
  taxAmount = 0,
): {
  lines: Array<{ lineTotal: number; discountAmount: number }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  if (!lines.length) {
    throw new Error('Quotation must include at least one item');
  }

  const computedLines = lines.map((line) => {
    if (!(line.quantity > 0)) {
      throw new Error('Quantity must be greater than 0');
    }
    if (line.quotationUnitPrice < 0) {
      throw new Error('Quotation unit price cannot be negative');
    }
    const discount = roundMoney(line.discountAmount ?? 0);
    if (discount < 0) {
      throw new Error('Line discount cannot be negative');
    }
    const raw = roundMoney(line.quantity * line.quotationUnitPrice);
    const lineTotal = roundMoney(Math.max(0, raw - discount));
    return { lineTotal, discountAmount: discount };
  });

  const subtotal = roundMoney(computedLines.reduce((sum, l) => sum + l.lineTotal, 0));
  const discount = roundMoney(Math.max(0, discountAmount));
  const tax = roundMoney(Math.max(0, taxAmount));
  if (discount > subtotal) {
    throw new Error('Discount cannot exceed subtotal');
  }
  const totalAmount = roundMoney(Math.max(0, subtotal - discount + tax));

  return {
    lines: computedLines,
    subtotal,
    discountAmount: discount,
    taxAmount: tax,
    totalAmount,
  };
}

export function isQuotationExpired(
  status: string,
  validUntil: string | Date | null | undefined,
  today = new Date(),
): boolean {
  if (!validUntil) return false;
  if (!['SENT', 'DRAFT'].includes(status)) return false;
  const todayStr = sriLankaTodayIso(today);
  const validStr = toDateOnlyString(validUntil);
  if (!validStr) return false;
  return validStr < todayStr;
}

export function resolveDisplayStatus(
  status: string,
  validUntil: string | Date | null | undefined,
  today = new Date(),
): string {
  if (isQuotationExpired(status, validUntil, today) && status === 'SENT') {
    return 'EXPIRED';
  }
  return status;
}
