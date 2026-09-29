import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequireFeature } from '../../tenant/decorators/require-feature.decorator';
import { RequirePermission } from '../../tenant/decorators/require-permission.decorator';
import { FeatureGuard } from '../../tenant/guards/feature.guard';
import { PermissionGuard } from '../../tenant/guards/permission.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import {
  CreateServiceCategoryDto,
  CreateServiceDto,
  ListServiceCategoriesQueryDto,
  ListServicesQueryDto,
  UpdateCategoryStatusDto,
  UpdateServiceCategoryDto,
  UpdateServiceDto,
  UpdateServiceStatusDto,
} from './dto/service.dto';
import { ServicesCatalogService } from './services-catalog.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('SERVICES')
export class ServicesCatalogController {
  constructor(private readonly servicesCatalogService: ServicesCatalogService) {}

  @Get('service-categories')
  @RequirePermission('SERVICE_VIEW')
  listCategories(
    @CurrentTenant() tenant: TenantContext,
    @Query() query?: ListServiceCategoriesQueryDto,
  ) {
    return this.servicesCatalogService.listCategories(tenant.schemaName, query);
  }

  @Post('service-categories')
  @RequirePermission('SERVICE_CREATE')
  createCategory(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceCategoryDto,
  ) {
    return this.servicesCatalogService.createCategory(tenant.schemaName, dto, user.id);
  }

  @Patch('service-categories/:id')
  @RequirePermission('SERVICE_UPDATE')
  updateCategory(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceCategoryDto,
  ) {
    return this.servicesCatalogService.updateCategory(tenant.schemaName, id, dto, user.id);
  }

  @Patch('service-categories/:id/status')
  @RequirePermission('SERVICE_UPDATE')
  updateCategoryStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryStatusDto,
  ) {
    return this.servicesCatalogService.updateCategoryStatus(tenant.schemaName, id, dto, user.id);
  }

  @Delete('service-categories/:id')
  @RequirePermission('SERVICE_UPDATE')
  deleteCategory(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.servicesCatalogService.deleteCategory(tenant.schemaName, id, user.id);
  }

  @Get('services')
  @RequirePermission('SERVICE_VIEW')
  listServices(
    @CurrentTenant() tenant: TenantContext,
    @Query() query?: ListServicesQueryDto,
  ) {
    return this.servicesCatalogService.listServices(tenant.schemaName, query);
  }

  @Post('services')
  @RequirePermission('SERVICE_CREATE')
  createService(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesCatalogService.createService(tenant.schemaName, dto, user.id);
  }

  @Patch('services/:id')
  @RequirePermission('SERVICE_UPDATE')
  updateService(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesCatalogService.updateService(tenant.schemaName, id, dto, user.id);
  }

  @Patch('services/:id/status')
  @RequirePermission('SERVICE_UPDATE')
  updateServiceStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceStatusDto,
  ) {
    return this.servicesCatalogService.updateServiceStatus(tenant.schemaName, id, dto, user.id);
  }

  @Delete('services/:id')
  @RequirePermission('SERVICE_UPDATE')
  deleteService(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.servicesCatalogService.deleteService(tenant.schemaName, id, user.id);
  }
}
