import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const p = new PrismaClient();
const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

async function main() {
  const tenant = await p.tenant.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  if (!tenant) {
    console.log('No active tenant');
    return;
  }

  const schema = tenant.schemaName;
  const user = await p.$queryRawUnsafe<Array<{ email: string }>>(
    `SELECT email FROM "${schema}".users WHERE status = 'ACTIVE' LIMIT 1`,
  );
  if (!user.length) {
    console.log('No tenant user');
    return;
  }

  const email = user[0].email;
  const password = 'TestPass123!';
  await p.$executeRawUnsafe(
    `UPDATE "${schema}".users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
    await bcrypt.hash(password, 12),
    email,
  );

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());

  if (!login.accessToken) {
    console.log('Login failed', login);
    return;
  }

  const h = {
    Authorization: `Bearer ${login.accessToken}`,
    'Content-Type': 'application/json',
  };

  const branches = await fetch(`${BASE}/api/tenant/branches`, { headers: h }).then((r) => r.json());
  const branchId = Array.isArray(branches) ? branches[0]?.id : null;
  if (!branchId) {
    console.log('No branch');
    return;
  }

  console.log(`Testing as ${email} (${tenant.code})\n`);

  const list = await fetch(`${BASE}/api/tenant/employees`, { headers: h });
  console.log('GET /employees', list.status, (await list.text()).slice(0, 300));

  const create = await fetch(`${BASE}/api/tenant/employees`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      name: 'API Test Stylist',
      designation: 'Stylist',
      branchId,
      phone: '',
      email: '',
    }),
  });
  const created = await create.json();
  console.log('POST /employees', create.status, created);

  if (created.id) {
    const update = await fetch(`${BASE}/api/tenant/employees/${created.id}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({
        name: 'API Test Updated',
        designation: 'Senior Stylist',
        branchId,
        phone: '0771112233',
        email: '',
      }),
    });
    console.log('PATCH /employees/:id', update.status, await update.text());
  }
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
