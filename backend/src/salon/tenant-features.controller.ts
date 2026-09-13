import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { TenantContext } from '../tenant/interfaces/tenant-context.interface';
import { SubscriptionFeatureService } from '../subscriptions/subscription-feature.service';

@Controller('tenant/features')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class TenantFeaturesController {
  constructor(private readonly subscriptionFeatureService: SubscriptionFeatureService) {}

  @Get()
  async listEnabled(@CurrentTenant() tenant: TenantContext) {
    return this.subscriptionFeatureService.getTenantFeatureCodes(tenant.tenantId);
  }
}
