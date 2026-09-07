import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { TenantContext } from '../tenant/interfaces/tenant-context.interface';
import { TenantFeatureService } from '../tenant/services/tenant-feature.service';

@Controller('tenant/features')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class TenantFeaturesController {
  constructor(private readonly tenantFeatureService: TenantFeatureService) {}

  @Get()
  async listEnabled(@CurrentTenant() tenant: TenantContext) {
    const features = await this.tenantFeatureService.getTenantFeatures(tenant.tenantId);
    return features.filter((f) => f.enabled).map((f) => f.code);
  }
}
