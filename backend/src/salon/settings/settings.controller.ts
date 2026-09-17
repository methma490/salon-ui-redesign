import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequireFeature } from '../../tenant/decorators/require-feature.decorator';
import { FeatureGuard } from '../../tenant/guards/feature.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import {
  ChangePasswordDto,
  ChangeSubscriptionPlanDto,
  CreateRoleDto,
  UpdateAccountSettingsDto,
  UpdateSalonSettingsDto,
  UpdateRolePermissionsDto,
  UpdateUserAccessDto,
  UpdateUserRolesDto,
} from './dto/settings.dto';
import { SettingsService } from './settings.service';

@Controller('tenant/settings')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getSettings(tenant.tenantId, tenant.schemaName, user.id);
  }

  @Patch('salon')
  updateSalon(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSalonSettingsDto,
  ) {
    return this.settingsService.updateSalon(tenant.tenantId, dto, user.roles);
  }

  @Post('logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadLogo(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.settingsService.saveLogo(tenant.tenantId, user.roles, file);
  }

  @Delete('logo')
  removeLogo(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.removeLogo(tenant.tenantId, user.roles);
  }

  @Get('access-control')
  @UseGuards(FeatureGuard)
  @RequireFeature('STAFF_MANAGEMENT')
  getAccessControl(@CurrentTenant() tenant: TenantContext) {
    return this.settingsService.getAccessControl(tenant.tenantId, tenant.schemaName);
  }

  @Post('roles')
  @UseGuards(FeatureGuard)
  @RequireFeature('STAFF_MANAGEMENT')
  createRole(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.settingsService.createRole(tenant.tenantId, tenant.schemaName, user.roles, dto);
  }

  @Delete('roles/:roleCode')
  @UseGuards(FeatureGuard)
  @RequireFeature('STAFF_MANAGEMENT')
  deleteRole(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleCode') roleCode: string,
  ) {
    return this.settingsService.deleteRole(
      tenant.tenantId,
      tenant.schemaName,
      roleCode,
      user.roles,
    );
  }

  @Patch('users/:userId/roles')
  updateUserRoles(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.settingsService.updateUserRoles(
      tenant.tenantId,
      tenant.schemaName,
      userId,
      user.id,
      user.roles,
      dto,
    );
  }

  @Patch('roles/:roleCode/permissions')
  @UseGuards(FeatureGuard)
  @RequireFeature('STAFF_MANAGEMENT')
  updateRolePermissions(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleCode') roleCode: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.settingsService.updateRolePermissions(
      tenant.tenantId,
      tenant.schemaName,
      roleCode,
      user.roles,
      dto,
    );
  }

  @Patch('users/:userId/access')
  updateUserAccess(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserAccessDto,
  ) {
    return this.settingsService.updateUserAccess(
      tenant.tenantId,
      tenant.schemaName,
      userId,
      user.id,
      user.roles,
      dto,
    );
  }

  @Patch('subscription/plan')
  changeSubscriptionPlan(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangeSubscriptionPlanDto,
  ) {
    return this.settingsService.changeSubscriptionPlan(tenant.tenantId, user.roles, dto);
  }

  @Patch('account')
  updateAccount(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAccountSettingsDto,
  ) {
    return this.settingsService.updateAccount(tenant.schemaName, user.id, dto);
  }

  @Patch('password')
  changePassword(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.settingsService.changePassword(tenant.schemaName, user.id, dto);
  }
}
