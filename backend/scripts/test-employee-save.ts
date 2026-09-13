import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { code: 'SAL000001', status: 'ACTIVE' },
    select: { schemaName: true, id: true },
  });
  if (!tenant) {
    console.log('No active SAL000001 tenant');
    return;
  }

  const schema = tenant.schemaName;
  const branches = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
    `SELECT id, name FROM "${schema}".branches WHERE status = 'ACTIVE' LIMIT 1`,
  );
  if (!branches.length) {
    console.log('No branch');
    return;
  }
  const branchId = branches[0].id;

  const order = await prisma.signupOrder.findFirst({
    where: { tenantId: tenant.id },
    select: { adminEmail: true },
  });
  const email = order?.adminEmail ?? 'hair@gmail.com';

  const testPassword = 'TestPass123!';
  const hash = await bcrypt.hash(testPassword, 12);
  await prisma.$executeRawUnsafe(
    `UPDATE "${schema}".users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
    hash,
    email,
  );

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: testPassword }),
  });
  const login = await loginRes.json();
  if (!login.accessToken) {
    console.log('Login failed', loginRes.status, login);
    return;
  }
  console.log('Logged in as', email);

  const token = login.accessToken;
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const createEmptyEmail = await fetch(`${BASE}/api/tenant/employees`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name: 'Test Employee',
      designation: 'Stylist',
      branchId,
      email: '',
      phone: '',
    }),
  });
  console.log('\nCreate with empty email:', createEmptyEmail.status, await createEmptyEmail.text());

  const createOk = await fetch(`${BASE}/api/tenant/employees`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name: 'Test Employee Two',
      designation: 'Stylist',
      branchId,
    }),
  });
  const created = await createOk.json();
  console.log('\nCreate without email:', createOk.status, created);

  if (created.id) {
    const updateEmptyEmail = await fetch(`${BASE}/api/tenant/employees/${created.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        name: 'Test Employee Updated',
        designation: 'Senior Stylist',
        branchId,
        email: '',
        phone: '0771234567',
      }),
    });
    console.log('\nUpdate with empty email:', updateEmptyEmail.status, await updateEmptyEmail.text());
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
