import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`SET search_path TO "tenant_000002", public`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS customers_name_trgm_idx
      ON customers USING gin (name gin_trgm_ops)
    `);
    console.log('trgm index on tenant_000002: OK');
  } catch (error) {
    console.error('failed:', error);
  }
}

main()
  .finally(async () => prisma.$disconnect());
