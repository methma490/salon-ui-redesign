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
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from './dto/customer.dto';
import { CustomersService } from './customers.service';

@Controller('tenant/customers')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('CUSTOMERS')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission('CUSTOMER_VIEW')
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListCustomersQueryDto) {
    return this.customersService.list(tenant.schemaName, query);
  }

  @Get('search')
  @RequirePermission('CUSTOMER_VIEW')
  search(@CurrentTenant() tenant: TenantContext, @Query() query: ListCustomersQueryDto) {
    return this.customersService.list(tenant.schemaName, { ...query, summary: true });
  }

  @Get(':id')
  @RequirePermission('CUSTOMER_VIEW')
  getById(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.customersService.findById(tenant.schemaName, id);
  }

  @Get(':id/booking-history')
  @RequirePermission('CUSTOMER_VIEW')
  getBookingHistory(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.customersService.getBookingHistory(tenant.schemaName, id);
  }

  @Post()
  @RequirePermission('CUSTOMER_CREATE')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(tenant.schemaName, dto, user.id);
  }

  @Patch(':id')
  @RequirePermission('CUSTOMER_UPDATE')
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenant.schemaName, id, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermission('CUSTOMER_UPDATE')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerStatusDto,
  ) {
    return this.customersService.updateStatus(tenant.schemaName, id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermission('CUSTOMER_UPDATE')
  delete(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.customersService.deleteCustomer(tenant.schemaName, id, user.id);
  }
}
