import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const extensions = await prisma.$queryRawUnsafe<
    Array<{ extname: string; schema: string }>
  >(
    `SELECT e.extname, n.nspname AS schema
     FROM pg_extension e
     JOIN pg_namespace n ON e.extnamespace = n.oid
     WHERE e.extname = 'pg_trgm'`,
  );
  console.log('pg_trgm:', extensions);

  for (const schema of ['tenant_000001', 'tenant_000002']) {
    const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = $1 AND indexname LIKE '%trgm%'
       ORDER BY indexname`,
      schema,
    );
    console.log(`${schema} trgm indexes:`, indexes.map((row) => row.indexname));
  }
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
