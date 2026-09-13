import 'dotenv/config';
import { PrismaClient, TenantStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const p = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? 'kavindu@gmail.com';
  const password = process.argv[3] ?? '00000000';

  console.log(`\n=== Login diagnosis: ${email} ===\n`);

  const superAdmin = await p.superAdminUser.findFirst({
    where: { email: email.toLowerCase() },
  });
  if (superAdmin) {
    const ok = await bcrypt.compare(password, superAdmin.passwordHash);
    console.log('Super admin user found:', superAdmin.status, '| password match:', ok);
  } else {
    console.log('Not a super admin user');
  }

  const tenants = await p.tenant.findMany({
    where: {
      OR: [
        { email: { equals: email, mode: 'insensitive' } },
        { signupOrders: { some: { adminEmail: { equals: email, mode: 'insensitive' } } } },
      ],
    },
    include: { signupOrders: { take: 1, orderBy: { createdAt: 'desc' } } },
  });

  console.log(`\nMatching tenants: ${tenants.length}`);
  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.code} (${tenant.name})`);
    console.log(`  Status: ${tenant.status}`);
    console.log(`  Schema: ${tenant.schemaName}`);

    if (tenant.status !== TenantStatus.ACTIVE) {
      console.log('  ⚠ Login blocked — tenant is not ACTIVE (auth only scans ACTIVE tenants)');
    }

    const schema = tenant.schemaName;
    const users = await p.$queryRawUnsafe<
      Array<{ id: string; email: string; status: string; password_hash: string | null }>
    >(
      `SELECT id, email, status::text AS status, password_hash
       FROM "${schema}".users
       WHERE LOWER(email) = LOWER($1)`,
      email,
    );

    if (!users.length) {
      console.log('  ✗ No user in tenant schema with this email');
      const allUsers = await p.$queryRawUnsafe<Array<{ email: string; status: string }>>(
        `SELECT email, status::text AS status FROM "${schema}".users LIMIT 5`,
      );
      console.log('  Users in schema:', allUsers);
      continue;
    }

    for (const u of users) {
      const hashOk = u.password_hash ? await bcrypt.compare(password, u.password_hash) : false;
      console.log(`  User id: ${u.id}`);
      console.log(`  User status: ${u.status}${u.status !== 'ACTIVE' ? ' (login requires ACTIVE)' : ''}`);
      console.log(`  Has password hash: ${!!u.password_hash}`);
      console.log(`  Password "${password}" matches: ${hashOk}`);

      if (!hashOk && u.password_hash) {
        const testPass = await bcrypt.compare('TestPass123!', u.password_hash);
        console.log(`  Password "TestPass123!" matches (test script): ${testPass}`);
      }
    }
  }

  const activeTenants = await p.tenant.findMany({ where: { status: 'ACTIVE' }, select: { code: true } });
  console.log('\nAll ACTIVE tenants:', activeTenants.map((t) => t.code).join(', ') || '(none)');

  console.log('\n--- Scan all tenant schemas for email ---');
  const allTenants = await p.tenant.findMany({ select: { code: true, schemaName: true, status: true } });
  for (const tenant of allTenants) {
    try {
      const hits = await p.$queryRawUnsafe<
        Array<{ email: string; status: string; has_pw: boolean }>
      >(
        `SELECT email, status::text AS status, (password_hash IS NOT NULL) AS has_pw
         FROM "${tenant.schemaName}".users
         WHERE LOWER(email) = LOWER($1)`,
        email,
      );
      if (hits.length) {
        for (const u of hits) {
          const row = await p.$queryRawUnsafe<Array<{ password_hash: string }>>(
            `SELECT password_hash FROM "${tenant.schemaName}".users WHERE LOWER(email) = LOWER($1)`,
            email,
          );
          const hashOk = row[0]?.password_hash
            ? await bcrypt.compare(password, row[0].password_hash)
            : false;
          console.log(
            `${tenant.code} (${tenant.status}): user status=${u.status}, has_pw=${u.has_pw}, password match=${hashOk}`,
          );
        }
      }
    } catch (e) {
      console.log(`${tenant.code}: schema error`, (e as Error).message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
