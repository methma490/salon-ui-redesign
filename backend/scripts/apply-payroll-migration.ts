/**
 * Applies 010_payroll.sql and payroll permissions to all existing tenant schemas.
 * Run: npm run db:payroll:tenants
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
  '010_payroll.sql',
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

const PAYROLL_PERMISSIONS = [
  { code: 'PAYROLL_VIEW', name: 'View Payroll' },
  { code: 'PAYROLL_RUN', name: 'Generate Payroll Runs' },
  { code: 'PAYROLL_UPDATE', name: 'Update Draft Payroll' },
  { code: 'PAYROLL_FINALIZE', name: 'Finalize Payroll' },
  { code: 'PAYROLL_MARK_PAID', name: 'Mark Payroll Paid' },
  { code: 'LOAN_VIEW', name: 'View Employee Loans' },
  { code: 'LOAN_CREATE', name: 'Create Employee Loans' },
  { code: 'LOAN_UPDATE', name: 'Update Employee Loans' },
  { code: 'PAYSLIP_VIEW', name: 'View Payslips' },
  { code: 'PAYROLL_SETTINGS_VIEW', name: 'View Payroll Settings' },
  { code: 'PAYROLL_SETTINGS_UPDATE', name: 'Update Payroll Settings' },
];

async function applyPermissions(schema: string): Promise<void> {
  for (const permission of PAYROLL_PERMISSIONS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".permissions (code, name)
       SELECT $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".permissions WHERE code = $1
       )`,
      permission.code,
      permission.name,
    );
  }

  const codes = PAYROLL_PERMISSIONS.map((p) => `'${p.code}'`).join(', ');
  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schema}".role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM "${schema}".roles r
    INNER JOIN "${schema}".permissions p ON p.code IN (${codes})
    WHERE r.code = 'SALON_ADMIN'
    ON CONFLICT DO NOTHING
  `);
}

async function main() {
  const sql = readFileSync(migrationPath, 'utf-8');
  const statements = splitSqlStatements(sql);
  const tenants = await prisma.tenant.findMany({
    select: { code: true, schemaName: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Applying payroll migration to ${tenants.length} tenant(s)...`);

  for (const tenant of tenants) {
    const schema = tenant.schemaName;
    try {
      await prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`);

      for (const statement of statements) {
        if (statement.trim().length === 0) continue;
        await prisma.$executeRawUnsafe(statement);
      }

      await applyPermissions(schema);
      await prisma.$executeRawUnsafe(`SET search_path TO public`);
      console.log(`✓ ${tenant.code} (${schema})`);
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
