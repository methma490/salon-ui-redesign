import 'dotenv/config';
import { FeatureStatus, PrismaClient } from '@prisma/client';
import { FEATURE_CATALOG, LEGACY_FEATURE_CATALOG } from '../prisma/seeds/billing-seed.config';

const prisma = new PrismaClient();

async function main() {
  for (const feature of FEATURE_CATALOG) {
    await prisma.feature.upsert({
      where: { code: feature.code },
      update: {
        name: feature.name,
        description: feature.description,
        status: FeatureStatus.ACTIVE,
      },
      create: { ...feature, status: FeatureStatus.ACTIVE },
    });
  }

  for (const feature of LEGACY_FEATURE_CATALOG) {
    await prisma.feature.upsert({
      where: { code: feature.code },
      update: {
        name: feature.name,
        description: feature.description,
        status: FeatureStatus.INACTIVE,
      },
      create: { ...feature, status: FeatureStatus.INACTIVE },
    });
  }

  console.log('Feature catalog updated.');
}

main()
  .catch((error) => {
    console.error('Feature catalog update failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
