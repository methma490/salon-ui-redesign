import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import { RequireFeature } from './decorators/require-feature.decorator';
import { RequirePermission } from './decorators/require-permission.decorator';
import { FeatureGuard } from './guards/feature.guard';
import { PermissionGuard } from './guards/permission.guard';
import { TenantContextGuard } from './guards/tenant-context.guard';
import { TenantContext } from './interfaces/tenant-context.interface';
import { TenantSchemaService } from './services/tenant-schema.service';
import { tenantTable } from './utils/schema-name.util';

@Controller('tenant/test')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class TenantTestController {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  @Get()
  async test(@CurrentTenant() tenant: TenantContext) {
    const branchesTable = tenantTable(tenant.schemaName, 'branches');

    const branchCount = await this.tenantSchemaService.withTenantSchema(
      tenant.schemaName,
      async ({ tx }) => {
        const result = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${branchesTable}`,
        );
        return Number(result[0]?.count ?? 0);
      },
    );

    return {
      message: 'Tenant access granted',
      tenantCode: tenant.tenantCode,
      tenantName: tenant.tenantName,
      userEmail: tenant.userEmail,
      roles: tenant.userRoles,
      branchCount,
    };
  }

  @Get('customers')
  @UseGuards(FeatureGuard)
  @RequireFeature('CUSTOMERS')
  customers(@CurrentTenant() tenant: TenantContext) {
    return {
      message: 'Customers feature access granted',
      tenantCode: tenant.tenantCode,
    };
  }

  @Get('users')
  @UseGuards(PermissionGuard)
  @RequirePermission('USER_VIEW')
  users(@CurrentTenant() tenant: TenantContext) {
    return {
      message: 'User view permission granted',
      tenantCode: tenant.tenantCode,
    };
  }
}
