import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe<Array<{ schema: string }>>(
    `SELECT n.nspname AS schema
     FROM pg_extension e
     JOIN pg_namespace n ON e.extnamespace = n.oid
     WHERE e.extname = 'pg_trgm'`,
  );

  console.log('Before:', rows);

  if (rows.length > 0) {
    await prisma.$executeRawUnsafe(`DROP EXTENSION pg_trgm CASCADE`);
    console.log('Dropped pg_trgm (cascade removes dependent trigram indexes)');
  }

  await prisma.$executeRawUnsafe(`CREATE EXTENSION pg_trgm SCHEMA public`);
  console.log('Created pg_trgm in public schema');

  const after = await prisma.$queryRawUnsafe<Array<{ schema: string }>>(
    `SELECT n.nspname AS schema
     FROM pg_extension e
     JOIN pg_namespace n ON e.extnamespace = n.oid
     WHERE e.extname = 'pg_trgm'`,
  );
  console.log('After:', after);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
