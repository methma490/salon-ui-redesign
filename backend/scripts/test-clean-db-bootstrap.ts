import { execSync } from 'child_process';
import { PrismaClient, TenantStatus, SuperAdminStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  getTenantMigrationFiles,
  getTenantMigrationStatuses,
} from '../src/database/tenant-migration-runner';
import {
  buildTenantSchemaName,
  isValidTenantSchemaName,
  tenantTable,
} from '../src/tenant/utils/schema-name.util';
import { TenantProvisioningService } from '../src/database/tenant-provisioning.service';

const TEST_DB_NAME = 'saloon_saas_bootstrap_test';
const BASE_DB_URL = 'postgresql://postgres:Ijse%401234@localhost:5432';
const TEST_DB_URL = `${BASE_DB_URL}/${TEST_DB_NAME}?schema=public`;

async function executeSql(connectionUrl: string, sql: string) {
  const client = new PrismaClient({
    datasources: { db: { url: connectionUrl } },
  });
  try {
    await client.$connect();
    await client.$executeRawUnsafe(sql);
  } finally {
    await client.$disconnect();
  }
}

async function run() {
  console.log('================================================================================');
  console.log('PRODUCTION DATABASE CLEAN BOOTSTRAP & DEPLOYMENT AUDIT');
  console.log('================================================================================\n');

  // STEP 1: Create a completely empty disposable PostgreSQL database
  console.log(`[Step 1] Preparing empty disposable test database: "${TEST_DB_NAME}"...`);
  const adminClient = new PrismaClient({
    datasources: { db: { url: `${BASE_DB_URL}/postgres?schema=public` } },
  });

  await adminClient.$connect();
  try {
    // Terminate existing connections to test db if any
    await adminClient.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid();
    `);
    await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
    await adminClient.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB_NAME}"`);
    console.log(`✓ Clean, completely empty database "${TEST_DB_NAME}" created successfully.`);
  } finally {
    await adminClient.$disconnect();
  }

  // STEP 2: Execute npm run db:deploy against the empty database
  console.log('\n[Step 2] Executing "npm run db:deploy" on the clean database...');
  const deployEnv = {
    ...process.env,
    DATABASE_URL: TEST_DB_URL,
    DATABASE_AUTO_SETUP: 'true',
    SUPER_ADMIN_NAME: 'System Administrator',
    SUPER_ADMIN_EMAIL: 'admin@gmail.com',
    SUPER_ADMIN_PASSWORD: 'password123',
  };

  execSync('npm run db:deploy', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: deployEnv,
  });
  console.log('✓ npm run db:deploy finished successfully.');

  // Connect Prisma to test database
  const testPrisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });
  await testPrisma.$connect();

  try {
    // STEP 3: Verify Public Tables & Migrations
    console.log('\n[Step 3] Verifying public tables & master seed counts...');
    const [publicTables, featureCount, planCount, templateCount, superAdminCount] =
      await Promise.all([
        testPrisma.$queryRaw<Array<{ table_name: string }>>`
          SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
        `,
        testPrisma.feature.count(),
        testPrisma.plan.count(),
        testPrisma.notificationTemplate.count(),
        testPrisma.superAdminUser.count(),
      ]);

    console.log(`  • Public Tables Created    : ${publicTables.length}`);
    console.log(`  • Master Features Seeded   : ${featureCount}`);
    console.log(`  • Plans Seeded             : ${planCount}`);
    console.log(`  • Notification Templates   : ${templateCount}`);
    console.log(`  • Super Admin User Count   : ${superAdminCount}`);

    if (publicTables.length < 15) {
      throw new Error(`Insufficient public tables found: ${publicTables.length}`);
    }
    if (featureCount < 18) {
      throw new Error(`Insufficient features seeded: ${featureCount}`);
    }
    if (planCount < 4) {
      throw new Error(`Insufficient plans seeded: ${planCount}`);
    }
    if (superAdminCount !== 1) {
      throw new Error(`Expected 1 super admin user, found: ${superAdminCount}`);
    }

    // STEP 4: Test Super Admin Login
    console.log('\n[Step 4] Testing Super Admin authentication on clean database...');
    const adminUser = await testPrisma.superAdminUser.findUnique({
      where: { email: 'admin@gmail.com' },
    });
    if (!adminUser) {
      throw new Error('Super Admin user record not found in database!');
    }
    if (adminUser.status !== SuperAdminStatus.ACTIVE) {
      throw new Error(`Super admin status is ${adminUser.status}, expected ACTIVE`);
    }
    const passwordMatch = await bcrypt.compare('password123', adminUser.passwordHash);
    if (!passwordMatch) {
      throw new Error('Super Admin password hash verification failed!');
    }
    console.log(`  ✓ Super Admin verified: id=${adminUser.id}, email=${adminUser.email}, status=ACTIVE`);

    // STEP 5: Create a brand-new tenant "Studio Zee"
    console.log('\n[Step 5] Provisioning a brand new salon "Studio Zee" on the clean database...');
    const provisioningService = new TenantProvisioningService(testPrisma as any);

    const salonName = 'Studio Zee';
    const tenantCode = 'SAL000001';
    const readableSchema = await provisioningService.generateSchemaName(salonName, tenantCode);

    console.log(`  • Generated Readable Schema: "${readableSchema}"`);
    if (readableSchema !== 'tenant_studio_zee_000001') {
      throw new Error(`Expected "tenant_studio_zee_000001", got "${readableSchema}"`);
    }

    const tenantRecord = await testPrisma.tenant.create({
      data: {
        code: tenantCode,
        schemaName: readableSchema,
        name: salonName,
        email: 'admin@studiozee.com',
        phone: '0712345678',
        status: TenantStatus.PROVISIONING,
      },
    });

    const provisionResult = await provisioningService.provisionTenantSchema({
      tenantCode: tenantRecord.code,
      schemaName: tenantRecord.schemaName,
      mainBranchName: 'Main Branch - Colombo',
      adminUser: {
        name: 'Zee Admin',
        email: 'admin@studiozee.com',
        phone: '0712345678',
        password: 'salonpassword123',
      },
    });

    if (!provisionResult.success) {
      throw new Error(`Tenant provisioning failed: ${provisionResult.error}`);
    }

    // Initialize 21-day trial subscription
    const goldPlan = await testPrisma.plan.findFirstOrThrow({
      where: { code: 'GOLD' },
    });

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 21);

    await testPrisma.subscription.create({
      data: {
        tenantId: tenantRecord.id,
        planId: goldPlan.id,
        status: 'TRIAL',
        billingCycle: 'MONTHLY',
        price: 15000.0,
        currency: 'LKR',
        startDate: now,
        endDate: trialEndsAt,
        trialStart: now,
        trialEnd: trialEndsAt,
      },
    });

    await testPrisma.tenant.update({
      where: { id: tenantRecord.id },
      data: { status: TenantStatus.ACTIVE },
    });

    console.log(`  ✓ Tenant "${salonName}" provisioned: schema="${readableSchema}", status=ACTIVE`);

    // STEP 6: Verify Tenant Migrations & History
    console.log('\n[Step 6] Verifying tenant migration history and tables...');
    const allMigrationFiles = getTenantMigrationFiles();
    const [tenantTables, appliedRows] = await Promise.all([
      testPrisma.$queryRawUnsafe<Array<{ table_name: string }>>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
        readableSchema,
      ),
      testPrisma.$queryRawUnsafe<Array<{ name: string; checksum: string }>>(
        `SELECT name, checksum FROM "${readableSchema}"."_applied_tenant_migrations" ORDER BY name ASC`,
      ),
    ]);

    console.log(`  • Tenant Tables Created         : ${tenantTables.length}`);
    console.log(`  • Tenant Migrations Applied     : ${appliedRows.length} / ${allMigrationFiles.length}`);

    if (appliedRows.length !== allMigrationFiles.length) {
      throw new Error(
        `Migration count mismatch! Expected ${allMigrationFiles.length}, got ${appliedRows.length}`,
      );
    }

    // Verify critical modules are present
    const tableNames = new Set(tenantTables.map((t) => t.table_name));
    const requiredTables = [
      'branches',
      'users',
      'roles',
      'permissions',
      'employees',
      'customers',
      'services',
      'service_categories',
      'products',
      'product_categories',
      'branch_stock',
      'stock_movements',
      'sales',
      'sale_items',
      'appointments',
      'expenses',
      'expense_categories',
      'payroll_runs',
      'quotations',
      'suppliers',
      'grns',
      'grn_items',
      'supplier_payments',
      'supplier_payment_allocations',
    ];

    for (const tbl of requiredTables) {
      if (!tableNames.has(tbl)) {
        throw new Error(`Required tenant table "${tbl}" is missing in schema "${readableSchema}"!`);
      }
    }
    console.log(`  ✓ All ${requiredTables.length} core and new module tables verified in "${readableSchema}".`);

    // STEP 7: Verify Tenant Seeds
    console.log('\n[Step 7] Verifying tenant seeds (roles, permissions, branches)...');
    const [roleCount, permCount, mainBranch] = await Promise.all([
      testPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*)::int as count FROM "${readableSchema}".roles`,
      ),
      testPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*)::int as count FROM "${readableSchema}".permissions`,
      ),
      testPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*)::int as count FROM "${readableSchema}".branches WHERE is_main = true`,
      ),
    ]);

    console.log(`  • Roles Seeded        : ${roleCount[0].count}`);
    console.log(`  • Permissions Seeded  : ${permCount[0].count}`);
    console.log(`  • Main Branch Exists  : ${Number(mainBranch[0].count) > 0 ? 'YES' : 'NO'}`);

    if (Number(roleCount[0].count) < 3) throw new Error('Tenant roles not seeded properly!');
    if (Number(permCount[0].count) < 50) throw new Error('Tenant permissions not seeded properly!');

    // STEP 8: Salon Admin Login Test
    console.log('\n[Step 8] Testing Salon Admin authentication in new readable schema...');
    const usersTable = tenantTable(readableSchema, 'users');
    const salonUsers = await testPrisma.$queryRawUnsafe<
      Array<{ id: string; name: string; email: string; password_hash: string }>
    >(`SELECT id, name, email, password_hash FROM ${usersTable} WHERE email = $1`, 'admin@studiozee.com');

    if (salonUsers.length === 0) throw new Error('Salon admin user not found in tenant schema!');
    const salonPassMatch = await bcrypt.compare('salonpassword123', salonUsers[0].password_hash);
    if (!salonPassMatch) throw new Error('Salon admin password verification failed!');
    console.log(`  ✓ Salon Admin login verified: "${salonUsers[0].name}" (${salonUsers[0].email})`);

    // STEP 9: Core Module Smoke Test
    console.log('\n[Step 9] Executing core module smoke tests (Customers, Services, Suppliers, POS, Expenses)...');
    const branchId = provisionResult.mainBranchId;
    const adminId = provisionResult.adminUserId;

    // A. Customer
    const customersTable = tenantTable(readableSchema, 'customers');
    const custRes = await testPrisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO ${customersTable} (code, name, phone, email, status) VALUES ('CUST001', 'Nimal Perera', '0771112233', 'nimal@gmail.com', 'ACTIVE') RETURNING id`,
    );
    const customerId = custRes[0].id;
    console.log(`  • Customer created: ${customerId}`);

    // B. Service
    const servicesTable = tenantTable(readableSchema, 'services');
    const svcRes = await testPrisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO ${servicesTable} (code, name, duration_minutes, price, is_active) VALUES ('SRV001', 'Signature Haircut', 45, 2500.00, true) RETURNING id`,
    );
    const serviceId = svcRes[0].id;
    console.log(`  • Service created: ${serviceId}`);

    // C. Supplier & GRN
    const suppliersTable = tenantTable(readableSchema, 'suppliers');
    const supRes = await testPrisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO ${suppliersTable} (name, phone, email, is_active) VALUES ('Luxe Hair Supplies', '0112233445', 'sales@luxehair.lk', true) RETURNING id`,
    );
    const supplierId = supRes[0].id;
    console.log(`  • Supplier created: ${supplierId}`);

    // D. POS Sale
    const salesTable = tenantTable(readableSchema, 'sales');
    const saleItemsTable = tenantTable(readableSchema, 'sale_items');
    const saleRes = await testPrisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO ${salesTable} (sale_number, branch_id, customer_id, subtotal, total, status) VALUES ('INV-0001', $1::uuid, $2::uuid, 2500.00, 2500.00, 'COMPLETED') RETURNING id`,
      branchId,
      customerId,
    );
    const saleId = saleRes[0].id;
    await testPrisma.$executeRawUnsafe(
      `INSERT INTO ${saleItemsTable} (sale_id, service_id, item_type, quantity, unit_price, total) VALUES ($1::uuid, $2::uuid, 'service', 1, 2500.00, 2500.00)`,
      saleId,
      serviceId,
    );
    console.log(`  • Sale & SaleItem created: ${saleId}`);

    // E. Expense
    const expensesTable = tenantTable(readableSchema, 'expenses');
    await testPrisma.$executeRawUnsafe(
      `INSERT INTO ${expensesTable} (code, branch_id, created_by, title, amount, expense_date, status) VALUES ('EXP001', $1::uuid, $2::uuid, 'Salon Utility Bill', 12000.00, CURRENT_DATE, 'ACTIVE')`,
      branchId,
      adminId,
    );
    console.log(`  • Expense recorded.`);
    console.log(`  ✓ Core modules smoke test passed!`);

    // STEP 10: Repeated Deployment / Idempotency Test
    console.log('\n[Step 10] Testing repeated deployment idempotency (running db:deploy a 2nd time)...');
    execSync('npm run db:deploy', {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: deployEnv,
    });

    const [postFeatureCount, postPlanCount, postSuperAdminCount, postCustCount] =
      await Promise.all([
        testPrisma.feature.count(),
        testPrisma.plan.count(),
        testPrisma.superAdminUser.count(),
        testPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*)::int as count FROM ${customersTable}`),
      ]);

    if (postFeatureCount !== featureCount) throw new Error('Features duplicated on re-deployment!');
    if (postPlanCount !== planCount) throw new Error('Plans duplicated on re-deployment!');
    if (postSuperAdminCount !== 1) throw new Error('Super Admin duplicated on re-deployment!');
    if (Number(postCustCount[0].count) !== 1) throw new Error('Customer data corrupted on re-deployment!');

    console.log(`  ✓ Idempotency verified: zero duplicate master data, customer data intact!`);

    console.log('\n================================================================================');
    console.log('FINAL AUDIT RESULT: CLEAN PRODUCTION DATABASE DEPLOYMENT READY ✓');
    console.log('================================================================================\n');
  } finally {
    await testPrisma.$disconnect();

    // Clean up disposable test database
    console.log(`[Cleanup] Dropping disposable test database "${TEST_DB_NAME}"...`);
    const cleanupAdmin = new PrismaClient({
      datasources: { db: { url: `${BASE_DB_URL}/postgres?schema=public` } },
    });
    await cleanupAdmin.$connect();
    try {
      await cleanupAdmin.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid();
      `);
      await cleanupAdmin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
      console.log(`✓ Disposable test database dropped cleanly.`);
    } finally {
      await cleanupAdmin.$disconnect();
    }
  }
}

run().catch((err) => {
  console.error('\n✗ AUDIT FAILED:', err);
  process.exit(1);
});
