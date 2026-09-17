/**
 * Applies 013_sale_item_employee_indexes.sql to all existing tenant schemas.
 * Run: npx ts-node scripts/apply-sale-item-employee-indexes.ts
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
  '013_sale_item_employee_indexes.sql',
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

async function main() {
  const sql = readFileSync(migrationPath, 'utf-8');
  const statements = splitSqlStatements(sql);
  const tenants = await prisma.tenant.findMany({
    select: { code: true, schemaName: true, status: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Applying sale_item_employees indexes to ${tenants.length} tenant(s)...`);

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
