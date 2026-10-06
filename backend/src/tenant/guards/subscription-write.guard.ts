import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SubscriptionFeatureService } from '../../subscriptions/subscription-feature.service';
import { TenantContext } from '../interfaces/tenant-context.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

@Injectable()
export class SubscriptionWriteGuard implements CanActivate {
  private resolvedFeatureService?: SubscriptionFeatureService;

  constructor(
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
    const request = context.switchToHttp().getRequest<{
      method: string;
      path?: string;
      url?: string;
      tenantContext?: TenantContext;
      user?: AuthenticatedUser;
    }>();

    const method = (request.method || '').toUpperCase();

    // Read-only operations are always permitted
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const routePath = request.path || request.url || '';

    // Only guard tenant business routes (e.g. /api/tenant/* or /tenant/*)
    // Billing/subscription/payment routes live in public SaaS layer and remain writable
    const isTenantBusinessRoute = routePath.includes('/tenant/') || routePath.startsWith('/tenant');
    if (!isTenantBusinessRoute) {
      return true;
    }

    const tenantId = request.tenantContext?.tenantId ?? request.user?.tenantId;
    if (!tenantId) {
      return true;
    }

    const canWrite = await this.getFeatureService().canTenantWrite(tenantId);
    if (!canWrite) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'SUBSCRIPTION_SUSPENDED',
        error: 'Subscription Suspended',
        message:
          'Your subscription is suspended. Your salon data is currently in read-only mode. Please renew your subscription to perform write actions.',
      });
    }

    return true;
  }
}
