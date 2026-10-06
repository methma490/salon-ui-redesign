import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('DatabaseBootstrap');

function resolveBackendRoot(): string {
  const candidates = [join(__dirname, '..'), join(__dirname, '../..'), process.cwd()];

  for (const dir of candidates) {
    if (existsSync(join(dir, 'prisma', 'schema.prisma'))) {
      return dir;
    }
  }

  return process.cwd();
}

function resolveTenantMigrationsDir(): string | null {
  const candidates = [
    join(__dirname, 'tenant-migrations'),
    join(__dirname, '../database/tenant-migrations'),
    join(__dirname, '../../database/tenant-migrations'),
    join(__dirname, '../../src/database/tenant-migrations'),
    join(process.cwd(), 'src/database/tenant-migrations'),
    join(process.cwd(), 'dist/database/tenant-migrations'),
    join(process.cwd(), 'backend/src/database/tenant-migrations'),
    join(process.cwd(), 'backend/dist/database/tenant-migrations'),
    join(process.cwd(), 'database/tenant-migrations'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        const sqlFiles = readdirSync(candidate).filter((f) => f.endsWith('.sql'));
        if (sqlFiles.length > 0) {
          return candidate;
        }
      } catch {
        // continue search
      }
    }
  }

  return null;
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const len = sql.length;

  while (i < len) {
    // 1. Single-line comment: -- ... \n
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < len && sql[i] !== '\n') {
        current += sql[i];
        i++;
      }
      if (i < len) {
        current += sql[i];
        i++;
      }
      continue;
    }

    // 2. Block comment: /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      current += '/*';
      i += 2;
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) {
        current += sql[i];
        i++;
      }
      if (i < len) {
        current += '*/';
        i += 2;
      }
      continue;
    }

    // 3. Dollar quote: $$ ... $$ or $<tag>$ ... $<tag>$
    if (sql[i] === '$') {
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        current += tag;
        i += tag.length;
        const endIdx = sql.indexOf(tag, i);
        if (endIdx !== -1) {
          current += sql.slice(i, endIdx + tag.length);
          i = endIdx + tag.length;
        } else {
          current += sql.slice(i);
          i = len;
        }
        continue;
      }
    }

    // 4. Single-quoted string
    if (sql[i] === "'") {
      current += "'";
      i++;
      while (i < len) {
        if (sql[i] === "'") {
          current += "'";
          i++;
          if (i < len && sql[i] === "'") {
            current += "'";
            i++;
          } else {
            break;
          }
        } else {
          current += sql[i];
          i++;
        }
      }
      continue;
    }

    // 5. Statement delimiter: ;
    if (sql[i] === ';') {
      current += ';';
      i++;
      statements.push(current);
      current = '';
      continue;
    }

    current += sql[i];
    i++;
  }

  if (current.trim().length > 0) {
    statements.push(current);
  }

  return statements;
}

