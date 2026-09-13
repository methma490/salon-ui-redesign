/**
 * Verifies salon settings + access-control APIs.
 * Run: npx ts-node scripts/verify-settings-apis.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT ?? '3000';
const BASE = `http://127.0.0.1:${PORT}/api`;
const prisma = new PrismaClient();

async function post(path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function get(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
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
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function ok(label: string, passed: boolean, detail?: string) {
  console.log(`${passed ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  return passed;
}

async function main() {
  console.log('\n=== SETTINGS API VERIFICATION ===\n');

  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' },
    include: { signupOrders: { take: 1 } },
  });

  if (!tenant) {
    console.log('No active tenant found.');
    return;
  }

  const email =
    tenant.signupOrders[0]?.adminEmail ??
    (
      await prisma.$queryRawUnsafe<Array<{ email: string }>>(
        `SELECT email FROM "${tenant.schemaName}".users ORDER BY created_at ASC LIMIT 1`,
      )
    )[0]?.email;

  if (!email) {
    console.log('No admin email found for tenant.');
    return;
  }

  const password = process.env.TEST_SALON_PASSWORD ?? 'SalonAdmin@123';
  const login = await post('/auth/login', { email, password });

  if (!ok('Login', login.status === 200 || login.status === 201, `status ${login.status}`)) {
    console.log(login.data);
    return;
  }

  const token = (login.data as { accessToken?: string }).accessToken;
  if (!token) {
    console.log('No access token returned.');
    return;
  }

  const settings = await get('/tenant/settings', token);
  ok('GET /tenant/settings', settings.status === 200);

  const access = await get('/tenant/settings/access-control', token);
  ok('GET /tenant/settings/access-control', access.status === 200);

  const users = (access.data as { users?: Array<{ id: string; roles: Array<{ code: string }> }> })
    .users;
  const roles = (access.data as { roles?: Array<{ code: string; permissions: Array<{ code: string }> }> })
    .roles;

  if (!users?.length || !roles?.length) {
    console.log('No users or roles in access control response.');
    return;
  }

  const target = users.find((u) => !u.roles.some((r) => r.code === 'SALON_ADMIN')) ?? users[0];
  const cashierRole = roles.find((r) => r.code === 'CASHIER') ?? roles[roles.length - 1];

  const moduleAccess = [
    { moduleCode: 'CORE', level: 'view' as const },
    { moduleCode: 'CUSTOMERS', level: 'view' as const },
    { moduleCode: 'POS', level: 'manage' as const },
  ];

  const update = await patch(
    `/tenant/settings/users/${target.id}/access`,
    {
      roleCode: cashierRole.code,
      moduleAccess,
    },
    token,
  );

  ok(
    'PATCH /tenant/settings/users/:id/access',
    update.status === 200,
    `status ${update.status}`,
  );

  if (update.status !== 200) {
    console.log(update.data);
    return;
  }

  const refreshed = await get('/tenant/settings/access-control', token);
  const refreshedUser = (
    refreshed.data as {
      users?: Array<{ id: string; moduleAccess: Record<string, string>; roles: Array<{ code: string }> }>;
    }
  ).users?.find((u) => u.id === target.id);

  ok(
    'Access control reflects saved role',
    refreshedUser?.roles.some((r) => r.code === cashierRole.code) ?? false,
  );

  ok(
    'Access control reflects saved module permissions',
    refreshedUser?.moduleAccess.POS === 'manage',
    `POS=${refreshedUser?.moduleAccess.POS}`,
  );

  const accountPatch = await patch('/tenant/settings/account', { name: refreshedUser ? 'API Test Name' : 'Test' }, token);
  ok('PATCH /tenant/settings/account', accountPatch.status === 200, `status ${accountPatch.status}`);

  console.log('\nDone.\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
