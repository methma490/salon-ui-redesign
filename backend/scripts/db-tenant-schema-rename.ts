import { PrismaClient } from '@prisma/client';
import {
  buildTenantSchemaName,
  extractTenantNumericId,
  isLegacyTenantSchemaName,
  isNewTenantSchemaName,
  isValidTenantSchemaName,
  validateTenantSchemaName,
} from '../src/tenant/utils/schema-name.util';

const prisma = new PrismaClient();

interface RenameTask {
  tenantId: string;
  tenantCode: string;
  salonName: string;
  oldSchema: string;
  newSchema: string;
  action: 'WOULD_RENAME' | 'ALREADY_MIGRATED' | 'CONFLICT' | 'MISSING_SOURCE';
  reason?: string;
}

async function getExistingSchemata(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ schema_name: string }>>`
    SELECT schema_name FROM information_schema.schemata
  `;
  return new Set(rows.map((r) => r.schema_name));
}

async function main() {
  const isDryRun = process.argv.some(
    (arg) => arg.toLowerCase().includes('dry-run') || arg.toLowerCase().includes('dryrun'),
  );

  console.log('================================================================================');
  console.log(`MULTI-TENANT SCHEMA MIGRATION UTILITY ${isDryRun ? '[DRY RUN MODE]' : '[LIVE EXECUTION]'}`);
  console.log('================================================================================\n');

  await prisma.$connect();

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      schemaName: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (tenants.length === 0) {
    console.log('No tenants found in public.tenants.');
    return;
  }

  console.log(`Discovered ${tenants.length} tenant record(s) in public.tenants.\n`);

  const physicalSchemata = await getExistingSchemata();
  const tasks: RenameTask[] = [];

  for (const tenant of tenants) {
    const currentSchema = tenant.schemaName;

    // 1. Check if already using the new readable format
    if (isNewTenantSchemaName(currentSchema)) {
      tasks.push({
        tenantId: tenant.id,
        tenantCode: tenant.code,
        salonName: tenant.name,
        oldSchema: currentSchema,
        newSchema: currentSchema,
        action: 'ALREADY_MIGRATED',
        reason: 'Schema name already adheres to new tenant_<slug>_<id> format',
      });
      continue;
    }

    // 2. Validate legacy schema
    if (!isLegacyTenantSchemaName(currentSchema)) {
      tasks.push({
        tenantId: tenant.id,
        tenantCode: tenant.code,
        salonName: tenant.name,
        oldSchema: currentSchema,
        newSchema: currentSchema,
        action: 'CONFLICT',
        reason: `Unrecognized schema format "${currentSchema}". Expected tenant_XXXXXX.`,
      });
      continue;
    }

    // 3. Extract 6-digit numeric ID from current schema or tenant code
    let numericId: number;
    try {
      numericId = extractTenantNumericId(currentSchema);
    } catch {
      try {
        numericId = extractTenantNumericId(tenant.code);
      } catch (err: any) {
        tasks.push({
          tenantId: tenant.id,
          tenantCode: tenant.code,
          salonName: tenant.name,
          oldSchema: currentSchema,
          newSchema: currentSchema,
          action: 'CONFLICT',
          reason: `Could not determine tenant numeric ID: ${err.message}`,
        });
        continue;
      }
    }

    // 4. Generate candidate new schema name
    const newSchema = buildTenantSchemaName(tenant.name, numericId);
    validateTenantSchemaName(newSchema);

    // 5. Check existence of old schema
    if (!physicalSchemata.has(currentSchema)) {
      tasks.push({
        tenantId: tenant.id,
        tenantCode: tenant.code,
        salonName: tenant.name,
        oldSchema: currentSchema,
        newSchema,
        action: 'MISSING_SOURCE',
        reason: `Source schema "${currentSchema}" does not physically exist in PostgreSQL.`,
      });
      continue;
    }

    // 6. Check collision: new schema must not already exist
    if (physicalSchemata.has(newSchema)) {
      tasks.push({
        tenantId: tenant.id,
        tenantCode: tenant.code,
        salonName: tenant.name,
        oldSchema: currentSchema,
        newSchema,
        action: 'CONFLICT',
        reason: `Target schema "${newSchema}" already exists in PostgreSQL.`,
      });
      continue;
    }

    tasks.push({
      tenantId: tenant.id,
      tenantCode: tenant.code,
      salonName: tenant.name,
      oldSchema: currentSchema,
      newSchema,
      action: 'WOULD_RENAME',
    });
  }

  // Display Plan
  for (const task of tasks) {
    console.log(`Tenant ${task.tenantCode} (${task.tenantId})`);
    console.log(`  Salon   : ${task.salonName}`);
    console.log(`  Current : ${task.oldSchema}`);
    console.log(`  New     : ${task.newSchema}`);
    if (task.action === 'ALREADY_MIGRATED') {
      console.log(`  Action  : ALREADY MIGRATED (SKIPPED)`);
    } else if (task.action === 'WOULD_RENAME') {
      console.log(`  Action  : ${isDryRun ? 'WOULD RENAME' : 'PROCEEDING TO RENAME'}`);
    } else {
      console.log(`  Action  : STOPPED / ${task.action} (${task.reason})`);
    }
    console.log('');
  }

  if (isDryRun) {
    console.log('================================================================================');
    console.log('DRY RUN COMPLETE: No database modifications were performed.');
    console.log('To execute real migration, run:');
    console.log('  npm run db:tenant-schema-rename');
    console.log('================================================================================');
    return;
  }

  // Live Execution
  const renameTasks = tasks.filter((t) => t.action === 'WOULD_RENAME');
  if (renameTasks.length === 0) {
    console.log('================================================================================');
    console.log('NO SCHEMAS REQUIRE RENAMING. All tenants are already up to date!');
    console.log('================================================================================');
    return;
  }

  console.log(`================================================================================`);
  console.log(`EXECUTING TRANSACTIONAL SCHEMA RENAMES FOR ${renameTasks.length} TENANT(S)...`);
  console.log(`================================================================================\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const task of renameTasks) {
    console.log(`Renaming [${task.oldSchema}] → [${task.newSchema}] for "${task.salonName}"...`);
    try {
      await prisma.$transaction(
        async (tx) => {
          // 1. Rename the PostgreSQL schema
          await tx.$executeRawUnsafe(`ALTER SCHEMA "${task.oldSchema}" RENAME TO "${task.newSchema}"`);

          // 2. Update public.tenants record
          await tx.$executeRawUnsafe(
            `UPDATE public.tenants SET "schemaName" = $1, "updatedAt" = NOW() WHERE id = $2::uuid`,
            task.newSchema,
            task.tenantId,
          );
        },
        { timeout: 60000, maxWait: 10000 },
      );

      // 3. Post-rename Verification
      const postSchemata = await getExistingSchemata();
      const newExists = postSchemata.has(task.newSchema);
      const oldExists = postSchemata.has(task.oldSchema);

      if (!newExists || oldExists) {
        throw new Error(
          `Post-rename verification failed: newExists=${newExists}, oldExists=${oldExists}`,
        );
      }

      // 4. Verify tenant tables and migration history table intact
      const [tableCountRes, migrationCountRes] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::int as count FROM information_schema.tables WHERE table_schema = $1`,
          task.newSchema,
        ),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::int as count FROM "${task.newSchema}"."_applied_tenant_migrations"`,
        ),
      ]);

      const tableCount = Number(tableCountRes[0]?.count ?? 0);
      const migrationCount = Number(migrationCountRes[0]?.count ?? 0);

      console.log(`  ✓ Schema successfully renamed to "${task.newSchema}"`);
      console.log(`  ✓ Verified: Tables=${tableCount}, AppliedMigrations=${migrationCount}`);
      successCount++;
    } catch (err: any) {
      console.error(`  ✗ FAILED renaming tenant ${task.tenantCode}: ${err.message || err}`);
      failureCount++;
    }
    console.log('');
  }

  console.log('================================================================================');
  console.log(`MIGRATION SUMMARY: ${successCount} Succeeded, ${failureCount} Failed.`);
  if (failureCount === 0) {
    console.log('ALL TENANT SCHEMAS SUCCESSFULLY MIGRATED TO READABLE FORMAT ✓');
  } else {
    console.log('SOME TENANT MIGRATIONS ENCOUNTERED ERRORS. Please inspect logs above.');
    process.exit(1);
  }
  console.log('================================================================================');
}

main()
  .catch((err) => {
    console.error('Fatal error during tenant schema rename:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
