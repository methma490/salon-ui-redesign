import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';

@Injectable()
export class DashboardCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<{
      tenantContext?: TenantContext;
      query?: { branchId?: string; period?: string };
    }>();

    const tenantContext = request.tenantContext;
    if (!tenantContext) {
      return undefined;
    }

    const branchId = request.query?.branchId ?? 'all';
    const period = request.query?.period ?? 'today';
    return `dashboard:${tenantContext.tenantId}:${branchId}:${period}`;
  }
}
