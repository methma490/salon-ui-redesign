import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { SuperAdminStatus, TenantStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';
import { TenantPermissionService } from '../../tenant/services/tenant-permission.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { assertTrustedTenantSchemaName, tenantTable } from '../../tenant/utils/schema-name.util';
import { isReservedPlatformRole } from '../../salon/utils/permission-feature.util';
import { AuthenticatedUser, JwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly tenantPermissionService: TenantPermissionService,
  ) {
    const secret = configService.get<string>('jwt.accessSecret');

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.userType === 'SUPER_ADMIN') {
      const user = await this.prisma.superAdminUser.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== SuperAdminStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const currentVersion = (user as any).tokenVersion ?? 1;
      if (payload.tokenVersion !== undefined && payload.tokenVersion !== currentVersion) {
        throw new UnauthorizedException('Session has been revoked or expired. Please log in again.');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: null,
        schemaName: null,
        roles: ['SUPER_ADMIN'],
        userType: 'SUPER_ADMIN',
        tokenVersion: currentVersion,
      };
    }

    if (payload.userType === 'TENANT_USER') {
      if (!payload.schemaName || !payload.tenantId) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      assertTrustedTenantSchemaName(payload.schemaName);

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: {
          status: true,
          name: true,
          code: true,
          schemaName: true,
        },
      });

      if (!tenant || tenant.schemaName !== payload.schemaName) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      if (tenant.status !== TenantStatus.ACTIVE) {
        throw new UnauthorizedException(
          tenant.status === TenantStatus.SUSPENDED
            ? 'Your salon has been suspended. Please contact support.'
            : 'Your salon account is not active.',
        );
      }

      const usersTable = tenantTable(payload.schemaName, 'users');
      const employeesTable = tenantTable(payload.schemaName, 'employees');
      const userRolesTable = tenantTable(payload.schemaName, 'user_roles');
      const rolesTable = tenantTable(payload.schemaName, 'roles');

      const userRecord = await this.tenantSchemaService.withTenantSchema(
        payload.schemaName,
        async ({ tx }) => {
          const users = await tx.$queryRawUnsafe<
            Array<{
              id: string;
              name: string;
              email: string;
              status: string;
              token_version: number;
              employee_status: string | null;
            }>
          >(
            `
            SELECT u.id, u.name, u.email, u.status::text AS status,
                   COALESCE(u.token_version, 1) AS token_version,
                   e.status::text AS employee_status
            FROM ${usersTable} u
            LEFT JOIN ${employeesTable} e ON e.user_id = u.id
            WHERE u.id = $1::uuid
            LIMIT 1
          `,
            payload.sub,
          );

          const user = users[0];
          if (!user) {
            return null;
          }

          if (
            user.status !== 'ACTIVE' ||
            (user.employee_status && user.employee_status !== 'ACTIVE')
          ) {
            return null;
          }

          if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.token_version) {
            return null;
          }

          const roleRows = await tx.$queryRawUnsafe<Array<{ code: string }>>(
            `
            SELECT r.code
            FROM ${userRolesTable} ur
            INNER JOIN ${rolesTable} r ON ur.role_id = r.id
            WHERE ur.user_id = $1::uuid
          `,
            user.id,
          );

          return {
            user,
            roles: roleRows.map((r) => r.code).filter((c) => !isReservedPlatformRole(c)),
          };
        },
      );

      if (!userRecord) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const permissions = await this.tenantPermissionService.getUserPermissionCodes(
        payload.schemaName,
        userRecord.user.id,
      );

      return {
        id: userRecord.user.id,
        email: userRecord.user.email,
        name: userRecord.user.name,
        tenantId: payload.tenantId,
        schemaName: payload.schemaName,
        roles: userRecord.roles,
        userType: 'TENANT_USER',
        permissions,
        tenantName: tenant.name,
        tenantStatus: tenant.status,
        tenantCode: tenant.code,
        tokenVersion: userRecord.user.token_version,
      };
    }

    throw new UnauthorizedException('Invalid or expired token');
  }
}
