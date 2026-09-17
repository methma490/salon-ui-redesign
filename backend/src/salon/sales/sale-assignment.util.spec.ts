import {
  allocateAmounts,
  equalSplitPercentages,
  normalizeSaleAssignments,
} from './sale-assignment.util';
import { calculateCommissionAmount } from '../payroll/payroll-calculation.service';
import { isSaleEligibleForSales } from './sale-eligibility';

describe('sale-assignment.util', () => {
  it('single employee gets 100%', () => {
    expect(equalSplitPercentages(1)).toEqual([100]);
    const result = normalizeSaleAssignments([{ employeeId: 'a' }], 10000);
    expect(result).toHaveLength(1);
    expect(result[0].allocationPercentage).toBe(100);
    expect(result[0].commissionableAmount).toBe(10000);
    expect(result[0].assignmentType).toBe('PRIMARY');
  });

  it('two employees get 50/50', () => {
    expect(equalSplitPercentages(2)).toEqual([50, 50]);
    const result = normalizeSaleAssignments(
      [{ employeeId: 'a' }, { employeeId: 'b' }],
      10000,
    );
    expect(result[0].commissionableAmount).toBe(5000);
    expect(result[1].commissionableAmount).toBe(5000);
    expect(result[1].assignmentType).toBe('ASSISTANT');
  });

  it('three employees split without remainder drift', () => {
    const pcts = equalSplitPercentages(3);
    expect(pcts.reduce((s, p) => s + p, 0)).toBeCloseTo(100, 2);
    const amounts = allocateAmounts(10000, pcts);
    expect(amounts.reduce((s, a) => s + a, 0)).toBe(10000);
  });

  it('accepts 70/30 allocation', () => {
    const result = normalizeSaleAssignments(
      [
        { employeeId: 'a', allocationPercentage: 70 },
        { employeeId: 'b', allocationPercentage: 30, assignmentType: 'ASSISTANT' },
      ],
      10000,
    );
    expect(result[0].commissionableAmount).toBe(7000);
    expect(result[1].commissionableAmount).toBe(3000);
  });

  it('rejects allocations not totaling 100%', () => {
    expect(() =>
      normalizeSaleAssignments(
        [
          { employeeId: 'a', allocationPercentage: 60 },
          { employeeId: 'b', allocationPercentage: 30 },
        ],
        10000,
      ),
    ).toThrow(/100%/);
  });

  it('rejects duplicate employees', () => {
    expect(() =>
      normalizeSaleAssignments(
        [{ employeeId: 'a' }, { employeeId: 'a' }],
        1000,
      ),
    ).toThrow(/Duplicate/);
  });

  it('rejects multiple PRIMARY', () => {
    expect(() =>
      normalizeSaleAssignments(
        [
          { employeeId: 'a', assignmentType: 'PRIMARY', allocationPercentage: 50 },
          { employeeId: 'b', assignmentType: 'PRIMARY', allocationPercentage: 50 },
        ],
        1000,
      ),
    ).toThrow(/PRIMARY/);
  });
});

describe('sale eligibility + commission', () => {
  it('only COMPLETED is eligible', () => {
    expect(isSaleEligibleForSales('COMPLETED')).toBe(true);
    expect(isSaleEligibleForSales('CANCELLED')).toBe(false);
    expect(isSaleEligibleForSales('REFUNDED')).toBe(false);
    expect(isSaleEligibleForSales('PENDING')).toBe(false);
  });

  it('100000 × 40% = 40000', () => {
    expect(calculateCommissionAmount(100000, 40)).toBe(40000);
  });
});
