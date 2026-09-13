import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [plans, planPrices, planFeatureRows, features, subscriptions, history, paymentOrders] =
    await Promise.all([
      prisma.plan.count(),
      prisma.planPrice.count(),
      prisma.planFeature.count(),
      prisma.feature.count(),
      prisma.subscription.count(),
      prisma.subscriptionHistory.count(),
      prisma.paymentOrder.count(),
    ]);

  console.log('--- Table counts ---');
  console.log({
    plans,
    planPrices,
    planFeatureRows,
    features,
    subscriptions,
    history,
    paymentOrders,
  });

  const planRows = await prisma.plan.findMany({
    orderBy: { displayOrder: 'asc' },
    include: { planPrices: true },
  });

  const plansWithFeatures = await prisma.plan.findMany({
    where: { code: { in: ['SILVER', 'GOLD', 'PLATINUM'] } },
    orderBy: { displayOrder: 'asc' },
    include: {
      planFeatures: {
        where: { enabled: true },
        include: { feature: { select: { code: true } } },
      },
    },
  });

  console.log('\n--- Plans with prices ---');
  for (const plan of planRows) {
    console.log({
      code: plan.code,
      status: plan.status,
      displayOrder: plan.displayOrder,
      prices: plan.planPrices.map((p) => ({
        cycle: p.billingCycle,
        price: p.price.toString(),
        trialDays: p.trialDays,
        isActive: p.isActive,
      })),
    });
  }

  console.log('\n--- Plan feature matrix ---');
  for (const plan of plansWithFeatures) {
    console.log({
      code: plan.code,
      features: plan.planFeatures.map((pf: { feature: { code: string } }) => pf.feature.code).sort(),
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
