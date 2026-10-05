import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SubscriptionFeatureService } from '../../subscriptions/subscription-feature.service';
import { TenantContext } from '../interfaces/tenant-context.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

@Injectable()
export class SubscriptionWriteGuard implements CanActivate {
  private resolvedFeatureService?: SubscriptionFeatureService;

  constructor(
    @Optional()
    private readonly moduleRef?: ModuleRef | SubscriptionFeatureService,
    @Optional()
    subscriptionFeatureService?: SubscriptionFeatureService,
  ) {
    if (subscriptionFeatureService) {
      this.resolvedFeatureService = subscriptionFeatureService;
    } else if (moduleRef && 'canTenantWrite' in moduleRef) {
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
