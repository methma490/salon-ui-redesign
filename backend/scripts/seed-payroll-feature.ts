import { FeatureStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const feature = await prisma.feature.upsert({
    where: { code: 'PAYROLL' },
    update: {
      name: 'Payroll',
      description: 'Employee payroll, loans, and payslips',
      status: FeatureStatus.ACTIVE,
    },
    create: {
      code: 'PAYROLL',
      name: 'Payroll',
      description: 'Employee payroll, loans, and payslips',
      status: FeatureStatus.ACTIVE,
    },
  });

  console.log('PAYROLL feature:', feature.id);

  const platinum = await prisma.plan.findUnique({
    where: { code: 'PLATINUM' },
    include: { planFeatures: { include: { feature: true } } },
  });

  if (!platinum) {
    console.log('PLATINUM plan not found');
    return;
  }

  const exists = platinum.planFeatures.some((pf) => pf.feature.code === 'PAYROLL');
  if (!exists) {
    await prisma.planFeature.create({
      data: { planId: platinum.id, featureId: feature.id, enabled: true },
    });
    console.log('PAYROLL linked to PLATINUM plan');
  } else {
    console.log('PAYROLL already on PLATINUM plan');
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
