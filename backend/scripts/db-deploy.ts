import { bootstrapDatabase } from '../src/database/bootstrap-database';
import { PrismaClient } from '@prisma/client';
import { getTenantMigrationStatuses } from '../src/database/tenant-migration-runner';

async function main() {
  console.log('================================================================================');
  console.log('PRODUCTION DATABASE DEPLOYMENT (MIGRATIONS + MASTER SEEDS)');
  console.log('================================================================================\n');

  // Explicit deployment command always executes migrations & master data seeds
  process.env.DATABASE_AUTO_SETUP = 'true';

  console.log('[1/4] Running public schema migrations (prisma migrate deploy)...');
  await bootstrapDatabase();
  console.log('✓ Public schema migrations & master seeds completed.\n');

  console.log('[2/4] Verifying database connectivity & schema health...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();

    const [featureCount, planCount, templateCount, superAdminCount, tenantCount] =
      await Promise.all([
        prisma.feature.count(),
        prisma.plan.count(),
        prisma.notificationTemplate.count(),
        prisma.superAdminUser.count(),
        prisma.tenant.count(),
      ]);

    console.log('  • Active / Master Features : ' + featureCount);
    console.log('  • Subscription Plans       : ' + planCount);
    console.log('  • Notification Templates   : ' + templateCount);
    console.log('  • Super Admin Users        : ' + superAdminCount);
    console.log('  • Active Salon Tenants     : ' + tenantCount);

    console.log('\n[3/4] Verifying tenant migration statuses...');
    const tenantStatuses = await getTenantMigrationStatuses(prisma);
    if (tenantStatuses.length === 0) {
      console.log('  • No tenant schemas present (clean database state or new platform).');
    } else {
      console.log(`  • Found ${tenantStatuses.length} tenant schema(s).`);
      for (const t of tenantStatuses) {
        console.log(
          `    - [${t.schema}] Migrations: ${t.appliedCount}/${t.totalAvailable} (Up to date: ${t.isUpToDate ? 'YES' : 'NO'})`,
        );
        if (!t.isUpToDate) {
          throw new Error(`Tenant schema ${t.schema} has pending migrations!`);
        }
      }
    }

    console.log('\n[4/4] Production deployment verification complete.');
    console.log('================================================================================');
    console.log('PRODUCTION DATABASE DEPLOYMENT SUCCESSFUL ✓');
    console.log('================================================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n✗ FATAL: Production database deployment failed:', err.message || err);
  process.exit(1);
});
