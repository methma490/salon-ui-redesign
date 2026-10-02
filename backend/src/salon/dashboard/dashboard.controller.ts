import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequireFeature } from '../../tenant/decorators/require-feature.decorator';
import { RequirePermission } from '../../tenant/decorators/require-permission.decorator';
import { FeatureGuard } from '../../tenant/guards/feature.guard';
import { PermissionGuard } from '../../tenant/guards/permission.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import { SalonDashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('tenant/dashboard')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequirePermission('SALE_VIEW')
  getDashboard(@CurrentTenant() tenant: TenantContext, @Query() query: SalonDashboardQueryDto) {
    return this.dashboardService.getDashboard(
      tenant.schemaName,
      query.branchId,
      query.period ?? 'today',
    );
  }
}

@Controller('tenant/reports')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('REPORTS')
export class ReportsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('sales-report')
  @RequirePermission('SALE_VIEW')
  salesReport(
    @CurrentTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.dashboardService.getSalesReport(
      tenant.schemaName,
      startDate,
      endDate,
      branchId,
      paymentMethod,
    );
  }

  @Get('daily-sales')
  @RequirePermission('SALE_VIEW')
  dailySales(
    @CurrentTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getDailySalesReport(
      tenant.schemaName,
      startDate,
      endDate,
      branchId,
    );
  }

  @Get('branch-sales')
  @RequirePermission('SALE_VIEW')
  branchSales(
    @CurrentTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getBranchSalesReport(tenant.schemaName, startDate, endDate);
  }

  @Get('service-sales')
  @RequirePermission('SALE_VIEW')
  serviceSales(
    @CurrentTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getServiceSalesReport(
      tenant.schemaName,
      startDate,
      endDate,
      branchId,
    );
  }

  @Get('product-sales')
  @RequirePermission('SALE_VIEW')
  productSales(
    @CurrentTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getProductSalesReport(
      tenant.schemaName,
      startDate,
      endDate,
      branchId,
    );
  }

  @Get('employee-performance')
  @RequirePermission('SALE_VIEW')
  employeePerformance(
    @CurrentTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
  ) {
    return this.dashboardService.getEmployeePerformanceReport(
      tenant.schemaName,
      startDate,
      endDate,
      branchId,
      search,
    );
  }

  @Get('inventory-report')
  @RequirePermission('PRODUCT_VIEW')
  inventoryReport(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getInventoryReport(
      tenant.schemaName,
      branchId,
      categoryId,
      status,
      search,
      startDate,
      endDate,
    );
  }

  @Get('low-stock')
  @RequirePermission('PRODUCT_VIEW')
  lowStock(
    @CurrentTenant() tenant: TenantContext,
    @Query('threshold') threshold?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getLowStockReport(
      tenant.schemaName,
      threshold ? Number(threshold) : 5,
      branchId,
    );
  }
}
