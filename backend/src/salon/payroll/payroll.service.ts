import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { SalesAnalyticsService } from '../sales-analytics/sales-analytics.service';
import { logAudit } from '../utils/audit.util';
import { calculatePayrollLine, PayrollRates, roundMoney } from './payroll-calculation.service';
import {
  CreateEmployeeAdvanceDto,
  CreateEmployeeLoanDto,
  CreatePayrollRunDto,
  ListEmployeeAdvancesQueryDto,
  ListEmployeeLoansQueryDto,
  ListPayrollRunsQueryDto,
  ListPayslipsQueryDto,
  UpdateEmployeeAdvanceDto,
  UpdateEmployeeLoanDto,
  UpdatePayrollItemDto,
  UpdatePayrollSettingsDto,
} from './dto/payroll.dto';

type TenantTx = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

export interface PayrollSettingsRecord {
  id: string;
  employeeEpfRate: number;
  employerEpfRate: number;
  employerEtfRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeLoanRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  loanType: string;
  originalAmount: number;
  remainingBalance: number;
  monthlyInstallment: number;
  startDate: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeAdvanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  originalAmount: number;
  remainingBalance: number;
  monthlyInstallment: number;
  startDate: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanRepaymentRecord {
  id: string;
  loanId: string;
  payrollItemId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paidAt: Date;
  payrollYear: number | null;
  payrollMonth: number | null;
}

export interface AdvanceRepaymentRecord {
  id: string;
  advanceId: string;
  payrollItemId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paidAt: Date;
  payrollYear: number | null;
  payrollMonth: number | null;
}

type DeductionSource = 'loan' | 'advance';

interface ActivePayrollDeduction {
  id: string;
  remainingBalance: number;
  monthlyInstallment: number;
  source: DeductionSource;
}

export interface PayrollItemRecord {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
  basicSalary: number;
  commissionPercentage: number;
  commissionBase: number;
  commissionAmount: number;
  bonus: number;
  grossSalary: number;
  employeeEpf: number;
  employerEpf: number;
  employerEtf: number;
  loanDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
  commissionInvoiceCount: number;
  commissionPeriodFrom: string | null;
  commissionPeriodTo: string | null;
  epfEnabled: boolean;
  etfEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollRunRecord {
  id: string;
  year: number;
  month: number;
  status: string;
  totalBasic: number;
  totalCommission: number;
  totalBonus: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdBy: string;
  createdByName: string | null;
  finalizedBy: string | null;
  finalizedByName: string | null;
  createdAt: Date;
  finalizedAt: Date | null;
  paidAt: Date | null;
  items?: PayrollItemRecord[];
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly salesAnalyticsService: SalesAnalyticsService,
  ) {}

  // ── Settings ──────────────────────────────────────────────────────────────

  async getSettings(schemaName: string): Promise<PayrollSettingsRecord> {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      this.ensureSettings(tx, schemaName),
    );
  }

