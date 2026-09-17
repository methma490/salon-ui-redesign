import {
  calculateCommissionAmount,
  calculateLoanDeductionAmount,
  calculatePayrollLine,
  roundMoney,
} from './payroll-calculation.service';

describe('payroll-calculation.service', () => {
  const rates = {
    employeeEpfRate: 8,
    employerEpfRate: 12,
    employerEtfRate: 3,
  };

  it('calculates commission including 0%', () => {
    expect(calculateCommissionAmount(120000, 5)).toBe(6000);
    expect(calculateCommissionAmount(120000, 0)).toBe(0);
  });

  it('monthly service sales Rs.100,000 × 40% = Rs.40,000', () => {
    expect(calculateCommissionAmount(100000, 40)).toBe(40000);
  });

  it('splits salary advances from loan installments', () => {
    const result = calculatePayrollLine({
      basicSalary: 25000,
      commissionPercentage: 40,
      commissionBase: 100000,
      bonus: 5000,
      otherDeduction: 0,
      epfEnabled: true,
      etfEnabled: true,
      rates,
      activeLoans: [
        { id: 'loan-1', remainingBalance: 120000, monthlyInstallment: 3000, source: 'loan' },
        { id: 'adv-1', remainingBalance: 5000, monthlyInstallment: 5000, source: 'advance' },
      ],
    });

    expect(result.commissionAmount).toBe(40000);
    expect(result.grossSalary).toBe(70000);
    expect(result.employeeEpf).toBe(2000);
    expect(result.loanDeduction).toBe(3000);
    expect(result.advanceDeduction).toBe(5000);
    expect(result.totalDeductions).toBe(10000);
    expect(result.netSalary).toBe(60000);
  });

  it('caps loan deduction at remaining balance', () => {
    expect(calculateLoanDeductionAmount(3000, 5000)).toBe(3000);
    expect(calculateLoanDeductionAmount(50000, 5000)).toBe(5000);
  });

  it('computes net salary and employer contributions separately', () => {
    const result = calculatePayrollLine({
      basicSalary: 60000,
      commissionPercentage: 5,
      commissionBase: 120000,
      bonus: 0,
      otherDeduction: 0,
      epfEnabled: true,
      etfEnabled: true,
      rates,
      activeLoans: [{ id: 'loan-1', remainingBalance: 50000, monthlyInstallment: 5000 }],
    });

    expect(result.commissionAmount).toBe(6000);
    expect(result.grossSalary).toBe(66000);
    expect(result.employeeEpf).toBe(4800);
    expect(result.employerEpf).toBe(7200);
    expect(result.employerEtf).toBe(1800);
    expect(result.loanDeduction).toBe(5000);
    expect(result.totalDeductions).toBe(9800);
    expect(result.netSalary).toBe(56200);
    expect(result.loanDeductions[0].balanceAfter).toBe(45000);
  });

  it('skips EPF/ETF when disabled', () => {
    const result = calculatePayrollLine({
      basicSalary: 60000,
      commissionPercentage: 0,
      commissionBase: 0,
      bonus: 1000,
      otherDeduction: 500,
      epfEnabled: false,
      etfEnabled: false,
      rates,
      activeLoans: [],
    });

    expect(result.employeeEpf).toBe(0);
    expect(result.employerEpf).toBe(0);
    expect(result.employerEtf).toBe(0);
    expect(result.grossSalary).toBe(61000);
    expect(result.netSalary).toBe(60500);
  });

  it('rounds money to 2 decimals', () => {
    expect(roundMoney(10.005)).toBe(10.01);
  });
});
