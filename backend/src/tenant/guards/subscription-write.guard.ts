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
import { TenantContext } from '../interfaces/tenant-context.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { ALLOW_READ_ONLY_KEY } from '../decorators/allow-read-only.decorator';

@Injectable()
export class SubscriptionWriteGuard implements CanActivate {
  private resolvedFeatureService?: SubscriptionFeatureService;

  constructor(
    @Inject(forwardRef(() => SubscriptionFeatureService))
    @Optional()
    subscriptionFeatureService?: SubscriptionFeatureService,
    @Optional()
    private readonly moduleRef?: ModuleRef,
    @Optional()
    private readonly reflector?: Reflector,
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
      originalUrl?: string;
      tenantContext?: TenantContext;
      user?: AuthenticatedUser;
    }>();

    const method = (request.method || '').toUpperCase();

    // 1. Read-only HTTP operations are always permitted
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // 2. Platform Super Admin operations are always permitted
    if (request.user?.userType === 'SUPER_ADMIN') {
      return true;
    }

    // 3. Explicit @AllowReadOnly decorator check on handler or class
    if (this.reflector && typeof context.getHandler === 'function') {
      const isExplicitlyAllowed = this.reflector.getAllAndOverride<boolean>(ALLOW_READ_ONLY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isExplicitlyAllowed) {
        return true;
      }
    }

    const tenantId = request.tenantContext?.tenantId ?? request.user?.tenantId;
    if (!tenantId) {
      return true;
    }

    const rawPath = request.path || request.originalUrl || request.url || '';
    const normalizedPath = rawPath.split('?')[0].toLowerCase().replace(/\/+/g, '/');

    // 4. SaaS billing, renewal, checkout, and auth endpoints remain writable so suspended tenants can renew
    const isExemptBillingOrAuth =
      /(^|\/)(subscriptions|payments|auth|public)(\/|$)/i.test(normalizedPath) ||
      normalizedPath.includes('/renew') ||
      normalizedPath.includes('/checkout') ||
      normalizedPath.includes('/webhook');

    if (isExemptBillingOrAuth) {
      return true;
    }

    // 5. Any tenant mutation (whether in tenant context, via tenant user, or targeting tenant endpoints)
    const isTenantMutation =
      Boolean(request.tenantContext) ||
      request.user?.userType === 'TENANT_USER' ||
      /(^|\/)tenant(\/|$)/i.test(normalizedPath);

    if (!isTenantMutation) {
      return true;
    }

    // 6. Check subscription write capability
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