function runPrismaCommand(command: string, backendRoot: string): void {
  execSync(`npx prisma ${command}`, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

/**
 * Automatically applies:
 * 1. Prisma migrations (Public schema tables, columns, indexes, enums).
 * 2. Seeds initial data if the public schema is brand new.
 * 3. Discovers and runs all tenant schema migrations dynamically across all tenants.
 *
 * Runs automatically on backend startup before NestJS listens for requests.
 */
export async function bootstrapDatabase(): Promise<void> {
  if (process.env.DATABASE_AUTO_SETUP === 'false') {
    logger.log('Skipping general auto database setup (DATABASE_AUTO_SETUP=false)');
    const prisma = new PrismaClient();
    try {
      await prisma.$connect();
      await syncEmployeePhotoColumns(prisma);
    } finally {
      await prisma.$disconnect();
    }
    return;
  }

  const backendRoot = resolveBackendRoot();

  // 1. Prisma Migrate Deploy (Public Schema)
  try {
    logger.log('Applying Prisma public schema migrations (migrate deploy)...');
    runPrismaCommand('migrate deploy', backendRoot);
    logger.log('Prisma public schema migrations verified / up to date.');
  } catch (err: any) {
    logger.warn(`Prisma migrate deploy warning/error: ${err.message || err}`);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    // 2. Ensure public extensions and payments table
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`);
    } catch (e: any) {
      logger.warn(`Could not verify pg_trgm extension: ${e.message || e}`);
    }
    await ensurePublicPaymentsTable(prisma);

    // 3. Seed default data if database is empty
    const planCount = await prisma.plan.count();

    if (planCount === 0) {
      logger.log('Empty database detected — seeding default data...');
      const compiledSeedPath = join(backendRoot, 'dist/prisma/seed.js');
      if (existsSync(compiledSeedPath)) {
        logger.log(`Executing compiled seed: node ${compiledSeedPath}`);
        execSync(`node "${compiledSeedPath}"`, {
          cwd: backendRoot,
          stdio: 'inherit',
          env: process.env,
        });
      } else {
        runPrismaCommand('db seed', backendRoot);
      }
    } else {
      logger.log('Database public schema ready');
    }

    // 4. Sync and run migrations for all tenant schemas automatically
    await syncAllTenantSchemas(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function syncEmployeePhotoColumns(prisma: PrismaClient): Promise<void> {
  const schemaRows = await prisma.$queryRaw<Array<{ schema_name: string }>>`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name ~ '^tenant_'
  `;
  const tenantRows = await prisma.$queryRaw<Array<{ schemaName: string }>>`
    SELECT "schemaName" FROM tenants WHERE "schemaName" IS NOT NULL
  `;
  const schemas = new Set([
    ...schemaRows.map((row) => row.schema_name),
    ...tenantRows.map((row) => row.schemaName),
  ]);

  for (const schema of schemas) {
    if (!schema) continue;
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await prisma.$executeRawUnsafe(
      `ALTER TABLE IF EXISTS ${quotedSchema}.employees ADD COLUMN IF NOT EXISTS photo_url TEXT`,
    );
  }
}

async function syncAllTenantSchemas(prisma: PrismaClient): Promise<void> {
  try {
    const schemaRows = await prisma.$queryRaw<Array<{ schema_name: string }>>`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name ~ '^tenant_'
    `;
    const physicallyExisting = new Set(schemaRows.map((r) => r.schema_name));
    const tenantRows = await prisma.$queryRaw<Array<{ schemaName: string }>>`
      SELECT "schemaName" FROM tenants WHERE "schemaName" IS NOT NULL
    `;
    const schemas = Array.from(
      new Set([
        ...schemaRows.map((r) => r.schema_name),
        ...tenantRows.map((r) => r.schemaName),
      ]),
    ).filter((s): s is string => Boolean(s) && physicallyExisting.has(s));

    if (schemas.length === 0) {
      logger.log('No active tenant schemas found to sync.');
      return;
    }

    const migrationsDir = resolveTenantMigrationsDir();
    const migrationFiles = migrationsDir
      ? readdirSync(migrationsDir)
          .filter((f) => f.endsWith('.sql'))
          .sort()
      : [];

    logger.log(`Found ${schemas.length} tenant schema(s) to check/migrate: [${schemas.join(', ')}]`);
    if (migrationsDir) {
      logger.log(`Loaded tenant migrations from: ${migrationsDir} (${migrationFiles.length} migration files found)`);
    } else {
      logger.warn('Tenant migrations directory not found; will apply inline schema fallbacks.');
    }

    for (const schema of schemas) {
      if (!schema) continue;
      try {
        // 1. Automatically run any unapplied .sql tenant migrations
        if (migrationsDir && migrationFiles.length > 0) {
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${schema}"._applied_tenant_migrations (
              name VARCHAR(255) PRIMARY KEY,
              applied_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);

          const appliedRows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
            `SELECT name FROM "${schema}"._applied_tenant_migrations`,
          );
          const appliedSet = new Set(appliedRows.map((r) => r.name));

          for (const file of migrationFiles) {
            if (appliedSet.has(file)) {
              continue; // Already applied
            }

            logger.log(`Applying tenant migration [${file}] to schema [${schema}]...`);
            const filePath = join(migrationsDir, file);
            const sql = readFileSync(filePath, 'utf-8');
            const statements = splitSqlStatements(sql);

            await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

            for (const stmt of statements) {
              const trimmed = stmt.trim();
              const executable = trimmed
                .replace(/--.*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .trim();
              if (!executable) continue;

              try {
                await prisma.$executeRawUnsafe(stmt);
              } catch (stmtErr: any) {
                // Ignore idempotent notices like type or relation already existing
                logger.debug?.(`Notice in [${schema}] on [${file}]: ${stmtErr.message || stmtErr}`);
              }
            }

            await prisma.$executeRawUnsafe(
              `INSERT INTO "${schema}"._applied_tenant_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
              file,
            );
            logger.log(`✓ Migration [${file}] completed for schema [${schema}]`);
          }
        }

        // 2. Extra safety fallback for critical tenant columns and indexes
        await applyTenantFallbackColumns(prisma, schema);

      } catch (err: any) {
        logger.warn(`Could not sync schema ${schema}: ${err.message || err}`);
      }
    }
    logger.log('All tenant schemas verified and up to date.');
  } catch (err: any) {
    logger.warn(`Could not query tenant schemas for sync: ${err.message || err}`);
  }
}

