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
    const userPermissions = tenantTable(schemaName, 'user_permissions');
    const rolePermissions = tenantTable(schemaName, 'role_permissions');
    const permissions = tenantTable(schemaName, 'permissions');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const customCount = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${userPermissions} WHERE user_id = $1::uuid`,
        userId,
      );

      const hasCustomPermissions = Number(customCount[0]?.count ?? 0) > 0;

      if (hasCustomPermissions) {
        const result = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `
          SELECT COUNT(*)::bigint AS count
          FROM ${userPermissions} up
          INNER JOIN ${permissions} p ON up.permission_id = p.id
          WHERE up.user_id = $1::uuid AND p.code = $2
        `,
          userId,
          permissionCode,
        );

        return Number(result[0]?.count ?? 0) > 0;
      }

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

  async getUserPermissionCodes(schemaName: string, userId: string): Promise<string[]> {
    const userRoles = tenantTable(schemaName, 'user_roles');
    const userPermissions = tenantTable(schemaName, 'user_permissions');
    const rolePermissions = tenantTable(schemaName, 'role_permissions');
    const permissions = tenantTable(schemaName, 'permissions');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const customCount = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM ${userPermissions} WHERE user_id = $1::uuid`,
        userId,
      );

      const hasCustomPermissions = Number(customCount[0]?.count ?? 0) > 0;

      if (hasCustomPermissions) {
        const rows = await tx.$queryRawUnsafe<Array<{ code: string }>>(
          `
          SELECT p.code
          FROM ${userPermissions} up
          INNER JOIN ${permissions} p ON up.permission_id = p.id
          WHERE up.user_id = $1::uuid
          ORDER BY p.code ASC
        `,
          userId,
        );
        return rows.map((row) => row.code);
      }

      const rows = await tx.$queryRawUnsafe<Array<{ code: string }>>(
        `
        SELECT DISTINCT p.code
        FROM ${userRoles} ur
        INNER JOIN ${rolePermissions} rp ON ur.role_id = rp.role_id
        INNER JOIN ${permissions} p ON rp.permission_id = p.id
        WHERE ur.user_id = $1::uuid
        ORDER BY p.code ASC
      `,
        userId,
      );
      return rows.map((row) => row.code);
    });
  }
}
