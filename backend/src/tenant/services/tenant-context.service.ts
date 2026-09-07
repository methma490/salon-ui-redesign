import { ForbiddenException, Injectable } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { PrismaService } from '../../database/prisma.service';
import { TenantContext } from '../interfaces/tenant-context.interface';
import { assertTrustedTenantSchemaName } from '../utils/schema-name.util';

@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFromUser(user: AuthenticatedUser): Promise<TenantContext> {
    if (user.userType !== 'TENANT_USER') {
      throw new ForbiddenException('Tenant access required');
    }

    if (!user.tenantId || !user.schemaName) {
      throw new ForbiddenException('Invalid tenant context');
    }

    assertTrustedTenantSchemaName(user.schemaName);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        schemaName: true,
        status: true,
      },
    });

    if (!tenant || tenant.schemaName !== user.schemaName) {
      throw new ForbiddenException('Invalid tenant context');
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException('Tenant access is not available');
    }

    return {
      tenantId: tenant.id,
      schemaName: tenant.schemaName,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      status: tenant.status,
      userId: user.id,
      userEmail: user.email,
      userRoles: user.roles,
    };
  }
}
