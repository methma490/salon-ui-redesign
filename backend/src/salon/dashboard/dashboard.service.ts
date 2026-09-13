import { Injectable } from '@nestjs/common';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { tenantTable } from '../../tenant/utils/schema-name.util';
import type { SalonDashboardPeriod } from './dto/dashboard-query.dto';

function periodDates(period: SalonDashboardPeriod): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
  }

  return { start: startDate.toISOString().slice(0, 10), end };
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async getDashboard(
    schemaName: string,
    branchId?: string,
    period: SalonDashboardPeriod = 'today',
  ) {
    const { start, end } = periodDates(period);
    const sales = tenantTable(schemaName, 'sales');
    const customers = tenantTable(schemaName, 'customers');
    const branchStock = tenantTable(schemaName, 'branch_stock');
    const products = tenantTable(schemaName, 'products');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const services = tenantTable(schemaName, 'services');
    const employees = tenantTable(schemaName, 'employees');
    const payments = tenantTable(schemaName, 'payments');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const appointments = tenantTable(schemaName, 'appointments');
    const appointmentServices = tenantTable(schemaName, 'appointment_services');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const branchParams = branchId ? [branchId] : [];
      const branchCond = branchId ? 'AND s.branch_id = $1::uuid' : '';
      const branchCondPlain = branchId ? 'AND branch_id = $1::uuid' : '';
      const stockBranchCond = branchId ? 'AND bs.branch_id = $1::uuid' : '';
      const apptBranchCond = branchId ? 'AND a.branch_id = $1::uuid' : '';
      const empBranchCond = branchId ? 'AND branch_id = $1::uuid' : '';

      const periodParams = branchId ? [start, end, branchId] : [start, end];
      const periodBranchCond = branchId ? 'AND s.branch_id = $3::uuid' : '';

      const [
        periodSales,
        todaySales,
        monthlySales,
        customerCount,
        newCustomersInPeriod,
        employeeCount,
        lowStockCount,
        inventoryOverview,
        lowStock,
        servicesCompleted,
        todayAppointments,
        periodAppointments,
        topServices,
        revenueByService,
        employeePerformance,
        salesTrend,
        customerGrowth,
        appointmentAnalytics,
        recentTransactions,
        upcomingAppointments,
      ] = await Promise.all([
        tx.$queryRawUnsafe<Array<{ total: string; count: bigint }>>(
          `SELECT COALESCE(SUM(total), 0)::text AS total, COUNT(*)::bigint AS count
           FROM ${sales} s
           WHERE s.status = 'COMPLETED'
             AND s.created_at >= $1::date
             AND s.created_at < ($2::date + INTERVAL '1 day')
             ${periodBranchCond}`,
          ...periodParams,
        ),
        tx.$queryRawUnsafe<Array<{ total: string; count: bigint }>>(
          `SELECT COALESCE(SUM(total), 0)::text AS total, COUNT(*)::bigint AS count
           FROM ${sales} s
           WHERE s.status = 'COMPLETED'
             AND s.created_at >= CURRENT_DATE
             AND s.created_at < CURRENT_DATE + INTERVAL '1 day'
             ${branchCond}`,
          ...branchParams,
        ),
        tx.$queryRawUnsafe<Array<{ total: string; count: bigint }>>(
          `SELECT COALESCE(SUM(total), 0)::text AS total, COUNT(*)::bigint AS count
           FROM ${sales} s
           WHERE s.status = 'COMPLETED'
             AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE)
             ${branchCond}`,
          ...branchParams,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${customers} WHERE status = 'ACTIVE'`,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${customers}
           WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')`,
          start,
          end,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${employees}
           WHERE status = 'ACTIVE' ${empBranchCond}`,
          ...branchParams,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count
           FROM ${branchStock} bs
           WHERE bs.quantity <= 5 ${stockBranchCond}`,
          ...branchParams,
        ),
        tx.$queryRawUnsafe<Array<{ available: bigint; low: bigint; out: bigint }>>(
          `SELECT
             COUNT(*) FILTER (WHERE bs.quantity > 5)::bigint AS available,
             COUNT(*) FILTER (WHERE bs.quantity BETWEEN 1 AND 5)::bigint AS low,
             COUNT(*) FILTER (WHERE bs.quantity <= 0)::bigint AS out
           FROM ${branchStock} bs
           WHERE 1=1 ${stockBranchCond}`,
          ...branchParams,
        ),
        tx.$queryRawUnsafe(
          `SELECT bs.branch_id AS "branchId", p.id AS "productId", p.name AS "productName", bs.quantity
           FROM ${branchStock} bs
           INNER JOIN ${products} p ON bs.product_id = p.id
           WHERE bs.quantity <= 5 ${stockBranchCond}
           ORDER BY bs.quantity ASC LIMIT 10`,
          ...branchParams,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count
           FROM ${saleItems} si
           INNER JOIN ${sales} s ON si.sale_id = s.id
           WHERE si.item_type = 'service' AND s.status = 'COMPLETED'
             AND s.created_at >= $1::date AND s.created_at < ($2::date + INTERVAL '1 day')
             ${periodBranchCond}`,
          ...periodParams,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${appointments} a
           WHERE a.appointment_date = CURRENT_DATE
             AND a.status IN ('PENDING', 'CONFIRMED', 'COMPLETED')
             ${apptBranchCond}`,
          ...branchParams,
        ),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${appointments} a
           WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date
             ${apptBranchCond}`,
          ...(branchId ? [start, end, branchId] : [start, end]),
        ),
        tx.$queryRawUnsafe(
          `SELECT sv.id, sv.name, COUNT(*)::bigint AS "saleCount", SUM(si.total)::text AS revenue
           FROM ${saleItems} si
           INNER JOIN ${services} sv ON si.service_id = sv.id
           INNER JOIN ${sales} s ON si.sale_id = s.id
           WHERE si.item_type = 'service' AND s.status = 'COMPLETED'
             AND s.created_at >= $1::date AND s.created_at < ($2::date + INTERVAL '1 day')
             ${periodBranchCond}
           GROUP BY sv.id, sv.name ORDER BY COUNT(*) DESC LIMIT 8`,
          ...periodParams,
        ),
        tx.$queryRawUnsafe(
          `SELECT sv.name, COALESCE(SUM(si.total), 0)::text AS revenue
           FROM ${saleItems} si
           INNER JOIN ${services} sv ON si.service_id = sv.id
           INNER JOIN ${sales} s ON si.sale_id = s.id
           WHERE si.item_type = 'service' AND s.status = 'COMPLETED'
             AND s.created_at >= $1::date AND s.created_at < ($2::date + INTERVAL '1 day')
             ${periodBranchCond}
           GROUP BY sv.name ORDER BY revenue DESC LIMIT 6`,
          ...periodParams,
        ),
        tx.$queryRawUnsafe(
          `SELECT e.id AS "employeeId", e.name AS "employeeName",
                  COUNT(*)::bigint AS "serviceCount", COALESCE(SUM(si.total), 0)::text AS revenue
           FROM ${saleItemEmployees} sie
           INNER JOIN ${saleItems} si ON sie.sale_item_id = si.id
           INNER JOIN ${sales} s ON si.sale_id = s.id
           INNER JOIN ${employees} e ON sie.employee_id = e.id
           WHERE s.status = 'COMPLETED'
             AND s.created_at >= $1::date AND s.created_at < ($2::date + INTERVAL '1 day')
             ${periodBranchCond}
           GROUP BY e.id, e.name ORDER BY revenue DESC LIMIT 8`,
          ...periodParams,
        ),
        tx.$queryRawUnsafe<Array<{ label: string; total: string; saleCount: bigint }>>(
          period === 'year'
            ? `SELECT TO_CHAR(DATE_TRUNC('month', s.created_at), 'Mon') AS label,
                      COALESCE(SUM(s.total), 0)::text AS total, COUNT(*)::bigint AS "saleCount"
               FROM ${sales} s
               WHERE s.status = 'COMPLETED'
                 AND s.created_at >= $1::date AND s.created_at < ($2::date + INTERVAL '1 day')
                 ${periodBranchCond}
               GROUP BY DATE_TRUNC('month', s.created_at) ORDER BY DATE_TRUNC('month', s.created_at)`
            : `SELECT TO_CHAR(DATE(s.created_at), 'Mon DD') AS label,
                      COALESCE(SUM(s.total), 0)::text AS total, COUNT(*)::bigint AS "saleCount"
               FROM ${sales} s
               WHERE s.status = 'COMPLETED'
                 AND s.created_at >= $1::date AND s.created_at < ($2::date + INTERVAL '1 day')
                 ${periodBranchCond}
               GROUP BY DATE(s.created_at) ORDER BY DATE(s.created_at)`,
          ...periodParams,
        ),
        tx.$queryRawUnsafe<Array<{ month: Date; count: bigint }>>(
          `SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)::bigint AS count
           FROM ${customers}
           WHERE created_at >= CURRENT_DATE - INTERVAL '11 months'
           GROUP BY DATE_TRUNC('month', created_at)
           ORDER BY month ASC`,
        ),
        tx.$queryRawUnsafe<Array<{ label: string; completed: bigint; pending: bigint; cancelled: bigint }>>(
          period === 'year'
            ? `SELECT TO_CHAR(DATE_TRUNC('month', a.appointment_date), 'Mon') AS label,
                      COUNT(*) FILTER (WHERE a.status = 'COMPLETED')::bigint AS completed,
                      COUNT(*) FILTER (WHERE a.status IN ('PENDING', 'CONFIRMED'))::bigint AS pending,
                      COUNT(*) FILTER (WHERE a.status IN ('CANCELLED', 'NO_SHOW'))::bigint AS cancelled
               FROM ${appointments} a
               WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date ${apptBranchCond}
               GROUP BY DATE_TRUNC('month', a.appointment_date)
               ORDER BY DATE_TRUNC('month', a.appointment_date)`
            : `SELECT TO_CHAR(a.appointment_date, 'Mon DD') AS label,
                      COUNT(*) FILTER (WHERE a.status = 'COMPLETED')::bigint AS completed,
                      COUNT(*) FILTER (WHERE a.status IN ('PENDING', 'CONFIRMED'))::bigint AS pending,
                      COUNT(*) FILTER (WHERE a.status IN ('CANCELLED', 'NO_SHOW'))::bigint AS cancelled
               FROM ${appointments} a
               WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date ${apptBranchCond}
               GROUP BY a.appointment_date ORDER BY a.appointment_date`,
          ...(branchId ? [start, end, branchId] : [start, end]),
        ),
        tx.$queryRawUnsafe(
          `SELECT s.id, s.sale_number AS "invoiceNo", c.name AS "customerName",
                  (SELECT sv.name FROM ${saleItems} si
                   LEFT JOIN ${services} sv ON si.service_id = sv.id
                   WHERE si.sale_id = s.id AND si.item_type = 'service' LIMIT 1) AS "serviceName",
                  (SELECT e.name FROM ${saleItemEmployees} sie
                   INNER JOIN ${saleItems} si ON sie.sale_item_id = si.id
                   INNER JOIN ${employees} e ON sie.employee_id = e.id
                   WHERE si.sale_id = s.id LIMIT 1) AS "employeeName",
                  s.total::text AS amount,
                  COALESCE(
                    (SELECT p.status::text FROM ${payments} p WHERE p.sale_id = s.id
                     ORDER BY p.created_at DESC LIMIT 1), 'COMPLETED') AS "paymentStatus",
                  s.created_at AS "createdAt"
           FROM ${sales} s
           LEFT JOIN ${customers} c ON s.customer_id = c.id
           WHERE s.status = 'COMPLETED' ${branchCondPlain.replace('branch_id', 's.branch_id')}
           ORDER BY s.created_at DESC LIMIT 10`,
          ...branchParams,
        ),
        tx.$queryRawUnsafe(
          `SELECT a.id, a.start_time AS "startTime", a.appointment_date AS "appointmentDate",
                  c.name AS "customerName",
                  (SELECT service_name FROM ${appointmentServices}
                   WHERE appointment_id = a.id LIMIT 1) AS "serviceName"
           FROM ${appointments} a
           INNER JOIN ${customers} c ON a.customer_id = c.id
           WHERE a.appointment_date >= CURRENT_DATE
             AND a.status IN ('PENDING', 'CONFIRMED')
             ${apptBranchCond}
           ORDER BY a.appointment_date ASC, a.start_time ASC LIMIT 8`,
          ...branchParams,
        ),
      ]);

      const growthBuckets: Array<{ name: string; key: string }> = [];
      const now = new Date();
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        growthBuckets.push({
          name: d.toLocaleDateString('en-US', { month: 'short' }),
          key: monthKey(d),
        });
      }
      const growthMap = new Map(
        customerGrowth.map((row) => [
          monthKey(row.month instanceof Date ? row.month : new Date(row.month)),
          Number(row.count),
        ]),
      );

      return {
        period,
        kpis: {
          periodRevenue: Number(periodSales[0]?.total ?? 0),
          periodSalesCount: Number(periodSales[0]?.count ?? 0),
          todayRevenue: Number(todaySales[0]?.total ?? 0),
          todaySalesCount: Number(todaySales[0]?.count ?? 0),
          monthlyRevenue: Number(monthlySales[0]?.total ?? 0),
          todayAppointments: Number(todayAppointments[0]?.count ?? 0),
          periodAppointments: Number(periodAppointments[0]?.count ?? 0),
          totalCustomers: Number(customerCount[0]?.count ?? 0),
          newCustomers: Number(newCustomersInPeriod[0]?.count ?? 0),
          servicesCompleted: Number(servicesCompleted[0]?.count ?? 0),
          lowStockCount: Number(lowStockCount[0]?.count ?? 0),
          employeeCount: Number(employeeCount[0]?.count ?? 0),
        },
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
          id: s.id,
          name: s.name,
          revenue: Number(s.revenue),
          saleCount: Number(s.saleCount),
        })),
        weeklySales: salesTrend.map((row) => ({
          date: row.label,
          saleCount: Number(row.saleCount),
          total: Number(row.total),
        })),
        charts: {
          salesTrend: salesTrend.map((row) => ({
            name: row.label,
            revenue: Number(row.total),
            sales: Number(row.saleCount),
          })),
          revenueByService: (
            revenueByService as Array<{ name: string; revenue: string }>
          ).map((s) => ({ name: s.name, value: Number(s.revenue) })),
          topServices: (
            topServices as Array<{ id: string; name: string; revenue: string; saleCount: bigint }>
          ).map((s) => ({ name: s.name, bookings: Number(s.saleCount), revenue: Number(s.revenue) })),
          employeePerformance: (
            employeePerformance as Array<{
              employeeId: string;
              employeeName: string;
              serviceCount: bigint;
              revenue: string;
            }>
          ).map((e) => ({
            name: e.employeeName,
            services: Number(e.serviceCount),
            revenue: Number(e.revenue),
          })),
          appointmentAnalytics: appointmentAnalytics.map((row) => ({
            name: row.label,
            completed: Number(row.completed),
            pending: Number(row.pending),
            cancelled: Number(row.cancelled),
          })),
          inventoryOverview: {
            available: Number(inventoryOverview[0]?.available ?? 0),
            low: Number(inventoryOverview[0]?.low ?? 0),
            outOfStock: Number(inventoryOverview[0]?.out ?? 0),
          },
          customerGrowth: growthBuckets.map((b) => ({
            name: b.name,
            count: growthMap.get(b.key) ?? 0,
          })),
        },
        recentTransactions: (
          recentTransactions as Array<{
            id: string;
            invoiceNo: string;
            customerName: string | null;
            serviceName: string | null;
            employeeName: string | null;
            amount: string;
            paymentStatus: string;
            createdAt: Date;
          }>
        ).map((t) => ({
          id: t.id,
          invoiceNo: t.invoiceNo,
          customer: t.customerName,
          service: t.serviceName,
          employee: t.employeeName,
          amount: Number(t.amount),
          paymentStatus: t.paymentStatus,
          date: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
        })),
        upcomingAppointments: (
          upcomingAppointments as Array<{
            id: string;
            startTime: string;
            appointmentDate: Date;
            customerName: string;
            serviceName: string | null;
          }>
        ).map((a) => ({
          id: a.id,
          time: typeof a.startTime === 'string' ? a.startTime.slice(0, 5) : String(a.startTime),
          date:
            a.appointmentDate instanceof Date
              ? a.appointmentDate.toISOString().slice(0, 10)
              : String(a.appointmentDate),
          customer: a.customerName,
          service: a.serviceName,
          employee: null as string | null,
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
