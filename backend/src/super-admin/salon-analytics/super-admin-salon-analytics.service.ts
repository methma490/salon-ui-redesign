import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SubscriptionStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { assertTrustedTenantSchemaName, tenantTable } from '../../tenant/utils/schema-name.util';
import {
  SalonAnalyticsAppointmentsQueryDto,
  SalonAnalyticsCustomersQueryDto,
  SalonAnalyticsDateRangeDto,
  SalonAnalyticsListQueryDto,
  SalonAnalyticsSalesQueryDto,
  SalonAnalyticsServicesQueryDto,
} from './dto/salon-analytics.dto';

function resolveDateRange(from?: string, to?: string): { start: string; end: string } {
  const toDateString = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const parseDate = (val?: string): string | null => {
    if (!val) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return toDateString(d);
    return null;
  };

  const now = new Date();
  const defaultTo = toDateString(now);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const defaultFrom = toDateString(thirtyDaysAgo);

  return {
    start: parseDate(from) ?? defaultFrom,
    end: parseDate(to) ?? defaultTo,
  };
}

@Injectable()
export class SuperAdminSalonAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSchemaService: TenantSchemaService,
  ) {}

  /**
   * Securely validates tenant existence and verifies trusted schema name format.
   */
  async resolveTenantContext(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { plan: { select: { name: true, code: true } } },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Salon with id "${tenantId}" not found`);
    }

    assertTrustedTenantSchemaName(tenant.schemaName);

    const isTrial = tenant.subscriptions?.[0]?.status === SubscriptionStatus.TRIAL || tenant.subscriptions?.[0]?.status === ('TRIAL' as any);
    const displayStatus = isTrial ? 'TRIAL' : tenant.status;

    return {
      tenant,
      schemaName: tenant.schemaName,
      planName: tenant.subscriptions[0]?.plan?.name ?? 'Standard',
      displayStatus,
    };
  }

  /**
   * Platform-wide list of salons with operational KPI performance aggregates.
   */
  async getSalonAnalyticsList(query: SalonAnalyticsListQueryDto) {
    const { start, end } = resolveDateRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {};
    if (query.status === 'TRIAL') {
      where.subscriptions = {
        some: {
          status: SubscriptionStatus.TRIAL,
        },
      };
    } else if (query.status && query.status !== 'ALL') {
      where.status = query.status as TenantStatus;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [allMatchingTenants, totalTenantsCount] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          schemaName: true,
          subscriptions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { status: true, plan: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    // Query per-tenant operational performance
    const salonPerformancePromises = allMatchingTenants.map(async (t) => {
      try {
        assertTrustedTenantSchemaName(t.schemaName);

        const isTrial = t.subscriptions?.[0]?.status === SubscriptionStatus.TRIAL || t.subscriptions?.[0]?.status === ('TRIAL' as any);
        const displayStatus = isTrial ? 'TRIAL' : t.status;

        return await this.tenantSchemaService.withTenantSchema(t.schemaName, async ({ tx }) => {
          const customers = tenantTable(t.schemaName, 'customers');
          const sales = tenantTable(t.schemaName, 'sales');
          const saleItems = tenantTable(t.schemaName, 'sale_items');
          const services = tenantTable(t.schemaName, 'services');
          const expenses = tenantTable(t.schemaName, 'expenses');
          const appointments = tenantTable(t.schemaName, 'appointments');
          const payroll = tenantTable(t.schemaName, 'payroll_runs');
          const branches = tenantTable(t.schemaName, 'branches');

          const [
            custCountRes,
            salesRes,
            expensesRes,
            payrollRes,
            apptsRes,
            topServiceRes,
            branchesRes,
          ] = await Promise.all([
            tx.$queryRawUnsafe<Array<{ count: bigint }>>(
              `SELECT COUNT(*)::bigint AS count FROM ${customers}`,
            ).catch(() => [{ count: 0n }]),
            tx.$queryRawUnsafe<Array<{ count: bigint; revenue: string }>>(
              `SELECT COUNT(*)::bigint AS count, COALESCE(SUM(total), 0)::text AS revenue
               FROM ${sales}
               WHERE status = 'COMPLETED'
                 AND created_at >= $1::date
                 AND created_at < ($2::date + INTERVAL '1 day')`,
              start,
              end,
            ).catch(() => [{ count: 0n, revenue: '0' }]),
            tx.$queryRawUnsafe<Array<{ total: string }>>(
              `SELECT COALESCE(SUM(amount), 0)::text AS total
               FROM ${expenses}
               WHERE status = 'ACTIVE'
                 AND expense_date >= $1::date
                 AND expense_date <= $2::date`,
              start,
              end,
            ).catch(() => [{ total: '0' }]),
            tx.$queryRawUnsafe<Array<{ total: string }>>(
              `SELECT COALESCE(SUM(total_net), 0)::text AS total
               FROM ${payroll}
               WHERE created_at >= $1::date
                 AND created_at < ($2::date + INTERVAL '1 day')`,
              start,
              end,
            ).catch(() => [{ total: '0' }]),
            tx.$queryRawUnsafe<Array<{ total: bigint; completed: bigint; cancelled: bigint }>>(
              `SELECT COUNT(*)::bigint AS total,
                      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::bigint AS completed,
                      COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::bigint AS cancelled
               FROM ${appointments}
               WHERE appointment_date >= $1::date
                 AND appointment_date <= $2::date`,
              start,
              end,
            ).catch(() => [{ total: 0n, completed: 0n, cancelled: 0n }]),
            tx.$queryRawUnsafe<Array<{ name: string }>>(
              `SELECT COALESCE(svc.name, 'Service') AS name
               FROM ${saleItems} si
               JOIN ${sales} s ON s.id = si.sale_id
               LEFT JOIN ${services} svc ON svc.id = si.service_id
               WHERE s.status = 'COMPLETED'
                 AND s.created_at >= $1::date
                 AND s.created_at < ($2::date + INTERVAL '1 day')
                 AND (si.item_type = 'service' OR si.service_id IS NOT NULL)
               GROUP BY svc.name
               ORDER BY COUNT(*) DESC
               LIMIT 1`,
              start,
              end,
            ).catch(() => []),
            tx.$queryRawUnsafe<Array<{ count: bigint }>>(
              `SELECT COUNT(*)::bigint AS count FROM ${branches}`,
            ).catch(() => [{ count: 1n }]),
          ]);

          const customerCount = Number(custCountRes[0]?.count ?? 0);
          const salesCount = Number(salesRes[0]?.count ?? 0);
          const revenue = Number(salesRes[0]?.revenue ?? 0);
          const expenseAmount = Number(expensesRes[0]?.total ?? 0);
          const salaryAmount = Number(payrollRes[0]?.total ?? 0);
          const totalExpenses = expenseAmount + salaryAmount;
          const estimatedProfit = revenue - totalExpenses;
          const appointmentCount = Number(apptsRes[0]?.total ?? 0);
          const completedAppointments = Number(apptsRes[0]?.completed ?? 0);
          const cancelledAppointments = Number(apptsRes[0]?.cancelled ?? 0);
          const topService = topServiceRes[0]?.name ?? null;
          const branchCount = Number(branchesRes[0]?.count ?? 1);

          return {
            tenantId: t.id,
            salonName: t.name,
            code: t.code,
            status: displayStatus,
            planName: t.subscriptions[0]?.plan?.name ?? 'Standard',
            branchCount,
            customers: customerCount,
            customerCount,
            sales: salesCount,
            salesCount,
            revenue,
            expenses: totalExpenses,
            operatingExpenses: expenseAmount,
            salaries: salaryAmount,
            estimatedProfit,
            appointments: appointmentCount,
            appointmentCount,
            completedAppointments,
            cancelledAppointments,
            topService,
          };
        });
      } catch {
        return {
          tenantId: t.id,
          salonName: t.name,
          code: t.code,
          status: t.status,
          planName: t.subscriptions[0]?.plan?.name ?? 'Standard',
          branchCount: 1,
          customers: 0,
          customerCount: 0,
          sales: 0,
          salesCount: 0,
          revenue: 0,
          expenses: 0,
          operatingExpenses: 0,
          salaries: 0,
          estimatedProfit: 0,
          appointments: 0,
          appointmentCount: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          topService: null,
        };
      }
    });

    const allSalonsData = await Promise.all(salonPerformancePromises);

    // Platform-wide Summary Totals
    const platformSummary = allSalonsData.reduce(
      (acc, curr) => {
        acc.totalCustomers += curr.customerCount;
        acc.totalSales += curr.salesCount;
        acc.totalRevenue += curr.revenue;
        acc.totalExpenses += curr.expenses;
        acc.totalEstimatedProfit += curr.estimatedProfit;
        acc.totalAppointments += curr.appointmentCount;
        acc.cancelledAppointments += curr.cancelledAppointments;
        return acc;
      },
      {
        totalSalons: totalTenantsCount,
        totalCustomers: 0,
        totalSales: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        totalEstimatedProfit: 0,
        totalAppointments: 0,
        cancelledAppointments: 0,
      },
    );

    // Sorting
    const sortBy = query.sort ?? query.sortBy ?? 'revenue';
    const isAsc = query.sortOrder === 'asc';
    allSalonsData.sort((a, b) => {
      let valA: any = a.revenue;
      let valB: any = b.revenue;
      if (sortBy === 'name') {
        valA = a.salonName.toLowerCase();
        valB = b.salonName.toLowerCase();
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortBy === 'profit') {
        valA = a.estimatedProfit;
        valB = b.estimatedProfit;
      } else if (sortBy === 'sales') {
        valA = a.salesCount;
        valB = b.salesCount;
      } else if (sortBy === 'customers') {
        valA = a.customerCount;
        valB = b.customerCount;
      } else if (sortBy === 'appointments') {
        valA = a.appointmentCount;
        valB = b.appointmentCount;
      }
      return isAsc ? valA - valB : valB - valA;
    });

    const paginatedSalons = allSalonsData.slice(skip, skip + limit);

    return {
      dateRange: { start, end },
      summary: platformSummary,
      salons: paginatedSalons,
      pagination: {
        page,
        limit,
        total: totalTenantsCount,
        pages: Math.ceil(totalTenantsCount / limit),
      },
      meta: {
        total: totalTenantsCount,
        page,
        limit,
        totalPages: Math.ceil(totalTenantsCount / limit),
      },
    };
  }

  /**
   * Salon 360: Overview Tab
   */
  async getSalonOverview(tenantId: string, query: SalonAnalyticsDateRangeDto) {
    const { tenant, schemaName, planName, displayStatus } = await this.resolveTenantContext(tenantId);
    const { start, end } = resolveDateRange(query.from, query.to);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const customers = tenantTable(schemaName, 'customers');
      const sales = tenantTable(schemaName, 'sales');
      const saleItems = tenantTable(schemaName, 'sale_items');
      const services = tenantTable(schemaName, 'services');
      const expenses = tenantTable(schemaName, 'expenses');
      const payroll = tenantTable(schemaName, 'payroll_runs');
      const appointments = tenantTable(schemaName, 'appointments');
      const branches = tenantTable(schemaName, 'branches');

      const [
        branchesCountRes,
        customersKpiRes,
        newCustomersRes,
        returningCustomersRes,
        salesKpiRes,
        expensesKpiRes,
        salariesKpiRes,
        apptsKpiRes,
        revenueTrendRes,
        salesTrendRes,
        customerGrowthRes,
        apptDistributionRes,
        topServicesRes,
      ] = await Promise.all([
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${branches}`,
        ).catch(() => [{ count: 1n }]),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${customers}`,
        ).catch(() => [{ count: 0n }]),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${customers}
           WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')`,
          start,
          end,
        ).catch(() => [{ count: 0n }]),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM (
             SELECT customer_id FROM ${sales}
             WHERE status = 'COMPLETED' AND customer_id IS NOT NULL
             GROUP BY customer_id HAVING COUNT(*) > 1
           ) t`,
        ).catch(() => [{ count: 0n }]),
        tx.$queryRawUnsafe<Array<{ count: bigint; revenue: string }>>(
          `SELECT COUNT(*)::bigint AS count, COALESCE(SUM(total), 0)::text AS revenue
           FROM ${sales}
           WHERE status = 'COMPLETED'
             AND created_at >= $1::date
             AND created_at < ($2::date + INTERVAL '1 day')`,
          start,
          end,
        ).catch(() => [{ count: 0n, revenue: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM ${expenses}
           WHERE status = 'ACTIVE'
             AND expense_date >= $1::date
             AND expense_date <= $2::date`,
          start,
          end,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(total_net), 0)::text AS total
           FROM ${payroll}
           WHERE created_at >= $1::date
             AND created_at < ($2::date + INTERVAL '1 day')`,
          start,
          end,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{
          total: bigint;
          confirmed: bigint;
          completed: bigint;
          cancelled: bigint;
          no_show: bigint;
          pending: bigint;
          upcoming: bigint;
        }>>(
          `SELECT COUNT(*)::bigint AS total,
                  COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END)::bigint AS confirmed,
                  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::bigint AS completed,
                  COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::bigint AS cancelled,
                  COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END)::bigint AS no_show,
                  COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::bigint AS pending,
                  COUNT(CASE WHEN appointment_date >= CURRENT_DATE AND status IN ('PENDING', 'CONFIRMED') THEN 1 END)::bigint AS upcoming
           FROM ${appointments}
           WHERE appointment_date >= $1::date
             AND appointment_date <= $2::date`,
          start,
          end,
        ).catch(() => [{
          total: 0n, confirmed: 0n, completed: 0n, cancelled: 0n, no_show: 0n, pending: 0n, upcoming: 0n,
        }]),
        // Daily Revenue & Expense trend
        tx.$queryRawUnsafe<Array<{ date: string; revenue: string; expenses: string }>>(
          `WITH dates AS (
             SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d
           ),
           daily_sales AS (
             SELECT created_at::date AS d, COALESCE(SUM(total), 0) AS revenue
             FROM ${sales}
             WHERE status = 'COMPLETED' AND created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
             GROUP BY created_at::date
           ),
           daily_expenses AS (
             SELECT expense_date AS d, COALESCE(SUM(amount), 0) AS expenses
             FROM ${expenses}
             WHERE status = 'ACTIVE' AND expense_date >= $1::date AND expense_date <= $2::date
             GROUP BY expense_date
           )
           SELECT dates.d::text AS date,
                  COALESCE(daily_sales.revenue, 0)::text AS revenue,
                  COALESCE(daily_expenses.expenses, 0)::text AS expenses
           FROM dates
           LEFT JOIN daily_sales ON daily_sales.d = dates.d
           LEFT JOIN daily_expenses ON daily_expenses.d = dates.d
           ORDER BY dates.d ASC`,
          start,
          end,
        ).catch(() => []),
        // Daily Sales trend
        tx.$queryRawUnsafe<Array<{ date: string; count: bigint; avg: string }>>(
          `WITH dates AS (
             SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d
           ),
           daily AS (
             SELECT created_at::date AS d, COUNT(*) AS cnt, AVG(total) AS average
             FROM ${sales}
             WHERE status = 'COMPLETED' AND created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
             GROUP BY created_at::date
           )
           SELECT dates.d::text AS date,
                  COALESCE(daily.cnt, 0)::bigint AS count,
                  COALESCE(daily.average, 0)::text AS avg
           FROM dates
           LEFT JOIN daily ON daily.d = dates.d
           ORDER BY dates.d ASC`,
          start,
          end,
        ).catch(() => []),
        // Customer growth
        tx.$queryRawUnsafe<Array<{ date: string; count: bigint }>>(
          `SELECT created_at::date::text AS date, COUNT(*)::bigint AS count
           FROM ${customers}
           WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
           GROUP BY created_at::date
           ORDER BY created_at::date ASC`,
          start,
          end,
        ).catch(() => []),
        // Appointment status distribution
        tx.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
          `SELECT status::text, COUNT(*)::bigint AS count
           FROM ${appointments}
           WHERE appointment_date >= $1::date AND appointment_date <= $2::date
           GROUP BY status`,
          start,
          end,
        ).catch(() => []),
        // Top 5 services
        tx.$queryRawUnsafe<Array<{ name: string; bookings: bigint; revenue: string }>>(
          `SELECT COALESCE(svc.name, 'Service') AS name, COUNT(si.id)::bigint AS bookings, COALESCE(SUM(si.total), 0)::text AS revenue
           FROM ${saleItems} si
           JOIN ${sales} s ON s.id = si.sale_id
           LEFT JOIN ${services} svc ON svc.id = si.service_id
           WHERE s.status = 'COMPLETED'
             AND s.created_at >= $1::date
             AND s.created_at < ($2::date + INTERVAL '1 day')
             AND (si.item_type = 'service' OR si.service_id IS NOT NULL)
           GROUP BY svc.name
           ORDER BY COALESCE(SUM(si.total), 0) DESC
           LIMIT 5`,
          start,
          end,
        ).catch(() => []),
      ]);

      const totalCustomers = Number(customersKpiRes[0]?.count ?? 0);
      const newCustomers = Number(newCustomersRes[0]?.count ?? 0);
      const returningCustomers = Number(returningCustomersRes[0]?.count ?? 0);

      const totalSales = Number(salesKpiRes[0]?.count ?? 0);
      const revenue = Number(salesKpiRes[0]?.revenue ?? 0);
      const averageSaleValue = totalSales > 0 ? revenue / totalSales : 0;

      const operatingExpenses = Number(expensesKpiRes[0]?.total ?? 0);
      const salaries = Number(salariesKpiRes[0]?.total ?? 0);
      const totalExpenses = operatingExpenses + salaries;
      const estimatedProfit = revenue - totalExpenses;

      const appt = apptsKpiRes[0];
      const branchCount = Number(branchesCountRes[0]?.count ?? 1);

      return {
        dateRange: { start, end },
        salon: {
          tenantId: tenant.id,
          name: tenant.name,
          code: tenant.code,
          status: displayStatus,
          planName,
          branchCount,
          branchesCount: branchCount,
        },
        kpis: {
          totalCustomers,
          newCustomers,
          returningCustomers,
          totalSales,
          revenue,
          averageSaleValue,
          operatingExpenses,
          salaries,
          totalExpenses,
          estimatedProfit,
          totalAppointments: Number(appt?.total ?? 0),
          confirmedAppointments: Number(appt?.confirmed ?? 0),
          completedAppointments: Number(appt?.completed ?? 0),
          cancelledAppointments: Number(appt?.cancelled ?? 0),
          noShowAppointments: Number(appt?.no_show ?? 0),
          pendingAppointments: Number(appt?.pending ?? 0),
          upcomingAppointments: Number(appt?.upcoming ?? 0),
        },
        charts: {
          revenueTrend: revenueTrendRes.map((r) => {
            const rev = Number(r.revenue);
            const exp = Number(r.expenses);
            return {
              date: r.date,
              revenue: rev,
              expenses: exp,
              profit: rev - exp,
            };
          }),
          salesTrend: salesTrendRes.map((s) => ({
            date: s.date,
            sales: Number(s.count),
            average: Number(s.avg),
          })),
          customerGrowth: customerGrowthRes.map((c) => ({
            date: c.date,
            newCustomers: Number(c.count),
          })),
          appointmentDistribution: apptDistributionRes.map((a) => ({
            name: a.status,
            value: Number(a.count),
          })),
          topServices: topServicesRes.map((s) => ({
            name: s.name,
            count: Number(s.bookings),
            revenue: Number(s.revenue),
          })),
        },
      };
    });
  }

  /**
   * Salon 360: Customers Tab
   */
  async getSalonCustomers(tenantId: string, query: SalonAnalyticsCustomersQueryDto) {
    const { schemaName } = await this.resolveTenantContext(tenantId);
    const { start, end } = resolveDateRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const customers = tenantTable(schemaName, 'customers');
      const sales = tenantTable(schemaName, 'sales');

      const searchTerm = query.search?.trim() ? `%${query.search.trim().toLowerCase()}%` : null;

      const [summaryRes, newCustRes, returningCustRes, topSpendRes, countRes, listRes] =
        await Promise.all([
          tx.$queryRawUnsafe<Array<{ total: bigint }>>(
            `SELECT COUNT(*)::bigint AS total FROM ${customers}`,
          ).catch(() => [{ total: 0n }]),
          tx.$queryRawUnsafe<Array<{ total: bigint }>>(
            `SELECT COUNT(*)::bigint AS total FROM ${customers}
             WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')`,
            start,
            end,
          ).catch(() => [{ total: 0n }]),
          tx.$queryRawUnsafe<Array<{ total: bigint }>>(
            `SELECT COUNT(*)::bigint AS total FROM (
               SELECT customer_id FROM ${sales}
               WHERE status = 'COMPLETED' AND customer_id IS NOT NULL
               GROUP BY customer_id HAVING COUNT(*) > 1
             ) t`,
          ).catch(() => [{ total: 0n }]),
          tx.$queryRawUnsafe<Array<{ top_spend: string }>>(
            `SELECT COALESCE(MAX(t.total_spend), 0)::text AS top_spend FROM (
               SELECT SUM(total) AS total_spend FROM ${sales}
               WHERE status = 'COMPLETED' AND customer_id IS NOT NULL
               GROUP BY customer_id
             ) t`,
          ).catch(() => [{ top_spend: '0' }]),
          // Total matching search count
          tx.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*)::bigint AS count
             FROM ${customers} c
             WHERE ($1::text IS NULL OR LOWER(c.name) LIKE $1 OR LOWER(COALESCE(c.phone, '')) LIKE $1 OR LOWER(COALESCE(c.email, '')) LIKE $1)`,
            searchTerm,
          ).catch(() => [{ count: 0n }]),
          // Customers table rows
          tx.$queryRawUnsafe<Array<{
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
            status: string;
            createdAt: Date;
            totalVisits: bigint;
            totalSpend: string;
            lastVisit: string | null;
          }>>(
            `SELECT c.id, c.name, c.phone, c.email, c.status, c.created_at AS "createdAt",
                    COUNT(s.id)::bigint AS "totalVisits",
                    COALESCE(SUM(s.total), 0)::text AS "totalSpend",
                    MAX(s.created_at)::text AS "lastVisit"
             FROM ${customers} c
             LEFT JOIN ${sales} s ON s.customer_id = c.id AND s.status = 'COMPLETED'
             WHERE ($1::text IS NULL OR LOWER(c.name) LIKE $1 OR LOWER(COALESCE(c.phone, '')) LIKE $1 OR LOWER(COALESCE(c.email, '')) LIKE $1)
             GROUP BY c.id, c.name, c.phone, c.email, c.status, c.created_at
             ORDER BY ${
               (query.sort ?? query.sortBy) === 'name'
                 ? 'c.name'
                 : (query.sort ?? query.sortBy) === 'visits'
                 ? '"totalVisits"'
                 : (query.sort ?? query.sortBy) === 'created_at'
                 ? 'c.created_at'
                 : (query.sort ?? query.sortBy) === 'last_visit'
                 ? '"lastVisit"'
                 : 'COALESCE(SUM(s.total), 0)'
             } ${query.sortOrder === 'asc' ? 'ASC' : 'DESC'} NULLS LAST
             LIMIT $2 OFFSET $3`,
            searchTerm,
            limit,
            skip,
          ).catch(() => []),
        ]);

      const totalCustomers = Number(summaryRes[0]?.total ?? 0);
      const newCustomers = Number(newCustRes[0]?.total ?? 0);
      const returningCustomers = Number(returningCustRes[0]?.total ?? 0);
      const inactiveCustomers = Math.max(0, totalCustomers - returningCustomers - newCustomers);
      const totalFiltered = Number(countRes[0]?.count ?? 0);

      return {
        dateRange: { start, end },
        summary: {
          totalCustomers,
          newCustomers,
          returningCustomers,
          inactiveCustomers,
          topSpenderSpend: Number(topSpendRes[0]?.top_spend ?? 0),
        },
        metrics: {
          totalCustomers,
          newCustomers,
          returningCustomers,
          inactiveCustomers,
          topSpendingCustomersCount: Number(topSpendRes[0]?.top_spend ?? 0),
        },
        customers: listRes.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? '',
          email: c.email ?? '',
          status: c.status,
          createdAt: String(c.createdAt),
          totalVisits: Number(c.totalVisits),
          totalSpend: Number(c.totalSpend),
          lastVisit: c.lastVisit,
        })),
        pagination: {
          total: totalFiltered,
          page,
          limit,
          pages: Math.ceil(totalFiltered / limit),
        },
        meta: {
          total: totalFiltered,
          page,
          limit,
          totalPages: Math.ceil(totalFiltered / limit),
        },
      };
    });
  }

  /**
   * Salon 360: Sales Tab
   */
  async getSalonSales(tenantId: string, query: SalonAnalyticsSalesQueryDto) {
    const { schemaName } = await this.resolveTenantContext(tenantId);
    const { start, end } = resolveDateRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const sales = tenantTable(schemaName, 'sales');
      const saleItems = tenantTable(schemaName, 'sale_items');
      const customers = tenantTable(schemaName, 'customers');
      const branches = tenantTable(schemaName, 'branches');
      const payments = tenantTable(schemaName, 'payments');
      const employees = tenantTable(schemaName, 'employees');
      const saleItemEmployees = tenantTable(schemaName, 'sale_item_employees');

      const conditions: string[] = [
        `s.status = 'COMPLETED'`,
        `s.created_at >= $1::date`,
        `s.created_at < ($2::date + INTERVAL '1 day')`,
      ];
      const params: unknown[] = [start, end];
      let pIdx = 3;

      if (query.branchId) {
        conditions.push(`s.branch_id = $${pIdx++}::uuid`);
        params.push(query.branchId);
      }
      if (query.employeeId) {
        conditions.push(
          `EXISTS (
            SELECT 1 FROM ${saleItems} si2
            JOIN ${saleItemEmployees} sie2 ON sie2.sale_item_id = si2.id
            WHERE si2.sale_id = s.id AND sie2.employee_id = $${pIdx++}::uuid
          )`,
        );
        params.push(query.employeeId);
      }
      if (query.paymentMethod && query.paymentMethod !== 'ALL') {
        conditions.push(
          `EXISTS (
            SELECT 1 FROM ${payments} p2
            WHERE p2.sale_id = s.id AND p2.method::text = $${pIdx++}
          )`,
        );
        params.push(query.paymentMethod);
      }
      if (query.search?.trim()) {
        const term = `%${query.search.trim().toLowerCase()}%`;
        conditions.push(
          `(LOWER(s.sale_number) LIKE $${pIdx} OR LOWER(COALESCE(c.name, '')) LIKE $${pIdx})`,
        );
        params.push(term);
        pIdx++;
      }

      const whereClause = conditions.join(' AND ');

      const [summaryRes, serviceRevRes, productRevRes, countRes, salesListRes] = await Promise.all([
        tx.$queryRawUnsafe<Array<{ count: bigint; revenue: string }>>(
          `SELECT COUNT(s.id)::bigint AS count, COALESCE(SUM(s.total), 0)::text AS revenue
           FROM ${sales} s
           LEFT JOIN ${customers} c ON c.id = s.customer_id
           WHERE ${whereClause}`,
          ...params,
        ).catch(() => [{ count: 0n, revenue: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(si.total), 0)::text AS total
           FROM ${saleItems} si
           JOIN ${sales} s ON s.id = si.sale_id
           LEFT JOIN ${customers} c ON c.id = s.customer_id
           WHERE ${whereClause} AND (si.item_type = 'service' OR si.service_id IS NOT NULL)`,
          ...params,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(si.total), 0)::text AS total
           FROM ${saleItems} si
           JOIN ${sales} s ON s.id = si.sale_id
           LEFT JOIN ${customers} c ON c.id = s.customer_id
           WHERE ${whereClause} AND (si.item_type = 'product' OR si.product_id IS NOT NULL)`,
          ...params,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(s.id)::bigint AS count
           FROM ${sales} s
           LEFT JOIN ${customers} c ON c.id = s.customer_id
           WHERE ${whereClause}`,
          ...params,
        ).catch(() => [{ count: 0n }]),
        tx.$queryRawUnsafe<Array<{
          id: string;
          saleNumber: string;
          customerName: string | null;
          branchName: string | null;
          amount: string;
          saleDate: Date;
          status: string;
          paymentMethod: string | null;
          performerName: string | null;
        }>>(
          `SELECT s.id, s.sale_number AS "saleNumber", s.total::text AS "amount",
                  s.created_at AS "saleDate", s.status,
                  c.name AS "customerName",
                  b.name AS "branchName",
                  (SELECT method::text FROM ${payments} p WHERE p.sale_id = s.id LIMIT 1) AS "paymentMethod",
                  (SELECT e.name FROM ${saleItems} si
                   JOIN ${saleItemEmployees} sie ON sie.sale_item_id = si.id
                   JOIN ${employees} e ON e.id = sie.employee_id
                   WHERE si.sale_id = s.id LIMIT 1) AS "performerName"
           FROM ${sales} s
           LEFT JOIN ${customers} c ON c.id = s.customer_id
           LEFT JOIN ${branches} b ON b.id = s.branch_id
           WHERE ${whereClause}
           ORDER BY s.created_at DESC
           LIMIT $${pIdx++} OFFSET $${pIdx++}`,
          ...params,
          limit,
          skip,
        ).catch(() => []),
      ]);

      const totalSales = Number(summaryRes[0]?.count ?? 0);
      const totalRevenue = Number(summaryRes[0]?.revenue ?? 0);
      const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
      const serviceRevenue = Number(serviceRevRes[0]?.total ?? 0);
      const productRevenue = Number(productRevRes[0]?.total ?? 0);
      const totalFiltered = Number(countRes[0]?.count ?? 0);

      const kpis = {
        totalSales,
        totalRevenue,
        averageSaleValue,
        serviceRevenue,
        productRevenue,
      };

      return {
        dateRange: { start, end },
        summary: kpis,
        kpis,
        sales: salesListRes.map((s) => ({
          id: s.id,
          invoiceNumber: s.saleNumber,
          saleNumber: s.saleNumber,
          customerName: s.customerName ?? 'Walk-in Customer',
          branchName: s.branchName ?? 'Main Branch',
          employeeName: s.performerName ?? 'Unassigned',
          performerName: s.performerName ?? 'Unassigned',
          amount: Number(s.amount),
          paymentMethod: s.paymentMethod ?? 'CASH',
          saleDate: String(s.saleDate),
          status: s.status,
        })),
        pagination: {
          total: totalFiltered,
          page,
          limit,
          pages: Math.ceil(totalFiltered / limit),
        },
        meta: {
          total: totalFiltered,
          page,
          limit,
          totalPages: Math.ceil(totalFiltered / limit),
        },
      };
    });
  }

  /**
   * Salon 360: Services Tab
   */
  async getSalonServices(tenantId: string, query: SalonAnalyticsServicesQueryDto) {
    const { schemaName } = await this.resolveTenantContext(tenantId);
    const { start, end } = resolveDateRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const services = tenantTable(schemaName, 'services');
      const serviceCategories = tenantTable(schemaName, 'service_categories');
      const saleItems = tenantTable(schemaName, 'sale_items');
      const sales = tenantTable(schemaName, 'sales');

      const searchTerm = query.search?.trim() ? `%${query.search.trim().toLowerCase()}%` : null;

      const [highlightsRes, countRes, listRes] = await Promise.all([
        // Highlights: most booked and highest revenue
        tx.$queryRawUnsafe<Array<{ id: string; name: string; bookings: bigint; revenue: string }>>(
          `SELECT s.id, s.name, COUNT(si.id)::bigint AS bookings, COALESCE(SUM(si.total), 0)::text AS revenue
           FROM ${services} s
           LEFT JOIN ${saleItems} si ON si.service_id = s.id
           LEFT JOIN ${sales} sale ON sale.id = si.sale_id AND sale.status = 'COMPLETED' AND sale.created_at >= $1::date AND sale.created_at < ($2::date + INTERVAL '1 day')
           GROUP BY s.id, s.name
           HAVING COUNT(si.id) > 0
           ORDER BY COALESCE(SUM(si.total), 0) DESC`,
          start,
          end,
        ).catch(() => []),
        // Filtered count
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count
           FROM ${services} s
           WHERE ($1::text IS NULL OR LOWER(s.name) LIKE $1 OR LOWER(s.code) LIKE $1)`,
          searchTerm,
        ).catch(() => [{ count: 0n }]),
        // Services table list
        tx.$queryRawUnsafe<Array<{
          id: string;
          name: string;
          code: string;
          categoryName: string | null;
          price: string;
          bookingsCount: bigint;
          uniqueCustomers: bigint;
          revenue: string;
        }>>(
          `SELECT s.id, s.name, s.code, sc.name AS "categoryName", s.price::text AS price,
                  COUNT(si.id)::bigint AS "bookingsCount",
                  COUNT(DISTINCT sale.customer_id)::bigint AS "uniqueCustomers",
                  COALESCE(SUM(si.total), 0)::text AS "revenue"
           FROM ${services} s
           LEFT JOIN ${serviceCategories} sc ON sc.id = s.category_id
           LEFT JOIN ${saleItems} si ON si.service_id = s.id
           LEFT JOIN ${sales} sale ON sale.id = si.sale_id AND sale.status = 'COMPLETED' AND sale.created_at >= $1::date AND sale.created_at < ($2::date + INTERVAL '1 day')
           WHERE ($1::text IS NULL OR LOWER(s.name) LIKE $1 OR LOWER(s.code) LIKE $1)
           GROUP BY s.id, s.name, s.code, sc.name, s.price
           ORDER BY ${
             (query.sort ?? query.sortBy) === 'highest_revenue' ||
             (query.sort ?? query.sortBy) === 'revenue_desc' ||
             (query.sort ?? query.sortBy) === 'revenue'
               ? 'COALESCE(SUM(si.total), 0) DESC'
               : (query.sort ?? query.sortBy) === 'lowest_revenue' ||
                 (query.sort ?? query.sortBy) === 'revenue_asc'
               ? 'COALESCE(SUM(si.total), 0) ASC'
               : 'COUNT(si.id) DESC'
           }
           LIMIT $2 OFFSET $3`,
          searchTerm,
          limit,
          skip,
        ).catch(() => []),
      ]);

      const sortedByBookings = [...highlightsRes].sort(
        (a, b) => Number(b.bookings) - Number(a.bookings),
      );
      const sortedByRevenue = [...highlightsRes].sort(
        (a, b) => Number(b.revenue) - Number(a.revenue),
      );

      const mostBooked = sortedByBookings[0]
        ? {
            id: sortedByBookings[0].id,
            name: sortedByBookings[0].name,
            bookingCount: Number(sortedByBookings[0].bookings),
            count: Number(sortedByBookings[0].bookings),
            revenue: Number(sortedByBookings[0].revenue),
          }
        : null;

      const highestRevenue = sortedByRevenue[0]
        ? {
            id: sortedByRevenue[0].id,
            name: sortedByRevenue[0].name,
            bookingCount: Number(sortedByRevenue[0].bookings),
            count: Number(sortedByRevenue[0].bookings),
            revenue: Number(sortedByRevenue[0].revenue),
          }
        : null;

      const totalFiltered = Number(countRes[0]?.count ?? 0);

      return {
        dateRange: { start, end },
        highlights: {
          mostBookedService: mostBooked,
          mostBooked,
          highestRevenueService: highestRevenue,
          highestRevenue,
        },
        services: listRes.map((s) => {
          const bookings = Number(s.bookingsCount);
          const rev = Number(s.revenue);
          const avgPrice = bookings > 0 ? rev / bookings : Number(s.price);
          return {
            id: s.id,
            name: s.name,
            code: s.code,
            category: s.categoryName ?? 'General',
            categoryName: s.categoryName ?? 'General',
            bookingsCount: bookings,
            uniqueCustomers: Number(s.uniqueCustomers),
            revenue: rev,
            averageSellingPrice: avgPrice,
          };
        }),
        pagination: {
          total: totalFiltered,
          page,
          limit,
          pages: Math.ceil(totalFiltered / limit),
        },
        meta: {
          total: totalFiltered,
          page,
          limit,
          totalPages: Math.ceil(totalFiltered / limit),
        },
      };
    });
  }

  /**
   * Salon 360: Appointments Tab
   */
  async getSalonAppointments(tenantId: string, query: SalonAnalyticsAppointmentsQueryDto) {
    const { schemaName } = await this.resolveTenantContext(tenantId);
    const { start, end } = resolveDateRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const appointments = tenantTable(schemaName, 'appointments');
      const appointmentServices = tenantTable(schemaName, 'appointment_services');
      const customers = tenantTable(schemaName, 'customers');
      const branches = tenantTable(schemaName, 'branches');
      const employees = tenantTable(schemaName, 'employees');

      const conditions: string[] = [
        `a.appointment_date >= $1::date`,
        `a.appointment_date <= $2::date`,
      ];
      const params: unknown[] = [start, end];
      let pIdx = 3;

      if (query.branchId) {
        conditions.push(`a.branch_id = $${pIdx++}::uuid`);
        params.push(query.branchId);
      }
      if (query.employeeId) {
        conditions.push(`a.employee_id = $${pIdx++}::uuid`);
        params.push(query.employeeId);
      }
      if (query.status && query.status !== 'ALL') {
        conditions.push(`a.status::text = $${pIdx++}`);
        params.push(query.status);
      }
      if (query.search?.trim()) {
        const term = `%${query.search.trim().toLowerCase()}%`;
        conditions.push(
          `(LOWER(a.code) LIKE $${pIdx} OR LOWER(COALESCE(c.name, '')) LIKE $${pIdx})`,
        );
        params.push(term);
        pIdx++;
      }

      const whereClause = conditions.join(' AND ');

      const [kpiRes, distributionRes, countRes, listRes] = await Promise.all([
        tx.$queryRawUnsafe<Array<{
          total: bigint;
          confirmed: bigint;
          completed: bigint;
          cancelled: bigint;
          no_show: bigint;
          pending: bigint;
          upcoming: bigint;
        }>>(
          `SELECT COUNT(*)::bigint AS total,
                  COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END)::bigint AS confirmed,
                  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::bigint AS completed,
                  COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::bigint AS cancelled,
                  COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END)::bigint AS no_show,
                  COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::bigint AS pending,
                  COUNT(CASE WHEN appointment_date >= CURRENT_DATE AND status IN ('PENDING', 'CONFIRMED') THEN 1 END)::bigint AS upcoming
           FROM ${appointments} a
           WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date`,
          start,
          end,
        ).catch(() => [{
          total: 0n, confirmed: 0n, completed: 0n, cancelled: 0n, no_show: 0n, pending: 0n, upcoming: 0n,
        }]),
        tx.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
          `SELECT status::text, COUNT(*)::bigint AS count
           FROM ${appointments} a
           WHERE a.appointment_date >= $1::date AND a.appointment_date <= $2::date
           GROUP BY status`,
          start,
          end,
        ).catch(() => []),
        tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(a.id)::bigint AS count
           FROM ${appointments} a
           LEFT JOIN ${customers} c ON c.id = a.customer_id
           WHERE ${whereClause}`,
          ...params,
        ).catch(() => [{ count: 0n }]),
        tx.$queryRawUnsafe<Array<{
          id: string;
          code: string;
          customerName: string | null;
          branchName: string | null;
          employeeName: string | null;
          appointmentDate: string;
          startTime: string;
          endTime: string;
          status: string;
          serviceName: string | null;
        }>>(
          `SELECT a.id, a.code,
                  c.name AS "customerName",
                  b.name AS "branchName",
                  (SELECT e.name FROM ${employees} e WHERE e.id = a.employee_id LIMIT 1) AS "employeeName",
                  a.appointment_date::text AS "appointmentDate",
                  a.start_time::text AS "startTime",
                  a.end_time::text AS "endTime",
                  a.status::text,
                  (SELECT service_name FROM ${appointmentServices} aps WHERE aps.appointment_id = a.id LIMIT 1) AS "serviceName"
           FROM ${appointments} a
           LEFT JOIN ${customers} c ON c.id = a.customer_id
           LEFT JOIN ${branches} b ON b.id = a.branch_id
           WHERE ${whereClause}
           ORDER BY a.appointment_date DESC, a.start_time DESC
           LIMIT $${pIdx++} OFFSET $${pIdx++}`,
          ...params,
          limit,
          skip,
        ).catch(() => []),
      ]);

      const kpi = kpiRes[0];
      const totalFiltered = Number(countRes[0]?.count ?? 0);

      const kpiSummary = {
        total: Number(kpi?.total ?? 0),
        confirmed: Number(kpi?.confirmed ?? 0),
        completed: Number(kpi?.completed ?? 0),
        cancelled: Number(kpi?.cancelled ?? 0),
        noShow: Number(kpi?.no_show ?? 0),
        pending: Number(kpi?.pending ?? 0),
        upcoming: Number(kpi?.upcoming ?? 0),
      };

      return {
        dateRange: { start, end },
        summary: kpiSummary,
        kpis: kpiSummary,
        distribution: distributionRes.map((d) => ({
          name: d.status,
          status: d.status,
          count: Number(d.count),
          value: Number(d.count),
        })),
        appointments: listRes.map((a) => ({
          id: a.id,
          code: a.code,
          customerName: a.customerName ?? 'Guest Customer',
          serviceName: a.serviceName ?? 'Service',
          employeeName: a.employeeName ?? 'Unassigned',
          branchName: a.branchName ?? 'Main Branch',
          appointmentDateTime: `${a.appointmentDate} ${a.startTime}`,
          appointmentDate: a.appointmentDate,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
        })),
        pagination: {
          total: totalFiltered,
          page,
          limit,
          pages: Math.ceil(totalFiltered / limit),
        },
        meta: {
          total: totalFiltered,
          page,
          limit,
          totalPages: Math.ceil(totalFiltered / limit),
        },
      };
    });
  }

  /**
   * Salon 360: Finance Tab
   */
  async getSalonFinance(tenantId: string, query: SalonAnalyticsDateRangeDto) {
    const { schemaName } = await this.resolveTenantContext(tenantId);
    const { start, end } = resolveDateRange(query.from, query.to);

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const sales = tenantTable(schemaName, 'sales');
      const expenses = tenantTable(schemaName, 'expenses');
      const expenseCategories = tenantTable(schemaName, 'expense_categories');
      const payroll = tenantTable(schemaName, 'payroll_runs');
      const payments = tenantTable(schemaName, 'payments');

      const [
        revenueRes,
        expensesRes,
        supplierExpensesRes,
        salariesRes,
        categoryBreakdownRes,
        salesPaymentMethodsRes,
        expensePaymentMethodsRes,
        monthlyTrendRes,
      ] = await Promise.all([
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(total), 0)::text AS total
           FROM ${sales}
           WHERE status = 'COMPLETED'
             AND created_at >= $1::date
             AND created_at < ($2::date + INTERVAL '1 day')`,
          start,
          end,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM ${expenses}
           WHERE status = 'ACTIVE'
             AND expense_date >= $1::date
             AND expense_date <= $2::date`,
          start,
          end,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(e.amount), 0)::text AS total
           FROM ${expenses} e
           LEFT JOIN ${expenseCategories} ec ON ec.id = e.category_id
           WHERE e.status = 'ACTIVE'
             AND (ec.code = 'SUPPLIER_PAYMENT' OR LOWER(e.title) LIKE '%supplier%' OR LOWER(COALESCE(e.notes, '')) LIKE '%supplier%')
             AND e.expense_date >= $1::date
             AND e.expense_date <= $2::date`,
          start,
          end,
        ).catch(() => [{ total: '0' }]),
        tx.$queryRawUnsafe<Array<{ total: string }>>(
          `SELECT COALESCE(SUM(total_net), 0)::text AS total
           FROM ${payroll}
           WHERE created_at >= $1::date
             AND created_at < ($2::date + INTERVAL '1 day')`,
          start,
          end,
        ).catch(() => [{ total: '0' }]),
        // Expense breakdown by category
        tx.$queryRawUnsafe<Array<{ category: string; amount: string }>>(
          `SELECT COALESCE(ec.name, 'Uncategorized') AS category,
                  COALESCE(SUM(e.amount), 0)::text AS amount
           FROM ${expenses} e
           LEFT JOIN ${expenseCategories} ec ON ec.id = e.category_id
           WHERE e.status = 'ACTIVE'
             AND e.expense_date >= $1::date
             AND e.expense_date <= $2::date
           GROUP BY COALESCE(ec.name, 'Uncategorized')
           ORDER BY COALESCE(SUM(e.amount), 0) DESC`,
          start,
          end,
        ).catch(() => []),
        // Payment methods for sales
        tx.$queryRawUnsafe<Array<{ method: string; amount: string }>>(
          `SELECT COALESCE(p.method::text, 'CASH') AS method,
                  COALESCE(SUM(p.amount), 0)::text AS amount
           FROM ${payments} p
           JOIN ${sales} s ON s.id = p.sale_id
           WHERE s.status = 'COMPLETED'
             AND s.created_at >= $1::date
             AND s.created_at < ($2::date + INTERVAL '1 day')
           GROUP BY COALESCE(p.method::text, 'CASH')`,
          start,
          end,
        ).catch(() => []),
        // Payment methods for expenses
        tx.$queryRawUnsafe<Array<{ method: string; amount: string }>>(
          `SELECT payment_method AS method, COALESCE(SUM(amount), 0)::text AS amount
           FROM ${expenses}
           WHERE status = 'ACTIVE'
             AND expense_date >= $1::date
             AND expense_date <= $2::date
           GROUP BY payment_method`,
          start,
          end,
        ).catch(() => []),
        // Monthly trend for last 6 months
        tx.$queryRawUnsafe<Array<{ month: string; revenue: string; expenses: string; salaries: string }>>(
          `WITH months AS (
             SELECT generate_series(
               DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
               DATE_TRUNC('month', CURRENT_DATE),
               '1 month'::interval
             )::date AS m
           ),
           m_sales AS (
             SELECT DATE_TRUNC('month', created_at)::date AS m, COALESCE(SUM(total), 0) AS rev
             FROM ${sales}
             WHERE status = 'COMPLETED' AND created_at >= (CURRENT_DATE - INTERVAL '6 months')
             GROUP BY DATE_TRUNC('month', created_at)::date
           ),
           m_exp AS (
             SELECT DATE_TRUNC('month', expense_date)::date AS m, COALESCE(SUM(amount), 0) AS exp
             FROM ${expenses}
             WHERE status = 'ACTIVE' AND expense_date >= (CURRENT_DATE - INTERVAL '6 months')
             GROUP BY DATE_TRUNC('month', expense_date)::date
           ),
           m_pay AS (
             SELECT DATE_TRUNC('month', created_at)::date AS m, COALESCE(SUM(total_net), 0) AS sal
             FROM ${payroll}
             WHERE created_at >= (CURRENT_DATE - INTERVAL '6 months')
             GROUP BY DATE_TRUNC('month', created_at)::date
           )
           SELECT TO_CHAR(months.m, 'YYYY-MM') AS month,
                  COALESCE(m_sales.rev, 0)::text AS revenue,
                  COALESCE(m_exp.exp, 0)::text AS expenses,
                  COALESCE(m_pay.sal, 0)::text AS salaries
           FROM months
           LEFT JOIN m_sales ON m_sales.m = months.m
           LEFT JOIN m_exp ON m_exp.m = months.m
           LEFT JOIN m_pay ON m_pay.m = months.m
           ORDER BY months.m ASC`,
        ).catch(() => []),
      ]);

      const revenue = Number(revenueRes[0]?.total ?? 0);
      const operatingExpenses = Number(expensesRes[0]?.total ?? 0);
      const supplierPaymentExpenses = Number(supplierExpensesRes[0]?.total ?? 0);
      const salaries = Number(salariesRes[0]?.total ?? 0);
      const totalExpenses = operatingExpenses + salaries;
      const estimatedProfit = revenue - totalExpenses;

      const totalExpForPct = operatingExpenses > 0 ? operatingExpenses : 1;
      const expenseBreakdown = categoryBreakdownRes.map((c) => {
        const amt = Number(c.amount);
        return {
          category: c.category,
          amount: amt,
          percentage: Math.round((amt / totalExpForPct) * 100),
        };
      });

      const metrics = {
        revenue,
        operatingExpenses,
        salaries,
        supplierPaymentExpenses,
        totalExpenses,
        estimatedProfit,
      };

      return {
        dateRange: { start, end },
        summary: metrics,
        metrics,
        expenseBreakdown,
        paymentMethodBreakdown: {
          sales: salesPaymentMethodsRes.map((p) => ({
            paymentMethod: p.method,
            amount: Number(p.amount),
          })),
          expenses: expensePaymentMethodsRes.map((p) => ({
            paymentMethod: p.method,
            amount: Number(p.amount),
          })),
        },
        monthlyTrend: monthlyTrendRes.map((m) => {
          const rev = Number(m.revenue);
          const exp = Number(m.expenses);
          const sal = Number(m.salaries);
          return {
            month: m.month,
            revenue: rev,
            expenses: exp,
            salaries: sal,
            profit: rev - (exp + sal),
          };
        }),
      };
    });
  }
}
