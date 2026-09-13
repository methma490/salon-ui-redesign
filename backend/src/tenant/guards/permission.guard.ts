import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
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

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      tenantContext?: TenantContext;
    }>();
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new ForbiddenException('Tenant context required');
    }

    const cachedPermissions = request.user?.permissions;

    for (const permissionCode of requiredPermissions) {
      if (cachedPermissions) {
        if (!cachedPermissions.includes(permissionCode)) {
          throw new ForbiddenException('Insufficient permissions');
        }
        continue;
      }

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
