import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionFeatureService } from '../../subscriptions/subscription-feature.service';
import { REQUIRE_FEATURE_KEY } from '../constants/tenant.constants';
import { TenantContext } from '../interfaces/tenant-context.interface';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionFeatureService: SubscriptionFeatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeatures?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ tenantContext?: TenantContext }>();
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new ForbiddenException('Tenant context required');
    }

    for (const featureCode of requiredFeatures) {
      const enabled = await this.subscriptionFeatureService.hasFeature(
        tenantContext.tenantId,
        featureCode,
      );

      if (!enabled) {
        throw new ForbiddenException('This feature is not included in your current subscription.');
      }
    }

    return true;
  }
}
