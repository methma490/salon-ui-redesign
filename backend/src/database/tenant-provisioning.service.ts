import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

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
  private readonly migrationsPath = path.join(
    process.cwd(),
    'src',
    'database',
    'tenant-migrations',
  );

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Provision a complete tenant schema with all tables, roles, and initial data
   */
  async provisionTenantSchema(data: TenantProvisioningData): Promise<TenantProvisioningResult> {
    const { schemaName, tenantCode, adminUser } = data;

    try {
      this.logger.log(`Starting provisioning for tenant ${tenantCode} (${schemaName})`);

      // 1. Create the schema
      await this.createSchema(schemaName);

      // 2. Run all migrations
      await this.runMigrations(schemaName);

      // 3. Seed default roles and permissions
      await this.seedRolesAndPermissions(schemaName, data.roles);

      // 4. Create main branch
      const mainBranchId = await this.createMainBranch(
        schemaName,
        data.mainBranchName || 'Main Branch',
      );

      // 5. Create admin user
      const adminUserId = await this.createAdminUser(schemaName, adminUser);

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
  private async runMigrations(schemaName: string): Promise<void> {
    this.logger.log(`Running migrations for schema: ${schemaName}`);

    // Get all migration files sorted by name
    const files = fs
      .readdirSync(this.migrationsPath)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      this.logger.log(`  Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(this.migrationsPath, file), 'utf-8');

      // Set search_path
      await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

      // Split SQL into statements, handling dollar-quoted strings
      const statements = this.splitSqlStatements(sql);

      for (const statement of statements) {
        if (statement.trim().length === 0) continue;

        try {
          await this.prisma.$executeRawUnsafe(statement);
        } catch (error) {
          this.logger.error(`Failed to execute statement in ${file}:`, error);
          throw error;
        }
      }

      await this.prisma.$executeRawUnsafe(`SET search_path TO public`);
    }

    this.logger.log(`✓ Migrations complete for ${schemaName}`);
  }

  /**
   * Split SQL into statements, handling dollar-quoted strings ($$)
   */
  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inDollarQuote = false;
    let dollarTag = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];

      // Check for dollar-quoted string
      if (char === '$' && nextChar === '$') {
        if (!inDollarQuote) {
          // Starting a dollar quote
          inDollarQuote = true;
          dollarTag = '$$';
          current += char + nextChar;
          i++; // Skip next $
        } else if (dollarTag === '$$') {
          // Ending a dollar quote
          inDollarQuote = false;
          current += char + nextChar;
          i++; // Skip next $
        } else {
          current += char;
        }
      } else if (char === ';' && !inDollarQuote) {
        // End of statement
        current += char;
        statements.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add final statement if any
    if (current.trim().length > 0) {
      statements.push(current.trim());
    }

    return statements.filter((s) => s.length > 0);
  }

  /**
   * Seed default roles and permissions
   */
  private async seedRolesAndPermissions(
    schemaName: string,
    _customRoles?: string[],
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
    ];

    await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);

    // Insert roles
    for (const role of roles) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO roles (code, name, description, is_system) VALUES ($1, $2, $3, true)`,
        role.code,
        role.name,
        role.description,
      );
    }

    // Insert permissions
    for (const permission of permissions) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO permissions (code, name) VALUES ($1, $2)`,
        permission.code,
        permission.name,
      );
    }

    // Grant all permissions to SALON_ADMIN
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'SALON_ADMIN'
    `);

    // CASHIER permissions
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p ON p.code IN (
        'BRANCH_VIEW', 'CUSTOMER_VIEW', 'CUSTOMER_CREATE',
        'SERVICE_VIEW', 'PRODUCT_VIEW', 'SALE_VIEW', 'SALE_CREATE', 'EMPLOYEE_VIEW',
        'APPOINTMENT_VIEW', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE'
      )
      WHERE r.code = 'CASHIER'
    `);

    // STOCK_KEEPER permissions
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p ON p.code IN (
        'BRANCH_VIEW', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE'
      )
      WHERE r.code = 'STOCK_KEEPER'
    `);

    await this.prisma.$executeRawUnsafe(`SET search_path TO public`);

    this.logger.log(`✓ Roles and permissions seeded for ${schemaName}`);
  }

  /**
   * Create the main branch
   */
  private async createMainBranch(schemaName: string, name: string): Promise<string> {
    this.logger.log(`Creating main branch for ${schemaName}`);

    await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);

    const result = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `
      INSERT INTO branches (code, name, is_main, status)
      VALUES ('MAIN', $1, true, 'ACTIVE')
      RETURNING id
    `,
      name,
    );

    await this.prisma.$executeRawUnsafe(`SET search_path TO public`);

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
  ): Promise<string> {
    this.logger.log(`Creating admin user for ${schemaName}`);

    const passwordHash = await bcrypt.hash(adminData.password, 12);

    await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);

    // Create user
    const userResult = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
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
    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1::uuid, id FROM roles WHERE code = 'SALON_ADMIN'
    `,
      userId,
    );

    await this.prisma.$executeRawUnsafe(`SET search_path TO public`);

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
