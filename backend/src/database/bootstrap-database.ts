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

        // Sync migration 026: Suppliers, GRNs, Payments & Permissions
        await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
        await prisma.$executeRawUnsafe(`
          DO $$ BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'grn_status' AND n.nspname = current_schema()
            ) THEN
              CREATE TYPE grn_status AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');
            END IF;
          END $$;

          DO $$ BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'grn_payment_status' AND n.nspname = current_schema()
            ) THEN
              CREATE TYPE grn_payment_status AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
            END IF;
          END $$;

          DO $$ BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'supplier_payment_method' AND n.nspname = current_schema()
            ) THEN
              CREATE TYPE supplier_payment_method AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE');
            END IF;
          END $$;

          DO $$ BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'supplier_cheque_status' AND n.nspname = current_schema()
            ) THEN
              CREATE TYPE supplier_cheque_status AS ENUM ('PENDING', 'CLEARED', 'BOUNCED');
            END IF;
          END $$;

          CREATE TABLE IF NOT EXISTS suppliers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            contact_person VARCHAR(255),
            phone VARCHAR(50),
            email VARCHAR(255),
            address TEXT,
            notes TEXT,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS grns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            grn_number VARCHAR(50) NOT NULL,
            supplier_id UUID NOT NULL,
            branch_id UUID NOT NULL,
            supplier_invoice_number VARCHAR(100),
            grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
            due_date DATE,
            notes TEXT,
            subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
            discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            payment_status grn_payment_status NOT NULL DEFAULT 'UNPAID',
            grn_status grn_status NOT NULL DEFAULT 'DRAFT',
            received_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            created_by UUID,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT grns_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
            CONSTRAINT grns_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
            CONSTRAINT grns_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT grns_grn_number_unique UNIQUE (grn_number)
          );

          CREATE TABLE IF NOT EXISTS grn_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            grn_id UUID NOT NULL,
            product_id UUID NOT NULL,
            quantity DECIMAL(10,2) NOT NULL,
            unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
            line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT grn_items_grn_fkey FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
            CONSTRAINT grn_items_product_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
          );

          CREATE TABLE IF NOT EXISTS supplier_payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            supplier_id UUID NOT NULL,
            payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
            amount DECIMAL(12,2) NOT NULL,
            payment_method supplier_payment_method NOT NULL DEFAULT 'CASH',
            reference_number VARCHAR(100),
            bank_name VARCHAR(100),
            cheque_number VARCHAR(50),
            cheque_date DATE,
            cheque_status supplier_cheque_status NOT NULL DEFAULT 'CLEARED',
            cleared_at TIMESTAMP,
            notes TEXT,
            created_by UUID,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT supplier_payments_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
            CONSTRAINT supplier_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
          );

          CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            payment_id UUID NOT NULL,
            grn_id UUID NOT NULL,
            allocated_amount DECIMAL(12,2) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT supplier_payment_allocations_payment_fkey FOREIGN KEY (payment_id) REFERENCES supplier_payments(id) ON DELETE CASCADE,
            CONSTRAINT supplier_payment_allocations_grn_fkey FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE RESTRICT
          );

          CREATE INDEX IF NOT EXISTS suppliers_is_active_idx ON suppliers (is_active);
          CREATE INDEX IF NOT EXISTS suppliers_name_idx ON suppliers (name);
          CREATE INDEX IF NOT EXISTS grns_supplier_idx ON grns (supplier_id);
          CREATE INDEX IF NOT EXISTS grns_branch_idx ON grns (branch_id);
          CREATE INDEX IF NOT EXISTS grns_status_idx ON grns (grn_status);
          CREATE INDEX IF NOT EXISTS grns_payment_status_idx ON grns (payment_status);
          CREATE INDEX IF NOT EXISTS grns_grn_date_idx ON grns (grn_date DESC);
          CREATE INDEX IF NOT EXISTS grn_items_grn_idx ON grn_items (grn_id);
          CREATE INDEX IF NOT EXISTS grn_items_product_idx ON grn_items (product_id);
          CREATE INDEX IF NOT EXISTS supplier_payments_supplier_idx ON supplier_payments (supplier_id);
          CREATE INDEX IF NOT EXISTS supplier_payments_date_idx ON supplier_payments (payment_date DESC);
          CREATE INDEX IF NOT EXISTS supplier_payment_allocations_payment_idx ON supplier_payment_allocations (payment_id);
          CREATE INDEX IF NOT EXISTS supplier_payment_allocations_grn_idx ON supplier_payment_allocations (grn_id);

          INSERT INTO permissions (code, name) VALUES
            ('SUPPLIERS_VIEW', 'View Suppliers'),
            ('SUPPLIERS_CREATE', 'Create Suppliers'),
            ('SUPPLIERS_EDIT', 'Edit Suppliers'),
            ('SUPPLIERS_DELETE', 'Delete/Deactivate Suppliers'),
            ('GRN_VIEW', 'View GRN / Purchases'),
            ('GRN_CREATE', 'Create GRN / Purchases'),
            ('GRN_EDIT', 'Edit GRN / Purchases'),
            ('GRN_RECEIVE', 'Receive GRN and Increment Stock'),
            ('GRN_CANCEL', 'Cancel GRN'),
            ('SUPPLIER_PAYMENTS_VIEW', 'View Supplier Payments'),
            ('SUPPLIER_PAYMENTS_CREATE', 'Record Supplier Payments'),
            ('SUPPLIER_OUTSTANDING_VIEW', 'View Supplier Outstanding')
          ON CONFLICT (code) DO NOTHING;

          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
          WHERE r.code = 'SALON_ADMIN'
            AND p.code IN (
              'SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_EDIT', 'SUPPLIERS_DELETE',
              'GRN_VIEW', 'GRN_CREATE', 'GRN_EDIT', 'GRN_RECEIVE', 'GRN_CANCEL',
              'SUPPLIER_PAYMENTS_VIEW', 'SUPPLIER_PAYMENTS_CREATE',
              'SUPPLIER_OUTSTANDING_VIEW'
            )
          ON CONFLICT (role_id, permission_id) DO NOTHING;

          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
          WHERE r.code = 'STOCK_KEEPER'
            AND p.code IN (
              'SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_EDIT',
              'GRN_VIEW', 'GRN_CREATE', 'GRN_EDIT', 'GRN_RECEIVE',
              'SUPPLIER_OUTSTANDING_VIEW'
            )
          ON CONFLICT (role_id, permission_id) DO NOTHING;
        `);
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