  async updateSettings(
    schemaName: string,
    dto: UpdatePayrollSettingsDto,
    userId: string,
  ): Promise<PayrollSettingsRecord> {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const current = await this.ensureSettings(tx, schemaName);
      const settings = tenantTable(schemaName, 'payroll_settings');

      const rows = (await tx.$queryRawUnsafe(
        `UPDATE ${settings}
         SET employee_epf_rate = COALESCE($2::numeric, employee_epf_rate),
             employer_epf_rate = COALESCE($3::numeric, employer_epf_rate),
             employer_etf_rate = COALESCE($4::numeric, employer_etf_rate)
         WHERE id = $1::uuid
         RETURNING id,
                   employee_epf_rate::float AS "employeeEpfRate",
                   employer_epf_rate::float AS "employerEpfRate",
                   employer_etf_rate::float AS "employerEtfRate",
                   created_at AS "createdAt",
                   updated_at AS "updatedAt"`,
        current.id,
        dto.employeeEpfRate ?? null,
        dto.employerEpfRate ?? null,
        dto.employerEtfRate ?? null,
      )) as PayrollSettingsRecord[];

      await logAudit(tx, schemaName, {
        userId,
        action: 'PAYROLL_SETTINGS_UPDATE',
        entityType: 'payroll_settings',
        entityId: current.id,
        details: dto as unknown as Record<string, unknown>,
      });

      return rows[0];
    });
  }

  private async ensureSettings(tx: TenantTx, schemaName: string): Promise<PayrollSettingsRecord> {
    const settings = tenantTable(schemaName, 'payroll_settings');
    const existing = (await tx.$queryRawUnsafe(
      `SELECT id,
              employee_epf_rate::float AS "employeeEpfRate",
              employer_epf_rate::float AS "employerEpfRate",
              employer_etf_rate::float AS "employerEtfRate",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM ${settings}
       ORDER BY created_at ASC
       LIMIT 1`,
    )) as PayrollSettingsRecord[];

    if (existing[0]) {
      return existing[0];
    }

    const created = (await tx.$queryRawUnsafe(
      `INSERT INTO ${settings} (employee_epf_rate, employer_epf_rate, employer_etf_rate)
       VALUES (8.00, 12.00, 3.00)
       RETURNING id,
                 employee_epf_rate::float AS "employeeEpfRate",
                 employer_epf_rate::float AS "employerEpfRate",
                 employer_etf_rate::float AS "employerEtfRate",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
    )) as PayrollSettingsRecord[];

    return created[0];
  }

  // ── Loans ─────────────────────────────────────────────────────────────────

  async listLoans(schemaName: string, query: ListEmployeeLoansQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const loans = tenantTable(schemaName, 'employee_loans');
    const employees = tenantTable(schemaName, 'employees');

    const conditions: string[] = [`LOWER(TRIM(l.loan_type)) <> 'salary advance'`];
    const params: unknown[] = [];
    let idx = 1;

    if (query.employeeId) {
      conditions.push(`l.employee_id = $${idx++}::uuid`);
      params.push(query.employeeId);
    }
    if (query.status) {
      conditions.push(`l.status::text = $${idx++}`);
      params.push(query.status);
    }
    if (query.search?.trim()) {
      conditions.push(
        `(e.name ILIKE $${idx} OR e.code ILIKE $${idx} OR l.loan_type ILIKE $${idx})`,
      );
      params.push(`%${query.search.trim()}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = (await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count
         FROM ${loans} l
         INNER JOIN ${employees} e ON e.id = l.employee_id
         WHERE ${where}`,
        ...params,
      )) as Array<{ count: number }>;

      const data = (await tx.$queryRawUnsafe(
        `${this.loanSelectSql(schemaName)}
         WHERE ${where}
         ORDER BY l.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      )) as EmployeeLoanRecord[];

      return buildPaginatedResponse(data, countRows[0]?.count ?? 0, page, limit);
    });
  }

  async getLoan(schemaName: string, id: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const loan = await this.fetchLoanById(tx, schemaName, id);
      if (!loan) {
        throw new NotFoundException('Loan not found');
      }
      const repayments = await this.listRepaymentsForLoan(tx, schemaName, id);
      return { ...loan, repayments };
    });
  }

  async createLoan(schemaName: string, dto: CreateEmployeeLoanDto, userId: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await this.assertEmployeeExists(tx, schemaName, dto.employeeId);

      if (dto.loanType.trim().toLowerCase() === 'salary advance') {
        throw new BadRequestException(
          'Use Advance Payments to record salary advances. Loans are for personal/other loans only.',
        );
      }

      if (dto.monthlyInstallment > dto.originalAmount) {
        throw new BadRequestException('Monthly installment cannot exceed original amount');
      }

      const loans = tenantTable(schemaName, 'employee_loans');
      const rows = (await tx.$queryRawUnsafe(
        `INSERT INTO ${loans}
           (employee_id, loan_type, original_amount, remaining_balance, monthly_installment, start_date, status, notes)
         VALUES ($1::uuid, $2, $3::numeric, $3::numeric, $4::numeric, $5::date, 'ACTIVE', $6)
         RETURNING id`,
        dto.employeeId,
        dto.loanType.trim(),
        dto.originalAmount,
        dto.monthlyInstallment,
        dto.startDate,
        dto.notes?.trim() || null,
      )) as Array<{ id: string }>;

      await logAudit(tx, schemaName, {
        userId,
        action: 'LOAN_CREATE',
        entityType: 'employee_loan',
        entityId: rows[0].id,
        details: dto as unknown as Record<string, unknown>,
      });

      const created = await this.fetchLoanById(tx, schemaName, rows[0].id);
      if (!created) {
        throw new NotFoundException('Loan not found');
      }
      return created;
    });
  }

  async updateLoan(schemaName: string, id: string, dto: UpdateEmployeeLoanDto, userId: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existing = await this.fetchLoanById(tx, schemaName, id);
      if (!existing) {
        throw new NotFoundException('Loan not found');
      }

      if (existing.status !== 'ACTIVE' && dto.status === undefined) {
        throw new BadRequestException('Only ACTIVE loans can be edited');
      }

      if (dto.loanType?.trim().toLowerCase() === 'salary advance') {
        throw new BadRequestException(
          'Use Advance Payments for salary advances. Loans are for personal/other loans only.',
        );
      }

      const loans = tenantTable(schemaName, 'employee_loans');
      await tx.$queryRawUnsafe(
        `UPDATE ${loans}
         SET loan_type = COALESCE($2, loan_type),
             monthly_installment = COALESCE($3::numeric, monthly_installment),
             start_date = COALESCE($4::date, start_date),
             status = CASE WHEN $5::boolean THEN $6 ELSE status END,
             notes = CASE WHEN $7::boolean THEN $8 ELSE notes END
         WHERE id = $1::uuid`,
        id,
        dto.loanType?.trim() ?? null,
        dto.monthlyInstallment ?? null,
        dto.startDate ?? null,
        dto.status !== undefined,
        dto.status ?? null,
        dto.notes !== undefined,
        dto.notes === undefined ? null : dto.notes?.trim() || null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'LOAN_UPDATE',
        entityType: 'employee_loan',
        entityId: id,
        details: dto as unknown as Record<string, unknown>,
      });

      const updated = await this.fetchLoanById(tx, schemaName, id);
      if (!updated) {
        throw new NotFoundException('Loan not found');
      }
      return updated;
    });
  }

  // ── Advances ──────────────────────────────────────────────────────────────

  async listAdvances(schemaName: string, query: ListEmployeeAdvancesQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const advances = tenantTable(schemaName, 'employee_advances');
    const employees = tenantTable(schemaName, 'employees');

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.employeeId) {
      conditions.push(`a.employee_id = $${idx++}::uuid`);
      params.push(query.employeeId);
    }
    if (query.status) {
      conditions.push(`a.status::text = $${idx++}`);
      params.push(query.status);
    }
    if (query.search?.trim()) {
      conditions.push(`(e.name ILIKE $${idx} OR e.code ILIKE $${idx} OR a.notes ILIKE $${idx})`);
      params.push(`%${query.search.trim()}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = (await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count
         FROM ${advances} a
         INNER JOIN ${employees} e ON e.id = a.employee_id
         WHERE ${where}`,
        ...params,
      )) as Array<{ count: number }>;

      const data = (await tx.$queryRawUnsafe(
        `${this.advanceSelectSql(schemaName)}
         WHERE ${where}
         ORDER BY a.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      )) as EmployeeAdvanceRecord[];

      return buildPaginatedResponse(data, countRows[0]?.count ?? 0, page, limit);
    });
  }

  async getAdvance(schemaName: string, id: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const advance = await this.fetchAdvanceById(tx, schemaName, id);
      if (!advance) {
        throw new NotFoundException('Advance not found');
      }
      const repayments = await this.listRepaymentsForAdvance(tx, schemaName, id);
      return { ...advance, repayments };
    });
  }

  async createAdvance(schemaName: string, dto: CreateEmployeeAdvanceDto, userId: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await this.assertEmployeeExists(tx, schemaName, dto.employeeId);

      // Advances are always recovered in full on the next payroll (same-month deduction).
      const fullAmount = dto.originalAmount;

      const advances = tenantTable(schemaName, 'employee_advances');
      const rows = (await tx.$queryRawUnsafe(
        `INSERT INTO ${advances}
           (employee_id, original_amount, remaining_balance, monthly_installment, start_date, status, notes)
         VALUES ($1::uuid, $2::numeric, $2::numeric, $2::numeric, $3::date, 'ACTIVE', $4)
         RETURNING id`,
        dto.employeeId,
        fullAmount,
        dto.startDate,
        dto.notes?.trim() || null,
      )) as Array<{ id: string }>;

      await logAudit(tx, schemaName, {
        userId,
        action: 'ADVANCE_CREATE',
        entityType: 'employee_advance',
        entityId: rows[0].id,
        details: {
          ...dto,
          monthlyInstallment: fullAmount,
        } as unknown as Record<string, unknown>,
      });

      const created = await this.fetchAdvanceById(tx, schemaName, rows[0].id);
      if (!created) {
        throw new NotFoundException('Advance not found');
      }
      return created;
    });
  }

  async updateAdvance(
    schemaName: string,
    id: string,
    dto: UpdateEmployeeAdvanceDto,
    userId: string,
  ) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existing = await this.fetchAdvanceById(tx, schemaName, id);
      if (!existing) {
        throw new NotFoundException('Advance not found');
      }

      if (existing.status !== 'ACTIVE' && dto.status === undefined) {
        throw new BadRequestException('Only ACTIVE advances can be edited');
      }

      const advances = tenantTable(schemaName, 'employee_advances');
      await tx.$queryRawUnsafe(
        `UPDATE ${advances}
         SET start_date = COALESCE($2::date, start_date),
             status = CASE WHEN $3::boolean THEN $4 ELSE status END,
             notes = CASE WHEN $5::boolean THEN $6 ELSE notes END,
             monthly_installment = remaining_balance
         WHERE id = $1::uuid`,
        id,
        dto.startDate ?? null,
        dto.status !== undefined,
        dto.status ?? null,
        dto.notes !== undefined,
        dto.notes === undefined ? null : dto.notes?.trim() || null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'ADVANCE_UPDATE',
        entityType: 'employee_advance',
        entityId: id,
        details: dto as unknown as Record<string, unknown>,
      });

      const updated = await this.fetchAdvanceById(tx, schemaName, id);
      if (!updated) {
        throw new NotFoundException('Advance not found');
      }
      return updated;
    });
  }

  private advanceSelectSql(schemaName: string): string {
    const advances = tenantTable(schemaName, 'employee_advances');
    const employees = tenantTable(schemaName, 'employees');
    return `SELECT a.id,
                   a.employee_id AS "employeeId",
                   e.name AS "employeeName",
                   e.code AS "employeeCode",
                   a.original_amount::float AS "originalAmount",
                   a.remaining_balance::float AS "remainingBalance",
                   a.monthly_installment::float AS "monthlyInstallment",
                   a.start_date::text AS "startDate",
                   a.status::text AS status,
                   a.notes,
                   a.created_at AS "createdAt",
                   a.updated_at AS "updatedAt"
            FROM ${advances} a
            INNER JOIN ${employees} e ON e.id = a.employee_id`;
  }

  private async fetchAdvanceById(
    tx: TenantTx,
    schemaName: string,
    id: string,
  ): Promise<EmployeeAdvanceRecord | null> {
    const rows = (await tx.$queryRawUnsafe(
      `${this.advanceSelectSql(schemaName)} WHERE a.id = $1::uuid LIMIT 1`,
      id,
    )) as EmployeeAdvanceRecord[];
    return rows[0] ?? null;
  }

  private async listRepaymentsForAdvance(
    tx: TenantTx,
    schemaName: string,
    advanceId: string,
  ): Promise<AdvanceRepaymentRecord[]> {
    const repayments = tenantTable(schemaName, 'advance_repayments');
    const items = tenantTable(schemaName, 'payroll_items');
    const runs = tenantTable(schemaName, 'payroll_runs');

    return (await tx.$queryRawUnsafe(
      `SELECT r.id, r.advance_id AS "advanceId", r.payroll_item_id AS "payrollItemId",
              r.amount::float AS amount,
              r.balance_before::float AS "balanceBefore",
              r.balance_after::float AS "balanceAfter",
              r.paid_at AS "paidAt",
              pr.year AS "payrollYear",
              pr.month AS "payrollMonth"
       FROM ${repayments} r
       LEFT JOIN ${items} pi ON pi.id = r.payroll_item_id
       LEFT JOIN ${runs} pr ON pr.id = pi.payroll_run_id
       WHERE r.advance_id = $1::uuid
       ORDER BY r.paid_at DESC`,
      advanceId,
    )) as AdvanceRepaymentRecord[];
  }

  private loanSelectSql(schemaName: string): string {
    const loans = tenantTable(schemaName, 'employee_loans');
    const employees = tenantTable(schemaName, 'employees');
    return `SELECT l.id,
                   l.employee_id AS "employeeId",
                   e.name AS "employeeName",
                   e.code AS "employeeCode",
                   l.loan_type AS "loanType",
                   l.original_amount::float AS "originalAmount",
                   l.remaining_balance::float AS "remainingBalance",
                   l.monthly_installment::float AS "monthlyInstallment",
                   l.start_date::text AS "startDate",
                   l.status::text AS status,
                   l.notes,
                   l.created_at AS "createdAt",
                   l.updated_at AS "updatedAt"
            FROM ${loans} l
            INNER JOIN ${employees} e ON e.id = l.employee_id`;
  }

  private async fetchLoanById(
    tx: TenantTx,
    schemaName: string,
    id: string,
  ): Promise<EmployeeLoanRecord | null> {
    const rows = (await tx.$queryRawUnsafe(
      `${this.loanSelectSql(schemaName)} WHERE l.id = $1::uuid LIMIT 1`,
      id,
    )) as EmployeeLoanRecord[];
    return rows[0] ?? null;
  }

  private async listRepaymentsForLoan(
    tx: TenantTx,
    schemaName: string,
    loanId: string,
  ): Promise<LoanRepaymentRecord[]> {
    const repayments = tenantTable(schemaName, 'loan_repayments');
    const items = tenantTable(schemaName, 'payroll_items');
    const runs = tenantTable(schemaName, 'payroll_runs');

    return (await tx.$queryRawUnsafe(
      `SELECT r.id, r.loan_id AS "loanId", r.payroll_item_id AS "payrollItemId",
              r.amount::float AS amount,
              r.balance_before::float AS "balanceBefore",
              r.balance_after::float AS "balanceAfter",
              r.paid_at AS "paidAt",
              pr.year AS "payrollYear",
              pr.month AS "payrollMonth"
       FROM ${repayments} r
       LEFT JOIN ${items} pi ON pi.id = r.payroll_item_id
       LEFT JOIN ${runs} pr ON pr.id = pi.payroll_run_id
       WHERE r.loan_id = $1::uuid
       ORDER BY r.paid_at DESC`,
      loanId,
    )) as LoanRepaymentRecord[];
  }

  private async assertEmployeeExists(tx: TenantTx, schemaName: string, employeeId: string) {
    const employees = tenantTable(schemaName, 'employees');
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${employees} WHERE id = $1::uuid LIMIT 1`,
      employeeId,
    );
    if (!rows[0]) {
      throw new BadRequestException('Employee not found');
    }
  }

  private async getActiveLoansForEmployee(
    tx: TenantTx,
    schemaName: string,
    employeeId: string,
  ): Promise<ActivePayrollDeduction[]> {
    const loans = tenantTable(schemaName, 'employee_loans');
    const advances = tenantTable(schemaName, 'employee_advances');

    const loanRows = (await tx.$queryRawUnsafe(
      `SELECT id,
              remaining_balance::float AS "remainingBalance",
              monthly_installment::float AS "monthlyInstallment"
       FROM ${loans}
       WHERE employee_id = $1::uuid
         AND status::text = 'ACTIVE'
         AND remaining_balance > 0
         AND LOWER(TRIM(loan_type)) <> 'salary advance'
       ORDER BY id ASC`,
      employeeId,
    )) as Array<{ id: string; remainingBalance: number; monthlyInstallment: number }>;

    const advanceRows = (await tx.$queryRawUnsafe(
      `SELECT id,
              remaining_balance::float AS "remainingBalance",
              monthly_installment::float AS "monthlyInstallment"
       FROM ${advances}
       WHERE employee_id = $1::uuid
         AND status::text = 'ACTIVE'
         AND remaining_balance > 0
       ORDER BY id ASC`,
      employeeId,
    )) as Array<{ id: string; remainingBalance: number; monthlyInstallment: number }>;

    return [
      ...loanRows.map((row) => ({ ...row, source: 'loan' as const })),
      ...advanceRows.map((row) => ({ ...row, source: 'advance' as const })),
    ];
  }

  // ── Payroll runs ──────────────────────────────────────────────────────────

  async listRuns(schemaName: string, query: ListPayrollRunsQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const runs = tenantTable(schemaName, 'payroll_runs');
    const users = tenantTable(schemaName, 'users');

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.year) {
      conditions.push(`pr.year = $${idx++}`);
      params.push(query.year);
    }
    if (query.status) {
      conditions.push(`pr.status::text = $${idx++}`);
      params.push(query.status);
    }

    const where = conditions.join(' AND ');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = (await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM ${runs} pr WHERE ${where}`,
        ...params,
      )) as Array<{ count: number }>;

      const data = (await tx.$queryRawUnsafe(
        `SELECT pr.id, pr.year, pr.month, pr.status::text AS status,
                pr.total_basic::float AS "totalBasic",
                pr.total_commission::float AS "totalCommission",
                pr.total_bonus::float AS "totalBonus",
                pr.total_gross::float AS "totalGross",
                pr.total_deductions::float AS "totalDeductions",
                pr.total_net::float AS "totalNet",
                pr.created_by AS "createdBy",
                cu.name AS "createdByName",
                pr.finalized_by AS "finalizedBy",
                fu.name AS "finalizedByName",
                pr.created_at AS "createdAt",
                pr.finalized_at AS "finalizedAt",
                pr.paid_at AS "paidAt"
         FROM ${runs} pr
         LEFT JOIN ${users} cu ON cu.id = pr.created_by
         LEFT JOIN ${users} fu ON fu.id = pr.finalized_by
         WHERE ${where}
         ORDER BY pr.year DESC, pr.month DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      )) as PayrollRunRecord[];

      return buildPaginatedResponse(data, countRows[0]?.count ?? 0, page, limit);
    });
  }

  async getRun(schemaName: string, id: string): Promise<PayrollRunRecord> {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const run = await this.fetchRunById(tx, schemaName, id);
      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }
      const items = await this.fetchItemsForRun(tx, schemaName, id);
      return { ...run, items };
    });
  }

  async createRun(schemaName: string, dto: CreatePayrollRunDto, userId: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const runs = tenantTable(schemaName, 'payroll_runs');
      const employees = tenantTable(schemaName, 'employees');
      const items = tenantTable(schemaName, 'payroll_items');

      const existing = (await tx.$queryRawUnsafe(
        `SELECT id FROM ${runs} WHERE year = $1 AND month = $2 LIMIT 1`,
        dto.year,
        dto.month,
      )) as Array<{ id: string }>;

      if (existing[0]) {
        throw new ConflictException(`Payroll for ${dto.year}-${dto.month} already exists`);
      }

      const settings = await this.ensureSettings(tx, schemaName);
      const rates = this.toRates(settings);

      const activeEmployees = (await tx.$queryRawUnsafe(
        `SELECT id,
                basic_salary::float AS "basicSalary",
                epf_enabled AS "epfEnabled",
                etf_enabled AS "etfEnabled"
         FROM ${employees}
         WHERE status::text = 'ACTIVE'
         ORDER BY code ASC`,
      )) as Array<{
        id: string;
        basicSalary: number;
        epfEnabled: boolean;
        etfEnabled: boolean;
      }>;

      if (activeEmployees.length === 0) {
        throw new BadRequestException('No active employees to include in payroll');
      }

      const runRows = (await tx.$queryRawUnsafe(
        `INSERT INTO ${runs} (year, month, status, created_by)
         VALUES ($1, $2, 'DRAFT', $3::uuid)
         RETURNING id`,
        dto.year,
        dto.month,
        userId,
      )) as Array<{ id: string }>;

      const runId = runRows[0].id;

      for (const employee of activeEmployees) {
        const activeLoans = await this.getActiveLoansForEmployee(tx, schemaName, employee.id);
        const commission = await this.salesAnalyticsService.getEmployeeCommissionForPeriod(
          schemaName,
          employee.id,
          dto.year,
          dto.month,
          tx as TenantTx,
        );
        const calc = calculatePayrollLine({
          basicSalary: employee.basicSalary,
          commissionPercentage: commission.commissionRate,
          commissionBase: commission.commissionableSales,
          bonus: 0,
          otherDeduction: 0,
          epfEnabled: employee.epfEnabled,
          etfEnabled: employee.etfEnabled,
          rates,
          activeLoans,
        });

        await tx.$queryRawUnsafe(
          `INSERT INTO ${items} (
             payroll_run_id, employee_id, basic_salary,
             commission_percentage, commission_base, commission_amount, bonus,
             gross_salary, employee_epf, employer_epf, employer_etf,
             loan_deduction, other_deduction, total_deductions, net_salary,
             commission_invoice_count, commission_period_from, commission_period_to
           ) VALUES (
             $1::uuid, $2::uuid, $3::numeric,
             $4::numeric, $5::numeric, $6::numeric, $7::numeric,
             $8::numeric, $9::numeric, $10::numeric, $11::numeric,
             $12::numeric, $13::numeric, $14::numeric, $15::numeric,
             $16::int, $17::date, $18::date
           )`,
          runId,
          employee.id,
          calc.basicSalary,
          calc.commissionPercentage,
          calc.commissionBase,
          calc.commissionAmount,
          calc.bonus,
          calc.grossSalary,
          calc.employeeEpf,
          calc.employerEpf,
          calc.employerEtf,
          calc.loanDeduction,
          calc.otherDeduction,
          calc.totalDeductions,
          calc.netSalary,
          commission.attendedInvoiceCount,
          commission.periodFrom,
          commission.periodTo,
        );
      }

      await this.recomputeRunTotals(tx, schemaName, runId);

      await logAudit(tx, schemaName, {
        userId,
        action: 'PAYROLL_RUN_CREATE',
        entityType: 'payroll_run',
        entityId: runId,
        details: { year: dto.year, month: dto.month, employees: activeEmployees.length },
      });

      const run = await this.fetchRunById(tx, schemaName, runId);
      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }
      const itemRows = await this.fetchItemsForRun(tx, schemaName, runId);
      return { ...run, items: itemRows };
    });
  }

  async updateItem(
    schemaName: string,
    runId: string,
    itemId: string,
    dto: UpdatePayrollItemDto,
    userId: string,
  ) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const run = await this.fetchRunById(tx, schemaName, runId);
      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }
      if (run.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT payroll can be edited');
      }

      const item = await this.fetchItemById(tx, schemaName, itemId);
      if (!item || item.payrollRunId !== runId) {
        throw new NotFoundException('Payroll item not found');
      }

      const settings = await this.ensureSettings(tx, schemaName);
      const rates = this.toRates(settings);
      const activeLoans = await this.getActiveLoansForEmployee(tx, schemaName, item.employeeId);

      const calc = calculatePayrollLine({
        basicSalary: item.basicSalary,
        commissionPercentage: dto.commissionPercentage ?? item.commissionPercentage,
        commissionBase: dto.commissionBase ?? item.commissionBase,
        bonus: dto.bonus ?? item.bonus,
        otherDeduction: dto.otherDeduction ?? item.otherDeduction,
        epfEnabled: item.epfEnabled,
        etfEnabled: item.etfEnabled,
        rates,
        activeLoans,
      });

      const items = tenantTable(schemaName, 'payroll_items');
      await tx.$queryRawUnsafe(
        `UPDATE ${items}
         SET commission_percentage = $2::numeric,
             commission_base = $3::numeric,
             commission_amount = $4::numeric,
             bonus = $5::numeric,
             gross_salary = $6::numeric,
             employee_epf = $7::numeric,
             employer_epf = $8::numeric,
             employer_etf = $9::numeric,
             loan_deduction = $10::numeric,
             other_deduction = $11::numeric,
             total_deductions = $12::numeric,
             net_salary = $13::numeric
         WHERE id = $1::uuid`,
        itemId,
        calc.commissionPercentage,
        calc.commissionBase,
        calc.commissionAmount,
        calc.bonus,
        calc.grossSalary,
        calc.employeeEpf,
        calc.employerEpf,
        calc.employerEtf,
        calc.loanDeduction,
        calc.otherDeduction,
        calc.totalDeductions,
        calc.netSalary,
      );

      await this.recomputeRunTotals(tx, schemaName, runId);

      await logAudit(tx, schemaName, {
        userId,
        action: 'PAYROLL_ITEM_UPDATE',
        entityType: 'payroll_item',
        entityId: itemId,
        details: dto as unknown as Record<string, unknown>,
      });

      const updated = await this.fetchItemById(tx, schemaName, itemId);
      if (!updated) {
        throw new NotFoundException('Payroll item not found');
      }
      return updated;
    });
  }

  async finalizeRun(schemaName: string, runId: string, userId: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const run = await this.fetchRunById(tx, schemaName, runId);
      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }
      if (run.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT payroll can be finalized');
      }

      const settings = await this.ensureSettings(tx, schemaName);
      const rates = this.toRates(settings);
      const items = await this.fetchItemsForRun(tx, schemaName, runId);
      const itemsTable = tenantTable(schemaName, 'payroll_items');
      const loansTable = tenantTable(schemaName, 'employee_loans');
      const advancesTable = tenantTable(schemaName, 'employee_advances');
      const loanRepaymentsTable = tenantTable(schemaName, 'loan_repayments');
      const advanceRepaymentsTable = tenantTable(schemaName, 'advance_repayments');
      const runsTable = tenantTable(schemaName, 'payroll_runs');

      for (const item of items) {
        const activeLoans = await this.getActiveLoansForEmployee(tx, schemaName, item.employeeId);
        const sourceById = new Map(activeLoans.map((row) => [row.id, row.source]));
        const calc = calculatePayrollLine({
          basicSalary: item.basicSalary,
          commissionPercentage: item.commissionPercentage,
          commissionBase: item.commissionBase,
          bonus: item.bonus,
          otherDeduction: item.otherDeduction,
          epfEnabled: item.epfEnabled,
          etfEnabled: item.etfEnabled,
          rates,
          activeLoans,
        });

        await tx.$queryRawUnsafe(
          `UPDATE ${itemsTable}
           SET commission_amount = $2::numeric,
               gross_salary = $3::numeric,
               employee_epf = $4::numeric,
               employer_epf = $5::numeric,
               employer_etf = $6::numeric,
               loan_deduction = $7::numeric,
               total_deductions = $8::numeric,
               net_salary = $9::numeric
           WHERE id = $1::uuid`,
          item.id,
          calc.commissionAmount,
          calc.grossSalary,
          calc.employeeEpf,
          calc.employerEpf,
          calc.employerEtf,
          calc.loanDeduction,
          calc.totalDeductions,
          calc.netSalary,
        );

        for (const loanDeduction of calc.loanDeductions) {
          const source = sourceById.get(loanDeduction.loanId) ?? 'loan';
          if (source === 'advance') {
            await tx.$queryRawUnsafe(
              `UPDATE ${advancesTable}
               SET remaining_balance = $2::numeric,
                   status = CASE
                     WHEN $2::numeric <= 0 THEN 'COMPLETED'
                     ELSE status
                   END
               WHERE id = $1::uuid
                 AND status::text = 'ACTIVE'`,
              loanDeduction.loanId,
              loanDeduction.balanceAfter,
            );

            await tx.$queryRawUnsafe(
              `INSERT INTO ${advanceRepaymentsTable}
                 (advance_id, payroll_item_id, amount, balance_before, balance_after, paid_at)
               VALUES ($1::uuid, $2::uuid, $3::numeric, $4::numeric, $5::numeric, NOW())`,
              loanDeduction.loanId,
              item.id,
              loanDeduction.amount,
              loanDeduction.balanceBefore,
              loanDeduction.balanceAfter,
            );
          } else {
            await tx.$queryRawUnsafe(
              `UPDATE ${loansTable}
               SET remaining_balance = $2::numeric,
                   status = CASE
                     WHEN $2::numeric <= 0 THEN 'COMPLETED'
                     ELSE status
                   END
               WHERE id = $1::uuid
                 AND status::text = 'ACTIVE'`,
              loanDeduction.loanId,
              loanDeduction.balanceAfter,
            );

            await tx.$queryRawUnsafe(
              `INSERT INTO ${loanRepaymentsTable}
                 (loan_id, payroll_item_id, amount, balance_before, balance_after, paid_at)
               VALUES ($1::uuid, $2::uuid, $3::numeric, $4::numeric, $5::numeric, NOW())`,
              loanDeduction.loanId,
              item.id,
              loanDeduction.amount,
              loanDeduction.balanceBefore,
              loanDeduction.balanceAfter,
            );
          }
        }
      }

      await this.recomputeRunTotals(tx, schemaName, runId);

      await tx.$queryRawUnsafe(
        `UPDATE ${runsTable}
         SET status = 'FINALIZED',
             finalized_by = $2::uuid,
             finalized_at = NOW()
         WHERE id = $1::uuid`,
        runId,
        userId,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'PAYROLL_FINALIZE',
        entityType: 'payroll_run',
        entityId: runId,
        details: { year: run.year, month: run.month },
      });

      const finalized = await this.fetchRunById(tx, schemaName, runId);
      if (!finalized) {
        throw new NotFoundException('Payroll run not found');
      }
      const itemRows = await this.fetchItemsForRun(tx, schemaName, runId);
      return { ...finalized, items: itemRows };
    });
  }

  async markPaid(schemaName: string, runId: string, userId: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const run = await this.fetchRunById(tx, schemaName, runId);
      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }
      if (run.status !== 'FINALIZED') {
        throw new BadRequestException('Only FINALIZED payroll can be marked as paid');
      }

      const runs = tenantTable(schemaName, 'payroll_runs');
      await tx.$queryRawUnsafe(
        `UPDATE ${runs}
         SET status = 'PAID', paid_at = NOW()
         WHERE id = $1::uuid`,
        runId,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'PAYROLL_MARK_PAID',
        entityType: 'payroll_run',
        entityId: runId,
        details: { year: run.year, month: run.month },
      });

      const updated = await this.fetchRunById(tx, schemaName, runId);
      if (!updated) {
        throw new NotFoundException('Payroll run not found');
      }
      return updated;
    });
  }

  // ── Payslips ──────────────────────────────────────────────────────────────

  async listPayslips(schemaName: string, query: ListPayslipsQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const items = tenantTable(schemaName, 'payroll_items');
    const runs = tenantTable(schemaName, 'payroll_runs');
    const employees = tenantTable(schemaName, 'employees');

    const conditions: string[] = [`pr.status IN ('FINALIZED', 'PAID')`];
    const params: unknown[] = [];
    let idx = 1;

    if (query.employeeId) {
      conditions.push(`pi.employee_id = $${idx++}::uuid`);
      params.push(query.employeeId);
    }
    if (query.year) {
      conditions.push(`pr.year = $${idx++}`);
      params.push(query.year);
    }
    if (query.month) {
      conditions.push(`pr.month = $${idx++}`);
      params.push(query.month);
    }

    const where = conditions.join(' AND ');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = (await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count
         FROM ${items} pi
         INNER JOIN ${runs} pr ON pr.id = pi.payroll_run_id
         WHERE ${where}`,
        ...params,
      )) as Array<{ count: number }>;

      const data = (await tx.$queryRawUnsafe(
        `SELECT pi.id,
                pi.payroll_run_id AS "payrollRunId",
                pr.year, pr.month,
                pr.status::text AS status,
                pi.employee_id AS "employeeId",
                e.name AS "employeeName",
                e.code AS "employeeCode",
                e.designation,
                pi.gross_salary::float AS "grossSalary",
                pi.total_deductions::float AS "totalDeductions",
                pi.net_salary::float AS "netSalary"
         FROM ${items} pi
         INNER JOIN ${runs} pr ON pr.id = pi.payroll_run_id
         INNER JOIN ${employees} e ON e.id = pi.employee_id
         WHERE ${where}
         ORDER BY pr.year DESC, pr.month DESC, e.name ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      )) as Array<Record<string, unknown>>;

      return buildPaginatedResponse(data, countRows[0]?.count ?? 0, page, limit);
    });
  }

  async getPayslip(schemaName: string, payrollItemId: string) {
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const item = await this.fetchItemById(tx, schemaName, payrollItemId);
      if (!item) {
        throw new NotFoundException('Payslip not found');
      }

      const run = await this.fetchRunById(tx, schemaName, item.payrollRunId);
      if (!run || (run.status !== 'FINALIZED' && run.status !== 'PAID')) {
        throw new BadRequestException('Payslips are only available for finalized payroll');
      }

      return {
        ...item,
        year: run.year,
        month: run.month,
        status: run.status,
        finalizedAt: run.finalizedAt,
        paidAt: run.paidAt,
      };
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toRates(settings: PayrollSettingsRecord): PayrollRates {
    return {
      employeeEpfRate: settings.employeeEpfRate,
      employerEpfRate: settings.employerEpfRate,
      employerEtfRate: settings.employerEtfRate,
    };
  }

  private async fetchRunById(
    tx: TenantTx,
    schemaName: string,
    id: string,
  ): Promise<PayrollRunRecord | null> {
    const runs = tenantTable(schemaName, 'payroll_runs');
    const users = tenantTable(schemaName, 'users');
    const rows = (await tx.$queryRawUnsafe(
      `SELECT pr.id, pr.year, pr.month, pr.status::text AS status,
              pr.total_basic::float AS "totalBasic",
              pr.total_commission::float AS "totalCommission",
              pr.total_bonus::float AS "totalBonus",
              pr.total_gross::float AS "totalGross",
              pr.total_deductions::float AS "totalDeductions",
              pr.total_net::float AS "totalNet",
              pr.created_by AS "createdBy",
              cu.name AS "createdByName",
              pr.finalized_by AS "finalizedBy",
              fu.name AS "finalizedByName",
              pr.created_at AS "createdAt",
              pr.finalized_at AS "finalizedAt",
              pr.paid_at AS "paidAt"
       FROM ${runs} pr
       LEFT JOIN ${users} cu ON cu.id = pr.created_by
       LEFT JOIN ${users} fu ON fu.id = pr.finalized_by
       WHERE pr.id = $1::uuid
       LIMIT 1`,
      id,
    )) as PayrollRunRecord[];
    return rows[0] ?? null;
  }

  private itemSelectSql(schemaName: string): string {
    const items = tenantTable(schemaName, 'payroll_items');
    const employees = tenantTable(schemaName, 'employees');
    return `SELECT pi.id,
                   pi.payroll_run_id AS "payrollRunId",
                   pi.employee_id AS "employeeId",
                   e.name AS "employeeName",
                   e.code AS "employeeCode",
                   e.designation,
                   pi.basic_salary::float AS "basicSalary",
                   pi.commission_percentage::float AS "commissionPercentage",
                   pi.commission_base::float AS "commissionBase",
                   pi.commission_amount::float AS "commissionAmount",
                   COALESCE(pi.commission_invoice_count, 0)::int AS "commissionInvoiceCount",
                   pi.commission_period_from::text AS "commissionPeriodFrom",
                   pi.commission_period_to::text AS "commissionPeriodTo",
                   pi.bonus::float AS bonus,
                   pi.gross_salary::float AS "grossSalary",
                   pi.employee_epf::float AS "employeeEpf",
                   pi.employer_epf::float AS "employerEpf",
                   pi.employer_etf::float AS "employerEtf",
                   pi.loan_deduction::float AS "loanDeduction",
                   pi.other_deduction::float AS "otherDeduction",
                   pi.total_deductions::float AS "totalDeductions",
                   pi.net_salary::float AS "netSalary",
                   e.epf_enabled AS "epfEnabled",
                   e.etf_enabled AS "etfEnabled",
                   pi.created_at AS "createdAt",
                   pi.updated_at AS "updatedAt"
            FROM ${items} pi
            INNER JOIN ${employees} e ON e.id = pi.employee_id`;
  }

  private async fetchItemById(
    tx: TenantTx,
    schemaName: string,
    id: string,
  ): Promise<PayrollItemRecord | null> {
    const rows = (await tx.$queryRawUnsafe(
      `${this.itemSelectSql(schemaName)} WHERE pi.id = $1::uuid LIMIT 1`,
      id,
    )) as PayrollItemRecord[];
    return rows[0] ?? null;
  }

  private async fetchItemsForRun(
    tx: TenantTx,
    schemaName: string,
    runId: string,
  ): Promise<PayrollItemRecord[]> {
    return (await tx.$queryRawUnsafe(
      `${this.itemSelectSql(schemaName)}
       WHERE pi.payroll_run_id = $1::uuid
       ORDER BY e.name ASC`,
      runId,
    )) as PayrollItemRecord[];
  }

  private async recomputeRunTotals(tx: TenantTx, schemaName: string, runId: string) {
    const items = tenantTable(schemaName, 'payroll_items');
    const runs = tenantTable(schemaName, 'payroll_runs');

    const totals = (await tx.$queryRawUnsafe(
      `SELECT COALESCE(SUM(basic_salary), 0)::float AS "totalBasic",
              COALESCE(SUM(commission_amount), 0)::float AS "totalCommission",
              COALESCE(SUM(bonus), 0)::float AS "totalBonus",
              COALESCE(SUM(gross_salary), 0)::float AS "totalGross",
              COALESCE(SUM(total_deductions), 0)::float AS "totalDeductions",
              COALESCE(SUM(net_salary), 0)::float AS "totalNet"
       FROM ${items}
       WHERE payroll_run_id = $1::uuid`,
      runId,
    )) as Array<{
      totalBasic: number;
      totalCommission: number;
      totalBonus: number;
      totalGross: number;
      totalDeductions: number;
      totalNet: number;
    }>;

    const t = totals[0];
    await tx.$queryRawUnsafe(
      `UPDATE ${runs}
       SET total_basic = $2::numeric,
           total_commission = $3::numeric,
           total_bonus = $4::numeric,
           total_gross = $5::numeric,
           total_deductions = $6::numeric,
           total_net = $7::numeric
       WHERE id = $1::uuid`,
      runId,
      roundMoney(t.totalBasic),
      roundMoney(t.totalCommission),
      roundMoney(t.totalBonus),
      roundMoney(t.totalGross),
      roundMoney(t.totalDeductions),
      roundMoney(t.totalNet),
    );
  }
}
