import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
import { CreateSaleDto } from './dto/pos.dto';
import { PosService } from './pos.service';

@Controller('tenant/pos')
@UseGuards(JwtAuthGuard, TenantContextGuard, FeatureGuard, PermissionGuard)
@RequireFeature('POS')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('performers')
  @RequirePermission('SALE_CREATE')
  getPerformers(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query('branchId') branchId?: string,
  ) {
    return this.posService.getPerformers(tenant.schemaName, user, branchId);
  }

  @Post('sales')
  @RequirePermission('SALE_CREATE')
  createSale(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSaleDto,
  ) {
    return this.posService.createSale(tenant.schemaName, dto, user);
  }
}
