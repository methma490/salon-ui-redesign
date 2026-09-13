import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' },
    include: { signupOrders: { take: 1 } },
  });
  if (!tenant) {
    console.log('No active tenant');
    return;
  }

  const email = tenant.signupOrders[0]?.adminEmail;
  if (!email) {
    console.log('No admin email on tenant', tenant.code);
    return;
  }

  const testPassword = 'TestPass123!';
  const hash = await bcrypt.hash(testPassword, 12);
  await prisma.$executeRawUnsafe(
    `UPDATE "${tenant.schemaName}".users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
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
  console.log('Logged in as', email, 'tenant', tenant.code);

  const auth = {
    Authorization: `Bearer ${login.accessToken}`,
    'Content-Type': 'application/json',
  };
  const phone = `077${String(Date.now()).slice(-7)}`;
  const res = await fetch(`${BASE}/api/tenant/customers`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: 'Test Customer', phone, email: '' }),
  });
  const text = await res.text();
  console.log('Create customer:', res.status, text);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
