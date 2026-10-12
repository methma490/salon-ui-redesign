import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { validateTenantSchemaName } from '../tenant-migration-runner';
import { DemoSeedService } from './demo-seed.service';
import { SuperAdminAuditLogsService } from '../../super-admin/audit-logs/super-admin-audit-logs.service';

export interface ResetDemoTenantOptions {
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DemoResetResult {
  success: boolean;
  tenantId: string;
  schemaName: string;
  demoProfile: string | null;
  lastDemoResetAt: Date;
}

@Injectable()
export class DemoResetService {
  private readonly logger = new Logger(DemoResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly demoSeedService: DemoSeedService = new DemoSeedService(prisma),
    @Optional() private readonly auditLogsService?: SuperAdminAuditLogsService,
  ) {}

  /**
   * Securely resets a demo salon account back to its deterministic initial baseline state.
   * STRICT SECURITY ENFORCEMENT: ONLY tenants with isDemo === true can be reset.
   */
  async resetDemoTenant(
    tenantId: string,
    options: ResetDemoTenantOptions = {},
  ): Promise<DemoResetResult> {
    const startedAt = new Date();
    const performedBy = options.performedBy || 'SALON_ADMIN';

    // 1. Fetch tenant from public schema (source of truth)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        schemaName: true,
        isDemo: true,
        demoProfile: true,
        demoResetInProgress: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantId}" not found`);
    }

    // 2. CRITICAL SECURITY GUARD: Verify isDemo is explicitly true
    if (!tenant.isDemo) {
      this.logger.error(
        `SECURITY VIOLATION: Attempted to reset real customer salon "${tenant.name}" (${tenant.id}) by ${performedBy}`,
      );
      throw new ForbiddenException('Reset is allowed ONLY for dedicated demo salon accounts.');
    }

    // 3. Concurrency Protection
    if (tenant.demoResetInProgress) {
      throw new ConflictException(
        'A demo reset operation is already in progress for this demo salon. Please wait.',
      );
    }

    const schemaName = validateTenantSchemaName(tenant.schemaName);
    const demoProfile = tenant.demoProfile || 'PLAN_ONE_DEMO';

    this.logger.log(`Starting demo reset for ${tenant.name} (${schemaName}) [${demoProfile}]`);

    let completedResetAt: Date;

