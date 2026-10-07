import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DbClient,
  runMigrationsForTenant,
  validateTenantSchemaName,
} from './tenant-migration-runner';

export interface TenantProvisioningData {
  tenantCode: string;
  schemaName: string;
  mainBranchName?: string;
  adminUser: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  };
  roles?: string[]; // Default: SALON_ADMIN, CASHIER, STOCK_KEEPER
}

export interface TenantProvisioningResult {
  success: boolean;
  schemaName: string;
  mainBranchId?: string;
  adminUserId?: string;
  error?: string;
}

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safely drops any orphan tenant enum types that were accidentally created in the public schema
   * during previous unpinned connection executions.
   */
  async cleanupStrayPublicTenantTypes(client: DbClient = this.prisma): Promise<void> {
    const cleanupSql = `
      DO $$
      DECLARE
        tenant_tables TEXT[] := ARRAY[
          'user_roles', 'role_permissions', 'appointment_services', 'sale_items',
          'quotation_items', 'payroll_items', 'stock_movements',
          'sales', 'appointments', 'stock', 'products', 'product_categories',
          'services', 'service_categories', 'customers', 'employees',
          'expenses', 'expense_categories', 'payroll_runs', 'employee_loans',
          'employee_advances', 'quotations', 'permissions', 'roles', 'users', 'branches',
          'suppliers', 'grns', 'grn_items', 'supplier_payments', 'supplier_payment_allocations'
        ];
        tbl_name TEXT;
        tenant_types TEXT[] := ARRAY[
          'branch_status', 'user_status', 'employee_status', 'customer_status',
          'stock_movement_type', 'sale_status', 'payment_method', 'payment_status',
          'appointment_status', 'expense_status', 'loan_status', 'payroll_run_status',
          'sale_assignment_type', 'advance_status', 'stock_receipt_payment_status',
          'stock_credit_payment_method', 'quotation_status', 'quotation_message_channel',
          'quotation_message_status', 'grn_status', 'grn_payment_status',
          'supplier_payment_method', 'supplier_cheque_status'
        ];
        t_name TEXT;
      BEGIN
        -- First drop any stray tenant tables in public from prior unpinned runs
        FOREACH tbl_name IN ARRAY tenant_tables LOOP
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl_name
          ) THEN
            BEGIN
              EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(tbl_name) || ' CASCADE';
            EXCEPTION WHEN OTHERS THEN
              NULL;
            END;
          END IF;
        END LOOP;

        -- Then drop stray tenant enums in public
        FOREACH t_name IN ARRAY tenant_types LOOP
          IF EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public' AND t.typname = t_name
          ) THEN
            BEGIN
              EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(t_name) || ' RESTRICT';
            EXCEPTION WHEN OTHERS THEN
              NULL;
            END;
          END IF;
        END LOOP;
      END $$;
    `;
    try {
      await client.$executeRawUnsafe(cleanupSql);
    } catch (err) {
      this.logger.warn(`Could not run public tenant type cleanup: ${err}`);
    }
  }

  /**
   * Provision a complete tenant schema with all tables, migrations, roles, and initial data.
   */
  async provisionTenantSchema(data: TenantProvisioningData): Promise<TenantProvisioningResult> {
    const { tenantCode, adminUser } = data;
    const schemaName = validateTenantSchemaName(data.schemaName);

    try {
      this.logger.log(`Starting provisioning for tenant ${tenantCode} (${schemaName})`);

      // 0. Clean stray tenant types from public schema first
      await this.cleanupStrayPublicTenantTypes();

      // 1. Create the schema (DDL)
      await this.createSchema(schemaName);

      // 2. Execute all provisioning steps inside a dedicated transaction to guarantee connection pinning!
      const { mainBranchId, adminUserId } = await this.prisma.$transaction(
        async (tx) => {
          // Pin search_path to the new tenant schema on this dedicated connection
          await tx.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

          // Run all migrations and record history on this pinned connection
          await runMigrationsForTenant(schemaName, tx);

          // Seed default roles and permissions on this pinned connection
          await this.seedRolesAndPermissions(schemaName, data.roles, tx);

          // Create main branch on this pinned connection
          const branchId = await this.createMainBranch(
            schemaName,
            data.mainBranchName || 'Main Branch',
            tx,
          );

          // Seed starter services
          await this.seedDefaultServiceCatalog(branchId, tx);

          // Create salon admin user on this pinned connection
          const userId = await this.createAdminUser(schemaName, adminUser, tx);

          return { mainBranchId: branchId, adminUserId: userId };
        },
        {
          timeout: 120000,
          maxWait: 15000,
        },
      );

      this.logger.log(`✓ Successfully provisioned tenant ${tenantCode} (${schemaName})`);

      return {
        success: true,
        schemaName,
        mainBranchId,
        adminUserId,
      };
    } catch (error) {
      this.logger.error(`Failed to provision tenant ${tenantCode}:`, error);

      // Attempt cleanup on failure
      try {
        await this.dropSchema(schemaName);
      } catch (cleanupError) {
        this.logger.error(`Failed to cleanup schema ${schemaName}:`, cleanupError);
      }

      return {
        success: false,
        schemaName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a fresh PostgreSQL schema (dropping any abandoned/stale schema first)
   */
  private async createSchema(schemaName: string): Promise<void> {
    const safeSchema = validateTenantSchemaName(schemaName);
    this.logger.log(`Creating fresh schema: ${safeSchema}`);
    await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${safeSchema}" CASCADE`);
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA "${safeSchema}"`);
  }

  /**
   * Drop tenant schema (cleanup abandoned / failed signups)
   */
  async cleanupTenantSchema(schemaName: string): Promise<void> {
    await this.dropSchema(schemaName);
  }

  /**
   * Drop a schema (used for cleanup on failure)
   */
  private async dropSchema(schemaName: string): Promise<void> {
    const safeSchema = validateTenantSchemaName(schemaName);
    this.logger.log(`Dropping schema: ${safeSchema}`);
    await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${safeSchema}" CASCADE`);
  }

  /**
   * Seed default roles and permissions for a tenant schema idempotently.
   */
  async seedRolesAndPermissions(
    schemaName: string,
    _customRoles?: string[],
    client: DbClient = this.prisma,
  ): Promise<void> {
    const safeSchema = validateTenantSchemaName(schemaName);
    this.logger.log(`Seeding roles and permissions for ${safeSchema}`);

    const roles = [
      { code: 'SALON_ADMIN', name: 'Salon Admin', description: 'Salon administrator' },
      { code: 'CASHIER', name: 'Cashier', description: 'Point of sale cashier' },
      { code: 'STOCK_KEEPER', name: 'Stock Keeper', description: 'Inventory manager' },
    ];

    const permissions = [
      { code: 'BRANCH_VIEW', name: 'View Branches' },
      { code: 'BRANCH_CREATE', name: 'Create Branches' },
      { code: 'BRANCH_UPDATE', name: 'Update Branches' },
      { code: 'USER_VIEW', name: 'View Users' },
      { code: 'USER_CREATE', name: 'Create Users' },
      { code: 'USER_UPDATE', name: 'Update Users' },
      { code: 'EMPLOYEE_VIEW', name: 'View Employees' },
      { code: 'EMPLOYEE_CREATE', name: 'Create Employees' },
      { code: 'EMPLOYEE_UPDATE', name: 'Update Employees' },
      { code: 'CUSTOMER_VIEW', name: 'View Customers' },
      { code: 'CUSTOMER_CREATE', name: 'Create Customers' },
      { code: 'CUSTOMER_UPDATE', name: 'Update Customers' },
      { code: 'SERVICE_VIEW', name: 'View Services' },
      { code: 'SERVICE_CREATE', name: 'Create Services' },
      { code: 'SERVICE_UPDATE', name: 'Update Services' },
      { code: 'PRODUCT_VIEW', name: 'View Products' },
      { code: 'PRODUCT_CREATE', name: 'Create Products' },
      { code: 'PRODUCT_UPDATE', name: 'Update Products' },
      { code: 'SALE_VIEW', name: 'View Sales' },
      { code: 'SALE_CREATE', name: 'Create Sales' },
      { code: 'SALE_UPDATE', name: 'Update Sales' },
      { code: 'APPOINTMENT_VIEW', name: 'View Appointments' },
      { code: 'APPOINTMENT_CREATE', name: 'Create Appointments' },
      { code: 'APPOINTMENT_UPDATE', name: 'Update Appointments' },
      { code: 'APPOINTMENT_DELETE', name: 'Cancel Appointments' },
      { code: 'EXPENSE_VIEW', name: 'View Expenses' },
      { code: 'EXPENSE_CREATE', name: 'Create Expenses' },
      { code: 'EXPENSE_UPDATE', name: 'Update Expenses' },
      { code: 'EXPENSE_DELETE', name: 'Void Expenses' },
      { code: 'PAYROLL_VIEW', name: 'View Payroll' },
      { code: 'PAYROLL_RUN', name: 'Generate Payroll Runs' },
      { code: 'PAYROLL_UPDATE', name: 'Update Draft Payroll' },
      { code: 'PAYROLL_FINALIZE', name: 'Finalize Payroll' },
      { code: 'PAYROLL_MARK_PAID', name: 'Mark Payroll Paid' },
      { code: 'LOAN_VIEW', name: 'View Employee Loans' },
      { code: 'LOAN_CREATE', name: 'Create Employee Loans' },
      { code: 'LOAN_UPDATE', name: 'Update Employee Loans' },
      { code: 'PAYSLIP_VIEW', name: 'View Payslips' },
      { code: 'PAYROLL_SETTINGS_VIEW', name: 'View Payroll Settings' },
      { code: 'PAYROLL_SETTINGS_UPDATE', name: 'Update Payroll Settings' },
      { code: 'QUOTATION_VIEW', name: 'View Quotations' },
      { code: 'QUOTATION_CREATE', name: 'Create Quotations' },
      { code: 'QUOTATION_UPDATE', name: 'Update Quotations' },
      { code: 'QUOTATION_SEND', name: 'Send Quotations' },
      { code: 'QUOTATION_CONVERT', name: 'Convert Quotations to Invoice' },
      { code: 'QUOTATION_CANCEL', name: 'Cancel Quotations' },
      { code: 'SUPPLIERS_VIEW', name: 'View Suppliers' },
      { code: 'SUPPLIERS_CREATE', name: 'Create Suppliers' },
      { code: 'SUPPLIERS_EDIT', name: 'Edit Suppliers' },
      { code: 'SUPPLIERS_DELETE', name: 'Delete/Deactivate Suppliers' },
      { code: 'GRN_VIEW', name: 'View GRN / Purchases' },
      { code: 'GRN_CREATE', name: 'Create GRN / Purchases' },
      { code: 'GRN_EDIT', name: 'Edit GRN / Purchases' },
      { code: 'GRN_RECEIVE', name: 'Receive GRN and Increment Stock' },
      { code: 'GRN_CANCEL', name: 'Cancel GRN' },
      { code: 'SUPPLIER_PAYMENTS_VIEW', name: 'View Supplier Payments' },
      { code: 'SUPPLIER_PAYMENTS_CREATE', name: 'Record Supplier Payments' },
      { code: 'SUPPLIER_OUTSTANDING_VIEW', name: 'View Supplier Outstanding' },
    ];

    await client.$executeRawUnsafe(`SET search_path TO "${safeSchema}", public`);

    // Insert roles
    for (const role of roles) {
      await client.$executeRawUnsafe(
        `INSERT INTO roles (code, name, description, is_system)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (code) DO NOTHING`,
        role.code,
        role.name,
        role.description,
      );
    }

    // Insert permissions
    for (const permission of permissions) {
      await client.$executeRawUnsafe(
        `INSERT INTO permissions (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO NOTHING`,
        permission.code,
        permission.name,
      );
    }

    // Grant all permissions to SALON_ADMIN
    await client.$executeRawUnsafe(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'SALON_ADMIN'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // CASHIER permissions
    await client.$executeRawUnsafe(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p ON p.code IN (
        'BRANCH_VIEW', 'CUSTOMER_VIEW', 'CUSTOMER_CREATE',
        'SERVICE_VIEW', 'PRODUCT_VIEW', 'SALE_VIEW', 'SALE_CREATE', 'EMPLOYEE_VIEW',
        'APPOINTMENT_VIEW', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE',
        'QUOTATION_VIEW', 'QUOTATION_CREATE', 'QUOTATION_UPDATE', 'QUOTATION_SEND'
      )
      WHERE r.code = 'CASHIER'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // STOCK_KEEPER permissions
    await client.$executeRawUnsafe(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p ON p.code IN (
        'BRANCH_VIEW', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE',
        'SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_EDIT',
        'GRN_VIEW', 'GRN_CREATE', 'GRN_EDIT', 'GRN_RECEIVE',
        'SUPPLIER_OUTSTANDING_VIEW'
      )
      WHERE r.code = 'STOCK_KEEPER'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    this.logger.log(`✓ Roles and permissions seeded for ${safeSchema}`);
  }

  /**
   * Create the main branch
   */
  private async createMainBranch(
    schemaName: string,
    name: string,
    client: DbClient = this.prisma,
  ): Promise<string> {
    const safeSchema = validateTenantSchemaName(schemaName);
    this.logger.log(`Creating main branch for ${safeSchema}`);

    await client.$executeRawUnsafe(`SET search_path TO "${safeSchema}", public`);

    const result = await client.$queryRawUnsafe<{ id: string }[]>(
      `
      INSERT INTO branches (code, name, is_main, status)
      VALUES ('MAIN', $1, true, 'ACTIVE')
      RETURNING id
    `,
      name,
    );

    const branchId = result[0].id;
    this.logger.log(`✓ Main branch created: ${branchId}`);

    return branchId;
  }

  /** Seed a starter service catalog for every newly registered salon. */
  private async seedDefaultServiceCatalog(
    branchId: string,
    client: DbClient,
  ): Promise<void> {
    const categories = [
      {
        code: 'SCAT-0001',
        name: 'Gents',
        description: 'Hair and grooming services for men',
        services: [
          ['Haircut', 30],
          ['Beard Trim', 20],
          ['Haircut & Beard Trim', 45],
          ['Hair Wash', 15],
          ['Hair Coloring', 60],
          ['Hair Styling', 20],
        ] as Array<[string, number]>,
      },
      {
        code: 'SCAT-0002',
        name: 'Ladies',
        description: 'Hair and beauty services for women',
        services: [
          ['Haircut', 45],
          ['Hair Wash & Blow Dry', 45],
          ['Hair Styling', 30],
          ['Hair Coloring', 120],
          ['Root Touch-up', 90],
          ['Hair Treatment', 60],
          ['Facial', 60],
          ['Eyebrow Threading', 15],
        ] as Array<[string, number]>,
      },
      {
        code: 'SCAT-0003',
        name: 'Kids',
        description: 'Hair services for children',
        services: [
          ['Kids Haircut', 30],
          ['Kids Haircut & Wash', 45],
          ['Fringe Trim', 15],
        ] as Array<[string, number]>,
      },
    ];

    let serviceNumber = 1;
    for (const category of categories) {
      const categoryRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO service_categories (code, name, description, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        category.code,
        category.name,
        category.description,
      );
      const categoryId = categoryRows[0].id;

      await client.$executeRawUnsafe(
        `INSERT INTO service_category_branches (category_id, branch_id)
         VALUES ($1::uuid, $2::uuid)`,
        categoryId,
        branchId,
      );

      for (const [name, durationMinutes] of category.services) {
        const code = `SRV-${String(serviceNumber++).padStart(4, '0')}`;
        await client.$executeRawUnsafe(
          `INSERT INTO services
             (category_id, code, name, price, duration_minutes, is_active)
           VALUES ($1::uuid, $2, $3, 0, $4, true)`,
          categoryId,
          code,
          name,
          durationMinutes,
        );
      }
    }
  }

  /**
   * Create salon admin user
   */
  private async createAdminUser(
    schemaName: string,
    adminData: TenantProvisioningData['adminUser'],
    client: DbClient = this.prisma,
  ): Promise<string> {
    const safeSchema = validateTenantSchemaName(schemaName);
    this.logger.log(`Creating admin user for ${safeSchema}`);

    const passwordHash = await bcrypt.hash(adminData.password, 12);

    await client.$executeRawUnsafe(`SET search_path TO "${safeSchema}", public`);

    const userResult = await client.$queryRawUnsafe<{ id: string }[]>(
      `
      INSERT INTO users (name, email, phone, password_hash, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING id
    `,
      adminData.name,
      adminData.email.toLowerCase(),
      adminData.phone || null,
      passwordHash,
    );

    const userId = userResult[0].id;

    // Assign SALON_ADMIN role
    await client.$executeRawUnsafe(
      `
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1::uuid, id FROM roles WHERE code = 'SALON_ADMIN'
    `,
      userId,
    );

    this.logger.log(`✓ Admin user created: ${userId} (${adminData.email})`);

    return userId;
  }

  /**
   * Check if a schema exists
   */
  async schemaExists(schemaName: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int as count
      FROM information_schema.schemata
      WHERE schema_name = ${schemaName}
    `;

    return Number(result[0].count) > 0;
  }

  /**
   * Generate next tenant schema name (e.g. tenant_000001)
   */
  async generateSchemaName(): Promise<string> {
    await this.prisma.$executeRawUnsafe(`SET search_path TO public`);

    const [schemaRows, tenantRows] = await Promise.all([
      this.prisma.$queryRaw<{ schema_name: string }[]>`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name ~ '^tenant_[0-9]+$'
      `,
      this.prisma.$queryRaw<{ schema_name: string }[]>`
        SELECT "schemaName" as schema_name
        FROM tenants
        WHERE "schemaName" ~ '^tenant_[0-9]+$'
      `,
    ]);

    let maxNum = 0;
    for (const row of [...schemaRows, ...tenantRows]) {
      const match = row.schema_name?.match(/^tenant_(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    let candidateNum = maxNum + 1;
    let candidateName = `tenant_${String(candidateNum).padStart(6, '0')}`;

    // Guarantee that the chosen schema name does not physically exist
    while (await this.schemaExists(candidateName)) {
      candidateNum++;
      candidateName = `tenant_${String(candidateNum).padStart(6, '0')}`;
    }

    return candidateName;
  }
}
