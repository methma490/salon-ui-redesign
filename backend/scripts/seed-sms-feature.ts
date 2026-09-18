import { FeatureStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const feature = await prisma.feature.upsert({
    where: { code: 'SMS_NOTIFICATIONS' },
    update: {
      name: 'SMS Notifications',
      description: 'Send digital invoice (e-bill) links and notifications via SMS',
      status: FeatureStatus.ACTIVE,
    },
    create: {
      code: 'SMS_NOTIFICATIONS',
      name: 'SMS Notifications',
      description: 'Send digital invoice (e-bill) links and notifications via SMS',
      status: FeatureStatus.ACTIVE,
    },
  });

  console.log('SMS_NOTIFICATIONS feature created/updated:', feature.id);

  const platinum = await prisma.plan.findUnique({
    where: { code: 'PLATINUM' },
    include: { planFeatures: { include: { feature: true } } },
  });

  if (!platinum) {
    console.log('PLATINUM plan not found');
    return;
  }

  const exists = platinum.planFeatures.some((pf) => pf.feature.code === 'SMS_NOTIFICATIONS');
  if (!exists) {
    await prisma.planFeature.create({
      data: { planId: platinum.id, featureId: feature.id, enabled: true },
    });
    console.log('SMS_NOTIFICATIONS linked to PLATINUM plan');
  } else {
    console.log('SMS_NOTIFICATIONS already linked to PLATINUM plan');
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
