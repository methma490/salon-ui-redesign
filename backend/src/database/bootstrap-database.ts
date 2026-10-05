import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
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

function runPrismaCommand(command: string, backendRoot: string): void {
  execSync(`npx prisma ${command}`, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

/**
 * Applies Prisma migrations and seeds when the public schema is empty.
 * Runs before NestJS bootstraps so tables exist on first `npm run dev`.
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

  logger.log('Applying database migrations...');
  runPrismaCommand('migrate deploy', backendRoot);

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`);
    await ensurePublicPaymentsTable(prisma);

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
      logger.log('Database schema ready');
    }

    // Sync all existing tenant schemas with latest columns/migrations
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
    const tenantRows = await prisma.$queryRaw<Array<{ schemaName: string }>>`
      SELECT "schemaName" FROM tenants WHERE "schemaName" IS NOT NULL
    `;
    const schemas = Array.from(
      new Set([
        ...schemaRows.map((r) => r.schema_name),
        ...tenantRows.map((r) => r.schemaName),
      ]),
    );

    for (const schema of schemas) {
      if (!schema) continue;
      try {
        // Keep this first: this column is read by the appointment list query. Other
        // optional sync statements may fail on partially provisioned tenant schemas.
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
      } catch (err) {
        logger.warn(`Could not sync schema ${schema}: ${err}`);
      }
    }
  } catch (err) {
    logger.warn(`Could not query tenant schemas for sync: ${err}`);
  }
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
  } catch (err) {
    logger.warn(`Could not verify public.payments table: ${err}`);
  }
}

