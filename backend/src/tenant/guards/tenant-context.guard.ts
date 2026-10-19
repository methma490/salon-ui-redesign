import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
  forwardRef,
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
        // Ignore fallback resolution error and throw clean message below
      }
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
      if (request.user?.userType !== 'SUPER_ADMIN') {
        const rawPath = request.path || request.url || '';
        const normalizedPath = rawPath.split('?')[0].toLowerCase().replace(/\/+/g, '/');

        const EXEMPT_PUBLIC_ROUTES = [
          '/subscriptions/renew',
          '/subscriptions/checkout',
          '/subscriptions/upgrade',
          '/payments/orders',
          '/payments/checkout',
          '/payments/webhook',
          '/auth/logout',
          '/auth/refresh',
        ];

        const isExempt = EXEMPT_PUBLIC_ROUTES.some((exempt) => normalizedPath.includes(exempt));

        if (!isExempt) {
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
    }

    return true;
  }
}

