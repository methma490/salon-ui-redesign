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

function appointmentPeriodDates(period: SalonDashboardPeriod): { start: string; end: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'week': {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 3);
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 3);
      break;
    }
    case 'month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    }
    case 'year': {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    }
    default: {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 3);
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 3);
      break;
    }
  }

  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
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
    const { start: apptStart, end: apptEnd } = appointmentPeriodDates(period);
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
    const expensesTable = tenantTable(schemaName, 'expenses');
    const payrollRunsTable = tenantTable(schemaName, 'payroll_runs');
    const employeeLoansTable = tenantTable(schemaName, 'employee_loans');

    return this.tenantSchemaService.withTenantSchema(
      schemaName,
      async ({ tx }) => {
      const branchParams = branchId ? [branchId] : [];
      const branchCond = branchId ? 'AND s.branch_id = $1::uuid' : '';
      const branchCondPlain = branchId ? 'AND branch_id = $1::uuid' : '';
      const stockBranchCond = branchId ? 'AND bs.branch_id = $1::uuid' : '';
      const apptBranchCond = branchId ? 'AND a.branch_id = $1::uuid' : '';
      const empBranchCond = branchId ? 'AND branch_id = $1::uuid' : '';
      const expBranchCond = branchId ? 'AND branch_id = $3::uuid' : '';

      const periodParams = branchId ? [start, end, branchId] : [start, end];
      const apptPeriodParams = branchId ? [apptStart, apptEnd, branchId] : [apptStart, apptEnd];
      const periodBranchCond = branchId ? 'AND s.branch_id = $3::uuid' : '';
      const apptPeriodBranchCond = branchId ? 'AND a.branch_id = $3::uuid' : '';

      const [
        periodSales,
        prevPeriodSales,
        todaySales,
        monthlySales,
        periodExpenses,
        prevPeriodExpenses,
        periodSalaries,
        prevPeriodSalaries,
        customerCount,
        newCustomersInPeriod,
        employeeCount,
        lowStockCount,
        inventoryOverview,
        inventoryTotals,
        lowStock,
        servicesCompleted,
        todayAppointments,
        periodAppointments,
        appointmentBreakdown,
        topServices,
        revenueByService,
        employeePerformance,
        salesTrend,
        customerGrowth,
        appointmentAnalytics,
        recentTransactions,
        upcomingAppointments,
        recentLoans,
        loansOverview,
        recentOrdersRows,
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
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(total), 0)::text AS total
           FROM ${sales} s
           WHERE s.status = 'COMPLETED'
             AND s.created_at >= ($1::date - INTERVAL '1 month')
             AND s.created_at < $1::date
             ${branchId ? 'AND s.branch_id = $2::uuid' : ''}`,
          ...(branchId ? [start, branchId] : [start]),
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
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM ${expensesTable}
           WHERE expense_date >= $1::date
             AND expense_date <= $2::date
             ${expBranchCond}`,
          ...periodParams,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM ${expensesTable}
           WHERE expense_date >= ($1::date - INTERVAL '1 month')
             AND expense_date < $1::date
             ${branchId ? 'AND branch_id = $2::uuid' : ''}`,
          ...(branchId ? [start, branchId] : [start]),
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(total_net), 0)::text AS total
           FROM ${payrollRunsTable}
           WHERE created_at >= $1::date
             AND created_at < ($2::date + INTERVAL '1 day')`,
          start,
          end,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(total_net), 0)::text AS total
           FROM ${payrollRunsTable}
           WHERE created_at >= ($1::date - INTERVAL '1 month')
             AND created_at < $1::date`,
          start,
        ).catch(() => [{ total: '0' }]),
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
        tx.$queryRawUnsafe<Array<{ totalCount: bigint; stockValue: string }>>(
          `SELECT COUNT(DISTINCT p.id)::bigint AS "totalCount",
                  COALESCE(SUM(COALESCE(bs.quantity, 0) * p.selling_price), 0)::text AS "stockValue"
           FROM ${products} p
           LEFT JOIN ${branchStock} bs ON bs.product_id = p.id ${stockBranchCond}
           WHERE p.is_active = true`,
          ...branchParams,
        ).catch(() => [{ totalCount: BigInt(0), stockValue: '0' }]),
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
             ${apptPeriodBranchCond}`,
          ...apptPeriodParams,
        ),
        tx.$queryRawUnsafe<Array<{ completed: bigint; pending: bigint; cancelled: bigint; noShow: bigint }>>(
          `SELECT
             COUNT(*) FILTER (WHERE a.status::text = 'COMPLETED')::bigint AS completed,
             COUNT(*) FILTER (WHERE a.status::text IN ('PENDING', 'CONFIRMED'))::bigint AS pending,
             COUNT(*) FILTER (WHERE a.status::text = 'CANCELLED')::bigint AS cancelled,
             COUNT(*) FILTER (WHERE a.status::text = 'NO_SHOW')::bigint AS "noShow"
           FROM ${appointments} a
           WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date
             ${apptPeriodBranchCond}`,
          ...apptPeriodParams,
        ).catch(() => [{ completed: BigInt(0), pending: BigInt(0), cancelled: BigInt(0), noShow: BigInt(0) }]),
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
          `SELECT e.id AS "employeeId", e.name AS "employeeName", NULL::text AS "avatarUrl",
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
        tx.$queryRawUnsafe<
          Array<{ label: string; completed: bigint; pending: bigint; cancelled: bigint; noShow: bigint }>
        >(
          period === 'year'
            ? `SELECT TO_CHAR(DATE_TRUNC('month', a.appointment_date), 'Mon') AS label,
                      COUNT(*) FILTER (WHERE a.status::text = 'COMPLETED')::bigint AS completed,
                      COUNT(*) FILTER (WHERE a.status::text IN ('PENDING', 'CONFIRMED'))::bigint AS pending,
                      COUNT(*) FILTER (WHERE a.status::text = 'CANCELLED')::bigint AS cancelled,
                      COUNT(*) FILTER (WHERE a.status::text = 'NO_SHOW')::bigint AS "noShow"
               FROM ${appointments} a
               WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date ${apptPeriodBranchCond}
               GROUP BY DATE_TRUNC('month', a.appointment_date)
               ORDER BY DATE_TRUNC('month', a.appointment_date)`
            : `SELECT TO_CHAR(a.appointment_date, 'Mon DD') AS label,
                      COUNT(*) FILTER (WHERE a.status::text = 'COMPLETED')::bigint AS completed,
                      COUNT(*) FILTER (WHERE a.status::text IN ('PENDING', 'CONFIRMED'))::bigint AS pending,
                      COUNT(*) FILTER (WHERE a.status::text = 'CANCELLED')::bigint AS cancelled,
                      COUNT(*) FILTER (WHERE a.status::text = 'NO_SHOW')::bigint AS "noShow"
               FROM ${appointments} a
               WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date ${apptPeriodBranchCond}
               GROUP BY a.appointment_date ORDER BY a.appointment_date`,
          ...apptPeriodParams,
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
           ORDER BY s.created_at DESC LIMIT 5`,
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
        tx.$queryRawUnsafe<Array<{
          id: string;
          employeeName: string;
          avatarUrl: string | null;
          amount: string;
          remainingBalance: string;
          status: string;
        }>>(
          `SELECT l.id, e.name AS "employeeName", NULL::text AS "avatarUrl",
                  l.original_amount::text AS amount, l.remaining_balance::text AS "remainingBalance",
                  l.status::text AS status
           FROM ${employeeLoansTable} l
           INNER JOIN ${employees} e ON l.employee_id = e.id
           ORDER BY l.created_at DESC LIMIT 5`,
        ).catch(() => []),
        tx.$queryRawUnsafe<Array<{ activeCount: bigint; totalOutstanding: string }>>(
          `SELECT COUNT(*)::bigint AS "activeCount",
                  COALESCE(SUM(remaining_balance), 0)::text AS "totalOutstanding"
           FROM ${employeeLoansTable}
           WHERE status = 'ACTIVE'`,
        ).catch(() => [{ activeCount: BigInt(0), totalOutstanding: '0' }]),
        tx.$queryRawUnsafe<Array<{
          id: string;
          saleNumber: string;
          customerName: string | null;
          amount: string;
          status: string;
          createdAt: Date;
        }>>(
          `SELECT s.id, s.sale_number AS "saleNumber", COALESCE(c.name, 'Walk-in') AS "customerName",
                  s.total::text AS amount, s.status::text AS status, s.created_at AS "createdAt"
           FROM ${sales} s
           LEFT JOIN ${customers} c ON s.customer_id = c.id
           WHERE 1=1 ${branchCondPlain.replace('branch_id', 's.branch_id')}
           ORDER BY s.created_at DESC LIMIT 5`,
          ...branchParams,
        ).catch(() => []),
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

      // Financials calculations
      const revenue = Number(periodSales[0]?.total ?? 0);
      const prevRevenue = Number(prevPeriodSales[0]?.total ?? 0);
      const revenueGrowth = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;

      const expenses = Number(periodExpenses[0]?.total ?? 0);
      const prevExpenses = Number(prevPeriodExpenses[0]?.total ?? 0);
      const expensesGrowth = prevExpenses > 0 ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : 0;

      const salaries = Number(periodSalaries[0]?.total ?? 0);
      const prevSalaries = Number(prevPeriodSalaries[0]?.total ?? 0);
      const salariesGrowth = prevSalaries > 0 ? Math.round(((salaries - prevSalaries) / prevSalaries) * 100) : 0;

      const netProfit = revenue - expenses - salaries;
      const prevProfit = prevRevenue - prevExpenses - prevSalaries;
      const profitGrowth = prevProfit !== 0 ? Math.round(((netProfit - prevProfit) / Math.abs(prevProfit)) * 100) : 0;

      // This chart currently has no weekly financial query, so show no points instead of sample values.
      const weeklyComparison: Array<{
        week: string;
        revenue: number;
        expenses: number;
        salaries: number;
      }> = [];

      // Appointments breakdown
      const apptCompleted = Number(appointmentBreakdown[0]?.completed ?? 0);
      const apptPending = Number(appointmentBreakdown[0]?.pending ?? 0);
      const apptCancelled = Number(appointmentBreakdown[0]?.cancelled ?? 0);
      const apptNoShow = Number(appointmentBreakdown[0]?.noShow ?? 0);
      const totalAppts = apptCompleted + apptPending + apptCancelled + apptNoShow || Number(periodAppointments[0]?.count ?? 0);

      const completedPct = totalAppts > 0 ? Math.round((apptCompleted / totalAppts) * 100) : 0;
      const pendingPct = totalAppts > 0 ? Math.round((apptPending / totalAppts) * 100) : 0;
      const cancelledPct = totalAppts > 0 ? Math.round((apptCancelled / totalAppts) * 100) : 0;
      const noShowPct = totalAppts > 0 ? Math.round((apptNoShow / totalAppts) * 100) : 0;

      // Top employees
      const empPerfRows = employeePerformance as Array<{
        employeeId: string;
        employeeName: string;
        avatarUrl: string | null;
        serviceCount: bigint;
        revenue: string;
      }>;
      const maxEmpRevenue = Math.max(...empPerfRows.map((e) => Number(e.revenue)), 1);
      const topEmployeesData = empPerfRows.slice(0, 5).map((e, idx) => ({
        id: e.employeeId,
        rank: idx + 1,
        name: e.employeeName,
        avatarUrl: e.avatarUrl,
        revenue: Number(e.revenue),
        servicesDone: Number(e.serviceCount),
        progressPct: Math.round((Number(e.revenue) / maxEmpRevenue) * 100),
      }));

      // Inventory breakdown
      const totalProductsCount = Number(inventoryTotals[0]?.totalCount ?? 0) || (Number(inventoryOverview[0]?.available ?? 0) + Number(inventoryOverview[0]?.low ?? 0) + Number(inventoryOverview[0]?.out ?? 0));
      const inStockQty = Number(inventoryOverview[0]?.available ?? 0);
      const lowStockQty = Number(inventoryOverview[0]?.low ?? 0);
      const outOfStockQty = Number(inventoryOverview[0]?.out ?? 0);
      const totalStockSum = inStockQty + lowStockQty + outOfStockQty || totalProductsCount || 1;

      const inStockPct = Math.round((inStockQty / totalStockSum) * 100);
      const lowStockPct = Math.round((lowStockQty / totalStockSum) * 100);
      const outOfStockPct = Math.round((outOfStockQty / totalStockSum) * 100);

      // Employee Loans
      const activeLoansCount = Number(loansOverview[0]?.activeCount ?? 0);
      const totalOutstandingLoans = Number(loansOverview[0]?.totalOutstanding ?? 0);
      const recentLoansData = (recentLoans as Array<{
        id: string;
        employeeName: string;
        avatarUrl: string | null;
        amount: string;
        remainingBalance: string;
        status: string;
      }>).map((l) => ({
        id: l.id,
        employeeName: l.employeeName,
        avatarUrl: l.avatarUrl,
        amount: Number(l.amount),
        remainingBalance: Number(l.remainingBalance),
        status: l.status,
      }));

      // Recent Orders (Sales)
      const recentOrders = (recentOrdersRows as Array<{
        id: string;
        saleNumber: string;
        customerName: string | null;
        amount: string;
        status: string;
        createdAt: Date;
      }>).map((r) => ({
        id: r.id,
        saleNumber: r.saleNumber,
        customerName: r.customerName ?? 'Walk-in',
        amount: Number(r.amount),
        status: r.status,
        date: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }));

      // Recent Transactions (Combine sales, expenses)
      const combinedTransactions = (recentTransactions as Array<{
        id: string;
        invoiceNo: string;
        customerName: string | null;
        serviceName: string | null;
        employeeName: string | null;
        amount: string;
        paymentStatus: string;
        createdAt: Date;
      }>).map((t) => ({
        id: t.id,
        date: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
        type: 'Income' as const,
        category: 'POS Order',
        amount: Number(t.amount),
        status: t.paymentStatus === 'COMPLETED' ? 'Paid' : 'Pending',
      }));

      return {
        period,
        kpis: {
          periodRevenue: revenue,
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
          expenses,
          expensesGrowth,
          salaries,
          salariesGrowth,
          netProfit,
          profitGrowth,
          revenueGrowth,
        },
        financials: {
          revenue,
          revenueGrowth,
          expenses,
          expensesGrowth,
          salaries,
          salariesGrowth,
          netProfit,
          profitGrowth,
          weeklyComparison,
        },
        appointmentOverview: {
          total: totalAppts,
          completed: apptCompleted,
          completedPct,
          pending: apptPending,
          pendingPct,
          cancelled: apptCancelled,
          cancelledPct,
          noShow: apptNoShow,
          noShowPct,
          trend: appointmentAnalytics.map((row) => ({
            name: row.label,
            date: row.label,
            completed: Number(row.completed),
            pending: Number(row.pending),
            cancelled: Number(row.cancelled),
            noShow: Number(row.noShow ?? 0),
          })),
        },
        topEmployees: topEmployeesData,
        inventoryOverview: {
          totalProducts: totalProductsCount,
          inStock: inStockQty,
          inStockPct,
          lowStock: lowStockQty,
          lowStockPct,
          outOfStock: outOfStockQty,
          outOfStockPct,
          stockValue: Number(inventoryTotals[0]?.stockValue ?? 0),
        },
        employeeLoans: {
          activeCount: activeLoansCount,
          totalOutstanding: totalOutstandingLoans,
          recentLoans: recentLoansData,
        },
        recentOrders,
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
          revenueByService: (revenueByService as Array<{ name: string; revenue: string }>).map(
            (s) => ({ name: s.name, value: Number(s.revenue) }),
          ),
          topServices: (
            topServices as Array<{ id: string; name: string; revenue: string; saleCount: bigint }>
          ).map((s) => ({
            name: s.name,
            bookings: Number(s.saleCount),
            revenue: Number(s.revenue),
          })),
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
        recentTransactions: combinedTransactions,
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
      },
      { timeoutMs: 30_000 },
    );
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

  async getSalesReport(
    schemaName: string,
    startDate: string,
    endDate: string,
    branchId?: string,
    paymentMethod?: string,
  ) {
    const sales = tenantTable(schemaName, 'sales');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const services = tenantTable(schemaName, 'services');
    const products = tenantTable(schemaName, 'products');
    const customers = tenantTable(schemaName, 'customers');
    const branches = tenantTable(schemaName, 'branches');
    const employees = tenantTable(schemaName, 'employees');
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const payments = tenantTable(schemaName, 'payments');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const params: unknown[] = [startDate, endDate];
      let idx = 3;
      let branchCond = '';
      if (branchId && branchId !== 'all') {
        branchCond = `AND s.branch_id = $${idx++}::uuid`;
        params.push(branchId);
      }
      let paymentCond = '';
      if (paymentMethod && paymentMethod !== 'all') {
        paymentCond = `AND EXISTS (SELECT 1 FROM ${payments} p WHERE p.sale_id = s.id AND p.method::text = $${idx++})`;
        params.push(paymentMethod);
      }

      const summaryRows = await tx.$queryRawUnsafe<
        Array<{
          totalSales: string;
          serviceSales: string;
          productSales: string;
          totalDiscounts: string;
        }>
      >(
        `SELECT
           COALESCE(SUM(s.total), 0)::text AS "totalSales",
           COALESCE((
             SELECT SUM(si.total)
             FROM ${saleItems} si
             INNER JOIN ${sales} s2 ON si.sale_id = s2.id
             WHERE s2.status = 'COMPLETED'
               AND s2.created_at >= $1::date
               AND s2.created_at < ($2::date + INTERVAL '1 day')
               ${branchCond.replace(/s\./g, 's2.')}
               ${paymentCond.replace(/s\./g, 's2.')}
               AND si.item_type = 'service'
           ), 0)::text AS "serviceSales",
           COALESCE((
             SELECT SUM(si.total)
             FROM ${saleItems} si
             INNER JOIN ${sales} s3 ON si.sale_id = s3.id
             WHERE s3.status = 'COMPLETED'
               AND s3.created_at >= $1::date
               AND s3.created_at < ($2::date + INTERVAL '1 day')
               ${branchCond.replace(/s\./g, 's3.')}
               ${paymentCond.replace(/s\./g, 's3.')}
               AND si.item_type = 'product'
           ), 0)::text AS "productSales",
           COALESCE(SUM(s.discount), 0)::text AS "totalDiscounts"
         FROM ${sales} s
         WHERE s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
           ${paymentCond}`,
        ...params,
      );

      const trendRows = await tx.$queryRawUnsafe<
        Array<{
          date: string;
          label: string;
          serviceSales: string;
          productSales: string;
          discounts: string;
        }>
      >(
        `SELECT
           TO_CHAR(DATE(s.created_at), 'YYYY-MM-DD') AS date,
           TO_CHAR(DATE(s.created_at), 'DD Mon') AS label,
           COALESCE(SUM(CASE WHEN si.item_type = 'service' THEN si.total ELSE 0 END), 0)::text AS "serviceSales",
           COALESCE(SUM(CASE WHEN si.item_type = 'product' THEN si.total ELSE 0 END), 0)::text AS "productSales",
           COALESCE(AVG(s.discount), 0)::text AS discounts
         FROM ${sales} s
         LEFT JOIN ${saleItems} si ON si.sale_id = s.id
         WHERE s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
           ${paymentCond}
         GROUP BY DATE(s.created_at)
         ORDER BY DATE(s.created_at) ASC`,
        ...params,
      );

      const serviceTxRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          invoiceNo: string;
          createdAt: string;
          employeeName: string | null;
          customerName: string | null;
          customerPhone: string | null;
          serviceName: string | null;
          grossAmount: string;
          discountAmount: string;
          netAmount: string;
          paymentMethod: string | null;
          branchName: string | null;
        }>
      >(
        `SELECT
           si.id,
           s.sale_number AS "invoiceNo",
           TO_CHAR(s.created_at, 'DD Mon YYYY hh:mi AM') AS "createdAt",
           (SELECT e.name FROM ${saleItemEmployees} sie
            INNER JOIN ${employees} e ON sie.employee_id = e.id
            WHERE sie.sale_item_id = si.id LIMIT 1) AS "employeeName",
           COALESCE(c.name, 'Walk-in') AS "customerName",
           c.phone AS "customerPhone",
           sv.name AS "serviceName",
           (si.quantity * si.unit_price)::text AS "grossAmount",
           si.discount::text AS "discountAmount",
           si.total::text AS "netAmount",
           COALESCE((SELECT p.method::text FROM ${payments} p WHERE p.sale_id = s.id ORDER BY p.created_at ASC LIMIT 1), 'CASH') AS "paymentMethod",
           b.name AS "branchName"
         FROM ${saleItems} si
         INNER JOIN ${sales} s ON si.sale_id = s.id
         INNER JOIN ${services} sv ON si.service_id = sv.id
         LEFT JOIN ${customers} c ON s.customer_id = c.id
         LEFT JOIN ${branches} b ON s.branch_id = b.id
         WHERE si.item_type = 'service'
           AND s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
           ${paymentCond}
         ORDER BY s.created_at DESC`,
        ...params,
      );

      const productTxRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          invoiceNo: string;
          createdAt: string;
          customerName: string | null;
          customerPhone: string | null;
          productName: string | null;
          quantity: string;
          grossAmount: string;
          discountAmount: string;
          netAmount: string;
          paymentMethod: string | null;
          branchName: string | null;
        }>
      >(
        `SELECT
           si.id,
           s.sale_number AS "invoiceNo",
           TO_CHAR(s.created_at, 'DD Mon YYYY hh:mi AM') AS "createdAt",
           COALESCE(c.name, 'Walk-in') AS "customerName",
           c.phone AS "customerPhone",
           pr.name AS "productName",
           si.quantity::text AS quantity,
           (si.quantity * si.unit_price)::text AS "grossAmount",
           si.discount::text AS "discountAmount",
           si.total::text AS "netAmount",
           COALESCE((SELECT p.method::text FROM ${payments} p WHERE p.sale_id = s.id ORDER BY p.created_at ASC LIMIT 1), 'CASH') AS "paymentMethod",
           b.name AS "branchName"
         FROM ${saleItems} si
         INNER JOIN ${sales} s ON si.sale_id = s.id
         INNER JOIN ${products} pr ON si.product_id = pr.id
         LEFT JOIN ${customers} c ON s.customer_id = c.id
         LEFT JOIN ${branches} b ON s.branch_id = b.id
         WHERE si.item_type = 'product'
           AND s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
           ${paymentCond}
         ORDER BY s.created_at DESC`,
        ...params,
      );

      const totalSales = Number(summaryRows[0]?.totalSales ?? 0);
      const serviceSales = Number(summaryRows[0]?.serviceSales ?? 0);
      const productSales = Number(summaryRows[0]?.productSales ?? 0);
      const totalDiscounts = Number(summaryRows[0]?.totalDiscounts ?? 0);

      const totalItemSales = serviceSales + productSales || 1;
      const serviceSalesPct = Math.round((serviceSales / totalItemSales) * 100);
      const productSalesPct = Math.round((productSales / totalItemSales) * 100);

      return {
        summary: {
          totalSales,
          serviceSales,
          productSales,
          totalDiscounts,
          serviceSalesPct,
          productSalesPct,
          totalSalesGrowth: 12,
          discountsGrowth: 10,
        },
        chart: trendRows.map((r) => ({
          date: r.date,
          label: r.label,
          serviceSales: Number(r.serviceSales),
          productSales: Number(r.productSales),
          discounts: Number(r.discounts),
          total: Number(r.serviceSales) + Number(r.productSales),
        })),
        serviceTransactions: serviceTxRows.map((r) => ({
          id: r.id,
          invoiceNo: r.invoiceNo,
          createdAt: r.createdAt,
          employeeName: r.employeeName ?? '—',
          customerName: r.customerName ?? 'Walk-in',
          customerPhone: r.customerPhone ?? '—',
          serviceName: r.serviceName ?? 'Service',
          grossAmount: Number(r.grossAmount),
          discountAmount: Number(r.discountAmount),
          netAmount: Number(r.netAmount),
          paymentMethod: r.paymentMethod ?? 'Cash',
          branchName: r.branchName ?? 'Main Branch',
        })),
        productTransactions: productTxRows.map((r) => ({
          id: r.id,
          invoiceNo: r.invoiceNo,
          createdAt: r.createdAt,
          customerName: r.customerName ?? 'Walk-in',
          customerPhone: r.customerPhone ?? '—',
          productName: r.productName ?? 'Product',
          quantity: Number(r.quantity),
          grossAmount: Number(r.grossAmount),
          discountAmount: Number(r.discountAmount),
          netAmount: Number(r.netAmount),
          paymentMethod: r.paymentMethod ?? 'Cash',
          branchName: r.branchName ?? 'Main Branch',
        })),
      };
    });
  }

  async getEmployeePerformanceReport(
    schemaName: string,
    startDate: string,
    endDate: string,
    branchId?: string,
    search?: string,
  ) {
    const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');
    const saleItems = tenantTable(schemaName, 'sale_items');
    const sales = tenantTable(schemaName, 'sales');
    const employees = tenantTable(schemaName, 'employees');

    const params: unknown[] = [startDate, endDate];
    let idx = 3;
    let branchCond = '';
    if (branchId && branchId !== 'all') {
      branchCond = `AND s.branch_id = $${idx++}::uuid`;
      params.push(branchId);
    }
    let searchCond = '';
    if (search && search.trim()) {
      searchCond = `AND (e.name ILIKE $${idx} OR e.code ILIKE $${idx})`;
      params.push(`%${search.trim()}%`);
    }

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          name: string;
          code: string;
          designation: string | null;
          servicesCompleted: bigint;
          serviceSales: string;
          productSales: string;
        }>
      >(
        `SELECT
           e.id,
           e.name,
           e.code,
           e.designation,
           COUNT(DISTINCT CASE WHEN si.item_type = 'service' THEN si.id END)::bigint AS "servicesCompleted",
           COALESCE(SUM(CASE WHEN si.item_type = 'service' THEN si.total ELSE 0 END), 0)::text AS "serviceSales",
           COALESCE(SUM(CASE WHEN si.item_type = 'product' THEN si.total ELSE 0 END), 0)::text AS "productSales"
         FROM ${employees} e
         LEFT JOIN ${saleItemEmployees} sie ON sie.employee_id = e.id
         LEFT JOIN ${saleItems} si ON sie.sale_item_id = si.id
         LEFT JOIN ${sales} s ON si.sale_id = s.id AND s.status = 'COMPLETED'
           AND s.created_at >= $1::date
           AND s.created_at < ($2::date + INTERVAL '1 day')
           ${branchCond}
         WHERE e.status = 'ACTIVE'
           ${searchCond}
         GROUP BY e.id, e.name, e.code, e.designation
         ORDER BY COALESCE(SUM(CASE WHEN si.item_type = 'service' THEN si.total ELSE 0 END), 0) DESC, e.name ASC`,
        ...params,
      );

      const employeesData = rows.map((r, i) => {
        const serviceSales = Number(r.serviceSales);
        const productSales = Number(r.productSales);
        const totalSales = serviceSales + productSales;
        const commission = Math.round(serviceSales * 0.1);
        return {
          id: r.id,
          index: i + 1,
          name: r.name,
          code: r.code,
          designation: r.designation ?? 'Stylist',
          servicesCompleted: Number(r.servicesCompleted),
          serviceSales,
          productSales,
          totalSales,
          commission,
        };
      });

      const totalServicesCompleted = employeesData.reduce((s, e) => s + e.servicesCompleted, 0);
      const totalServiceSales = employeesData.reduce((s, e) => s + e.serviceSales, 0);
      const totalProductSales = employeesData.reduce((s, e) => s + e.productSales, 0);
      const totalSales = employeesData.reduce((s, e) => s + e.totalSales, 0);
      const totalCommission = employeesData.reduce((s, e) => s + e.commission, 0);

      return {
        employees: employeesData,
        summary: {
          totalServicesCompleted,
          totalServiceSales,
          totalProductSales,
          totalSales,
          totalCommission,
        },
      };
    });
  }

  async getInventoryReport(
    schemaName: string,
    branchId?: string,
    categoryId?: string,
    status?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const products = tenantTable(schemaName, 'products');
    const categories = tenantTable(schemaName, 'product_categories');
    const branchStock = tenantTable(schemaName, 'branch_stock');
    const stockMovements = tenantTable(schemaName, 'stock_movements');

    const params: unknown[] = [];
    let idx = 1;
    let branchCond = '';
    if (branchId && branchId !== 'all') {
      branchCond = `AND bs.branch_id = $${idx++}::uuid`;
      params.push(branchId);
    }

    const whereClauses: string[] = [];
    if (status && status.toUpperCase() === 'INACTIVE') {
      whereClauses.push('p.is_active = false');
    } else if (status && status.toUpperCase() === 'ACTIVE') {
      whereClauses.push('p.is_active = true');
    } else {
      whereClauses.push('p.is_active = true');
    }

    if (categoryId && categoryId !== 'all') {
      whereClauses.push(`p.category_id = $${idx++}::uuid`);
      params.push(categoryId);
    }

    if (search && search.trim()) {
      whereClauses.push(`(p.name ILIKE $${idx} OR p.code ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    let dateMovementsCond = '';
    if (startDate && endDate) {
      dateMovementsCond = `AND sm.created_at >= $${idx}::date AND sm.created_at < ($${idx + 1}::date + INTERVAL '1 day')`;
      params.push(startDate, endDate);
      idx += 2;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const rows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          name: string;
          sku: string;
          categoryName: string | null;
          imageUrl: string | null;
          sellingPrice: string;
          costPrice: string;
          currentStock: string;
          stockIn: string;
          stockOut: string;
          adjustments: string;
        }>
      >(
        `SELECT
           p.id,
           p.name,
           p.code AS sku,
           c.name AS "categoryName",
           p.image_url AS "imageUrl",
           p.selling_price::text AS "sellingPrice",
           p.cost_price::text AS "costPrice",
           COALESCE(SUM(bs.quantity), 0)::text AS "currentStock",
           COALESCE(
             (SELECT SUM(quantity) FROM ${stockMovements} sm
              WHERE sm.product_id = p.id AND sm.type::text IN ('IN', 'STOCK_IN') ${dateMovementsCond}), 0)::text AS "stockIn",
           COALESCE(
             (SELECT SUM(quantity) FROM ${stockMovements} sm
              WHERE sm.product_id = p.id AND sm.type::text IN ('OUT', 'SALE', 'DAMAGE') ${dateMovementsCond}), 0)::text AS "stockOut",
           COALESCE(
             (SELECT COUNT(*) FROM ${stockMovements} sm
              WHERE sm.product_id = p.id AND sm.type::text IN ('ADJUSTMENT', 'TRANSFER') ${dateMovementsCond}), 0)::text AS adjustments
         FROM ${products} p
         LEFT JOIN ${categories} c ON p.category_id = c.id
         LEFT JOIN ${branchStock} bs ON bs.product_id = p.id ${branchCond}
         ${whereSql}
         GROUP BY p.id, p.name, p.code, c.name, p.image_url, p.selling_price, p.cost_price
         ORDER BY p.name ASC`,
        ...params,
      );

      const productsData = rows.map((r, i) => {
        const currentStock = Number(r.currentStock);
        const sellingPrice = Number(r.sellingPrice);
        const stockValue = currentStock * sellingPrice;
        const stockIn = Number(r.stockIn);
        const stockOut = Number(r.stockOut);
        const adjustments = Number(r.adjustments);
        const stockStatus =
          currentStock <= 0 ? 'Out of Stock' : currentStock <= 5 ? 'Low Stock' : 'In Stock';

        return {
          id: r.id,
          index: i + 1,
          name: r.name,
          sku: r.sku,
          categoryName: r.categoryName ?? 'General',
          imageUrl: r.imageUrl,
          currentStock,
          stockValue,
          stockIn,
          stockOut,
          adjustments,
          status: stockStatus,
        };
      });

      const totalProducts = productsData.length;
      const totalStockUnits = productsData.reduce((s, p) => s + p.currentStock, 0);
      const totalStockValue = productsData.reduce((s, p) => s + p.stockValue, 0);
      const lowStockCount = productsData.filter((p) => p.status === 'Low Stock').length;
      const outOfStockCount = productsData.filter((p) => p.status === 'Out of Stock').length;
      const totalStockIn = productsData.reduce((s, p) => s + p.stockIn, 0);
      const totalStockOut = productsData.reduce((s, p) => s + p.stockOut, 0);
      const totalAdjustments = productsData.reduce((s, p) => s + p.adjustments, 0);

      return {
        products: productsData,
        summary: {
          totalProducts,
          totalStockUnits,
          totalStockValue,
          lowStockCount,
          outOfStockCount,
        },
        summaryTotals: {
          currentStock: totalStockUnits,
          stockValue: totalStockValue,
          stockIn: totalStockIn,
          stockOut: totalStockOut,
          adjustments: totalAdjustments,
        },
      };
    });
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
