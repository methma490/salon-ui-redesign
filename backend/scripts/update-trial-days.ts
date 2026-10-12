import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const res = await prisma.planPrice.updateMany({
      data: { trialDays: 21 },
    });
    console.log('Updated planPrice trialDays to 21:', res);
  } finally {
    await prisma.$disconnect();
  }
}

main();
