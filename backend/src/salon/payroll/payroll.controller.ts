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
  CreateEmployeeAdvanceDto,
  CreateEmployeeLoanDto,
  CreatePayrollRunDto,
  ListEmployeeAdvancesQueryDto,
  ListEmployeeLoansQueryDto,
  ListPayrollRunsQueryDto,
  ListPayslipsQueryDto,
  UpdateEmployeeAdvanceDto,
  UpdateEmployeeLoanDto,
  UpdatePayrollItemDto,
  UpdatePayrollSettingsDto,
} from './dto/payroll.dto';
import { PayrollService } from './payroll.service';

@Controller('tenant/payroll')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('PAYROLL')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('settings')
  @RequirePermission('PAYROLL_SETTINGS_VIEW')
  getSettings(@CurrentTenant() tenant: TenantContext) {
    return this.payrollService.getSettings(tenant.schemaName);
  }

  @Patch('settings')
  @RequirePermission('PAYROLL_SETTINGS_UPDATE')
  updateSettings(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePayrollSettingsDto,
  ) {
    return this.payrollService.updateSettings(tenant.schemaName, dto, user.id);
  }

  @Get('loans')
  @RequirePermission('LOAN_VIEW')
  listLoans(@CurrentTenant() tenant: TenantContext, @Query() query: ListEmployeeLoansQueryDto) {
    return this.payrollService.listLoans(tenant.schemaName, query);
  }

  @Post('loans')
  @RequirePermission('LOAN_CREATE')
  createLoan(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeLoanDto,
  ) {
    return this.payrollService.createLoan(tenant.schemaName, dto, user.id);
  }

  @Get('loans/:id')
  @RequirePermission('LOAN_VIEW')
  getLoan(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.payrollService.getLoan(tenant.schemaName, id);
  }

  @Patch('loans/:id')
  @RequirePermission('LOAN_UPDATE')
  updateLoan(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeLoanDto,
  ) {
    return this.payrollService.updateLoan(tenant.schemaName, id, dto, user.id);
  }

  @Get('advances')
  @RequirePermission('LOAN_VIEW')
  listAdvances(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListEmployeeAdvancesQueryDto,
  ) {
    return this.payrollService.listAdvances(tenant.schemaName, query);
  }

  @Post('advances')
  @RequirePermission('LOAN_CREATE')
  createAdvance(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeAdvanceDto,
  ) {
    return this.payrollService.createAdvance(tenant.schemaName, dto, user.id);
  }

  @Get('advances/:id')
  @RequirePermission('LOAN_VIEW')
  getAdvance(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.payrollService.getAdvance(tenant.schemaName, id);
  }

  @Patch('advances/:id')
  @RequirePermission('LOAN_UPDATE')
  updateAdvance(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeAdvanceDto,
  ) {
    return this.payrollService.updateAdvance(tenant.schemaName, id, dto, user.id);
  }

  @Get('runs')
  @RequirePermission('PAYROLL_VIEW')
  listRuns(@CurrentTenant() tenant: TenantContext, @Query() query: ListPayrollRunsQueryDto) {
    return this.payrollService.listRuns(tenant.schemaName, query);
  }

  @Post('runs')
  @RequirePermission('PAYROLL_RUN')
  createRun(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollRunDto,
  ) {
    return this.payrollService.createRun(tenant.schemaName, dto, user.id);
  }

  @Get('runs/:id')
  @RequirePermission('PAYROLL_VIEW')
  getRun(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.payrollService.getRun(tenant.schemaName, id);
  }

  @Patch('runs/:runId/items/:itemId')
  @RequirePermission('PAYROLL_UPDATE')
  updateItem(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePayrollItemDto,
  ) {
    return this.payrollService.updateItem(tenant.schemaName, runId, itemId, dto, user.id);
  }

  @Post('runs/:id/finalize')
  @RequirePermission('PAYROLL_FINALIZE')
  finalize(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.payrollService.finalizeRun(tenant.schemaName, id, user.id);
  }

  @Post('runs/:id/mark-paid')
  @RequirePermission('PAYROLL_MARK_PAID')
  markPaid(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.payrollService.markPaid(tenant.schemaName, id, user.id);
  }

  @Get('payslips')
  @RequirePermission('PAYSLIP_VIEW')
  listPayslips(@CurrentTenant() tenant: TenantContext, @Query() query: ListPayslipsQueryDto) {
    return this.payrollService.listPayslips(tenant.schemaName, query);
  }

  @Get('payslips/:payrollItemId')
  @RequirePermission('PAYSLIP_VIEW')
  getPayslip(
    @CurrentTenant() tenant: TenantContext,
    @Param('payrollItemId') payrollItemId: string,
  ) {
    return this.payrollService.getPayslip(tenant.schemaName, payrollItemId);
  }
}
