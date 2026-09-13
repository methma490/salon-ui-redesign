/**
 * Applies 005_user_permissions.sql to all existing tenant schemas.
 * Run: npx ts-node scripts/apply-user-permissions-migration.ts
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const migrationPath = join(
  process.cwd(),
  'src',
  'database',
  'tenant-migrations',
  '005_user_permissions.sql',
);

async function main() {
  const sql = readFileSync(migrationPath, 'utf-8');
  const tenants = await prisma.tenant.findMany({
    select: { code: true, schemaName: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Applying user_permissions migration to ${tenants.length} tenant(s)...`);

  const statements = sql
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith('--'));

  for (const tenant of tenants) {
    const schema = tenant.schemaName;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schema}".user_permissions (
          user_id UUID NOT NULL,
          permission_id UUID NOT NULL,
          PRIMARY KEY (user_id, permission_id),
          CONSTRAINT user_permissions_user_fkey FOREIGN KEY (user_id) REFERENCES "${schema}".users(id) ON DELETE CASCADE,
          CONSTRAINT user_permissions_permission_fkey FOREIGN KEY (permission_id) REFERENCES "${schema}".permissions(id) ON DELETE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS user_permissions_user_id_idx ON "${schema}".user_permissions(user_id)
      `);
      console.log(`✓ ${tenant.code} (${schema})`);
    } catch (error) {
      console.error(`✗ ${tenant.code}:`, error instanceof Error ? error.message : error);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
