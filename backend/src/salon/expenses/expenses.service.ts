import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { logAudit } from '../utils/audit.util';
import { generateSequentialCode } from '../utils/code-generator.util';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
  UpdateExpenseStatusDto,
} from './dto/expense.dto';

export interface ExpenseCategoryRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseRecord {
  id: string;
  code: string;
  branchId: string;
  branchName: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  notes: string | null;
  status: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplierPaymentId: string | null;
  isSystemGenerated: boolean;
}

@Injectable()
export class ExpensesService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  private expenseSelectSql(schemaName: string): string {
    const expenses = tenantTable(schemaName, 'expenses');
    const branches = tenantTable(schemaName, 'branches');
    const categories = tenantTable(schemaName, 'expense_categories');
    const users = tenantTable(schemaName, 'users');

    return `SELECT e.id, e.code,
                   e.branch_id AS "branchId",
                   b.name AS "branchName",
                   e.category_id AS "categoryId",
                   c.name AS "categoryName",
                   e.title,
                   e.amount::float AS amount,
                   e.expense_date::text AS "expenseDate",
                   e.payment_method AS "paymentMethod",
                   e.notes,
                   e.status::text AS status,
                   e.created_by AS "createdBy",
                   u.name AS "createdByName",
                   e.created_at AS "createdAt",
                   e.updated_at AS "updatedAt",
                   e.supplier_payment_id AS "supplierPaymentId",
                   COALESCE(e.is_system_generated, false) AS "isSystemGenerated"
            FROM ${expenses} e
            INNER JOIN ${branches} b ON b.id = e.branch_id
            LEFT JOIN ${categories} c ON c.id = e.category_id
            LEFT JOIN ${users} u ON u.id = e.created_by`;
  }

  private async fetchExpenseByIdTx(
    tx: { $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> },
    schemaName: string,
    id: string,
  ): Promise<ExpenseRecord | null> {
    const rows = (await tx.$queryRawUnsafe(
      `${this.expenseSelectSql(schemaName)} WHERE e.id = $1::uuid LIMIT 1`,
      id,
    )) as ExpenseRecord[];
    return rows[0] ?? null;
  }

  private async assertBranchExists(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    schemaName: string,
    branchId: string,
  ): Promise<void> {
    const branches = tenantTable(schemaName, 'branches');
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
      branchId,
    );
    if (!rows[0]) {
      throw new BadRequestException('Branch not found');
    }
  }

  private async assertCategoryExists(
    tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
    schemaName: string,
    categoryId: string,
  ): Promise<void> {
    const categories = tenantTable(schemaName, 'expense_categories');
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${categories} WHERE id = $1::uuid LIMIT 1`,
      categoryId,
    );
    if (!rows[0]) {
      throw new BadRequestException('Expense category not found');
    }
  }

  async listCategories(schemaName: string): Promise<ExpenseCategoryRecord[]> {
    const table = tenantTable(schemaName, 'expense_categories');
    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      return tx.$queryRawUnsafe<ExpenseCategoryRecord[]>(
        `SELECT id, code, name, description,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM ${table}
         ORDER BY name ASC`,
      );
    });
  }

  async createCategory(
    schemaName: string,
    dto: CreateExpenseCategoryDto,
    userId: string,
  ): Promise<ExpenseCategoryRecord> {
    const table = tenantTable(schemaName, 'expense_categories');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      let code = dto.code?.trim().toUpperCase();
      if (!code) {
        code = await generateSequentialCode(tx, table, 'EXPC-');
      } else {
        const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${table} WHERE code = $1 LIMIT 1`,
          code,
        );
        if (existing.length > 0) {
          throw new ConflictException('Expense category code already exists');
        }
      }

      const rows = await tx.$queryRawUnsafe<ExpenseCategoryRecord[]>(
        `INSERT INTO ${table} (code, name, description)
         VALUES ($1, $2, $3)
         RETURNING id, code, name, description,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        code,
        dto.name.trim(),
        dto.description?.trim() || null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EXPENSE_CATEGORY_CREATE',
        entityType: 'expense_category',
        entityId: rows[0].id,
        details: { code, name: dto.name },
      });

      return rows[0];
    });
  }

  async updateCategory(
    schemaName: string,
    id: string,
    dto: UpdateExpenseCategoryDto,
    userId: string,
  ): Promise<ExpenseCategoryRecord> {
    const table = tenantTable(schemaName, 'expense_categories');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${table} WHERE id = $1::uuid LIMIT 1`,
        id,
      );
      if (!existing[0]) {
        throw new NotFoundException('Expense category not found');
      }

      const rows = await tx.$queryRawUnsafe<ExpenseCategoryRecord[]>(
        `UPDATE ${table}
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, code, name, description,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        id,
        dto.name?.trim() ?? null,
        dto.description !== undefined ? dto.description?.trim() || null : null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EXPENSE_CATEGORY_UPDATE',
        entityType: 'expense_category',
        entityId: id,
        details: dto as Record<string, unknown>,
      });

      return rows[0];
    });
  }

  async deleteCategory(
    schemaName: string,
    id: string,
    userId: string,
  ): Promise<{ id: string; success: boolean }> {
    const table = tenantTable(schemaName, 'expense_categories');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const existing = await tx.$queryRawUnsafe<Array<{ id: string; code: string; name: string }>>(
        `SELECT id, code, name FROM ${table} WHERE id = $1::uuid LIMIT 1`,
        id,
      );
      if (!existing[0]) {
        throw new NotFoundException('Expense category not found');
      }

      if (existing[0].code === 'SUPPLIER_PAYMENT') {
        throw new BadRequestException('Cannot delete the system "Supplier Payments" category.');
      }

      await tx.$queryRawUnsafe(`DELETE FROM ${table} WHERE id = $1::uuid`, id);

      await logAudit(tx, schemaName, {
        userId,
        action: 'EXPENSE_CATEGORY_DELETE',
        entityType: 'expense_category',
        entityId: id,
        details: { code: existing[0].code, name: existing[0].name },
      });

      return { id, success: true };
    });
  }

  async list(schemaName: string, query: ListExpensesQueryDto) {
    const expenses = tenantTable(schemaName, 'expenses');
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (query.search) {
      conditions.push(`(e.title ILIKE $${idx} OR e.code ILIKE $${idx} OR e.notes ILIKE $${idx})`);
      params.push(`%${query.search}%`);
      idx++;
    }

    if (query.branchId) {
      conditions.push(`e.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }

    if (query.categoryId) {
      conditions.push(`e.category_id = $${idx++}::uuid`);
      params.push(query.categoryId);
    }

    if (query.status) {
      conditions.push(`e.status::text = $${idx++}`);
      params.push(query.status);
    }

    if (query.dateFrom) {
      conditions.push(`e.expense_date >= $${idx++}::date`);
      params.push(query.dateFrom);
    }

    if (query.dateTo) {
      conditions.push(`e.expense_date <= $${idx++}::date`);
      params.push(query.dateTo);
    }

    const whereClause = conditions.join(' AND ');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint; totalAmount: number }>>(
        `SELECT COUNT(*)::bigint AS count,
                COALESCE(SUM(CASE WHEN e.status::text = 'ACTIVE' THEN e.amount ELSE 0 END), 0)::float AS "totalAmount"
         FROM ${expenses} e
         WHERE ${whereClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);
      const totalAmount = Number(countRows[0]?.totalAmount ?? 0);

      const data = await tx.$queryRawUnsafe(
        `${this.expenseSelectSql(schemaName)}
         WHERE ${whereClause}
         ORDER BY e.expense_date DESC, e.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return {
        ...buildPaginatedResponse(data as ExpenseRecord[], total, page, limit),
        summary: { totalAmount },
      };
    });
  }

  async findById(schemaName: string, id: string): Promise<ExpenseRecord> {
    const expense = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      this.fetchExpenseByIdTx(tx, schemaName, id),
    );

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async create(schemaName: string, dto: CreateExpenseDto, userId: string): Promise<ExpenseRecord> {
    const table = tenantTable(schemaName, 'expenses');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await this.assertBranchExists(tx, schemaName, dto.branchId);
      if (dto.categoryId) {
        await this.assertCategoryExists(tx, schemaName, dto.categoryId);
      }

      const code = await generateSequentialCode(tx, table, 'EXP-');
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${table}
           (code, branch_id, category_id, title, amount, expense_date, payment_method, notes, created_by)
         VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6::date, $7, $8, $9::uuid)
         RETURNING id`,
        code,
        dto.branchId,
        dto.categoryId ?? null,
        dto.title.trim(),
        dto.amount,
        dto.expenseDate,
        dto.paymentMethod ?? 'CASH',
        dto.notes?.trim() || null,
        userId,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EXPENSE_CREATE',
        entityType: 'expense',
        entityId: rows[0].id,
        details: { code, title: dto.title, amount: dto.amount },
      });

      const created = await this.fetchExpenseByIdTx(tx, schemaName, rows[0].id);
      if (!created) {
        throw new NotFoundException('Expense not found');
      }
      return created;
    });
  }

  async update(
    schemaName: string,
    id: string,
    dto: UpdateExpenseDto,
    userId: string,
  ): Promise<ExpenseRecord> {
    const table = tenantTable(schemaName, 'expenses');
    const existing = await this.findById(schemaName, id);

    if (existing.isSystemGenerated || existing.supplierPaymentId) {
      throw new BadRequestException(
        'Cannot manually edit a system-generated supplier payment expense. Please manage it from the Supplier Payments module.',
      );
    }

    if (existing.status === 'VOID') {
      throw new BadRequestException('Cannot update a voided expense');
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      if (dto.branchId) {
        await this.assertBranchExists(tx, schemaName, dto.branchId);
      }
      if (dto.categoryId) {
        await this.assertCategoryExists(tx, schemaName, dto.categoryId);
      }

      await tx.$queryRawUnsafe(
        `UPDATE ${table}
         SET branch_id = COALESCE($2::uuid, branch_id),
             category_id = CASE
               WHEN $3::boolean THEN $4::uuid
               ELSE category_id
             END,
             title = COALESCE($5, title),
             amount = COALESCE($6, amount),
             expense_date = COALESCE($7::date, expense_date),
             payment_method = COALESCE($8, payment_method),
             notes = CASE
               WHEN $9::boolean THEN $10
               ELSE notes
             END,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.branchId ?? null,
        dto.categoryId !== undefined,
        dto.categoryId ?? null,
        dto.title?.trim() ?? null,
        dto.amount ?? null,
        dto.expenseDate ?? null,
        dto.paymentMethod ?? null,
        dto.notes !== undefined,
        dto.notes?.trim() || null,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EXPENSE_UPDATE',
        entityType: 'expense',
        entityId: id,
        details: dto as Record<string, unknown>,
      });

      const updated = await this.fetchExpenseByIdTx(tx, schemaName, id);
      if (!updated) {
        throw new NotFoundException('Expense not found');
      }
      return updated;
    });
  }

  async updateStatus(
    schemaName: string,
    id: string,
    dto: UpdateExpenseStatusDto,
    userId: string,
  ): Promise<ExpenseRecord> {
    const table = tenantTable(schemaName, 'expenses');
    const existing = await this.findById(schemaName, id);

    if (existing.isSystemGenerated || existing.supplierPaymentId) {
      throw new BadRequestException(
        'Cannot manually change the status of a system-generated supplier payment expense. Please manage it from the Supplier Payments module.',
      );
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${table}
         SET status = $2, updated_at = NOW()
         WHERE id = $1::uuid`,
        id,
        dto.status,
      );

      await logAudit(tx, schemaName, {
        userId,
        action: 'EXPENSE_STATUS_UPDATE',
        entityType: 'expense',
        entityId: id,
        details: { status: dto.status },
      });

      const updated = await this.fetchExpenseByIdTx(tx, schemaName, id);
      if (!updated) {
        throw new NotFoundException('Expense not found');
      }
      return updated;
    });
  }

  async delete(schemaName: string, id: string, userId: string): Promise<{ id: string; success: boolean }> {
    const table = tenantTable(schemaName, 'expenses');
    const existing = await this.findById(schemaName, id);

    if (existing.isSystemGenerated || existing.supplierPaymentId) {
      throw new BadRequestException(
        'Cannot manually delete a system-generated supplier payment expense. Please manage it from the Supplier Payments module.',
      );
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(`DELETE FROM ${table} WHERE id = $1::uuid`, id);

      await logAudit(tx, schemaName, {
        userId,
        action: 'EXPENSE_DELETE',
        entityType: 'expense',
        entityId: id,
        details: { code: existing.code, title: existing.title, amount: existing.amount },
      });

      return { id, success: true };
    });
  }
}
