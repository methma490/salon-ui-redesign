import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  discoverTenantSchemas,
  runAllTenantMigrations,
} from './tenant-migration-runner';
import { seedAllPublicMasterData } from './public-seed-runner';

const logger = new Logger('DatabaseSetup');

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
 * Ensures public schema extensions and payments table are verified.
 */
async function ensurePublicFoundation(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`);
  } catch (e: any) {
    logger.warn(`Could not verify pg_trgm extension: ${e.message || e}`);
  }

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
    logger.warn(`Could not verify public.payments table constraints: ${err.message || err}`);
  }
}

/**
 * Master database bootstrap orchestrator:
 * 1. Executes Prisma public schema migrations (migrate deploy).
 * 2. Seeds & updates public master data (Features, Plans, Prices, Templates, Super Admin).
 * 3. Discovers all tenant schemas and applies missing migrations inside transactions.
 *
 * Runs automatically on backend startup when DATABASE_AUTO_SETUP !== 'false'.
 */
export async function bootstrapDatabase(): Promise<void> {
  if (process.env.DATABASE_AUTO_SETUP === 'false') {
    logger.log('Skipping auto database setup (DATABASE_AUTO_SETUP=false)');
    return;
  }

  logger.log('[DatabaseSetup] Starting database setup...');
  const backendRoot = resolveBackendRoot();

  // 1. Prisma Migrate Deploy (Public Schema)
  try {
    logger.log('[DatabaseSetup] Applying Prisma public schema migrations (migrate deploy)...');
    runPrismaCommand('migrate deploy', backendRoot);
    logger.log('[DatabaseSetup] Public migrations complete.');
  } catch (err: any) {
    logger.error(`[DatabaseSetup] Prisma migrate deploy failed: ${err.message || err}`);
    throw err; // Fail startup rather than running on an invalid database
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    // 2. Ensure public extensions and foundation
    await ensurePublicFoundation(prisma);

    // 3. Seed / sync public master data (Idempotent: Features, Plans, Prices, Templates, Super Admin)
    await seedAllPublicMasterData(prisma);
    logger.log('[DatabaseSetup] Public seeds complete.');

    // 4. Sync and run missing migrations for all tenant schemas automatically
    const tenantSchemas = await discoverTenantSchemas(prisma);
    logger.log(`[DatabaseSetup] Found ${tenantSchemas.length} tenant schema(s).`);

    if (tenantSchemas.length > 0) {
      await runAllTenantMigrations(prisma);
    }

    logger.log('[DatabaseSetup] Database setup completed successfully.');
  } catch (err: any) {
    logger.error(`[DatabaseSetup] Fatal error during database setup: ${err.message || err}`);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
