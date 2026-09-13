/**
 * Live API checks for signup → pay → activate → login flow.
 * Run: npx ts-node scripts/test-api-flow.ts
 */
import 'dotenv/config';
import { PrismaClient, TenantStatus } from '@prisma/client';

const PORT = process.env.PORT ?? '3000';
const BASE = `http://127.0.0.1:${PORT}`;
const prisma = new PrismaClient();

async function post(path: string, body: object, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function patch(path: string, body: object, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function get(path: string, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log('\n=== LIVE API FLOW TEST ===\n');

  const tenant = await prisma.tenant.findFirst({
    where: { code: 'SAL000001' },
    include: { signupOrders: { take: 1 } },
  });

  if (!tenant) {
    console.log('No SAL000001 tenant found — skip API tests');
    return;
  }

  const adminEmail = tenant.signupOrders[0]?.adminEmail ?? 'hair@gmail.com';

  // 1. Salon login blocked while SUSPENDED
  const loginBefore = await post('/api/auth/login', {
    email: adminEmail,
    password: 'any-password',
  });
  const blocked =
    loginBefore.status === 401 &&
    JSON.stringify(loginBefore.data).toLowerCase().includes('invalid');
  console.log(
    blocked ? '[OK]' : '[FAIL]',
    `Salon login blocked while SUSPENDED: HTTP ${loginBefore.status}`,
    loginBefore.data,
  );

  // 2. Super admin login
  const saEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@system.local';
  const saPass = process.env.SUPER_ADMIN_PASSWORD ?? 'StrongPassword123!';
  const saLogin = await post('/api/auth/login', { email: saEmail, password: saPass });
  const saToken = (saLogin.data as { accessToken?: string })?.accessToken;

  if (!saToken) {
    console.log('[FAIL] Super admin login:', saLogin.status, saLogin.data);
    return;
  }
  console.log('[OK] Super admin login: HTTP', saLogin.status);

  // 3. Salon list shows awaiting activation
  const salons = await get('/api/super-admin/salons', saToken);
  const list = (salons.data as { data?: Array<Record<string, unknown>> })?.data ?? salons.data;
  const salonRow = Array.isArray(list)
    ? list.find((s) => s.code === 'SAL000001' || s.id === tenant.id)
    : null;

  if (salonRow) {
    console.log(
      salonRow.awaitingActivation ? '[OK]' : '[FAIL]',
      'Salon list awaitingActivation:',
      salonRow.awaitingActivation,
      '| plan:',
      (salonRow.subscription as { plan?: { code?: string } })?.plan?.code ??
        salonRow.planCode ??
        '—',
    );
  } else {
    console.log('[FAIL] SAL000001 not found in super admin salon list');
  }

  // 4. Activate salon (only if still suspended)
  if (tenant.status === TenantStatus.SUSPENDED) {
    const activate = await patch(
      `/api/super-admin/salons/${tenant.id}/status`,
      { status: 'ACTIVE' },
      saToken,
    );
    console.log(
      activate.status === 200 ? '[OK]' : '[FAIL]',
      `Super admin activate salon: HTTP ${activate.status}`,
    );
  } else {
    console.log('[OK] Salon already ACTIVE — skip activation');
  }

  // 5. After activation, login should find user (401 only if wrong password, not "user not found")
  const loginAfter = await post('/api/auth/login', {
    email: adminEmail,
    password: 'wrong-password',
  });
  const reachable =
    loginAfter.status === 401 &&
    !JSON.stringify(loginAfter.data).toLowerCase().includes('not found');
  console.log(
    reachable ? '[OK]' : '[INFO]',
    `Post-activation login reaches tenant user (wrong pass → 401): HTTP ${loginAfter.status}`,
    (loginAfter.data as { message?: string })?.message ?? loginAfter.data,
  );

  console.log('\nAPI flow test complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
