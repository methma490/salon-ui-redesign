import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequireFeature } from '../../tenant/decorators/require-feature.decorator';
import { RequirePermission } from '../../tenant/decorators/require-permission.decorator';
import { FeatureGuard } from '../../tenant/guards/feature.guard';
import { PermissionGuard } from '../../tenant/guards/permission.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import { SalesAnalyticsQueryDto } from './dto/sales-analytics.dto';
import { SalesAnalyticsService } from './sales-analytics.service';

@Controller('tenant/sales-analytics')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('POS')
export class SalesAnalyticsController {
  constructor(private readonly salesAnalyticsService: SalesAnalyticsService) {}

  @Get('overview')
  @RequirePermission('SALE_VIEW')
  overview(@CurrentTenant() tenant: TenantContext, @Query() query: SalesAnalyticsQueryDto) {
    return this.salesAnalyticsService.getOverview(tenant.schemaName, query);
  }

  @Get('invoices')
  @RequirePermission('SALE_VIEW')
  invoices(@CurrentTenant() tenant: TenantContext, @Query() query: SalesAnalyticsQueryDto) {
    return this.salesAnalyticsService.listInvoices(tenant.schemaName, query);
  }

  @Get('by-employee')
  @RequirePermission('SALE_VIEW')
  byEmployee(@CurrentTenant() tenant: TenantContext, @Query() query: SalesAnalyticsQueryDto) {
    return this.salesAnalyticsService.getByEmployee(tenant.schemaName, query);
  }

  @Get('by-employee/:employeeId')
  @RequirePermission('SALE_VIEW')
  async employeeDetail(
    @CurrentTenant() tenant: TenantContext,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: SalesAnalyticsQueryDto,
  ) {
    const result = await this.salesAnalyticsService.getEmployeeDetail(
      tenant.schemaName,
      employeeId,
      query,
    );
    if (!result) throw new NotFoundException('Employee not found');
    return result;
  }

  @Get('by-branch')
  @RequirePermission('SALE_VIEW')
  byBranch(@CurrentTenant() tenant: TenantContext, @Query() query: SalesAnalyticsQueryDto) {
    return this.salesAnalyticsService.getByBranch(tenant.schemaName, query);
  }

  @Get('by-branch/:branchId')
  @RequirePermission('SALE_VIEW')
  branchDetail(
    @CurrentTenant() tenant: TenantContext,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query() query: SalesAnalyticsQueryDto,
  ) {
    return this.salesAnalyticsService.getBranchDetail(tenant.schemaName, branchId, query);
  }

  @Get('by-day')
  @RequirePermission('SALE_VIEW')
  byDay(@CurrentTenant() tenant: TenantContext, @Query() query: SalesAnalyticsQueryDto) {
    return this.salesAnalyticsService.getByDay(tenant.schemaName, query);
  }
}
