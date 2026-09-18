import { FeatureStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const feature = await prisma.feature.upsert({
    where: { code: 'EMPLOYEES' },
    update: {
      name: 'Employee Management',
      description: 'Manage employee profiles, designations, and commission rates',
      status: FeatureStatus.ACTIVE,
    },
    create: {
      code: 'EMPLOYEES',
      name: 'Employee Management',
      description: 'Manage employee profiles, designations, and commission rates',
      status: FeatureStatus.ACTIVE,
    },
  });

  console.log('EMPLOYEES feature created/updated:', feature.id);

  const plans = await prisma.plan.findMany({
    where: { code: { in: ['SILVER', 'GOLD', 'PLATINUM'] } },
    include: { planFeatures: { include: { feature: true } } },
  });

  for (const plan of plans) {
    const exists = plan.planFeatures.some((pf) => pf.feature.code === 'EMPLOYEES');
    if (!exists) {
      await prisma.planFeature.create({
        data: { planId: plan.id, featureId: feature.id, enabled: true },
      });
      console.log(`EMPLOYEES feature linked to ${plan.code} plan`);
    } else {
      console.log(`EMPLOYEES feature already on ${plan.code} plan`);
    }
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
