/**
 * Applies 008_performance_indexes.sql to all existing tenant schemas.
 * Run: npx ts-node scripts/apply-performance-indexes-migration.ts
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
  '008_performance_indexes.sql',
);

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (char === '$' && nextChar === '$') {
      inDollarQuote = !inDollarQuote;
      current += char + nextChar;
      i++;
    } else if (char === ';' && !inDollarQuote) {
      current += char;
      statements.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements.filter((statement) => statement.length > 0);
}

async function ensurePgTrgmInPublic(): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ schema: string }>>(
    `SELECT n.nspname AS schema
     FROM pg_extension e
     JOIN pg_namespace n ON e.extnamespace = n.oid
     WHERE e.extname = 'pg_trgm'`,
  );

  if (rows.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`);
    return;
  }

  if (rows[0].schema !== 'public') {
    await prisma.$executeRawUnsafe(`ALTER EXTENSION pg_trgm SET SCHEMA public`);
  }
}

async function main() {
  await ensurePgTrgmInPublic();

  const sql = readFileSync(migrationPath, 'utf-8');
  const statements = splitSqlStatements(sql);
  const tenants = await prisma.tenant.findMany({
    select: { code: true, schemaName: true, status: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Applying performance indexes to ${tenants.length} tenant(s)...`);

  for (const tenant of tenants) {
    const schema = tenant.schemaName;
    try {
      await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

      for (const statement of statements) {
        if (statement.trim().length === 0) continue;
        await prisma.$executeRawUnsafe(statement);
      }

      await prisma.$executeRawUnsafe(`SET search_path TO public`);
      console.log(`✓ ${tenant.code} (${schema}) [${tenant.status}]`);
    } catch (error) {
      await prisma.$executeRawUnsafe(`SET search_path TO public`);
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
