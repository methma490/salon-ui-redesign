import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  CreateSupplierDto,
  ListSuppliersQueryDto,
  UpdateSupplierDto,
  UpdateSupplierStatusDto,
} from './dto/supplier.dto';
import {
  CancelGrnDto,
  CreateGrnDto,
  ListGrnsQueryDto,
  ReceiveGrnDto,
  UpdateGrnDto,
} from './dto/grn.dto';
import {
  CreateSupplierPaymentDto,
  ListSupplierPaymentsQueryDto,
  UpdateChequeStatusDto,
} from './dto/supplier-payment.dto';
import { ListSupplierOutstandingQueryDto } from './dto/supplier-outstanding.dto';
import { SuppliersService } from './suppliers.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('INVENTORY')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // =========================================================================
  // 1. SUPPLIERS
  // =========================================================================

  @Get('suppliers')
  @RequirePermission('SUPPLIERS_VIEW')
  listSuppliers(
    @CurrentTenant() tenant: TenantContext,
    @Query() query?: ListSuppliersQueryDto,
  ) {
    return this.suppliersService.listSuppliers(tenant.schemaName, query);
  }

  @Get('suppliers/:id')
  @RequirePermission('SUPPLIERS_VIEW')
  getSupplier(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.suppliersService.getSupplier(tenant.schemaName, id);
  }

  @Post('suppliers')
  @RequirePermission('SUPPLIERS_CREATE')
  createSupplier(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.createSupplier(tenant.schemaName, dto, user.id);
  }

  @Patch('suppliers/:id')
  @RequirePermission('SUPPLIERS_EDIT')
  updateSupplier(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.updateSupplier(tenant.schemaName, id, dto, user.id);
  }

  @Patch('suppliers/:id/status')
  @RequirePermission('SUPPLIERS_EDIT')
  updateSupplierStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierStatusDto,
  ) {
    return this.suppliersService.updateSupplierStatus(tenant.schemaName, id, dto, user.id);
  }

  @Delete('suppliers/:id')
  @RequirePermission('SUPPLIERS_DELETE')
  deleteSupplier(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.suppliersService.deleteSupplier(tenant.schemaName, id, user.id);
  }

  // =========================================================================
  // 2. GRN / PURCHASES
  // =========================================================================

  @Get('grns')
  @RequirePermission('GRN_VIEW')
  listGrns(
    @CurrentTenant() tenant: TenantContext,
    @Query() query?: ListGrnsQueryDto,
  ) {
    return this.suppliersService.listGrns(tenant.schemaName, query);
  }

  @Get('grns/:id')
  @RequirePermission('GRN_VIEW')
  getGrn(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.suppliersService.getGrn(tenant.schemaName, id);
  }

  @Post('grns')
  @RequirePermission('GRN_CREATE')
  createGrn(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGrnDto,
  ) {
    return this.suppliersService.createGrn(tenant.schemaName, dto, user.id);
  }

  @Patch('grns/:id')
  @RequirePermission('GRN_EDIT')
  updateGrn(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGrnDto,
  ) {
    return this.suppliersService.updateGrn(tenant.schemaName, id, dto, user.id);
  }

  @Post('grns/:id/receive')
  @RequirePermission('GRN_RECEIVE')
  receiveGrn(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReceiveGrnDto,
  ) {
    return this.suppliersService.receiveGrn(tenant.schemaName, id, dto, user.id);
  }

  @Post('grns/:id/cancel')
  @RequirePermission('GRN_CANCEL')
  cancelGrn(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelGrnDto,
  ) {
    return this.suppliersService.cancelGrn(tenant.schemaName, id, dto, user.id);
  }

  // =========================================================================
  // 3. SUPPLIER PAYMENTS
  // =========================================================================

  @Get('supplier-payments')
  @RequirePermission('SUPPLIER_PAYMENTS_VIEW')
  listSupplierPayments(
    @CurrentTenant() tenant: TenantContext,
    @Query() query?: ListSupplierPaymentsQueryDto,
  ) {
    return this.suppliersService.listSupplierPayments(tenant.schemaName, query);
  }

  @Get('supplier-payments/:id')
  @RequirePermission('SUPPLIER_PAYMENTS_VIEW')
  getSupplierPayment(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.suppliersService.getSupplierPayment(tenant.schemaName, id);
  }

  @Post('supplier-payments')
  @RequirePermission('SUPPLIER_PAYMENTS_CREATE')
  createSupplierPayment(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierPaymentDto,
  ) {
    return this.suppliersService.createSupplierPayment(tenant.schemaName, dto, user.id);
  }

  @Patch('supplier-payments/:id/cheque-status')
  @RequirePermission('SUPPLIER_PAYMENTS_CREATE')
  updateChequeStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateChequeStatusDto,
  ) {
    return this.suppliersService.updateChequeStatus(tenant.schemaName, id, dto, user.id);
  }

  // =========================================================================
  // 4. SUPPLIER OUTSTANDING & REPORT SUMMARY
  // =========================================================================

  @Get('supplier-outstanding')
  @RequirePermission('SUPPLIER_OUTSTANDING_VIEW')
  listSupplierOutstanding(
    @CurrentTenant() tenant: TenantContext,
    @Query() query?: ListSupplierOutstandingQueryDto,
  ) {
    return this.suppliersService.listSupplierOutstanding(tenant.schemaName, query);
  }

  @Get('supplier-outstanding-summary')
  @RequirePermission('SUPPLIER_OUTSTANDING_VIEW')
  getOutstandingSummary(
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.suppliersService.getOutstandingSummary(tenant.schemaName);
  }
}
