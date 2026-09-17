export type StockPaymentType = 'PAID' | 'PARTIAL' | 'CREDIT';
export type StockReceiptPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

/** Round to 2 decimal places for money amounts. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function derivePaymentStatus(
  totalAmount: number,
  paidAmount: number,
): StockReceiptPaymentStatus {
  const total = roundMoney(totalAmount);
  const paid = roundMoney(paidAmount);
  if (total <= 0 || paid >= total) return 'PAID';
  if (paid <= 0) return 'UNPAID';
  return 'PARTIALLY_PAID';
}

export function resolveStockInPayment(input: {
  quantity: number;
  unitCost: number;
  paymentType: StockPaymentType;
  paidAmount?: number;
}): {
  lineTotal: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: StockReceiptPaymentStatus;
} {
  if (!(input.quantity > 0)) {
    throw new Error('Quantity must be greater than 0');
  }
  if (input.unitCost < 0) {
    throw new Error('Unit cost cannot be negative');
  }

  const lineTotal = roundMoney(input.quantity * input.unitCost);
  const totalAmount = lineTotal;
  let paidAmount = 0;

  if (input.paymentType === 'PAID') {
    paidAmount = totalAmount;
  } else if (input.paymentType === 'CREDIT') {
    paidAmount = 0;
  } else {
    if (input.paidAmount === undefined || Number.isNaN(input.paidAmount)) {
      throw new Error('Paid amount is required for partial payment');
    }
    paidAmount = roundMoney(input.paidAmount);
    if (paidAmount <= 0 || paidAmount >= totalAmount) {
      throw new Error('Partial paid amount must be greater than 0 and less than total');
    }
  }

  if (paidAmount < 0) {
    throw new Error('Paid amount cannot be negative');
  }
  if (paidAmount > totalAmount) {
    throw new Error('Paid amount cannot exceed total amount');
  }

  const outstandingAmount = roundMoney(totalAmount - paidAmount);
  return {
    lineTotal,
    totalAmount,
    paidAmount,
    outstandingAmount,
    paymentStatus: derivePaymentStatus(totalAmount, paidAmount),
  };
}

export function resolveCreditPaymentUpdate(input: {
  totalAmount: number;
  currentPaidAmount: number;
  paymentAmount: number;
}): {
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: StockReceiptPaymentStatus;
} {
  const total = roundMoney(input.totalAmount);
  const currentPaid = roundMoney(input.currentPaidAmount);
  const payment = roundMoney(input.paymentAmount);
  const outstanding = roundMoney(total - currentPaid);

  if (!(payment > 0)) {
    throw new Error('Payment amount must be greater than 0');
  }
  if (payment > outstanding) {
    throw new Error('Payment amount cannot exceed outstanding balance');
  }

  const paidAmount = roundMoney(currentPaid + payment);
  const outstandingAmount = roundMoney(total - paidAmount);
  return {
    paidAmount,
    outstandingAmount,
    paymentStatus: derivePaymentStatus(total, paidAmount),
  };
}
