const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  const schema = 'tenant_000004';
  console.log(`Testing supplier operations on [${schema}]...`);

  // Test insert
  const res = await prisma.$queryRawUnsafe(`
    INSERT INTO "${schema}".suppliers (name, contact_person, phone, email, address, notes, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, contact_person AS "contactPerson", phone, email, address, notes, is_active AS "isActive", created_at AS "createdAt"
  `, 'Test Supplier ABC', 'John Doe', '0771234567', 'test@supplier.com', 'Colombo, SL', 'Test note', true);

  console.log('Inserted supplier:', res);

  // Test query with left join
  const rows = await prisma.$queryRawUnsafe(`
    SELECT s.id, s.name, s.contact_person AS "contactPerson", s.phone, s.email,
           s.address, s.notes, s.is_active AS "isActive",
           CASE WHEN s.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
           s.created_at AS "createdAt", s.updated_at AS "updatedAt",
           COALESCE(g.total_purchases, 0)::numeric AS "totalPurchases",
           COALESCE(g.total_paid, 0)::numeric AS "totalPaid",
           COALESCE(g.total_outstanding, 0)::numeric AS "currentOutstanding",
           COALESCE(g.grns_count, 0)::int AS "grnsCount"
    FROM "${schema}".suppliers s
    LEFT JOIN (
      SELECT supplier_id,
             SUM(total_amount) AS total_purchases,
             SUM(paid_amount) AS total_paid,
             SUM(outstanding_amount) AS total_outstanding,
             COUNT(*) AS grns_count
      FROM "${schema}".grns
      WHERE grn_status = 'RECEIVED'
      GROUP BY supplier_id
    ) g ON g.supplier_id = s.id
    WHERE s.id = $1::uuid
  `, res[0].id);

  console.log('Queried supplier:', rows);

  // Clean up test supplier
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".suppliers WHERE id = $1::uuid`, res[0].id);
  console.log('Cleaned up test supplier. All operations SUCCESSFUL!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
