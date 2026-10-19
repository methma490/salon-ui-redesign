import 'dotenv/config';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { getTenantMigrationStatuses } from '../src/database/tenant-migration-runner';

const prisma = new PrismaClient();

async function checkPublicMigrationStatus() {
  const migrationsDir = join(__dirname, '../prisma/migrations');
  const migrationFolders = existsSync(migrationsDir)
    ? readdirSync(migrationsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];

  let appliedPublicMigrations: Array<{ migration_name: string; finished_at: Date | null }> = [];
  try {
    appliedPublicMigrations = await prisma.$queryRaw<
      Array<{ migration_name: string; finished_at: Date | null }>
    >`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      WHERE rolled_back_at IS NULL
      ORDER BY finished_at ASC
    `;
  } catch {
    // _prisma_migrations table might not exist yet
  }

  const appliedSet = new Set(appliedPublicMigrations.map((m) => m.migration_name));
  const missing = migrationFolders.filter((f) => !appliedSet.has(f));

  return {
    expectedCount: migrationFolders.length,
    appliedCount: appliedPublicMigrations.length,
    missingCount: missing.length,
    missingMigrations: missing,
  };
}

async function main() {
  console.log('================================================================================');
  console.log('DATABASE MIGRATION & SEED DIAGNOSTIC REPORT');
  console.log('================================================================================\n');

  await prisma.$connect();

  // 1. Public Schema Migrations
  const publicStatus = await checkPublicMigrationStatus();
  console.log('PUBLIC SCHEMA:');
  console.log(`  Expected Migrations : ${publicStatus.expectedCount}`);
  console.log(`  Applied Migrations  : ${publicStatus.appliedCount}`);
  console.log(`  Missing Migrations  : ${publicStatus.missingCount}`);
  if (publicStatus.missingCount > 0) {
    console.log('  Missing List:');
    publicStatus.missingMigrations.forEach((m) => console.log(`    - ${m}`));
  } else {
    console.log('  Status              : UP TO DATE ✓');
  }

  // 2. Public Master Data Counts
  try {
    const [featureCount, planCount, templateCount, superAdminCount] = await Promise.all([
      prisma.feature.count(),
      prisma.plan.count(),
      prisma.notificationTemplate.count(),
      prisma.superAdminUser.count(),
    ]);
    console.log('\nPUBLIC SEED / MASTER DATA:');
    console.log(`  Active Features      : ${featureCount}`);
    console.log(`  Subscription Plans   : ${planCount}`);
    console.log(`  Notification Templates: ${templateCount}`);
    console.log(`  Super Admin Users    : ${superAdminCount}`);
  } catch (err: any) {
    console.log(`  Error querying public seed data: ${err.message || err}`);
  }

  // 3. Tenant Migrations & Seed Status
  console.log('\n================================================================================');
  console.log('TENANT SCHEMAS:');
  console.log('================================================================================\n');

  const tenantStatuses = await getTenantMigrationStatuses(prisma);

  if (tenantStatuses.length === 0) {
    console.log('No active tenant schemas found.');
  } else {
    console.log(`Found ${tenantStatuses.length} tenant schema(s):\n`);

    for (const status of tenantStatuses) {
      console.log(`[Schema: ${status.schema}]`);
      console.log(`  Expected Migrations : ${status.totalAvailable}`);
      console.log(`  Applied Migrations  : ${status.appliedCount}`);
      console.log(`  Missing Migrations  : ${status.missingCount}`);

      if (status.missingCount > 0) {
        console.log('  Missing List:');
        status.missingMigrations.forEach((m) => console.log(`    - ${m}`));
      } else {
        console.log('  Status              : ALL MIGRATIONS APPLIED ✓');
      }

      // Check tenant seed health
      try {
        const [roles, permissions, mainBranch] = await Promise.all([
          prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT count(*)::int as count FROM "${status.schema}".roles`,
          ),
          prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT count(*)::int as count FROM "${status.schema}".permissions`,
          ),
          prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT count(*)::int as count FROM "${status.schema}".branches WHERE is_main = true`,
          ),
        ]);

        console.log(
          `  Seed Status         : Roles=${roles[0]?.count ?? 0}, Permissions=${permissions[0]?.count ?? 0}, MainBranch=${Number(mainBranch[0]?.count) > 0 ? 'YES' : 'NO'}`,
        );
      } catch (seedErr: any) {
        console.log(`  Seed Status         : ERROR (${seedErr.message || seedErr})`);
      }
      console.log('');
    }
  }

  console.log('================================================================================');
  const allTenantsUpToDate = tenantStatuses.every((t) => t.isUpToDate);
  const isPublicUpToDate = publicStatus.missingCount === 0;

  if (isPublicUpToDate && allTenantsUpToDate) {
    console.log('OVERALL STATUS: DATABASE AUTO SETUP READY ✓');
  } else {
    console.log('OVERALL STATUS: PENDING MIGRATIONS DETECTED');
  }
  console.log('================================================================================');
}

main()
  .catch((err) => {
    console.error('Diagnostic status check failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
