import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  for (const schema of ['tenant_000001', 'tenant_000002']) {
    const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = $1
         AND indexname LIKE '%_idx'
       ORDER BY indexname`,
      schema,
    );
    console.log(`\n${schema} (${indexes.length} custom idx):`);
    console.log(indexes.map((row) => row.indexname).join('\n'));
  }
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
