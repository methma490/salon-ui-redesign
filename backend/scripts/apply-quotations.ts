/**
 * Applies 016_quotations.sql to all existing tenant schemas,
 * then idempotently seeds quotation permissions / role mappings.
 * Run from backend/: npx ts-node scripts/apply-quotations.ts
 * Or: npm run db:quotations:tenants
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FeatureStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const migrationPath = join(
  process.cwd(),
  'src',
  'database',
  'tenant-migrations',
  '016_quotations.sql',
);

const QUOTATION_PERMISSIONS: Array<{ code: string; name: string }> = [
  { code: 'QUOTATION_VIEW', name: 'View Quotations' },
  { code: 'QUOTATION_CREATE', name: 'Create Quotations' },
  { code: 'QUOTATION_UPDATE', name: 'Update Quotations' },
  { code: 'QUOTATION_SEND', name: 'Send Quotations' },
  { code: 'QUOTATION_CONVERT', name: 'Convert Quotations to Invoice' },
  { code: 'QUOTATION_CANCEL', name: 'Cancel Quotations' },
];

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

async function seedQuotationPermissions(schema: string): Promise<void> {
  await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

  for (const permission of QUOTATION_PERMISSIONS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO permissions (code, name)
       VALUES ($1, $2)
       ON CONFLICT (code) DO NOTHING`,
      permission.code,
      permission.name,
    );
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.code = 'SALON_ADMIN'
      AND p.code IN (
        'QUOTATION_VIEW', 'QUOTATION_CREATE', 'QUOTATION_UPDATE',
        'QUOTATION_SEND', 'QUOTATION_CONVERT', 'QUOTATION_CANCEL'
      )
    ON CONFLICT (role_id, permission_id) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    INNER JOIN permissions p ON p.code IN (
      'QUOTATION_VIEW', 'QUOTATION_CREATE', 'QUOTATION_UPDATE', 'QUOTATION_SEND'
    )
    WHERE r.code = 'CASHIER'
    ON CONFLICT (role_id, permission_id) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`SET search_path TO public`);
}

async function main() {
  const sql = readFileSync(migrationPath, 'utf-8');
  const statements = splitSqlStatements(sql);
  const tenants = await prisma.tenant.findMany({
    select: { code: true, schemaName: true, status: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Applying quotations migration to ${tenants.length} tenant(s)...`);

  for (const tenant of tenants) {
    const schema = tenant.schemaName;
    try {
      await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
      for (const statement of statements) {
        if (statement.trim().length === 0) continue;
        await prisma.$executeRawUnsafe(statement);
      }
      await prisma.$executeRawUnsafe(`SET search_path TO public`);
      await seedQuotationPermissions(schema);
      console.log(`✓ ${tenant.code} (${schema}) [${tenant.status}]`);
    } catch (error) {
      await prisma.$executeRawUnsafe(`SET search_path TO public`);
      console.error(`✗ ${tenant.code}:`, error instanceof Error ? error.message : error);
    }
  }

  const quotations = await prisma.feature.upsert({
    where: { code: 'QUOTATIONS' },
    create: {
      code: 'QUOTATIONS',
      name: 'Quotations',
      description: 'Customer quotations, messaging, and convert to invoice',
      status: FeatureStatus.ACTIVE,
    },
    update: {
      name: 'Quotations',
      description: 'Customer quotations, messaging, and convert to invoice',
      status: FeatureStatus.ACTIVE,
    },
  });

  const plans = await prisma.plan.findMany({
    where: { status: 'ACTIVE' },
    include: { planFeatures: { include: { feature: true } } },
  });

  for (const plan of plans) {
    const hasPos = plan.planFeatures.some((f) => f.feature.code === 'POS');
    const hasQuotations = plan.planFeatures.some((f) => f.feature.code === 'QUOTATIONS');
    if (hasPos && !hasQuotations) {
      await prisma.planFeature.create({
        data: { planId: plan.id, featureId: quotations.id, enabled: true },
      });
      console.log(`✓ Added QUOTATIONS feature to plan ${plan.code}`);
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
