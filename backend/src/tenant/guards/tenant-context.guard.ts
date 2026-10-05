import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { TenantContext } from '../interfaces/tenant-context.interface';
import { TenantContextService } from '../services/tenant-context.service';
import { SubscriptionFeatureService } from '../../subscriptions/subscription-feature.service';

@Injectable()
export class TenantContextGuard implements CanActivate {
  private resolvedFeatureService?: SubscriptionFeatureService;

  constructor(
    private readonly tenantContextService: TenantContextService,
    @Optional()
    private readonly moduleRef?: ModuleRef | SubscriptionFeatureService,
    @Optional()
    subscriptionFeatureService?: SubscriptionFeatureService,
  ) {
    if (subscriptionFeatureService) {
      this.resolvedFeatureService = subscriptionFeatureService;
    } else if (moduleRef && 'canTenantWrite' in moduleRef) {
      // Support direct injection in unit tests: new TenantContextGuard(tenantCtxService, featureService)
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
    const request = context.switchToHttp().getRequest<{
      method: string;
      path?: string;
      url?: string;
      user?: AuthenticatedUser;
      tenantContext?: TenantContext;
    }>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    request.tenantContext = await this.tenantContextService.resolveFromUser(request.user);

    const method = (request.method || '').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const routePath = request.path || request.url || '';
      const isTenantBusinessRoute =
        routePath.includes('/tenant/') || routePath.startsWith('/tenant');

      if (isTenantBusinessRoute) {
        const canWrite = await this.getFeatureService().canTenantWrite(
          request.tenantContext.tenantId,
        );

        if (!canWrite) {
          throw new ForbiddenException({
            statusCode: 403,
            code: 'SUBSCRIPTION_SUSPENDED',
            error: 'Subscription Suspended',
            message:
              'Your subscription is suspended. Your salon data is currently in read-only mode. Please renew your subscription to perform write actions.',
          });
        }
      }
    }

    return true;
  }
}

