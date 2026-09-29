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
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
  UpdateExpenseStatusDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('EXPENSES')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('expense-categories')
  @RequirePermission('EXPENSE_VIEW')
  listCategories(@CurrentTenant() tenant: TenantContext) {
    return this.expensesService.listCategories(tenant.schemaName);
  }

  @Post('expense-categories')
  @RequirePermission('EXPENSE_CREATE')
  createCategory(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.expensesService.createCategory(tenant.schemaName, dto, user.id);
  }

  @Patch('expense-categories/:id')
  @RequirePermission('EXPENSE_UPDATE')
  updateCategory(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expensesService.updateCategory(tenant.schemaName, id, dto, user.id);
  }

  @Delete('expense-categories/:id')
  @RequirePermission('EXPENSE_DELETE')
  deleteCategory(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.expensesService.deleteCategory(tenant.schemaName, id, user.id);
  }

  @Get('expenses')
  @RequirePermission('EXPENSE_VIEW')
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListExpensesQueryDto) {
    return this.expensesService.list(tenant.schemaName, query);
  }

  @Get('expenses/:id')
  @RequirePermission('EXPENSE_VIEW')
  getById(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.expensesService.findById(tenant.schemaName, id);
  }

  @Post('expenses')
  @RequirePermission('EXPENSE_CREATE')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(tenant.schemaName, dto, user.id);
  }

  @Patch('expenses/:id')
  @RequirePermission('EXPENSE_UPDATE')
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(tenant.schemaName, id, dto, user.id);
  }

  @Patch('expenses/:id/status')
  @RequirePermission('EXPENSE_DELETE')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseStatusDto,
  ) {
    return this.expensesService.updateStatus(tenant.schemaName, id, dto, user.id);
  }

  @Delete('expenses/:id')
  @RequirePermission('EXPENSE_DELETE')
  delete(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.expensesService.delete(tenant.schemaName, id, user.id);
  }
}
