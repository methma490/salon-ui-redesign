import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequireFeature } from '../../tenant/decorators/require-feature.decorator';
import { RequirePermission } from '../../tenant/decorators/require-permission.decorator';
import { PermissionGuard } from '../../tenant/guards/permission.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { FeatureGuard } from '../../tenant/guards/feature.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import {
  CreateEmployeeDto,
  EmployeePerformanceDetailQueryDto,
  EmployeePerformanceQueryDto,
  ListEmployeesQueryDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
} from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@Controller('tenant/employees')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('EMPLOYEES')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListEmployeesQueryDto) {
    return this.employeesService.list(tenant.schemaName, query);
  }

  @Get('performance')
  @RequirePermission('EMPLOYEE_VIEW')
  getPerformance(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: EmployeePerformanceQueryDto,
  ) {
    return this.employeesService.getPerformance(tenant.schemaName, query);
  }

  @Get(':id/performance')
  @RequirePermission('EMPLOYEE_VIEW')
  getEmployeePerformanceDetail(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Query() query: EmployeePerformanceDetailQueryDto,
  ) {
    return this.employeesService.getEmployeePerformanceDetail(tenant.schemaName, id, query);
  }


  @Get('assignable-roles')
  @UseGuards(FeatureGuard)
  @RequireFeature('STAFF_MANAGEMENT')
  @RequirePermission('EMPLOYEE_VIEW')
  getAssignableRoles(@CurrentTenant() tenant: TenantContext) {
    return this.employeesService.getAssignableRoles(tenant.tenantId, tenant.schemaName);
  }

  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadNewEmployeePhoto(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.employeesService.saveEmployeePhoto(file);
  }

  @Post(':id/upload-photo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadExistingEmployeePhoto(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.employeesService.saveEmployeePhoto(file);
  }

  @Get(':id')
  getById(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.employeesService.findById(tenant.schemaName, id);
  }

  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(tenant.tenantId, tenant.schemaName, dto, user.id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(tenant.tenantId, tenant.schemaName, id, dto, user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.employeesService.updateStatus(tenant.schemaName, id, dto, user.id);
  }

  @Delete(':id')
  delete(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.employeesService.deleteEmployee(tenant.schemaName, id, user.id);
  }
}

