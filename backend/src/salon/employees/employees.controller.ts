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
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
} from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@Controller('tenant/employees')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermission('EMPLOYEE_VIEW')
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListEmployeesQueryDto) {
    return this.employeesService.list(tenant.schemaName, query);
  }

  @Get('assignable-roles')
  @UseGuards(FeatureGuard)
  @RequireFeature('STAFF_MANAGEMENT')
  @RequirePermission('EMPLOYEE_VIEW')
  getAssignableRoles(@CurrentTenant() tenant: TenantContext) {
    return this.employeesService.getAssignableRoles(tenant.tenantId, tenant.schemaName);
  }

  @Get(':id')
  @RequirePermission('EMPLOYEE_VIEW')
  getById(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.employeesService.findById(tenant.schemaName, id);
  }

  @Post()
  @RequirePermission('EMPLOYEE_CREATE')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(tenant.tenantId, tenant.schemaName, dto, user.id);
  }

  @Patch(':id')
  @RequirePermission('EMPLOYEE_UPDATE')
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(tenant.tenantId, tenant.schemaName, id, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermission('EMPLOYEE_UPDATE')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.employeesService.updateStatus(tenant.schemaName, id, dto, user.id);
  }
}
