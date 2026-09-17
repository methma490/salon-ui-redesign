import {
  derivePaymentStatus,
  resolveCreditPaymentUpdate,
  resolveStockInPayment,
  roundMoney,
} from './stock-receipt-money';

describe('stock-receipt-money', () => {
  describe('roundMoney', () => {
    it('rounds to 2 decimals', () => {
      expect(roundMoney(10.005)).toBe(10.01);
      expect(roundMoney(19.999)).toBe(20);
    });
  });

  describe('resolveStockInPayment', () => {
    it('handles PAID', () => {
      const result = resolveStockInPayment({
        quantity: 10,
        unitCost: 2000,
        paymentType: 'PAID',
      });
      expect(result).toEqual({
        lineTotal: 20000,
        totalAmount: 20000,
        paidAmount: 20000,
        outstandingAmount: 0,
        paymentStatus: 'PAID',
      });
    });

    it('handles CREDIT and still computes total for stock receipt', () => {
      const result = resolveStockInPayment({
        quantity: 10,
        unitCost: 2000,
        paymentType: 'CREDIT',
      });
      expect(result).toEqual({
        lineTotal: 20000,
        totalAmount: 20000,
        paidAmount: 0,
        outstandingAmount: 20000,
        paymentStatus: 'UNPAID',
      });
    });

    it('handles PARTIAL', () => {
      const result = resolveStockInPayment({
        quantity: 10,
        unitCost: 2000,
        paymentType: 'PARTIAL',
        paidAmount: 5000,
      });
      expect(result).toEqual({
        lineTotal: 20000,
        totalAmount: 20000,
        paidAmount: 5000,
        outstandingAmount: 15000,
        paymentStatus: 'PARTIALLY_PAID',
      });
    });

    it('rejects paid amount exceeding total', () => {
      expect(() =>
        resolveStockInPayment({
          quantity: 1,
          unitCost: 100,
          paymentType: 'PARTIAL',
          paidAmount: 150,
        }),
      ).toThrow(/less than total|exceed/i);
    });

    it('rejects quantity <= 0', () => {
      expect(() =>
        resolveStockInPayment({
          quantity: 0,
          unitCost: 100,
          paymentType: 'PAID',
        }),
      ).toThrow(/Quantity/);
    });
  });

  describe('resolveCreditPaymentUpdate', () => {
    it('reduces outstanding without touching stock math', () => {
      const mid = resolveCreditPaymentUpdate({
        totalAmount: 20000,
        currentPaidAmount: 5000,
        paymentAmount: 5000,
      });
      expect(mid).toEqual({
        paidAmount: 10000,
        outstandingAmount: 10000,
        paymentStatus: 'PARTIALLY_PAID',
      });

      const final = resolveCreditPaymentUpdate({
        totalAmount: 20000,
        currentPaidAmount: 10000,
        paymentAmount: 10000,
      });
      expect(final).toEqual({
        paidAmount: 20000,
        outstandingAmount: 0,
        paymentStatus: 'PAID',
      });
    });

    it('rejects payment above outstanding', () => {
      expect(() =>
        resolveCreditPaymentUpdate({
          totalAmount: 20000,
          currentPaidAmount: 15000,
          paymentAmount: 6000,
        }),
      ).toThrow(/outstanding/i);
    });
  });

  describe('derivePaymentStatus', () => {
    it('maps amounts to status', () => {
      expect(derivePaymentStatus(100, 0)).toBe('UNPAID');
      expect(derivePaymentStatus(100, 40)).toBe('PARTIALLY_PAID');
      expect(derivePaymentStatus(100, 100)).toBe('PAID');
    });
  });
});
