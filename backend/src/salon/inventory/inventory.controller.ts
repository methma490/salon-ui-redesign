import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  CreateProductCategoryDto,
  CreateProductDto,
  CreateStockCreditPaymentDto,
  ListStockCreditsQueryDto,
  ListStockMovementsQueryDto,
  StockAdjustmentDto,
  StockInDto,
  UpdateProductCategoryDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('INVENTORY')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('product-categories')
  @RequirePermission('PRODUCT_VIEW')
  listProductCategories(@CurrentTenant() tenant: TenantContext) {
    return this.inventoryService.listProductCategories(tenant.schemaName);
  }

  @Post('product-categories')
  @RequirePermission('PRODUCT_CREATE')
  createProductCategory(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.inventoryService.createProductCategory(tenant.schemaName, dto, user.id);
  }

  @Patch('product-categories/:id')
  @RequirePermission('PRODUCT_UPDATE')
  updateProductCategory(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.inventoryService.updateProductCategory(tenant.schemaName, id, dto, user.id);
  }

  @Get('products')
  @RequirePermission('PRODUCT_VIEW')
  listProducts(@CurrentTenant() tenant: TenantContext, @Query('categoryId') categoryId?: string) {
    return this.inventoryService.listProducts(tenant.schemaName, categoryId);
  }

  @Post('products')
  @RequirePermission('PRODUCT_CREATE')
  createProduct(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.inventoryService.createProduct(tenant.schemaName, dto, user.id);
  }

  @Patch('products/:id')
  @RequirePermission('PRODUCT_UPDATE')
  updateProduct(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.inventoryService.updateProduct(tenant.schemaName, id, dto, user.id);
  }

  @Patch('products/:id/status')
  @RequirePermission('PRODUCT_UPDATE')
  updateProductStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.inventoryService.updateProductStatus(tenant.schemaName, id, dto, user.id);
  }

  @Get('stock')
  @RequirePermission('PRODUCT_VIEW')
  listStock(@CurrentTenant() tenant: TenantContext, @Query('branchId') branchId?: string) {
    return this.inventoryService.listStockLevels(tenant.schemaName, branchId);
  }

  @Post('stock/in')
  @RequirePermission('PRODUCT_UPDATE')
  stockIn(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StockInDto,
  ) {
    return this.inventoryService.stockIn(tenant.schemaName, dto, user.id);
  }

  @Post('stock/adjustment')
  @RequirePermission('PRODUCT_UPDATE')
  stockAdjustment(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StockAdjustmentDto,
  ) {
    return this.inventoryService.stockAdjustment(tenant.schemaName, dto, user.id);
  }

  @Get('stock/movements')
  @RequirePermission('PRODUCT_VIEW')
  listStockMovements(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListStockMovementsQueryDto,
  ) {
    return this.inventoryService.listStockMovements(tenant.schemaName, query);
  }

  @Get('stock/credits')
  @RequirePermission('PRODUCT_VIEW')
  listStockCredits(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListStockCreditsQueryDto,
  ) {
    return this.inventoryService.listStockCredits(tenant.schemaName, query);
  }

  @Get('stock/credits/:id')
  @RequirePermission('PRODUCT_VIEW')
  getStockCredit(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.inventoryService.getStockCredit(tenant.schemaName, id);
  }

  @Post('stock/credits/:id/payments')
  @RequirePermission('PRODUCT_UPDATE')
  addStockCreditPayment(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateStockCreditPaymentDto,
  ) {
    return this.inventoryService.addStockCreditPayment(tenant.schemaName, id, dto, user.id);
  }
}
