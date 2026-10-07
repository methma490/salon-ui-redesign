import { PrismaClient } from '@prisma/client';
import { seedAllPublicMasterData } from '../src/database/public-seed-runner';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding public schema master data...');
  await prisma.$connect();
  await seedAllPublicMasterData(prisma);
  console.log('✓ Master data seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
