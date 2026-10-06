import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  forwardRef,
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
    @Inject(forwardRef(() => SubscriptionFeatureService))
    @Optional()
    subscriptionFeatureService?: SubscriptionFeatureService,
    @Optional()
    private readonly moduleRef?: ModuleRef,
  ) {
    if (subscriptionFeatureService) {
      this.resolvedFeatureService = subscriptionFeatureService;
    }
  }

  private getFeatureService(): SubscriptionFeatureService {
    if (this.resolvedFeatureService) {
      return this.resolvedFeatureService;
    }
    if (this.moduleRef && typeof this.moduleRef.get === 'function') {
      try {
        const resolved = this.moduleRef.get(SubscriptionFeatureService, { strict: false });
        if (resolved) {
          this.resolvedFeatureService = resolved;
          return this.resolvedFeatureService;
        }
      } catch {
        // Ignore fallback error
      }
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
