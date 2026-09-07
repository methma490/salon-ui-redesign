import { Injectable } from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';

@Injectable()
export class DashboardService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async getDashboard(schemaName: string, branchId?: string) {
    const sales = tenantTable(schemaName, 'sales');
    const customers = tenantTable(schemaName, 'customers');
    const branchStock = tenantTable(schemaName, 'branch_stock');
    const products = tenantTable(schemaName, 'products');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const services = tenantTable(schemaName, 'services');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const branchParams = branchId ? [branchId] : [];
      const branchCond = branchId ? 'AND s.branch_id = $1::uuid' : '';
      const stockBranchCond = branchId ? 'AND bs.branch_id = $1::uuid' : '';

      const todaySales = await tx.$queryRawUnsafe<Array<{ total: string; count: bigint }>>(
        `SELECT COALESCE(SUM(total), 0)::text AS total, COUNT(*)::bigint AS count
         FROM ${sales} s
         WHERE s.status = 'COMPLETED'
           AND s.created_at >= CURRENT_DATE
           AND s.created_at < CURRENT_DATE + INTERVAL '1 day'
           ${branchCond}`,
        ...branchParams,
      );

      const monthlySales = await tx.$queryRawUnsafe<Array<{ total: string; count: bigint }>>(
        `SELECT COALESCE(SUM(total), 0)::text AS total, COUNT(*)::bigint AS count
         FROM ${sales} s
         WHERE s.status = 'COMPLETED'
           AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE)
           ${branchCond}`,
        ...branchParams,
      );

