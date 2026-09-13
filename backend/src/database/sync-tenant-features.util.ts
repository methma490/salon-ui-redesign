import { Prisma } from '@prisma/client';

/**
 * Mirror subscription/plan features into tenant_features for Super Admin visibility.
 * Runtime access for subscription salons still uses subscription_features.
 */
export async function syncTenantFeatures(
  tx: Prisma.TransactionClient,
  tenantId: string,
  featureIds: string[],
): Promise<void> {
  const uniqueFeatureIds = [...new Set(featureIds)];

  for (const featureId of uniqueFeatureIds) {
    await tx.tenantFeature.upsert({
      where: {
        tenantId_featureId: { tenantId, featureId },
      },
      update: { isEnabled: true },
      create: {
        tenantId,
        featureId,
        isEnabled: true,
      },
    });
  }

  await tx.tenantFeature.updateMany({
    where: {
      tenantId,
      featureId: { notIn: uniqueFeatureIds },
    },
    data: { isEnabled: false },
  });
}