async function applyTenantFallbackColumns(prisma: PrismaClient, schema: string): Promise<void> {
  // Keep this first: this column is read by the appointment list query.
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".appointments ADD COLUMN IF NOT EXISTS employee_id UUID`,
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".branches ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".branches ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".service_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".product_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${schema}".service_category_branches (
      category_id UUID NOT NULL,
      branch_id UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (category_id, branch_id),
      CONSTRAINT scb_category_fkey FOREIGN KEY (category_id) REFERENCES "${schema}".service_categories(id) ON DELETE CASCADE,
      CONSTRAINT scb_branch_fkey FOREIGN KEY (branch_id) REFERENCES "${schema}".branches(id) ON DELETE CASCADE
    )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_scb_category_id ON "${schema}".service_category_branches(category_id)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_scb_branch_id ON "${schema}".service_category_branches(branch_id)`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".products ADD COLUMN IF NOT EXISTS image_url TEXT`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${schema}".product_branches (
      product_id UUID NOT NULL,
      branch_id UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (product_id, branch_id),
      CONSTRAINT pb_product_fkey FOREIGN KEY (product_id) REFERENCES "${schema}".products(id) ON DELETE CASCADE,
      CONSTRAINT pb_branch_fkey FOREIGN KEY (branch_id) REFERENCES "${schema}".branches(id) ON DELETE CASCADE
    )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_pb_product_id ON "${schema}".product_branches(product_id)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_pb_branch_id ON "${schema}".product_branches(branch_id)`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".quotations ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255)`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".quotations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".employees ADD COLUMN IF NOT EXISTS max_advance_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".employees ADD COLUMN IF NOT EXISTS photo_url TEXT`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${schema}".payroll_settings ADD COLUMN IF NOT EXISTS max_salary_advance_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00`,
  );
}

async function ensurePublicPaymentsTable(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "public"."payments" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "payment_order_id" UUID NOT NULL,
        "transaction_id" TEXT,
        "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
        "paid_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "payments_transaction_id_key" ON "public"."payments"("transaction_id");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "payments_payment_order_id_idx" ON "public"."payments"("payment_order_id");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "public"."payments"("status");`,
    );

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'payments_payment_order_id_fkey'
        ) THEN
          ALTER TABLE "public"."payments"
            ADD CONSTRAINT "payments_payment_order_id_fkey"
            FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_payment_id_fkey'
        ) THEN
          ALTER TABLE "public"."payment_transactions"
            ADD CONSTRAINT "payment_transactions_payment_id_fkey"
            FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE "public"."invoices"
      SET payment_id = NULL
      WHERE payment_id IS NOT NULL AND payment_id NOT IN (SELECT id FROM "public"."payments");
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'invoices_payment_id_fkey'
        ) THEN
          ALTER TABLE "public"."invoices"
            ADD CONSTRAINT "invoices_payment_id_fkey"
            FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  } catch (err: any) {
    logger.warn(`Could not verify public.payments table: ${err.message || err}`);
  }
}
