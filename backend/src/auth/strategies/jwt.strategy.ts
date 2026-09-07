import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { SuperAdminStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { assertTrustedTenantSchemaName, tenantTable } from '../../tenant/utils/schema-name.util';
import { AuthenticatedUser, JwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantSchemaService: TenantSchemaService,
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

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: null,
        schemaName: null,
        roles: ['SUPER_ADMIN'],
        userType: 'SUPER_ADMIN',
      };
    }

    if (payload.userType === 'TENANT_USER') {
      if (!payload.schemaName || !payload.tenantId) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      assertTrustedTenantSchemaName(payload.schemaName);

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: { schemaName: true },
      });

      if (!tenant || tenant.schemaName !== payload.schemaName) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const usersTable = tenantTable(payload.schemaName, 'users');

      const user = await this.tenantSchemaService.withTenantSchema(
        payload.schemaName,
        async ({ tx }) => {
          const users = await tx.$queryRawUnsafe<
            Array<{
              id: string;
              name: string;
              email: string;
              status: string;
            }>
          >(
            `
            SELECT id, name, email, status
            FROM ${usersTable}
            WHERE id = $1::uuid AND status = 'ACTIVE'
            LIMIT 1
          `,
            payload.sub,
          );

          return users[0] ?? null;
        },
      );

      if (!user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: payload.tenantId,
        schemaName: payload.schemaName,
        roles: payload.roles,
        userType: 'TENANT_USER',
      };
    }

    throw new UnauthorizedException('Invalid or expired token');
  }
}
