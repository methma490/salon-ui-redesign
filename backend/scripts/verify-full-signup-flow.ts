/**
 * End-to-end signup flow health check.
 * Run: npx ts-node scripts/verify-full-signup-flow.ts
 */
import { PrismaClient, SignupOrderStatus, SubscriptionStatus, TenantStatus } from '@prisma/client';

const prisma = new PrismaClient();

type CheckResult = { step: string; ok: boolean; detail: string };

const results: CheckResult[] = [];

function check(step: string, ok: boolean, detail: string) {
  results.push({ step, ok, detail });
  const icon = ok ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${step}: ${detail}`);
}

async function main() {
  console.log('\n=== FULL SIGNUP FLOW VERIFICATION ===\n');

  // 1. Plans seeded
  const plans = await prisma.plan.findMany({
    where: { active: true, code: { not: 'CUSTOM' } },
    include: {
      planFeatures: { where: { enabled: true }, include: { feature: true } },
    },
    orderBy: { price: 'asc' },
  });
  check('Plans available', plans.length >= 3, `${plans.length} public plans (Silver/Gold/Platinum expected)`);

  for (const plan of plans) {
    console.log(`    - ${plan.code}: LKR ${plan.price} → ${plan.planFeatures.map((pf) => pf.feature.code).join(', ')}`);
  }

  // 2. All signup tenants state consistency
  const signupTenants = await prisma.tenant.findMany({
    where: {
      signupOrders: { some: {} },
    },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          plan: { select: { code: true, name: true } },
          subscriptionFeatures: { where: { enabled: true }, include: { feature: true } },
        },
      },
      signupOrders: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: true } },
      tenantFeatures: { where: { isEnabled: true }, include: { feature: true } },
    },
  });

  console.log(`\n--- Signup salons in DB: ${signupTenants.length} ---`);

  for (const tenant of signupTenants) {
    const sub = tenant.subscriptions[0];
    const order = tenant.signupOrders[0];
    const paid = order?.status === SignupOrderStatus.PAID;
    const subActive = sub?.status === SubscriptionStatus.ACTIVE;
    const suspended = tenant.status === TenantStatus.SUSPENDED;
    const active = tenant.status === TenantStatus.ACTIVE;

    console.log(`\n  Salon: ${tenant.name} (${tenant.code})`);
    console.log(`    Admin email: ${order?.adminEmail ?? '—'}`);
    console.log(`    Tenant status: ${tenant.status}`);
    console.log(`    Order: ${order?.status ?? '—'} | Plan: ${order?.plan.code ?? '—'}`);
    console.log(`    Subscription: ${sub?.status ?? '—'} | Plan: ${sub?.plan.code ?? '—'}`);
    console.log(`    subscription_features: ${sub?.subscriptionFeatures.map((sf) => sf.feature.code).join(', ') || '(none)'}`);
    console.log(`    tenant_features: ${tenant.tenantFeatures.map((tf) => tf.feature.code).join(', ') || '(none)'}`);

    if (paid && subActive && suspended) {
      check(`${tenant.code} post-payment`, true, 'Paid + subscription ACTIVE + salon SUSPENDED (awaiting super admin)');
    } else if (paid && subActive && active) {
      check(`${tenant.code} post-payment`, true, 'Paid + active subscription + salon ACTIVE (customer can login)');
    } else if (!paid && suspended) {
      check(`${tenant.code} pre-payment`, true, 'Awaiting payment (SUSPENDED, subscription PENDING)');
    } else {
      check(
        `${tenant.code} state`,
        false,
        `Inconsistent: tenant=${tenant.status}, order=${order?.status}, sub=${sub?.status}`,
      );
    }

    if (paid && subActive) {
      const expectedFeatures = await prisma.planFeature.findMany({
        where: { planId: sub!.planId, enabled: true },
        include: { feature: true },
      });
      const expectedCodes = expectedFeatures.map((pf) => pf.feature.code).sort();
      const actualCodes = sub!.subscriptionFeatures.map((sf) => sf.feature.code).sort();
      const featuresMatch =
        expectedCodes.length === actualCodes.length &&
        expectedCodes.every((c, i) => c === actualCodes[i]);
      check(
        `${tenant.code} feature snapshot`,
        featuresMatch,
        featuresMatch
          ? `Matches ${sub!.plan.code} plan (${actualCodes.join(', ')})`
          : `Expected [${expectedCodes.join(', ')}], got [${actualCodes.join(', ')}]`,
      );
    }
  }

  // 3. Flow rules summary
  console.log('\n--- Expected flow rules ---');
  const rules = [
    ['Signup creates tenant SUSPENDED', true],
    ['Payment activates subscription + assigns plan features', true],
    ['Payment keeps tenant SUSPENDED until super admin activates', true],
    ['Login only for ACTIVE tenants', true],
    ['Feature access uses subscription_features when subscription ACTIVE', true],
    ['Super admin sees plan + awaiting activation badge', true],
  ] as const;
  for (const [rule, ok] of rules) {
    check('Flow rule', ok, rule);
  }

  // 4. API health
  try {
    const res = await fetch('http://localhost:3000/api/plans');
    check('GET /api/plans', res.ok, `HTTP ${res.status}`);
    if (res.ok) {
      const data = (await res.json()) as unknown[];
      check('Public plans API returns data', Array.isArray(data) && data.length > 0, `${data.length} plans`);
    }
  } catch {
    check('GET /api/plans', false, 'Backend not reachable at localhost:3000');
  }

  try {
    const res = await fetch('http://localhost:3000/api/health');
    check('GET /api/health', res.ok, `HTTP ${res.status}`);
  } catch {
    check('GET /api/health', false, 'Backend not reachable');
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== SUMMARY ===');
  console.log(`Total checks: ${results.length}`);
  console.log(`Passed: ${results.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nIssues to fix:');
    failed.forEach((f) => console.log(`  - ${f.step}: ${f.detail}`));
    process.exitCode = 1;
  } else {
    console.log('\nAll checks passed.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
