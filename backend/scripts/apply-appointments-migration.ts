/**
 * Applies 007_appointments.sql and appointment permissions to all existing tenant schemas.
 * Run: npx ts-node scripts/apply-appointments-migration.ts
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
  '007_appointments.sql',
);

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (char === '$' && nextChar === '$') {
      if (!inDollarQuote) {
        inDollarQuote = true;
        current += char + nextChar;
        i++;
      } else {
        inDollarQuote = false;
        current += char + nextChar;
        i++;
      }
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

async function applyPermissions(schema: string): Promise<void> {
  const permissions = [
    { code: 'APPOINTMENT_VIEW', name: 'View Appointments' },
    { code: 'APPOINTMENT_CREATE', name: 'Create Appointments' },
    { code: 'APPOINTMENT_UPDATE', name: 'Update Appointments' },
    { code: 'APPOINTMENT_DELETE', name: 'Cancel Appointments' },
  ];

  for (const permission of permissions) {
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

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schema}".role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM "${schema}".roles r
    INNER JOIN "${schema}".permissions p ON p.code IN (
      'APPOINTMENT_VIEW', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_DELETE'
    )
    WHERE r.code = 'SALON_ADMIN'
    ON CONFLICT DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${schema}".role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM "${schema}".roles r
    INNER JOIN "${schema}".permissions p ON p.code IN (
      'APPOINTMENT_VIEW', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE'
    )
    WHERE r.code = 'CASHIER'
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

  console.log(`Applying appointments migration to ${tenants.length} tenant(s)...`);

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
