const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('Connected!');

  const schemas = await prisma.$queryRawUnsafe(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`);
  console.log('Tenant schemas:', schemas);

  for (const s of schemas) {
    const schema = s.schema_name;
    const tables = await prisma.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name IN ('suppliers', 'grns', 'grn_items', 'supplier_payments', 'supplier_payment_allocations')`);
    console.log(`Schema [${schema}] supplier tables:`, tables.map(t => t.table_name));

    // Check permissions seeded in role_permissions
    const perms = await prisma.$queryRawUnsafe(`SELECT * FROM "${schema}".permissions WHERE code LIKE 'SUPPLIER%' OR code LIKE 'GRN%'`);
    console.log(`Schema [${schema}] supplier permissions:`, perms.map(p => p.code));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
