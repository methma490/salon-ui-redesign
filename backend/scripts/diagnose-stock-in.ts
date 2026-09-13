import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { schemaName: true, name: true },
    take: 5,
  });
  console.log('Tenants:', tenants);

  for (const tenant of tenants) {
    const schema = tenant.schemaName;
    const enums = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(
      `SELECT e.enumlabel
       FROM pg_enum e
       JOIN pg_type ty ON e.enumtypid = ty.oid
       JOIN pg_namespace n ON ty.typnamespace = n.oid
       WHERE n.nspname = $1 AND ty.typname = 'stock_movement_type'
       ORDER BY e.enumsortorder`,
      schema,
    );
    console.log(`${schema} enum values:`, enums.map((row) => row.enumlabel));

    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_name IN ('branch_stock', 'stock_movements')
       ORDER BY table_name`,
      schema,
    );
    console.log(`${schema} tables:`, tables.map((row) => row.table_name));

    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".stock_movements
           (branch_id, product_id, type, quantity, notes, reference_type, reference_id, created_by)
         SELECT b.id, p.id, $1::stock_movement_type, 1, 'test', NULL, NULL, NULL
         FROM "${schema}".branches b
         CROSS JOIN "${schema}".products p
         LIMIT 0`,
        'STOCK_IN',
      );
      console.log(`${schema} unqualified enum cast: OK (0 rows)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${schema} unqualified enum cast FAILED:`, message.split('\n')[0]);
    }

    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".stock_movements
           (branch_id, product_id, type, quantity, notes, reference_type, reference_id, created_by)
         SELECT b.id, p.id, $1::text::"${schema}".stock_movement_type, 1, 'test', NULL, NULL, NULL
         FROM "${schema}".branches b
         CROSS JOIN "${schema}".products p
         LIMIT 0`,
        'STOCK_IN',
      );
      console.log(`${schema} qualified enum cast: OK (0 rows)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${schema} qualified enum cast FAILED:`, message.split('\n')[0]);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