    try {
      // 4. Mark in progress & execute all reset actions inside a single atomic transaction
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { demoResetInProgress: true },
      });

      completedResetAt = await this.prisma.$transaction(
        async (tx) => {
          // Acquire transaction-scoped advisory lock for this tenant to prevent races
          const lockRows = await tx.$queryRawUnsafe<Array<{ lock_acquired: boolean }>>(
            `SELECT pg_try_advisory_xact_lock(hashtext($1)) AS lock_acquired`,
            `demo_reset_${tenant.id}`,
          );

          if (lockRows.length === 0 || !lockRows[0].lock_acquired) {
            throw new ConflictException(
              'A concurrent reset lock is already held for this demo tenant.',
            );
          }

          // Pin search path
          await tx.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

          // Clear resettable tables in safe foreign-key order
          await this.clearTenantBusinessData(schemaName, tx);

          // Seed baseline deterministically
          await this.demoSeedService.seedBaseline(schemaName, demoProfile, tx);

          // Update public tenant timestamp
          const now = new Date();
          await tx.tenant.update({
            where: { id: tenant.id },
            data: {
              lastDemoResetAt: now,
              demoResetInProgress: false,
            },
          });

          return now;
        },
        {
          timeout: 180000,
          maxWait: 30000,
        },
      );

      // 5. Record platform audit log
      const superAdminUser = await this.prisma.superAdminUser.findFirst({
        select: { id: true },
      });
      if (superAdminUser && this.auditLogsService) {
        await this.auditLogsService.logAction({
          adminUserId: superAdminUser.id,
          action: 'DEMO_DATA_RESET',
          entityType: 'TENANT_DEMO',
          entityId: tenant.id,
          tenantId: tenant.id,
          metadata: {
            tenantCode: tenant.code,
            tenantName: tenant.name,
            schemaName: tenant.schemaName,
            demoProfile,
            performedBy,
            startedAt,
            completedAt: completedResetAt,
            result: 'SUCCESS',
          },
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        });
      }

      this.logger.log(
        `✓ Demo tenant ${tenant.name} (${schemaName}) restored to original baseline at ${completedResetAt.toISOString()}`,
      );

      return {
        success: true,
        tenantId: tenant.id,
        schemaName: tenant.schemaName,
        demoProfile: tenant.demoProfile,
        lastDemoResetAt: completedResetAt,
      };
    } catch (error) {
      // Ensure in-progress flag is cleared on failure
      await this.prisma.tenant
        .update({
          where: { id: tenant.id },
          data: { demoResetInProgress: false },
        })
        .catch(() => {});

      this.logger.error(`Failed to reset demo tenant ${tenant.name}:`, error);

      if (error instanceof ForbiddenException || error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to reset demo data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Clears resettable demo business data without touching infrastructure:
   * Preserves: users, roles, permissions, user_roles, role_permissions, refresh_tokens, _applied_tenant_migrations.
   */
  private async clearTenantBusinessData(schemaName: string, tx: any): Promise<void> {
    const clearStatements = [
      // 1. Supplier & GRN module
      `DELETE FROM "${schemaName}".supplier_payment_allocations`,
      `DELETE FROM "${schemaName}".supplier_payments`,
      `DELETE FROM "${schemaName}".grn_items`,
      `DELETE FROM "${schemaName}".grns`,
      `DELETE FROM "${schemaName}".suppliers`,

      // 2. Stock Receipts & Credit Payments
      `DELETE FROM "${schemaName}".stock_credit_payments`,
      `DELETE FROM "${schemaName}".stock_receipt_items`,
      `DELETE FROM "${schemaName}".stock_receipts`,

      // 3. Quotations module
      `DELETE FROM "${schemaName}".quotation_messages`,
      `DELETE FROM "${schemaName}".quotation_items`,
      `DELETE FROM "${schemaName}".quotations`,

      // 4. Payroll module
      `DELETE FROM "${schemaName}".loan_repayments`,
      `DELETE FROM "${schemaName}".payroll_items`,
      `DELETE FROM "${schemaName}".payroll_runs`,
      `DELETE FROM "${schemaName}".employee_advances`,
      `DELETE FROM "${schemaName}".employee_loans`,
      `DELETE FROM "${schemaName}".payroll_settings`,

      // 5. Sales & Payments
      `DELETE FROM "${schemaName}".payments`,
      `DELETE FROM "${schemaName}".sale_item_employees`,
      `DELETE FROM "${schemaName}".sale_items`,
      `DELETE FROM "${schemaName}".sales`,

      // 6. Appointments
      `DELETE FROM "${schemaName}".appointment_services`,
      `DELETE FROM "${schemaName}".appointments`,

      // 7. Inventory & Products
      `DELETE FROM "${schemaName}".stock_movements`,
      `DELETE FROM "${schemaName}".product_branches`,
      `DELETE FROM "${schemaName}".products`,
      `DELETE FROM "${schemaName}".product_categories`,

      // 8. Services
      `DELETE FROM "${schemaName}".service_category_branches`,
      `DELETE FROM "${schemaName}".services`,
      `DELETE FROM "${schemaName}".service_categories`,

      // 9. Expenses
      `DELETE FROM "${schemaName}".expenses`,

      // 10. Customers & Employees
      `DELETE FROM "${schemaName}".customers`,
      `DELETE FROM "${schemaName}".employees`,

      // 11. Secondary Branches (preserve main branch)
      `DELETE FROM "${schemaName}".branches WHERE is_main = false`,
    ];

    for (const sql of clearStatements) {
      try {
        await tx.$executeRawUnsafe(sql);
      } catch (err) {
        // Safe execution if a table does not exist in some legacy test setup
        this.logger.debug(`Reset statement skipped or error: ${sql} -> ${err}`);
      }
    }
  }

  /**
   * Reset by profile (CLI support)
   */
  async resetByProfile(profile: string, performedBy = 'CLI_ADMIN'): Promise<DemoResetResult[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        isDemo: true,
        demoProfile: profile,
      },
    });

    if (tenants.length === 0) {
      throw new NotFoundException(`No demo tenant found with profile "${profile}"`);
    }

    const results: DemoResetResult[] = [];
    for (const tenant of tenants) {
      const result = await this.resetDemoTenant(tenant.id, { performedBy });
      results.push(result);
    }

    return results;
  }

  /**
   * Reset all demo tenants (CLI support / optional nightly reset)
   */
  async resetAllDemoTenants(performedBy = 'CLI_ADMIN'): Promise<DemoResetResult[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        isDemo: true,
      },
    });

    const results: DemoResetResult[] = [];
    for (const tenant of tenants) {
      const result = await this.resetDemoTenant(tenant.id, { performedBy });
      results.push(result);
    }

    return results;
  }
}
