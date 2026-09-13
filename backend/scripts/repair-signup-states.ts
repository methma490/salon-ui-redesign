/**
 * Repair inconsistent signup salon states and optionally simulate payment completion.
 * Run: npx ts-node scripts/repair-signup-states.ts
 */
import {
  FeatureStatus,
  PaymentStatus,
  PrismaClient,
  SignupOrderStatus,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import { syncTenantFeatures } from '../src/database/sync-tenant-features.util';

const prisma = new PrismaClient();

async function finalizeOrder(orderId: string) {
  const order = await prisma.signupOrder.findUnique({ where: { orderId } });
  if (!order || order.status === SignupOrderStatus.PAID) {
    console.log(`Order ${orderId} already paid or not found`);
    return;
  }

  const startDate = new Date();

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { id: order.subscriptionId },
    });
    if (!subscription) return;

    if (subscription.status === SubscriptionStatus.PENDING) {
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      await tx.subscriptionPayment.updateMany({
        where: {
          subscriptionId: order.subscriptionId,
          paymentReference: orderId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.PAID,
          paidAt: startDate,
          paymentReference: `REPAIR-${orderId}`,
        },
      });

      const planFeatures = await tx.planFeature.findMany({
        where: {
          planId: order.planId,
          enabled: true,
          feature: { status: FeatureStatus.ACTIVE },
        },
        select: { featureId: true },
      });

      if (planFeatures.length > 0) {
        await tx.subscriptionFeature.createMany({
          data: planFeatures.map((pf) => ({
            subscriptionId: order.subscriptionId,
            featureId: pf.featureId,
            enabled: true,
          })),
          skipDuplicates: true,
        });
        await syncTenantFeatures(
          tx,
          order.tenantId,
          planFeatures.map((pf) => pf.featureId),
        );
      }

      await tx.subscription.update({
        where: { id: order.subscriptionId },
        data: { status: SubscriptionStatus.ACTIVE, startDate, endDate },
      });
    }

    await tx.tenant.update({
      where: { id: order.tenantId },
      data: { status: TenantStatus.SUSPENDED },
    });

    await tx.signupOrder.update({
      where: { id: order.id },
      data: { status: SignupOrderStatus.PAID, payherePaymentId: `REPAIR-${orderId}` },
    });
  });

  console.log(`Finalized order ${orderId} (simulated payment)`);
}

async function main() {
  const inconsistent = await prisma.tenant.findMany({
    where: {
      signupOrders: { some: {} },
      OR: [
        {
          status: TenantStatus.ACTIVE,
          subscriptions: { some: { status: SubscriptionStatus.PENDING } },
        },
        {
          status: TenantStatus.ACTIVE,
          signupOrders: { some: { status: SignupOrderStatus.PENDING } },
        },
      ],
    },
    include: {
      signupOrders: { where: { status: SignupOrderStatus.PENDING }, take: 1 },
    },
  });

  for (const tenant of inconsistent) {
    console.log(`Repairing ${tenant.code}: ACTIVE tenant with pending payment → SUSPENDED`);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: TenantStatus.SUSPENDED },
    });
  }

  const pendingPaidOrders = await prisma.signupOrder.findMany({
    where: { status: SignupOrderStatus.PENDING },
    include: { tenant: true, plan: true },
  });

  for (const order of pendingPaidOrders) {
    console.log(
      `\nSimulating payment for ${order.salonName} (${order.plan.code}) — order ${order.orderId}`,
    );
    await finalizeOrder(order.orderId);
  }

  console.log('\nRepair complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
