import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { TenantContext } from '../interfaces/tenant-context.interface';
import { TenantContextService } from '../services/tenant-context.service';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly tenantContextService: TenantContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      tenantContext?: TenantContext;
    }>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    request.tenantContext = await this.tenantContextService.resolveFromUser(request.user);
    return true;
  }
}
