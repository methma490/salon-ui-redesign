import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import { ProfitLossQueryDto, ProfitLossReportResponse } from './dto/profit-loss.dto';
import { ProfitLossService } from './profit-loss.service';

@Controller(['reports', 'tenant/reports'])
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class ProfitLossController {
  constructor(private readonly profitLossService: ProfitLossService) {}

  @Get('profit-loss')
  async getProfitLoss(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProfitLossQueryDto,
  ): Promise<ProfitLossReportResponse> {
    return this.profitLossService.getProfitLoss(tenant.schemaName, query, user);
  }
}
