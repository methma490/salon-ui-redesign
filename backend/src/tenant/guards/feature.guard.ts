import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { SubscriptionFeatureService } from '../../subscriptions/subscription-feature.service';
import { REQUIRE_FEATURE_KEY } from '../constants/tenant.constants';
import { TenantContext } from '../interfaces/tenant-context.interface';

@Injectable()
export class FeatureGuard implements CanActivate {
  private resolvedFeatureService?: SubscriptionFeatureService;

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    private readonly moduleRef?: ModuleRef | SubscriptionFeatureService,
    @Optional()
    subscriptionFeatureService?: SubscriptionFeatureService,
  ) {
    if (subscriptionFeatureService) {
      this.resolvedFeatureService = subscriptionFeatureService;
    } else if (moduleRef && 'hasFeature' in moduleRef) {
      this.resolvedFeatureService = moduleRef as SubscriptionFeatureService;
    }
  }

  private getFeatureService(): SubscriptionFeatureService {
    if (this.resolvedFeatureService) {
      return this.resolvedFeatureService;
    }
    if (this.moduleRef && 'get' in this.moduleRef && typeof this.moduleRef.get === 'function') {
      this.resolvedFeatureService = this.moduleRef.get(SubscriptionFeatureService, {
        strict: false,
      });
      return this.resolvedFeatureService;
    }
    throw new Error('SubscriptionFeatureService is not available');
  }

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
      const enabled = await this.getFeatureService().hasFeature(
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