      const customerCount = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${customers} WHERE status = 'ACTIVE'`,
      );

      const lowStock = await tx.$queryRawUnsafe(
        `SELECT bs.branch_id AS "branchId", p.id AS "productId", p.name AS "productName",
                bs.quantity
         FROM ${branchStock} bs
         INNER JOIN ${products} p ON bs.product_id = p.id
         WHERE bs.quantity <= 5 ${stockBranchCond}
         ORDER BY bs.quantity ASC
         LIMIT 10`,
        ...branchParams,
      );

      const topServices = await tx.$queryRawUnsafe(
        `SELECT sv.id, sv.name, COUNT(*)::bigint AS "saleCount", SUM(si.total)::text AS revenue
         FROM ${saleItems} si
         INNER JOIN ${services} sv ON si.service_id = sv.id
         INNER JOIN ${sales} s ON si.sale_id = s.id
         WHERE si.item_type = 'service' AND s.status = 'COMPLETED'
           ${branchCond}
         GROUP BY sv.id, sv.name
         ORDER BY COUNT(*) DESC
         LIMIT 5`,
        ...branchParams,
      );

      return {
        todaySales: {
          total: Number(todaySales[0]?.total ?? 0),
          count: Number(todaySales[0]?.count ?? 0),
        },
        monthlySales: {
          total: Number(monthlySales[0]?.total ?? 0),
          count: Number(monthlySales[0]?.count ?? 0),
        },
        totalCustomers: Number(customerCount[0]?.count ?? 0),
        lowStockProducts: lowStock,
        topServices: (
          topServices as Array<{ id: string; name: string; revenue: string; saleCount: bigint }>
        ).map((s) => ({
          ...s,
          revenue: Number(s.revenue),
          saleCount: Number(s.saleCount),
        })),
      };
    });
  }

  async getDailySalesReport(
    schemaName: string,
    startDate: string,
    endDate: string,
    branchId?: string,
  ) {
    const sales = tenantTable(schemaName, 'sales');
    const params: unknown[] = [startDate, endDate];
    const branchCond = branchId ? 'AND branch_id = $3::uuid' : '';
    if (branchId) params.push(branchId);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT DATE(created_at) AS date,
                COUNT(*)::bigint AS "saleCount",
                COALESCE(SUM(total), 0)::text AS total
         FROM ${sales}
         WHERE status = 'COMPLETED'
           AND created_at >= $1::date
           AND created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        ...params,
      ),
    );
  }

  async getBranchSalesReport(schemaName: string, startDate: string, endDate: string) {
    const sales = tenantTable(schemaName, 'sales');
    const branches = tenantTable(schemaName, 'branches');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT b.id AS "branchId", b.name AS "branchName",
                COUNT(s.id)::bigint AS "saleCount",
                COALESCE(SUM(s.total), 0)::text AS total
         FROM ${branches} b
         LEFT JOIN ${sales} s ON s.branch_id = b.id
           AND s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
         GROUP BY b.id, b.name
         ORDER BY total DESC`,
        startDate,
        endDate,
      ),
    );
  }

  async getServiceSalesReport(
    schemaName: string,
    startDate: string,
    endDate: string,
    branchId?: string,
  ) {
    const saleItems = tenantTable(schemaName, 'sale_items');
    const sales = tenantTable(schemaName, 'sales');
    const services = tenantTable(schemaName, 'services');
    const params: unknown[] = [startDate, endDate];
    const branchCond = branchId ? 'AND s.branch_id = $3::uuid' : '';
    if (branchId) params.push(branchId);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT sv.id, sv.name,
                COUNT(*)::bigint AS "saleCount",
                COALESCE(SUM(si.total), 0)::text AS total
         FROM ${saleItems} si
         INNER JOIN ${sales} s ON si.sale_id = s.id
         INNER JOIN ${services} sv ON si.service_id = sv.id
         WHERE si.item_type = 'service' AND s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
         GROUP BY sv.id, sv.name
         ORDER BY total DESC`,
        ...params,
      ),
    );
  }

  async getProductSalesReport(
    schemaName: string,
    startDate: string,
    endDate: string,
    branchId?: string,
  ) {
    const saleItems = tenantTable(schemaName, 'sale_items');
    const sales = tenantTable(schemaName, 'sales');
    const products = tenantTable(schemaName, 'products');
    const params: unknown[] = [startDate, endDate];
    const branchCond = branchId ? 'AND s.branch_id = $3::uuid' : '';
    if (branchId) params.push(branchId);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT p.id, p.name,
                COALESCE(SUM(si.quantity), 0)::text AS quantity,
                COALESCE(SUM(si.total), 0)::text AS total
         FROM ${saleItems} si
         INNER JOIN ${sales} s ON si.sale_id = s.id
         INNER JOIN ${products} p ON si.product_id = p.id
         WHERE si.item_type = 'product' AND s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
         GROUP BY p.id, p.name
         ORDER BY total DESC`,
        ...params,
      ),
    );
  }

  async getEmployeePerformanceReport(
    schemaName: string,
    startDate: string,
    endDate: string,
    branchId?: string,
  ) {
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const sales = tenantTable(schemaName, 'sales');
    const employees = tenantTable(schemaName, 'employees');
    const params: unknown[] = [startDate, endDate];
    const branchCond = branchId ? 'AND s.branch_id = $3::uuid' : '';
    if (branchId) params.push(branchId);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT e.id AS "employeeId", e.name AS "employeeName", e.designation,
                COUNT(*)::bigint AS "serviceCount",
                COALESCE(SUM(si.total), 0)::text AS total
         FROM ${saleItemEmployees} sie
         INNER JOIN ${saleItems} si ON sie.sale_item_id = si.id
         INNER JOIN ${sales} s ON si.sale_id = s.id
         INNER JOIN ${employees} e ON sie.employee_id = e.id
         WHERE s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
         GROUP BY e.id, e.name, e.designation
         ORDER BY total DESC`,
        ...params,
      ),
    );
  }

  async getLowStockReport(schemaName: string, threshold = 5, branchId?: string) {
    const branchStock = tenantTable(schemaName, 'branch_stock');
    const products = tenantTable(schemaName, 'products');
    const branches = tenantTable(schemaName, 'branches');
    const params: unknown[] = [threshold];
    const branchCond = branchId ? 'AND bs.branch_id = $2::uuid' : '';
    if (branchId) params.push(branchId);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) =>
      tx.$queryRawUnsafe(
        `SELECT b.name AS "branchName", p.name AS "productName", bs.quantity
         FROM ${branchStock} bs
         INNER JOIN ${products} p ON bs.product_id = p.id
         INNER JOIN ${branches} b ON bs.branch_id = b.id
         WHERE bs.quantity <= $1 ${branchCond}
         ORDER BY bs.quantity ASC, b.name ASC, p.name ASC`,
        ...params,
      ),
    );
  }
}
