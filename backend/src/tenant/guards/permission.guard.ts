import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../constants/tenant.constants';
import { TenantContext } from '../interfaces/tenant-context.interface';
import { TenantPermissionService } from '../services/tenant-permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantPermissionService: TenantPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ tenantContext?: TenantContext }>();
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new ForbiddenException('Tenant context required');
    }

    for (const permissionCode of requiredPermissions) {
      const allowed = await this.tenantPermissionService.userHasPermission(
        tenantContext.schemaName,
        tenantContext.userId,
        permissionCode,
      );

      if (!allowed) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
