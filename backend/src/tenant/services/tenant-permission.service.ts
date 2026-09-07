import { Injectable } from '@nestjs/common';
import { TenantSchemaService } from './tenant-schema.service';
import { tenantTable } from '../utils/schema-name.util';

@Injectable()
export class TenantPermissionService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async userHasPermission(
    schemaName: string,
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const userRoles = tenantTable(schemaName, 'user_roles');
    const rolePermissions = tenantTable(schemaName, 'role_permissions');
    const permissions = tenantTable(schemaName, 'permissions');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const result = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `
        SELECT COUNT(*)::bigint AS count
        FROM ${userRoles} ur
        INNER JOIN ${rolePermissions} rp ON ur.role_id = rp.role_id
        INNER JOIN ${permissions} p ON rp.permission_id = p.id
        WHERE ur.user_id = $1::uuid AND p.code = $2
      `,
        userId,
        permissionCode,
      );

      return Number(result[0]?.count ?? 0) > 0;
    });
  }
}
