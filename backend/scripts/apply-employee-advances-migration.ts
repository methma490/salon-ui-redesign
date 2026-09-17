/**
 * Applies 012_employee_advances.sql to all existing tenant schemas.
 * Run: npm run db:advances:tenants
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
  '012_employee_advances.sql',
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
  const sql = readFileSync(migrationPath, 'utf8');
  const statements = splitSqlStatements(sql);

  const tenants = await prisma.$queryRawUnsafe<Array<{ schema_name: string }>>(
    `SELECT schema_name FROM information_schema.schemata
     WHERE schema_name LIKE 'tenant_%'
     ORDER BY schema_name`,
  );

  console.log(`Applying 012_employee_advances to ${tenants.length} tenant schema(s)…`);

  for (const tenant of tenants) {
    const schema = tenant.schema_name;
    console.log(`→ ${schema}`);
    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`);
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (error) {
        console.error(`  Failed on statement:\n${statement.slice(0, 240)}…`);
        throw error;
      }
    }
  }

  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
