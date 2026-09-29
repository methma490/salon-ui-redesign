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
    logger.log('Skipping auto database setup (DATABASE_AUTO_SETUP=false)');
    return;
  }

  const backendRoot = resolveBackendRoot();

  logger.log('Applying database migrations...');
  runPrismaCommand('migrate deploy', backendRoot);

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`);

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
      } catch (err) {
        logger.warn(`Could not sync schema ${schema}: ${err}`);
      }
    }
  } catch (err) {
    logger.warn(`Could not query tenant schemas for sync: ${err}`);
  }
}

