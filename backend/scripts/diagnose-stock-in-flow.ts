import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulate(schema: string, branchId: string, productId: string, userId: string) {
  console.log(`\n=== Simulating stock in for ${schema} ===`);

  try {
    await prisma.$transaction(async (tx) => {
      const stock = `"${schema}".branch_stock`;
      const movements = `"${schema}".stock_movements`;

      const existing = await tx.$queryRawUnsafe<Array<{ id: string; quantity: string }>>(
        `SELECT id, quantity::text FROM ${stock}
         WHERE branch_id = $1::uuid AND product_id = $2::uuid LIMIT 1`,
        branchId,
        productId,
      );
      console.log('existing stock row:', existing.length);

      await tx.$queryRawUnsafe(
        `INSERT INTO ${movements}
           (branch_id, product_id, type, quantity, notes, reference_type, reference_id, created_by)
         VALUES ($1::uuid, $2::uuid, $3::stock_movement_type, $4, $5, $6, $7::uuid, $8::uuid)
         RETURNING id`,
        branchId,
        productId,
        'STOCK_IN',
        10,
        null,
        null,
        null,
        userId,
      );
      console.log('unqualified STOCK_IN: success');
    });
  } catch (error) {
    console.log('unqualified STOCK_IN failed:', (error as Error).message.split('\n').slice(0, 3).join(' | '));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const movements = `"${schema}".stock_movements`;
      await tx.$queryRawUnsafe(
        `INSERT INTO ${movements}
           (branch_id, product_id, type, quantity, notes, reference_type, reference_id, created_by)
         VALUES ($1::uuid, $2::uuid, $3::text::"${schema}".stock_movement_type, $4, $5, $6, $7::uuid, $8::uuid)
         RETURNING id`,
        branchId,
        productId,
        'STOCK_IN',
        10,
        null,
        null,
        null,
        userId,
      );
      console.log('qualified STOCK_IN: success');
    });
  } catch (error) {
    console.log('qualified STOCK_IN failed:', (error as Error).message.split('\n').slice(0, 3).join(' | '));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const movements = `"${schema}".stock_movements`;
      await tx.$queryRawUnsafe(
        `INSERT INTO ${movements}
           (branch_id, product_id, type, quantity, notes, reference_type, reference_id, created_by)
         VALUES ($1::uuid, $2::uuid, $3::text::"${schema}".stock_movement_type, $4, $5, $6, $7::uuid, $8::uuid)
         RETURNING id`,
        branchId,
        productId,
        'IN',
        10,
        null,
        null,
        null,
        userId,
      );
      console.log('qualified IN: success');
      throw new Error('rollback');
    });
  } catch (error) {
    if ((error as Error).message === 'rollback') {
      console.log('qualified IN: success (rolled back)');
      return;
    }
    console.log('qualified IN failed:', (error as Error).message.split('\n').slice(0, 3).join(' | '));
  }
}

async function main() {
  const branchId = '60cb36a2-80b2-4f4c-ad9b-278990ed4f31';
  const productId = 'c442d0be-9dba-42a3-a49c-cae0716b7e07';

  for (const schema of ['tenant_000001', 'tenant_000002']) {
    const users = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schema}".users WHERE status = 'ACTIVE' LIMIT 1`,
    );
    await simulate(schema, branchId, productId, users[0]?.id ?? '');
  }
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
