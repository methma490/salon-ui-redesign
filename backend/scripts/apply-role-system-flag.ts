/**
 * Applies 006_role_system_flag.sql to all existing tenant schemas.
 * Run: npx ts-node scripts/apply-role-system-flag.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { code: true, schemaName: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Applying role system flag migration to ${tenants.length} tenant(s)...`);

  for (const tenant of tenants) {
    const schema = tenant.schemaName;
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schema}".roles
        ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE "${schema}".roles
        SET is_system = true
        WHERE code IN ('SALON_ADMIN', 'CASHIER', 'STOCK_KEEPER')
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
