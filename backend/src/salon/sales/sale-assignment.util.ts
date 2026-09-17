import { BadRequestException } from '@nestjs/common';
import {
  calculateCommissionAmount,
  roundMoney,
} from '../payroll/payroll-calculation.service';

export type SaleAssignmentType = 'PRIMARY' | 'ASSISTANT';

export interface SaleEmployeeAssignmentInput {
  employeeId: string;
  assignmentType?: SaleAssignmentType;
  allocationPercentage?: number;
}

export interface NormalizedSaleAssignment {
  employeeId: string;
  assignmentType: SaleAssignmentType;
  allocationPercentage: number;
  commissionableAmount: number;
}

const ALLOCATION_TOLERANCE = 0.01;

export { calculateCommissionAmount };

/** Equal split percentages that always sum to exactly 100. */
export function equalSplitPercentages(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];

  const base = Math.floor(10000 / count) / 100;
  const parts = Array.from({ length: count }, () => base);
  const sumExceptLast = roundMoney(base * (count - 1));
  parts[count - 1] = roundMoney(100 - sumExceptLast);
  return parts;
}

/** Split a money total by percentages; last amount absorbs rounding remainder. */
export function allocateAmounts(total: number, percentages: number[]): number[] {
  if (percentages.length === 0) return [];
  if (percentages.length === 1) return [roundMoney(total)];

  const amounts: number[] = [];
  let allocated = 0;
  for (let i = 0; i < percentages.length - 1; i++) {
    const amount = roundMoney((total * percentages[i]) / 100);
    amounts.push(amount);
    allocated = roundMoney(allocated + amount);
  }
  amounts.push(roundMoney(total - allocated));
  return amounts;
}

/**
 * Normalize & validate sale employee assignments.
 * - Unique employees
 * - Exactly one PRIMARY (defaults first to PRIMARY)
 * - Allocations sum to 100%
 * - Equal split suggested when percentages omitted
 */
export function normalizeSaleAssignments(
  inputs: SaleEmployeeAssignmentInput[],
  netSaleTotal: number,
): NormalizedSaleAssignment[] {
  if (!inputs.length) {
    throw new BadRequestException('At least one employee must be assigned to the sale');
  }

  const seen = new Set<string>();
  for (const input of inputs) {
    if (seen.has(input.employeeId)) {
      throw new BadRequestException('Duplicate employee assignment on sale');
    }
    seen.add(input.employeeId);
  }

  const equal = equalSplitPercentages(inputs.length);
  const hasAnyPct = inputs.some(
    (i) => i.allocationPercentage !== undefined && i.allocationPercentage !== null,
  );

  const percentages = inputs.map((input, index) => {
    if (hasAnyPct) {
      if (input.allocationPercentage === undefined || input.allocationPercentage === null) {
        throw new BadRequestException(
          'All employees must have an allocation percentage when any is provided',
        );
      }
      return Number(input.allocationPercentage);
    }
    return equal[index];
  });

  for (const pct of percentages) {
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new BadRequestException('Allocation percentage must be between 0 and 100');
    }
  }

  const pctSum = roundMoney(percentages.reduce((sum, p) => sum + p, 0));
  if (Math.abs(pctSum - 100) > ALLOCATION_TOLERANCE) {
    throw new BadRequestException(
      `Total allocation must equal 100% (currently ${pctSum}%)`,
    );
  }

  let primaryCount = 0;
  const withTypes = inputs.map((input, index) => {
    let assignmentType: SaleAssignmentType =
      input.assignmentType === 'ASSISTANT' ? 'ASSISTANT' : 'PRIMARY';
    if (input.assignmentType === undefined || input.assignmentType === null) {
      assignmentType = index === 0 ? 'PRIMARY' : 'ASSISTANT';
    }
    if (assignmentType === 'PRIMARY') primaryCount += 1;
    return { ...input, assignmentType };
  });

  if (primaryCount === 0) {
    withTypes[0].assignmentType = 'PRIMARY';
    primaryCount = 1;
  }
  if (primaryCount > 1) {
    throw new BadRequestException('Only one PRIMARY employee is allowed per sale');
  }

  const amounts = allocateAmounts(Math.max(0, netSaleTotal), percentages);

  return withTypes.map((input, index) => ({
    employeeId: input.employeeId,
    assignmentType: input.assignmentType,
    allocationPercentage: percentages[index],
    commissionableAmount: amounts[index],
  }));
}
