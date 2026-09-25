import { Injectable } from '@nestjs/common';
import { buildPaginatedResponse, resolvePagination } from '../../common/dto/pagination.dto';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import { calculateCommissionAmount } from '../sales/sale-assignment.util';
import {
  commissionableServiceLineSql,
  eligibleSaleStatusSql,
  netSaleAmountSql,
} from '../sales/sale-eligibility';
import { SalesAnalyticsQueryDto } from './dto/sales-analytics.dto';

type TenantTx = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

export interface DateRange {
  from: string;
  to: string;
}

@Injectable()
export class SalesAnalyticsService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  resolveDateRange(query: SalesAnalyticsQueryDto): DateRange {
    const today = this.localDateString(new Date());
    const preset = (query.preset ?? '').toLowerCase();

    if (query.from && query.to) {
      return { from: query.from.slice(0, 10), to: query.to.slice(0, 10) };
    }

    if (preset === 'today') {
      return { from: today, to: today };
    }
    if (preset === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = this.localDateString(d);
      return { from: y, to: y };
    }
    if (preset === 'this_week' || preset === 'week') {
      const d = new Date();
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const start = new Date(d);
      start.setDate(d.getDate() - diff);
      return { from: this.localDateString(start), to: today };
    }
    if (preset === 'last_month') {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const end = new Date(d.getFullYear(), d.getMonth(), 0);
      return { from: this.localDateString(start), to: this.localDateString(end) };
    }

