import { Injectable } from '@nestjs/common';
import {
  PaymentOrderStatus,
  Prisma,
  SubscriptionHistoryAction,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PaymentPurpose } from '../../payments/dto/create-payment-order.dto';
import type { DashboardPeriod } from './dto/dashboard-query.dto';

type MonthBucket = { name: string; key: string };

function monthBuckets(count: number): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const name = d.toLocaleDateString('en-US', { month: 'short' });
    buckets.push({ name, key });
  }
  return buckets;
}

function periodStart(period: DashboardPeriod): Date {
  const now = new Date();
  if (period === '7d') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  }
  if (period === 'mtd') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
}

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function monthlyKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class SuperAdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(period: DashboardPeriod = '30d') {
    const rangeStart = periodStart(period);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const buckets = monthBuckets(12);
    const bucketStart = new Date(buckets[0].key + '-01');

    const [
      tenantGroups,
      totalTenants,
      newTenantsThisMonth,
      newTenantsLastMonth,
      trialSubscriptions,
      activeSubscriptions,
      subscriptionsByPlan,
      activeSubsForMrr,
      paymentGroups,
      periodPaidOrders,
      recentTenants,
      recentHistory,
      recentPaidPayments,
      expiringSoon,
      failedPaymentsWeek,
      provisioningTenants,
      tenantsCreatedInRange,
      cancelledHistory,
      archivedTenants,
      paidOrdersForCharts,
      subscriptionsCreatedInRange,
    ] = await Promise.all([
      this.prisma.tenant.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.tenant.count({
        where: {
          createdAt: {
            gte: new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1),
            lt: monthStart,
          },
        },
      }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      this.prisma.subscription.count({
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
      }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
        _count: { _all: true },
      }),
      this.prisma.subscription.findMany({
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
        select: { price: true, billingCycle: true, currency: true },
      }),
      this.prisma.paymentOrder.groupBy({
        by: ['status'],
        where: { createdAt: { gte: rangeStart } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.paymentOrder.findMany({
        where: { status: PaymentOrderStatus.PAID, createdAt: { gte: rangeStart } },
        select: { amount: true, currency: true },
      }),
      this.prisma.tenant.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: { select: { code: true, name: true } } },
          },
        },
      }),
      this.prisma.subscriptionHistory.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: {
              tenant: { select: { name: true } },
              plan: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.paymentOrder.findMany({
        where: { status: PaymentOrderStatus.PAID },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.subscription.count({
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.paymentOrder.count({
        where: {
          status: PaymentOrderStatus.FAILED,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.tenant.count({ where: { status: TenantStatus.PROVISIONING } }),
      this.prisma.tenant.findMany({
        where: { createdAt: { gte: bucketStart } },
        select: { createdAt: true },
      }),
      this.prisma.subscriptionHistory.findMany({
        where: {
          action: SubscriptionHistoryAction.CANCELLED,
          createdAt: { gte: bucketStart },
        },
        select: { createdAt: true },
      }),
      this.prisma.tenant.findMany({
        where: {
          status: TenantStatus.ARCHIVED,
          updatedAt: { gte: bucketStart },
        },
        select: { updatedAt: true },
      }),
      this.prisma.paymentOrder.findMany({
        where: {
          status: PaymentOrderStatus.PAID,
          createdAt: { gte: bucketStart },
        },
        select: { createdAt: true, amount: true, purpose: true },
      }),
      this.prisma.subscription.findMany({
        where: { createdAt: { gte: bucketStart } },
        select: { createdAt: true },
      }),
    ]);

    const statusMap = Object.fromEntries(
      tenantGroups.map((g) => [g.status, g._count._all]),
    ) as Record<string, number>;

    const activeTenants = statusMap[TenantStatus.ACTIVE] ?? 0;
    const suspendedTenants = statusMap[TenantStatus.SUSPENDED] ?? 0;
    const archivedTenantsCount = statusMap[TenantStatus.ARCHIVED] ?? 0;
    const provisioningCount = statusMap[TenantStatus.PROVISIONING] ?? 0;

    const mrr = activeSubsForMrr.reduce((sum, sub) => {
      const price = toNumber(sub.price);
      return sum + (sub.billingCycle === 'YEARLY' ? price / 12 : price);
    }, 0);

    const arr = mrr * 12;
    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

    const tenantGrowthPct =
      newTenantsLastMonth > 0
        ? ((newTenantsThisMonth - newTenantsLastMonth) / newTenantsLastMonth) * 100
        : newTenantsThisMonth > 0
          ? 100
          : 0;

    const planIds = subscriptionsByPlan.map((p) => p.planId);
    const plans = planIds.length
      ? await this.prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, code: true, name: true },
        })
      : [];
    const planMap = new Map(plans.map((p) => [p.id, p]));

    const subscriptionDistribution = subscriptionsByPlan.map((row) => {
      const plan = planMap.get(row.planId);
      return {
        planId: row.planId,
        planCode: plan?.code ?? 'UNKNOWN',
        planName: plan?.name ?? 'Unknown',
        count: row._count._all,
      };
    });

    const successfulPayments =
      paymentGroups.find((g) => g.status === PaymentOrderStatus.PAID)?._count._all ?? 0;
    const pendingPayments =
      paymentGroups.find((g) => g.status === PaymentOrderStatus.PENDING)?._count._all ?? 0;
    const failedPayments =
      paymentGroups.find((g) => g.status === PaymentOrderStatus.FAILED)?._count._all ?? 0;

    const periodRevenue = periodPaidOrders.reduce((sum, o) => sum + toNumber(o.amount), 0);
    const currency = periodPaidOrders[0]?.currency ?? activeSubsForMrr[0]?.currency ?? 'LKR';

    const newByMonth = new Map<string, number>();
    for (const t of tenantsCreatedInRange) {
      const key = monthlyKey(t.createdAt);
      newByMonth.set(key, (newByMonth.get(key) ?? 0) + 1);
    }

    const cancelledByMonth = new Map<string, number>();
    for (const h of cancelledHistory) {
      const key = monthlyKey(h.createdAt);
      cancelledByMonth.set(key, (cancelledByMonth.get(key) ?? 0) + 1);
    }
    for (const t of archivedTenants) {
      const key = monthlyKey(t.updatedAt);
      cancelledByMonth.set(key, (cancelledByMonth.get(key) ?? 0) + 1);
    }

    const salonGrowth = buckets.map((b) => ({
      name: b.name,
      newSalons: newByMonth.get(b.key) ?? 0,
      cancelledSalons: cancelledByMonth.get(b.key) ?? 0,
    }));

    const revenueByMonth = buckets.map((b) => ({
      name: b.name,
      subscription: 0,
      upgrade: 0,
      renewal: 0,
    }));
    const revenueIndex = new Map(revenueByMonth.map((r, i) => [buckets[i].key, i]));

    for (const order of paidOrdersForCharts) {
      const idx = revenueIndex.get(monthlyKey(order.createdAt));
      if (idx == null) continue;
      const amount = toNumber(order.amount);
      if (order.purpose === PaymentPurpose.SUBSCRIPTION_RENEW) {
        revenueByMonth[idx].renewal += amount;
      } else if (
        order.purpose === PaymentPurpose.SUBSCRIPTION_ACTIVATE ||
        order.purpose === PaymentPurpose.SIGNUP
      ) {
        revenueByMonth[idx].subscription += amount;
      } else {
        revenueByMonth[idx].upgrade += amount;
      }
    }

    const subsByMonth = new Map<string, number>();
    for (const sub of subscriptionsCreatedInRange) {
      const key = monthlyKey(sub.createdAt);
      subsByMonth.set(key, (subsByMonth.get(key) ?? 0) + 1);
    }

    const sparklineFromGrowth = salonGrowth.slice(-8).map((row) => ({
      value: row.newSalons,
    }));

    const sparklineRevenue = revenueByMonth.slice(-8).map((row) => ({
      value: row.subscription + row.upgrade + row.renewal,
    }));

    const sparklineSubs = buckets.slice(-8).map((b) => ({
      value: subsByMonth.get(b.key) ?? 0,
    }));

    const activities = this.buildActivities(recentHistory, recentPaidPayments, recentTenants);

    let dbHealthy = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbHealthy = false;
    }

    const healthScore = dbHealthy && provisioningCount === 0 ? 98 : dbHealthy ? 92 : 75;

    return {
      period,
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        archived: archivedTenantsCount,
        provisioning: provisioningCount,
        trial: trialSubscriptions,
        newThisMonth: newTenantsThisMonth,
        growthPercent: Number(tenantGrowthPct.toFixed(1)),
      },
      revenue: {
        mrr: Number(mrr.toFixed(2)),
        arr: Number(arr.toFixed(2)),
        arpu: Number(arpu.toFixed(2)),
        periodTotal: Number(periodRevenue.toFixed(2)),
        currency,
      },
      subscriptions: {
        total: activeSubscriptions,
        trial: trialSubscriptions,
        byPlan: subscriptionDistribution,
      },
      payments: {
        successful: successfulPayments,
        pending: pendingPayments,
        failed: failedPayments,
        periodTotal: Number(periodRevenue.toFixed(2)),
        currency,
      },
      charts: {
        salonGrowth,
        revenueByMonth,
        subscriptionDistribution: subscriptionDistribution.map((p) => ({
          name: p.planName,
          value: p.count,
        })),
        sparklines: {
          salons: sparklineFromGrowth.length ? sparklineFromGrowth : [{ value: totalTenants }],
          revenue: sparklineRevenue.length ? sparklineRevenue : [{ value: mrr }],
          subscriptions: sparklineSubs,
        },
      },
      alerts: {
        expiringSubscriptions: expiringSoon,
        failedPaymentsThisWeek: failedPaymentsWeek,
        awaitingActivation: provisioningCount,
      },
      platformHealth: {
        score: healthScore,
        label: healthScore >= 95 ? 'Excellent' : healthScore >= 85 ? 'Good' : 'Needs attention',
        database: dbHealthy ? 'Operational' : 'Degraded',
        api: 'Operational',
        payments: failedPaymentsWeek > 5 ? 'Degraded' : 'Operational',
        performance: provisioningCount > 3 ? 'Slow' : 'Optimal',
      },
      recentSalons: recentTenants.map((tenant) => ({
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        status: tenant.status,
        createdAt: tenant.createdAt.toISOString(),
        planName: tenant.subscriptions[0]?.plan.name ?? null,
        planCode: tenant.subscriptions[0]?.plan.code ?? null,
      })),
      recentActivities: activities,
    };
  }

  private buildActivities(
    history: Array<{
      action: SubscriptionHistoryAction;
      createdAt: Date;
      subscription: {
        tenant: { name: string };
        plan: { name: string };
      };
    }>,
    payments: Array<{
      amount: Prisma.Decimal;
      currency: string;
      updatedAt: Date;
      tenant: { name: string };
    }>,
    tenants: Array<{ name: string; createdAt: Date }>,
  ) {
    const items: Array<{
      type: 'success' | 'info' | 'payment' | 'warning';
      message: string;
      createdAt: string;
    }> = [];

    for (const row of history) {
      const salon = row.subscription.tenant.name;
      const plan = row.subscription.plan.name;
      if (row.action === SubscriptionHistoryAction.UPGRADED) {
        items.push({
          type: 'success',
          message: `${salon} upgraded to ${plan}`,
          createdAt: row.createdAt.toISOString(),
        });
      } else if (row.action === SubscriptionHistoryAction.CREATED) {
        items.push({
          type: 'info',
          message: `${salon} registered as new tenant`,
          createdAt: row.createdAt.toISOString(),
        });
      } else if (row.action === SubscriptionHistoryAction.ACTIVATED) {
        items.push({
          type: 'success',
          message: `${salon} subscription activated`,
          createdAt: row.createdAt.toISOString(),
        });
      }
    }

    for (const payment of payments) {
      items.push({
        type: 'payment',
        message: `Payment of ${payment.currency} ${toNumber(payment.amount).toLocaleString()} received from ${payment.tenant.name}`,
        createdAt: payment.updatedAt.toISOString(),
      });
    }

    for (const tenant of tenants.slice(0, 3)) {
      items.push({
        type: 'info',
        message: `New salon ${tenant.name} created`,
        createdAt: tenant.createdAt.toISOString(),
      });
    }

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }
}
