/** Money helpers and payroll formulas (backend source of truth). */

export interface PayrollRates {
  employeeEpfRate: number;
  employerEpfRate: number;
  employerEtfRate: number;
}

export type PayrollDeductionSource = 'loan' | 'advance';

export interface LoanDeductionInput {
  id: string;
  remainingBalance: number;
  monthlyInstallment: number;
  source?: PayrollDeductionSource;
}

export interface LoanDeductionResult {
  loanId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  source: PayrollDeductionSource;
}

export interface PayrollLineInput {
  basicSalary: number;
  commissionPercentage: number;
  commissionBase: number;
  bonus: number;
  otherDeduction: number;
  epfEnabled: boolean;
  etfEnabled: boolean;
  rates: PayrollRates;
  activeLoans: LoanDeductionInput[];
}

export interface PayrollLineResult {
  basicSalary: number;
  commissionPercentage: number;
  commissionBase: number;
  commissionAmount: number;
  bonus: number;
  grossSalary: number;
  employeeEpf: number;
  employerEpf: number;
  employerEtf: number;
  /** Personal/other loan installments only (excludes salary advances). */
  loanDeduction: number;
  /** Salary advance recovery for this payroll period. */
  advanceDeduction: number;
  loanDeductions: LoanDeductionResult[];
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateCommissionAmount(
  commissionBase: number,
  commissionPercentage: number,
): number {
  return roundMoney((Math.max(0, commissionBase) * Math.max(0, commissionPercentage)) / 100);
}

export function calculateLoanDeductionAmount(
  remainingBalance: number,
  monthlyInstallment: number,
): number {
  const balance = Math.max(0, remainingBalance);
  const installment = Math.max(0, monthlyInstallment);
  return roundMoney(Math.min(balance, installment));
}

/**
 * Contribution base = basic salary (snapshot).
 * Employer EPF/ETF are recorded but never deducted from employee net.
 */
export function calculatePayrollLine(input: PayrollLineInput): PayrollLineResult {
  const basicSalary = roundMoney(Math.max(0, input.basicSalary));
  const commissionPercentage = Math.max(0, input.commissionPercentage);
  const commissionBase = roundMoney(Math.max(0, input.commissionBase));
  const bonus = roundMoney(Math.max(0, input.bonus));
  const otherDeduction = roundMoney(Math.max(0, input.otherDeduction));

  const commissionAmount = calculateCommissionAmount(commissionBase, commissionPercentage);
  const grossSalary = roundMoney(basicSalary + commissionAmount + bonus);

  const contributionBase = basicSalary;
  const employeeEpf = input.epfEnabled
    ? roundMoney((contributionBase * Math.max(0, input.rates.employeeEpfRate)) / 100)
    : 0;
  const employerEpf = input.epfEnabled
    ? roundMoney((contributionBase * Math.max(0, input.rates.employerEpfRate)) / 100)
    : 0;
  const employerEtf = input.etfEnabled
    ? roundMoney((contributionBase * Math.max(0, input.rates.employerEtfRate)) / 100)
    : 0;

  let remainingAdvanceCap = basicSalary > 0 ? basicSalary : Infinity;

  const loanDeductions: LoanDeductionResult[] = [...input.activeLoans]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((loan) => {
      let amount = calculateLoanDeductionAmount(loan.remainingBalance, loan.monthlyInstallment);
      if (loan.source === 'advance') {
        amount = Math.min(amount, remainingAdvanceCap);
        remainingAdvanceCap = Math.max(0, remainingAdvanceCap - amount);
      }
      return {
        loanId: loan.id,
        amount,
        balanceBefore: roundMoney(loan.remainingBalance),
        balanceAfter: roundMoney(Math.max(0, loan.remainingBalance - amount)),
        source: loan.source === 'advance' ? ('advance' as const) : ('loan' as const),
      };
    })
    .filter((entry) => entry.amount > 0);

  const loanDeduction = roundMoney(
    loanDeductions
      .filter((entry) => entry.source === 'loan')
      .reduce((sum, entry) => sum + entry.amount, 0),
  );
  const advanceDeduction = roundMoney(
    loanDeductions
      .filter((entry) => entry.source === 'advance')
      .reduce((sum, entry) => sum + entry.amount, 0),
  );

  const totalDeductions = roundMoney(
    employeeEpf + loanDeduction + advanceDeduction + otherDeduction,
  );
  const netSalary = roundMoney(Math.max(0, grossSalary - totalDeductions));

  return {
    basicSalary,
    commissionPercentage,
    commissionBase,
    commissionAmount,
    bonus,
    grossSalary,
    employeeEpf,
    employerEpf,
    employerEtf,
    loanDeduction,
    advanceDeduction,
    loanDeductions,
    otherDeduction,
    totalDeductions,
    netSalary,
  };
}
