import { PrismaClient } from '@prisma/client';
import { getTenantMigrationFiles } from '../src/database/tenant-migration-runner';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================================');
  console.log('TENANT SCHEMA POST-MIGRATION VERIFICATION REPORT');
  console.log('================================================================================\n');

  await prisma.$connect();

  const [tenants, physicalSchemata, availableFiles] = await Promise.all([
    prisma.tenant.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        schemaName: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.$queryRaw<Array<{ schema_name: string }>>`
      SELECT schema_name FROM information_schema.schemata
    `,
    getTenantMigrationFiles(),
  ]);

  const physicalSet = new Set(physicalSchemata.map((r) => r.schema_name));
  const totalAvailableMigrations = availableFiles.length;

  console.log(
    `| ${'Tenant Code'.padEnd(12)} | ${'Salon Name'.padEnd(25)} | ${'Stored schema_name'.padEnd(32)} | ${'Schema Exists?'.padEnd(14)} | ${'Migrations'.padEnd(12)} | ${'Status'.padEnd(8)} |`,
  );
  console.log(
    `|${'-'.repeat(14)}|${'-'.repeat(27)}|${'-'.repeat(34)}|${'-'.repeat(16)}|${'-'.repeat(14)}|${'-'.repeat(10)}|`,
  );

  for (const tenant of tenants) {
    const schema = tenant.schemaName;
    const exists = physicalSet.has(schema);

    let migrationCount = 0;
    let statusText = 'OK';

    if (exists) {
      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::int as count FROM "${schema}"."_applied_tenant_migrations"`,
        );
        migrationCount = Number(rows[0]?.count ?? 0);
        if (migrationCount !== totalAvailableMigrations) {
          statusText = `PARTIAL (${migrationCount}/${totalAvailableMigrations})`;
        }
      } catch {
        statusText = 'NO_HISTORY';
      }
    } else {
      statusText = 'MISSING_SCHEMA';
    }

    const migStr = `${migrationCount}/${totalAvailableMigrations}`;
    console.log(
      `| ${tenant.code.padEnd(12)} | ${tenant.name.padEnd(25).slice(0, 25)} | ${schema.padEnd(32)} | ${(exists ? 'YES' : 'NO').padEnd(14)} | ${migStr.padEnd(12)} | ${statusText.padEnd(8)} |`,
    );
  }

  console.log('\n================================================================================');
  console.log('ALL VERIFICATIONS COMPLETED.');
  console.log('================================================================================\n');
}

main()
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
