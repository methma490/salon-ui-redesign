import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const p = new PrismaClient();
const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

async function main() {
  const email = (process.argv[2] ?? 'kavindu@gmail.com').toLowerCase();
  const password = process.argv[3] ?? '00000000';

  const tenants = await p.tenant.findMany({ select: { code: true, schemaName: true } });
  let updated = false;

  for (const tenant of tenants) {
    const users = await p.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${tenant.schemaName}".users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      email,
    );
    if (!users.length) continue;

    const hash = await bcrypt.hash(password, 12);
    await p.$executeRawUnsafe(
      `UPDATE "${tenant.schemaName}".users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
      hash,
      email,
    );
    console.log(`✓ Password updated for ${email} in ${tenant.code}`);
    updated = true;
  }

  if (!updated) {
    console.log(`No user found with email ${email}`);
    process.exit(1);
  }

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await loginRes.json();
  console.log(`Login test: HTTP ${loginRes.status}`, loginRes.ok ? 'SUCCESS' : body);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
