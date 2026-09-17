/**
 * Enable EXPENSES + PAYROLL on all ACTIVE tenant subscriptions (and their plan snapshots).
 * Run: npx ts-node scripts/enable-expenses-payroll-features.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FEATURE_CODES = ['EXPENSES', 'PAYROLL'] as const;

async function main() {
  const features = await prisma.feature.findMany({
    where: { code: { in: [...FEATURE_CODES] } },
    select: { id: true, code: true },
  });

  if (features.length !== FEATURE_CODES.length) {
    throw new Error(`Missing features. Found: ${features.map((f) => f.code).join(', ')}`);
  }

  const featureIds = features.map((f) => f.id);
  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      code: true,
      subscriptions: {
        where: { status: { in: ['ACTIVE', 'TRIAL', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: { code: 'asc' },
  });

  for (const tenant of tenants) {
    const subscription = tenant.subscriptions[0];
    if (!subscription) {
      console.log(`skip ${tenant.code}: no subscription`);
      continue;
    }

    await prisma.tenantFeature.createMany({
      data: featureIds.map((featureId) => ({
        tenantId: tenant.id,
        featureId,
        isEnabled: true,
      })),
      skipDuplicates: true,
    });

    await prisma.subscriptionFeature.createMany({
      data: featureIds.map((featureId) => ({
        subscriptionId: subscription.id,
        featureId,
        enabled: true,
      })),
      skipDuplicates: true,
    });

    console.log(`✓ ${tenant.code}: EXPENSES + PAYROLL enabled`);
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
