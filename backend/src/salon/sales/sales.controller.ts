import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { RequirePermission } from '../../tenant/decorators/require-permission.decorator';
import { PermissionGuard } from '../../tenant/guards/permission.guard';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import { ListSalesQueryDto } from '../pos/dto/pos.dto';
import { SalesService } from './sales.service';

@Controller('tenant/sales')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermission('SALE_VIEW')
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListSalesQueryDto) {
    return this.salesService.list(tenant.schemaName, query);
  }

  @Get(':id')
  @RequirePermission('SALE_VIEW')
  getById(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.salesService.findById(tenant.schemaName, id);
  }
}
