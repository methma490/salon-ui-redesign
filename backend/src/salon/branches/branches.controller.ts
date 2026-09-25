import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto, UpdateBranchStatusDto } from './dto/branch.dto';

@Controller('tenant/branches')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get('suggest-code')
  @UseGuards(PermissionGuard)
  @RequirePermission('BRANCH_VIEW')
  suggestCode(
    @CurrentTenant() tenant: TenantContext,
    @Param('name') name?: string,
  ) {
    return this.branchesService.suggestCode(tenant.schemaName, name);
  }

  @Get()
  list(@CurrentTenant() tenant: TenantContext) {
    return this.branchesService.list(tenant.schemaName);
  }

  @Post()
  @UseGuards(FeatureGuard, PermissionGuard)
  @RequireFeature('MULTI_BRANCH')
  @RequirePermission('BRANCH_CREATE')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchesService.create(tenant.schemaName, dto, user.id);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('BRANCH_UPDATE')
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(tenant.schemaName, id, dto, user.id);
  }

  @Patch(':id/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('BRANCH_UPDATE')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBranchStatusDto,
  ) {
    return this.branchesService.updateStatus(tenant.schemaName, id, dto, user.id);
  }
}
