import { PrismaClient } from '@prisma/client';
import { runAllTenantMigrations } from '../src/database/tenant-migration-runner';

const prisma = new PrismaClient();

async function main() {
  console.log('Running tenant migrations across all tenants...');
  await prisma.$connect();
  const results = await runAllTenantMigrations(prisma);
  console.log(`\nCompleted tenant migrations for ${results.length} tenant schemas.`);
  for (const res of results) {
    console.log(
      `  • [${res.schema}] Applied: ${res.appliedNow.length}, Already Applied: ${res.alreadyApplied}, Total: ${res.totalAvailable}`,
    );
  }
}

main()
  .catch((err) => {
    console.error('Tenant migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
