/**
 * Enable APPOINTMENTS feature and verify appointments CRUD.
 * Run: npx ts-node scripts/test-appointments-api.ts
 */
import 'dotenv/config';
import { FeatureStatus, PrismaClient, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { syncTenantFeatures } from '../src/database/sync-tenant-features.util';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;
const prisma = new PrismaClient();

async function ensureAppointmentsFeature(): Promise<string> {
  const feature = await prisma.feature.upsert({
    where: { code: 'APPOINTMENTS' },
    update: {
      name: 'Appointments',
      description: 'Appointment booking and calendar management',
      status: FeatureStatus.ACTIVE,
    },
    create: {
      code: 'APPOINTMENTS',
      name: 'Appointments',
      description: 'Appointment booking and calendar management',
      status: FeatureStatus.ACTIVE,
    },
  });

  const planCodes = ['GOLD', 'PLATINUM'];
  for (const planCode of planCodes) {
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) continue;

    await prisma.planFeature.upsert({
      where: {
        planId_featureId: { planId: plan.id, featureId: feature.id },
      },
      update: { enabled: true },
      create: { planId: plan.id, featureId: feature.id, enabled: true },
    });
  }

  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: SubscriptionStatus.ACTIVE },
    include: { plan: true },
  });

  for (const subscription of activeSubscriptions) {
    if (!['GOLD', 'PLATINUM', 'CUSTOM'].includes(subscription.plan.code)) {
      continue;
    }

    await prisma.subscriptionFeature.upsert({
      where: {
        subscriptionId_featureId: {
          subscriptionId: subscription.id,
          featureId: feature.id,
        },
      },
      update: { enabled: true },
      create: {
        subscriptionId: subscription.id,
        featureId: feature.id,
        enabled: true,
      },
    });

    const enabledFeatures = await prisma.subscriptionFeature.findMany({
      where: { subscriptionId: subscription.id, enabled: true },
      select: { featureId: true },
    });

    await prisma.$transaction(async (tx) => {
      await syncTenantFeatures(
        tx,
        subscription.tenantId,
        enabledFeatures.map((item) => item.featureId),
      );
    });
  }

  return feature.id;
}

async function main() {
  await ensureAppointmentsFeature();

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

  const auth = {
    Authorization: `Bearer ${login.accessToken}`,
    'Content-Type': 'application/json',
  };

  console.log('Logged in as', email, 'tenant', tenant.code);

  const featuresRes = await fetch(`${BASE}/api/tenant/features`, { headers: auth });
  const features = await featuresRes.json();
  console.log('Features:', featuresRes.status, features);

  const branches = await fetch(`${BASE}/api/tenant/branches`, { headers: auth }).then((r) =>
    r.json(),
  );
  const branchId = branches[0]?.id;
  if (!branchId) {
    console.log('No branch found');
    return;
  }

  let customerId = (
    await fetch(`${BASE}/api/tenant/customers`, { headers: auth }).then((r) => r.json())
  )[0]?.id;

  if (!customerId) {
    const phone = `077${String(Date.now()).slice(-7)}`;
    const createdCustomer = await fetch(`${BASE}/api/tenant/customers`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: 'Appointment Test Customer', phone }),
    }).then((r) => r.json());
    customerId = createdCustomer.id;
  }

  let services = await fetch(`${BASE}/api/tenant/services`, { headers: auth }).then((r) =>
    r.json(),
  );
  let serviceId = services[0]?.id;

  if (!serviceId) {
    const categoryRes = await fetch(`${BASE}/api/tenant/service-categories`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ code: 'TEST-CAT', name: 'Test Category' }),
    });
    const category = await categoryRes.json();
    const serviceRes = await fetch(`${BASE}/api/tenant/services`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Test Haircut',
        price: 1500,
        durationMinutes: 60,
        categoryId: category.id,
      }),
    });
    const service = await serviceRes.json();
    serviceId = service.id;
    console.log('Created test service:', serviceRes.status, service.code ?? service);
  }

  const today = new Date().toISOString().slice(0, 10);
  const createRes = await fetch(`${BASE}/api/tenant/appointments`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      customerId,
      branchId,
      appointmentDate: today,
      startTime: '10:00',
      endTime: '11:00',
      serviceIds: [serviceId],
      notes: 'Test appointment',
    }),
  });
  const created = await createRes.json();
  console.log('Create appointment:', createRes.status, created.code ?? created);

  if (!createRes.ok) return;

  const listRes = await fetch(`${BASE}/api/tenant/appointments?startDate=${today}`, {
    headers: auth,
  });
  const list = await listRes.json();
  console.log('List appointments:', listRes.status, Array.isArray(list) ? list.length : list);

  const calendarRes = await fetch(`${BASE}/api/tenant/appointments/calendar?startDate=${today}`, {
    headers: auth,
  });
  const calendar = await calendarRes.json();
  console.log('Calendar:', calendarRes.status, Array.isArray(calendar) ? calendar.length : calendar);

  const updateRes = await fetch(`${BASE}/api/tenant/appointments/${created.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ notes: 'Updated test appointment' }),
  });
  console.log('Update appointment:', updateRes.status, await updateRes.json());

  const statusRes = await fetch(`${BASE}/api/tenant/appointments/${created.id}/status`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  console.log('Confirm appointment:', statusRes.status, await statusRes.json());

  const cancelRes = await fetch(`${BASE}/api/tenant/appointments/${created.id}`, {
    method: 'DELETE',
    headers: auth,
  });
  console.log('Cancel appointment:', cancelRes.status, await cancelRes.json());

  console.log('Appointments API test complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
