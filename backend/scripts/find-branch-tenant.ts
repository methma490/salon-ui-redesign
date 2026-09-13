import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const branchId = '60cb36a2-80b2-4f4c-ad9b-278990ed4f31';

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { schemaName: true, name: true } });
  for (const tenant of tenants) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT id, name FROM "${tenant.schemaName}".branches WHERE id = $1::uuid`,
      branchId,
    );
    if (rows.length > 0) {
      console.log('Found branch in', tenant.schemaName, tenant.name, rows[0]);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
