import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { syncTenantFeatures } from '../src/database/sync-tenant-features.util';

const prisma = new PrismaClient();

async function main() {
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: SubscriptionStatus.ACTIVE },
    include: {
      subscriptionFeatures: {
        where: { enabled: true },
        select: { featureId: true },
      },
    },
  });

  for (const subscription of activeSubscriptions) {
    const featureIds = subscription.subscriptionFeatures.map((sf) => sf.featureId);
    if (featureIds.length === 0) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await syncTenantFeatures(tx, subscription.tenantId, featureIds);
    });

    console.log(`Synced ${featureIds.length} features for tenant ${subscription.tenantId}`);
  }

  console.log('Backfill complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
