import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const p = new PrismaClient();
const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

async function main() {
  const tenants = await p.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, code: true, schemaName: true, name: true },
  });

  for (const tenant of tenants) {
    const order = await p.signupOrder.findFirst({
      where: { tenantId: tenant.id },
      select: { adminEmail: true },
    });
    const email = order?.adminEmail;
    if (!email) continue;

    const schema = tenant.schemaName;
    const users = await p.$queryRawUnsafe<Array<{ email: string }>>(
      `SELECT email FROM "${schema}".users WHERE status = 'ACTIVE' LIMIT 1`,
    );
    if (!users.length) continue;

    const loginEmail = users[0].email;
    const testPassword = 'TestPass123!';
    const hash = await bcrypt.hash(testPassword, 12);
    await p.$executeRawUnsafe(
      `UPDATE "${schema}".users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
      hash,
      loginEmail,
    );

    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: testPassword }),
    });
    const login = await loginRes.json();
    if (!login.accessToken) {
      console.log(tenant.code, 'login failed', login);
      continue;
    }

    const h = {
      Authorization: `Bearer ${login.accessToken}`,
      'Content-Type': 'application/json',
    };

    console.log(`\n=== ${tenant.code} (${loginEmail}) ===`);

    const listRes = await fetch(`${BASE}/api/tenant/branches`, { headers: h });
    console.log('GET /branches', listRes.status, await listRes.text());

    const featuresRes = await fetch(`${BASE}/api/tenant/features`, { headers: h });
    console.log('GET /features', featuresRes.status, await featuresRes.text());

    const createRes = await fetch(`${BASE}/api/tenant/branches`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        code: 'TST1',
        name: 'Test Branch',
        phone: '',
        email: '',
        address: '',
      }),
    });
    console.log('POST /branches (empty email)', createRes.status, await createRes.text());
  }
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
