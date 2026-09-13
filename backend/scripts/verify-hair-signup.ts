import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { email: { contains: 'hair', mode: 'insensitive' } },
        { name: { contains: 'hair', mode: 'insensitive' } },
      ],
    },
  });

  console.log('=== TENANTS ===');
  console.log(JSON.stringify(tenants, null, 2));

  for (const tenant of tenants) {
    const subs = await prisma.subscription.findMany({
      where: { tenantId: tenant.id },
      include: {
        plan: true,
        subscriptionFeatures: {
          where: { enabled: true },
          include: { feature: true },
        },
      },
    });

    console.log(`\n=== SUBSCRIPTIONS (${tenant.code}) ===`);
    console.log(JSON.stringify(subs, null, 2));

    const orders = await prisma.signupOrder.findMany({
      where: { tenantId: tenant.id },
      include: { plan: true },
    });

    console.log('\n=== SIGNUP ORDERS ===');
    console.log(JSON.stringify(orders, null, 2));

    const tenantFeatures = await prisma.tenantFeature.findMany({
      where: { tenantId: tenant.id, isEnabled: true },
      include: { feature: true },
    });

    console.log('\n=== TENANT FEATURES ===');
    console.log(tenantFeatures.map((tf) => tf.feature.code));
  }

  const ordersByEmail = await prisma.signupOrder.findMany({
    where: { adminEmail: 'hair@gmail.com' },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n=== ORDERS BY adminEmail hair@gmail.com ===');
  console.log(JSON.stringify(ordersByEmail, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