    // default: this month
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    return { from: this.localDateString(start), to: today };
  }

  private localDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private buildFilters(
    query: SalesAnalyticsQueryDto,
    range: DateRange,
    startIdx = 1,
  ): { conditions: string[]; params: unknown[]; nextIdx: number } {
    const conditions: string[] = [
      eligibleSaleStatusSql('s'),
      `s.created_at >= $${startIdx}::date`,
      `s.created_at < ($${startIdx + 1}::date + INTERVAL '1 day')`,
    ];
    const params: unknown[] = [range.from, range.to];
    let idx = startIdx + 2;

    if (query.branchId) {
      conditions.push(`s.branch_id = $${idx++}::uuid`);
      params.push(query.branchId);
    }
    if (query.status && query.status !== 'all') {
      conditions.push(`s.status::text = $${idx++}`);
      params.push(query.status);
    }
    if (query.search?.trim()) {
      conditions.push(
        `(s.sale_number ILIKE $${idx} OR c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR e.name ILIKE $${idx})`,
      );
      params.push(`%${query.search.trim()}%`);
      idx++;
    }

    return { conditions, params, nextIdx: idx };
  }

  async getOverview(schemaName: string, query: SalesAnalyticsQueryDto) {
    const range = this.resolveDateRange(query);
    const sales = tenantTable(schemaName, 'sales');
    const customers = tenantTable(schemaName, 'customers');
    const saleEmployees = tenantTable(schemaName, 'sale_employees');
    const employees = tenantTable(schemaName, 'employees');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const { conditions, params } = this.buildFilters(query, range);
      const where = conditions.join(' AND ');

      const employeeFilter = query.employeeId
        ? `AND EXISTS (
             SELECT 1 FROM ${saleEmployees} se0
             WHERE se0.sale_id = s.id AND se0.employee_id = $${params.length + 1}::uuid
           )`
        : '';
      const allParams = query.employeeId ? [...params, query.employeeId] : params;

      const summaryRows = await tx.$queryRawUnsafe<
        Array<{
          invoiceCount: bigint;
          grossSales: number;
          refundAmount: number;
          netSales: number;
          employeesWithSales: bigint;
        }>
      >(
        `WITH filtered_sales AS (
           SELECT DISTINCT s.id, s.total, s.refunded_amount
           FROM ${sales} s
           LEFT JOIN ${customers} c ON c.id = s.customer_id
           LEFT JOIN ${saleEmployees} se ON se.sale_id = s.id
           LEFT JOIN ${employees} e ON e.id = se.employee_id
           WHERE ${where} ${employeeFilter}
         )
         SELECT
           COUNT(fs.id)::bigint AS "invoiceCount",
           COALESCE(SUM(fs.total), 0)::float AS "grossSales",
           COALESCE(SUM(COALESCE(fs.refunded_amount, 0)), 0)::float AS "refundAmount",
           COALESCE(SUM(COALESCE(fs.total, 0) - COALESCE(fs.refunded_amount, 0)), 0)::float AS "netSales",
           COALESCE((
             SELECT COUNT(DISTINCT se.employee_id)::bigint
             FROM ${saleEmployees} se
             INNER JOIN filtered_sales fs2 ON fs2.id = se.sale_id
           ), 0)::bigint AS "employeesWithSales"
         FROM filtered_sales fs`,
        ...allParams,
      );

      const row = summaryRows[0];
      const invoiceCount = Number(row?.invoiceCount ?? 0);
      const netSales = Number(row?.netSales ?? 0);
      const today = this.localDateString(new Date());
      const monthStart = this.localDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

      const todayParams: unknown[] = [today, today];
      let todayBranch = '';
      if (query.branchId) {
        todayBranch = `AND s.branch_id = $${todayParams.length + 1}::uuid`;
        todayParams.push(query.branchId);
      }
      let todayEmployee = '';
      if (query.employeeId) {
        todayEmployee = `AND EXISTS (SELECT 1 FROM ${saleEmployees} se_t WHERE se_t.sale_id = s.id AND se_t.employee_id = $${todayParams.length + 1}::uuid)`;
        todayParams.push(query.employeeId);
      }
      const todayRows = await tx.$queryRawUnsafe<Array<{ net: number }>>(
        `SELECT COALESCE(SUM(${netSaleAmountSql('s')}), 0)::float AS net
         FROM ${sales} s
         WHERE ${eligibleSaleStatusSql('s')}
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${todayBranch}
           ${todayEmployee}`,
        ...todayParams,
      );

      const monthParams: unknown[] = [monthStart, today];
      let monthBranch = '';
      if (query.branchId) {
        monthBranch = `AND s.branch_id = $${monthParams.length + 1}::uuid`;
        monthParams.push(query.branchId);
      }
      let monthEmployee = '';
      if (query.employeeId) {
        monthEmployee = `AND EXISTS (SELECT 1 FROM ${saleEmployees} se_m WHERE se_m.sale_id = s.id AND se_m.employee_id = $${monthParams.length + 1}::uuid)`;
        monthParams.push(query.employeeId);
      }
      const monthRows = await tx.$queryRawUnsafe<Array<{ net: number }>>(
        `SELECT COALESCE(SUM(${netSaleAmountSql('s')}), 0)::float AS net
         FROM ${sales} s
         WHERE ${eligibleSaleStatusSql('s')}
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${monthBranch}
           ${monthEmployee}`,
        ...monthParams,
      );

      return {
        range,
        summary: {
          totalSales: netSales,
          invoiceCount,
          averageInvoiceValue: invoiceCount > 0 ? Math.round((netSales / invoiceCount) * 100) / 100 : 0,
          employeesGeneratedSales: Number(row?.employeesWithSales ?? 0),
          grossSales: Number(row?.grossSales ?? 0),
          refundAmount: Number(row?.refundAmount ?? 0),
          netSales,
          todaySales: Number(todayRows[0]?.net ?? 0),
          monthSales: Number(monthRows[0]?.net ?? 0),
        },
      };
    });
  }

  async listInvoices(schemaName: string, query: SalesAnalyticsQueryDto) {
    const range = this.resolveDateRange(query);
    const sales = tenantTable(schemaName, 'sales');
    const branches = tenantTable(schemaName, 'branches');
    const customers = tenantTable(schemaName, 'customers');
    const saleEmployees = tenantTable(schemaName, 'sale_employees');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const employees = tenantTable(schemaName, 'employees');
    const { page, limit, offset } = resolvePagination(query.page, query.limit ?? 20);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const { conditions, params, nextIdx } = this.buildFilters(query, range);
      let idx = nextIdx;
      let employeeFilter = '';
      if (query.employeeId) {
        employeeFilter = `AND EXISTS (
          SELECT 1 FROM ${saleItemEmployees} siex
          INNER JOIN ${saleItems} six ON six.id = siex.sale_item_id AND six.item_type = 'service'
          WHERE six.sale_id = s.id AND siex.employee_id = $${idx++}::uuid
        )`;
        params.push(query.employeeId);
      }

      const where = `${conditions.join(' AND ')} ${employeeFilter}`;

      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT s.id)::bigint AS count
         FROM ${sales} s
         INNER JOIN ${branches} b ON b.id = s.branch_id
         LEFT JOIN ${customers} c ON c.id = s.customer_id
         LEFT JOIN ${saleEmployees} se ON se.sale_id = s.id
         LEFT JOIN ${employees} e ON e.id = se.employee_id
         WHERE ${where}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const sortBy = query.sortBy === 'total' ? 's.total' : 's.created_at';
      const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

      const data = await tx.$queryRawUnsafe(
        `WITH distinct_matching_sales AS (
           SELECT DISTINCT s.id
           FROM ${sales} s
           INNER JOIN ${branches} b ON b.id = s.branch_id
           LEFT JOIN ${customers} c ON c.id = s.customer_id
           LEFT JOIN ${saleEmployees} se ON se.sale_id = s.id
           LEFT JOIN ${employees} e ON e.id = se.employee_id
           WHERE ${where}
         )
         SELECT s.id,
                s.sale_number AS "saleNumber",
                s.created_at AS "createdAt",
                s.branch_id AS "branchId",
                b.name AS "branchName",
                s.customer_id AS "customerId",
                c.name AS "customerName",
                c.phone AS "customerPhone",
                s.total::float AS "invoiceTotal",
                COALESCE(s.refunded_amount, 0)::float AS "refundedAmount",
                ${netSaleAmountSql('s')}::float AS "netAmount",
                s.status::text AS status,
                (
                  SELECT COALESCE(
                    json_agg(json_build_object(
                      'employeeId', se2.employee_id,
                      'employeeName', e2.name,
                      'assignmentType', se2.assignment_type::text,
                      'allocationPercentage', se2.allocation_percentage::float,
                      'commissionableAmount', se2.commissionable_amount::float
                    ) ORDER BY CASE WHEN se2.assignment_type::text = 'PRIMARY' THEN 0 ELSE 1 END, e2.name),
                    '[]'::json
                  )
                  FROM ${saleEmployees} se2
                  INNER JOIN ${employees} e2 ON e2.id = se2.employee_id
                  WHERE se2.sale_id = s.id
                ) AS employees
         FROM distinct_matching_sales dms
         INNER JOIN ${sales} s ON s.id = dms.id
         INNER JOIN ${branches} b ON b.id = s.branch_id
         LEFT JOIN ${customers} c ON c.id = s.customer_id
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return buildPaginatedResponse(data as unknown[], total, page, limit);
    });
  }

  async getByEmployee(schemaName: string, query: SalesAnalyticsQueryDto) {
    const range = this.resolveDateRange(query);
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const branches = tenantTable(schemaName, 'branches');
    const employees = tenantTable(schemaName, 'employees');
    const { page, limit, offset } = resolvePagination(query.page, query.limit ?? 20);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const params: unknown[] = [range.from, range.to];
      let idx = 3;
      const filters: string[] = [
        `si.item_type = 'service'`,
        eligibleSaleStatusSql('s'),
        `s.created_at >= $1::date`,
        `s.created_at < ($2::date + INTERVAL '1 day')`,
      ];
      if (query.branchId) {
        filters.push(`s.branch_id = $${idx++}::uuid`);
        params.push(query.branchId);
      }
      if (query.employeeId) {
        filters.push(`sie.employee_id = $${idx++}::uuid`);
        params.push(query.employeeId);
      }
      if (query.search?.trim()) {
        filters.push(`(e.name ILIKE $${idx} OR e.code ILIKE $${idx})`);
        params.push(`%${query.search.trim()}%`);
        idx++;
      }

      const where = filters.join(' AND ');
      const lineValue = commissionableServiceLineSql('s', 'si');
      const fromClause = `
        FROM ${saleItemEmployees} sie
        INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id
        INNER JOIN ${sales} s ON s.id = si.sale_id
        INNER JOIN ${employees} e ON e.id = sie.employee_id
        INNER JOIN ${branches} b ON b.id = e.branch_id
        WHERE ${where}`;

      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT sie.employee_id)::bigint AS count ${fromClause}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const data = await tx.$queryRawUnsafe(
        `SELECT
           e.id AS "employeeId",
           e.name AS "employeeName",
           e.code AS "employeeCode",
           e.designation,
           e.branch_id AS "branchId",
           b.name AS "branchName",
           COALESCE(e.commission_rate, 0)::float AS "commissionRate",
           COUNT(DISTINCT s.id)::int AS "attendedInvoiceCount",
           COALESCE(SUM(${lineValue}), 0)::float AS "allocatedSales",
           COALESCE(SUM(${lineValue}), 0)::float AS "commissionableSales"
         ${fromClause}
         GROUP BY e.id, e.name, e.code, e.designation, e.branch_id, b.name, e.commission_rate
         ORDER BY COALESCE(SUM(${lineValue}), 0) DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      const rows = (
        data as Array<{
          employeeId: string;
          attendedInvoiceCount: number;
          allocatedSales: number;
          commissionableSales: number;
          commissionRate: number;
        }>
      ).map((row) => ({
        ...row,
        commissionAmount: calculateCommissionAmount(row.commissionableSales, row.commissionRate),
      }));

      if (query.sortBy === 'commission') {
        rows.sort((a, b) =>
          query.sortOrder === 'asc'
            ? a.commissionAmount - b.commissionAmount
            : b.commissionAmount - a.commissionAmount,
        );
      } else if (query.sortBy === 'invoiceCount') {
        rows.sort((a, b) =>
          query.sortOrder === 'asc'
            ? a.attendedInvoiceCount - b.attendedInvoiceCount
            : b.attendedInvoiceCount - a.attendedInvoiceCount,
        );
      }

      return { range, ...buildPaginatedResponse(rows, total, page, limit) };
    });
  }

  async getEmployeeDetail(
    schemaName: string,
    employeeId: string,
    query: SalesAnalyticsQueryDto,
  ) {
    const range = this.resolveDateRange(query);
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const services = tenantTable(schemaName, 'services');
    const branches = tenantTable(schemaName, 'branches');
    const customers = tenantTable(schemaName, 'customers');
    const employees = tenantTable(schemaName, 'employees');
    const { page, limit, offset } = resolvePagination(query.page, query.limit ?? 20);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const empRows = await tx.$queryRawUnsafe<
        Array<{
          employeeId: string;
          employeeName: string;
          employeeCode: string;
          designation: string | null;
          branchId: string;
          branchName: string;
          commissionRate: number;
        }>
      >(
        `SELECT e.id AS "employeeId", e.name AS "employeeName", e.code AS "employeeCode",
                e.designation, e.branch_id AS "branchId", b.name AS "branchName",
                COALESCE(e.commission_rate, 0)::float AS "commissionRate"
         FROM ${employees} e
         INNER JOIN ${branches} b ON b.id = e.branch_id
         WHERE e.id = $1::uuid
         LIMIT 1`,
        employeeId,
      );
      if (!empRows[0]) {
        return null;
      }

      const params: unknown[] = [employeeId, range.from, range.to];
      let idx = 4;
      const filters = [
        `sie.employee_id = $1::uuid`,
        `si.item_type = 'service'`,
        eligibleSaleStatusSql('s'),
        `s.created_at >= $2::date`,
        `s.created_at < ($3::date + INTERVAL '1 day')`,
      ];
      if (query.branchId) {
        filters.push(`s.branch_id = $${idx++}::uuid`);
        params.push(query.branchId);
      }

      const where = filters.join(' AND ');
      const lineValue = commissionableServiceLineSql('s', 'si');
      const lineFrom = `
        FROM ${saleItemEmployees} sie
        INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id
        INNER JOIN ${sales} s ON s.id = si.sale_id`;

      const summaryRows = await tx.$queryRawUnsafe<
        Array<{ invoiceCount: bigint; allocatedSales: number }>
      >(
        `SELECT COUNT(DISTINCT s.id)::bigint AS "invoiceCount",
                COALESCE(SUM(${lineValue}), 0)::float AS "allocatedSales"
         ${lineFrom}
         WHERE ${where}`,
        ...params,
      );

      const invoiceCount = Number(summaryRows[0]?.invoiceCount ?? 0);
      const allocatedSales = Number(summaryRows[0]?.allocatedSales ?? 0);
      const commissionRate = empRows[0].commissionRate;
      const commissionAmount = calculateCommissionAmount(allocatedSales, commissionRate);

      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         ${lineFrom}
         WHERE ${where}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const invoices = await tx.$queryRawUnsafe(
        `SELECT s.id, s.sale_number AS "saleNumber", s.created_at AS "createdAt",
                b.name AS "branchName", c.name AS "customerName",
                COALESCE(svc.name, 'Service') AS "serviceName",
                s.total::float AS "invoiceTotal",
                (${lineValue})::float AS "employeeSales",
                100::float AS "allocationPercentage",
                'LINE'::text AS "assignmentType",
                s.status::text AS status
         ${lineFrom}
         INNER JOIN ${branches} b ON b.id = s.branch_id
         LEFT JOIN ${customers} c ON c.id = s.customer_id
         LEFT JOIN ${services} svc ON svc.id = si.service_id
         WHERE ${where}
         ORDER BY s.created_at DESC, svc.name ASC NULLS LAST
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return {
        range,
        summary: {
          ...empRows[0],
          invoiceCount,
          allocatedSales,
          commissionableSales: allocatedSales,
          commissionRate,
          commissionAmount,
          averageInvoice: invoiceCount > 0 ? Math.round((allocatedSales / invoiceCount) * 100) / 100 : 0,
        },
        ...buildPaginatedResponse(invoices as unknown[], total, page, limit),
      };
    });
  }

  async getByBranch(schemaName: string, query: SalesAnalyticsQueryDto) {
    const range = this.resolveDateRange(query);
    const sales = tenantTable(schemaName, 'sales');
    const branches = tenantTable(schemaName, 'branches');
    const { page, limit, offset } = resolvePagination(query.page, query.limit ?? 50);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const params: unknown[] = [range.from, range.to];
      let idx = 3;
      const filters = [
        eligibleSaleStatusSql('s'),
        `s.created_at >= $1::date`,
        `s.created_at < ($2::date + INTERVAL '1 day')`,
      ];
      if (query.branchId) {
        filters.push(`s.branch_id = $${idx++}::uuid`);
        params.push(query.branchId);
      }

      const where = filters.join(' AND ');
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT s.branch_id)::bigint AS count
         FROM ${sales} s
         WHERE ${where}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const data = await tx.$queryRawUnsafe(
        `SELECT
           b.id AS "branchId",
           b.name AS "branchName",
           COUNT(s.id)::int AS "invoiceCount",
           COALESCE(SUM(s.total), 0)::float AS "grossSales",
           COALESCE(SUM(COALESCE(s.refunded_amount, 0)), 0)::float AS "refunds",
           COALESCE(SUM(${netSaleAmountSql('s')}), 0)::float AS "netSales"
         FROM ${sales} s
         INNER JOIN ${branches} b ON b.id = s.branch_id
         WHERE ${where}
         GROUP BY b.id, b.name
         ORDER BY "netSales" DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return { range, ...buildPaginatedResponse(data as unknown[], total, page, limit) };
    });
  }

  async getBranchDetail(
    schemaName: string,
    branchId: string,
    query: SalesAnalyticsQueryDto,
  ) {
    const range = this.resolveDateRange(query);
    const byEmployee = await this.getByEmployee(schemaName, {
      ...query,
      branchId,
      from: range.from,
      to: range.to,
      limit: 100,
    });
    const byDay = await this.getByDay(schemaName, {
      ...query,
      branchId,
      from: range.from,
      to: range.to,
      limit: 100,
    });
    const invoices = await this.listInvoices(schemaName, {
      ...query,
      branchId,
      from: range.from,
      to: range.to,
      limit: 20,
    });

    const branchRows = await this.tenantSchemaService.withTenantSchema(
      schemaName,
      async ({ tx }) => {
        const branches = tenantTable(schemaName, 'branches');
        return tx.$queryRawUnsafe<Array<{ id: string; name: string }>>(
          `SELECT id, name FROM ${branches} WHERE id = $1::uuid LIMIT 1`,
          branchId,
        );
      },
    );

    const overview = await this.getOverview(schemaName, {
      ...query,
      branchId,
      from: range.from,
      to: range.to,
    });

    return {
      branch: branchRows[0] ?? { id: branchId, name: 'Branch' },
      range,
      summary: overview.summary,
      employees: byEmployee.data,
      daily: byDay.data,
      invoices: invoices.data,
    };
  }

  async getByDay(schemaName: string, query: SalesAnalyticsQueryDto) {
    const range = this.resolveDateRange(query);
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const { page, limit, offset } = resolvePagination(query.page, query.limit ?? 50);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const params: unknown[] = [range.from, range.to];
      let idx = 3;
      const filters = [
        eligibleSaleStatusSql('s'),
        `s.created_at >= $1::date`,
        `s.created_at < ($2::date + INTERVAL '1 day')`,
      ];
      if (query.branchId) {
        filters.push(`s.branch_id = $${idx++}::uuid`);
        params.push(query.branchId);
      }
      if (query.employeeId) {
        filters.push(`EXISTS (
          SELECT 1 FROM ${saleItemEmployees} sie
          INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
          WHERE si.sale_id = s.id AND sie.employee_id = $${idx++}::uuid
        )`);
        params.push(query.employeeId);
      }

      const where = filters.join(' AND ');
      const countRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT (s.created_at::date))::bigint AS count
         FROM ${sales} s
         WHERE ${where}`,
        ...params,
      );
      const total = Number(countRows[0]?.count ?? 0);

      const data = await tx.$queryRawUnsafe(
        `SELECT
           s.created_at::date AS date,
           COUNT(s.id)::int AS "invoiceCount",
           COALESCE(SUM(s.total), 0)::float AS "grossSales",
           COALESCE(SUM(COALESCE(s.refunded_amount, 0)), 0)::float AS "refunds",
           COALESCE(SUM(${netSaleAmountSql('s')}), 0)::float AS "netSales"
         FROM ${sales} s
         WHERE ${where}
         GROUP BY s.created_at::date
         ORDER BY date DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        ...params,
        limit,
        offset,
      );

      return { range, ...buildPaginatedResponse(data as unknown[], total, page, limit) };
    });
  }

  /** Used by payroll — monthly SUM of assigned service lines × commission rate. */
  async getEmployeeCommissionForPeriod(
    schemaName: string,
    employeeId: string,
    year: number,
    month: number,
    tx?: TenantTx,
  ): Promise<{
    attendedInvoiceCount: number;
    commissionableSales: number;
    commissionRate: number;
    commissionAmount: number;
    periodFrom: string;
    periodTo: string;
  }> {
    const periodFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const run = async (client: TenantTx) => {
      const sales = tenantTable(schemaName, 'sales');
      const saleItems = tenantTable(schemaName, 'sale_items');
      const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
      const employees = tenantTable(schemaName, 'employees');

      const rateRows = await client.$queryRawUnsafe<Array<{ commissionRate: number }>>(
        `SELECT COALESCE(commission_rate, 0)::float AS "commissionRate"
         FROM ${employees} WHERE id = $1::uuid LIMIT 1`,
        employeeId,
      );
      const commissionRate = Number(rateRows[0]?.commissionRate ?? 0);

      const rows = await client.$queryRawUnsafe<
        Array<{ invoiceCount: bigint; commissionableSales: number }>
      >(
        `SELECT COUNT(DISTINCT s.id)::bigint AS "invoiceCount",
                COALESCE(SUM(${commissionableServiceLineSql('s', 'si')}), 0)::float AS "commissionableSales"
         FROM ${saleItemEmployees} sie
         INNER JOIN ${saleItems} si ON si.id = sie.sale_item_id AND si.item_type = 'service'
         INNER JOIN ${sales} s ON s.id = si.sale_id
         WHERE sie.employee_id = $1::uuid
           AND ${eligibleSaleStatusSql('s')}
           AND s.created_at >= $2::date
           AND s.created_at < ($3::date + INTERVAL '1 day')`,
        employeeId,
        periodFrom,
        periodTo,
      );

      const attendedInvoiceCount = Number(rows[0]?.invoiceCount ?? 0);
      const commissionableSales = Number(rows[0]?.commissionableSales ?? 0);
      return {
        attendedInvoiceCount,
        commissionableSales,
        commissionRate,
        commissionAmount: calculateCommissionAmount(commissionableSales, commissionRate),
        periodFrom,
        periodTo,
      };
    };

    if (tx) return run(tx);
    return this.tenantSchemaService.withTenantSchema(schemaName, ({ tx: client }) =>
      run(client as TenantTx),
    );
  }
}
