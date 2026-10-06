const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subscription.findMany({
    include: { tenant: true, plan: true, addOns: { include: { feature: true } } },
    orderBy: { createdAt: 'desc' },
  });
  console.log(
    'Subscriptions:',
    JSON.stringify(
      subs.map((s) => ({
        id: s.id,
        tenant: s.tenant?.name,
        status: s.status,
        plan: s.plan?.name,
        createdAt: s.createdAt,
        addOns: s.addOns.map((a) => ({ id: a.id, feature: a.feature.name, status: a.status })),
      })),
      null,
      2,
    ),
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
