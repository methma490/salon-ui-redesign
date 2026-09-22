import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

export type DbClient = Prisma.TransactionClient | PrismaService;

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
   * Resolve the tenant migrations directory dynamically across dev, prod, and Docker environments
   */
  private getMigrationsPath(): string {
    const candidates = [
      path.join(__dirname, 'tenant-migrations'),
      path.join(__dirname, '..', 'database', 'tenant-migrations'),
      path.join(__dirname, '..', 'src', 'database', 'tenant-migrations'),
      path.join(process.cwd(), 'src', 'database', 'tenant-migrations'),
      path.join(process.cwd(), 'dist', 'src', 'database', 'tenant-migrations'),
      path.join(process.cwd(), 'dist', 'database', 'tenant-migrations'),
      path.join(process.cwd(), 'database', 'tenant-migrations'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    this.logger.error(
      `Could not locate tenant-migrations directory. Checked: ${candidates.join(', ')}`,
    );
    return path.join(process.cwd(), 'src', 'database', 'tenant-migrations');
  }

  /**
   * Safely drops any orphan tenant enum types that were accidentally created in the public schema
   * during previous unpinned connection executions.
   */
  async cleanupStrayPublicTenantTypes(client: DbClient = this.prisma): Promise<void> {
    const cleanupSql = `
      DO $$
      DECLARE
        tenant_types TEXT[] := ARRAY[
          'branch_status', 'user_status', 'employee_status', 'customer_status',
          'stock_movement_type', 'sale_status', 'payment_method', 'payment_status',
          'appointment_status', 'expense_status', 'loan_status', 'payroll_run_status',
          'sale_assignment_type', 'advance_status', 'stock_receipt_payment_status',
          'stock_credit_payment_method', 'quotation_status', 'quotation_message_channel',
          'quotation_message_status'
        ];
        t_name TEXT;
      BEGIN
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
   * Provision a complete tenant schema with all tables, roles, and initial data
   */
  async provisionTenantSchema(data: TenantProvisioningData): Promise<TenantProvisioningResult> {
    const { schemaName, tenantCode, adminUser } = data;

    try {
      this.logger.log(`Starting provisioning for tenant ${tenantCode} (${schemaName})`);

      // 0. Clean stray tenant types from public schema first
      await this.cleanupStrayPublicTenantTypes();

      // 1. Create the schema (DDL)
      await this.createSchema(schemaName);

      // 2. Execute all provisioning steps inside a dedicated transaction to guarantee connection pinning!
      // In Prisma, $transaction pins a single underlying physical connection for the entire callback.
      const { mainBranchId, adminUserId } = await this.prisma.$transaction(
        async (tx) => {
          // Pin search_path to the new tenant schema on this dedicated connection
          await tx.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

          // Run all migrations on this pinned connection
          await this.runMigrations(schemaName, tx);

          // Seed default roles and permissions on this pinned connection
          await this.seedRolesAndPermissions(schemaName, data.roles, tx);

          // Create main branch on this pinned connection
          const branchId = await this.createMainBranch(
            schemaName,
            data.mainBranchName || 'Main Branch',
            tx,
          );

          // Create admin user on this pinned connection
          const userId = await this.createAdminUser(schemaName, adminUser, tx);

          return { mainBranchId: branchId, adminUserId: userId };
        },
        {
          timeout: 120000,
          maxWait: 15000,
        },
      );

      this.logger.log(`✓ Successfully provisioned tenant ${tenantCode}`);

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
   * Create a new PostgreSQL schema
   */
  private async createSchema(schemaName: string): Promise<void> {
    this.logger.log(`Creating schema: ${schemaName}`);
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
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
    this.logger.log(`Dropping schema: ${schemaName}`);
    await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  }

  /**
   * Run all tenant migration files in order
   */
  private async runMigrations(schemaName: string, client: DbClient = this.prisma): Promise<void> {
    const migrationsPath = this.getMigrationsPath();
    this.logger.log(`Running migrations for schema: ${schemaName} (from ${migrationsPath})`);

    if (!fs.existsSync(migrationsPath)) {
      throw new Error(`Tenant migrations directory not found at: ${migrationsPath}`);
    }

    // Ensure search_path is set on this client/connection
    await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

    // Get all migration files sorted by name
    const files = fs
      .readdirSync(migrationsPath)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      throw new Error(`No .sql migration files found in: ${migrationsPath}`);
    }

    for (const file of files) {
      this.logger.log(`  Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');

      // Split SQL into statements, handling quotes, comments, and dollar-quoted blocks
      const statements = this.splitSqlStatements(sql);

      let statementIndex = 0;
      for (const statement of statements) {
        statementIndex++;
        const trimmed = statement.trim();
        if (trimmed.length === 0) continue;

        // Skip pure comment blocks that have no executable SQL
        const executableContent = trimmed
          .replace(/--.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .trim();
        if (executableContent.length === 0) continue;

        try {
          await client.$executeRawUnsafe(statement);
        } catch (error: any) {
          const prismaCode = error?.code || 'UNKNOWN_PRISMA_CODE';
          const dbCode = error?.meta?.code || 'N/A';
          const dbMessage = error?.meta?.message || error?.message || String(error);

          this.logger.error(
            `\n[MIGRATION FAILURE]\n` +
            `================================================================================\n` +
            `Migration File : ${file}\n` +
            `Statement #    : ${statementIndex}\n` +
            `Prisma Code    : ${prismaCode}\n` +
            `DB Error Code  : ${dbCode}\n` +
            `DB Message     : ${dbMessage}\n` +
            `Failed SQL     :\n${statement}\n` +
            `================================================================================`,
          );
          throw error;
        }
      }
    }

    this.logger.log(`✓ Migrations complete for ${schemaName}`);
  }

  /**
   * Split SQL into executable statements, properly preserving:
   * 1. Single-line comments (-- ...)
   * 2. Block comments (/* ... * /)
   * 3. Single-quoted strings ('...' and '' escapes)
   * 4. Dollar-quoted blocks ($$ ... $$ or $<tag>$ ... $<tag>$)
   */
  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let i = 0;
    const len = sql.length;

    while (i < len) {
      // 1. Single-line comment: -- ... \n
      if (sql[i] === '-' && sql[i + 1] === '-') {
        while (i < len && sql[i] !== '\n') {
          current += sql[i];
          i++;
        }
        if (i < len) {
          current += sql[i]; // include \n
          i++;
        }
        continue;
      }

      // 2. Block comment: /* ... */
      if (sql[i] === '/' && sql[i + 1] === '*') {
        current += '/*';
        i += 2;
        while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) {
          current += sql[i];
          i++;
        }
        if (i < len) {
          current += '*/';
          i += 2;
        }
        continue;
      }

      // 3. Dollar quote: $$ ... $$ or $<tag>$ ... $<tag>$
      if (sql[i] === '$') {
        const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
        if (match) {
          const tag = match[0];
          current += tag;
          i += tag.length;
          const endIdx = sql.indexOf(tag, i);
          if (endIdx !== -1) {
            current += sql.slice(i, endIdx + tag.length);
            i = endIdx + tag.length;
          } else {
            current += sql.slice(i);
            i = len;
          }
          continue;
        }
      }

      // 4. Single-quoted string: '...' (handles '' and \' escapes)
      if (sql[i] === "'") {
        current += "'";
        i++;
        while (i < len) {
          if (sql[i] === "'") {
            current += "'";
            i++;
            // Check for doubled quote escape ''
            if (sql[i] === "'") {
              current += "'";
              i++;
            } else {
              break;
            }
          } else if (sql[i] === '\\' && i + 1 < len) {
            current += sql[i] + sql[i + 1];
            i += 2;
          } else {
            current += sql[i];
            i++;
          }
        }
        continue;
      }

      // 5. Statement delimiter: ;
      if (sql[i] === ';') {
        current += ';';
        i++;
        const trimmed = current.trim();
        if (trimmed.length > 0) {
          statements.push(trimmed);
        }
        current = '';
        continue;
      }

      current += sql[i];
      i++;
    }

    const trimmed = current.trim();
    if (trimmed.length > 0) {
      statements.push(trimmed);
    }

    return statements;
  }

  /**
   * Seed default roles and permissions
   */
  private async seedRolesAndPermissions(
    schemaName: string,
    _customRoles?: string[],
    client: DbClient = this.prisma,
  ): Promise<void> {
    this.logger.log(`Seeding roles and permissions for ${schemaName}`);

    // Default tenant roles (NOT SUPER_ADMIN - that's platform-level only)
    const roles = [
      { code: 'SALON_ADMIN', name: 'Salon Admin', description: 'Salon administrator' },
      { code: 'CASHIER', name: 'Cashier', description: 'Point of sale cashier' },
      { code: 'STOCK_KEEPER', name: 'Stock Keeper', description: 'Inventory manager' },
    ];

    // Default permissions for tenant users
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
    ];

    await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

    // Insert roles (idempotent — safe if migration already seeded or retry mid-seed)
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

    // Insert permissions (idempotent — never re-insert QUOTATION_* / others)
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
        'BRANCH_VIEW', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE'
      )
      WHERE r.code = 'STOCK_KEEPER'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    this.logger.log(`✓ Roles and permissions seeded for ${schemaName}`);
  }

  /**
   * Create the main branch
   */
  private async createMainBranch(
    schemaName: string,
    name: string,
    client: DbClient = this.prisma,
  ): Promise<string> {
    this.logger.log(`Creating main branch for ${schemaName}`);

    await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

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

  /**
   * Create salon admin user
   */
  private async createAdminUser(
    schemaName: string,
    adminData: TenantProvisioningData['adminUser'],
    client: DbClient = this.prisma,
  ): Promise<string> {
    this.logger.log(`Creating admin user for ${schemaName}`);

    const passwordHash = await bcrypt.hash(adminData.password, 12);

    await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

    // Create user
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
   * Generate next tenant schema name
   */
  async generateSchemaName(): Promise<string> {
    await this.prisma.$executeRawUnsafe(`SET search_path TO public`);

    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int as count FROM tenants
    `;

    const count = Number(result[0].count);
    const nextNumber = count + 1;

    return `tenant_${String(nextNumber).padStart(6, '0')}`;
  }
}
