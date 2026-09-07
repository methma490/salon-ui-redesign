import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SuperAdminStatus } from '@prisma/client';
import type { StringValue } from 'ms';
import { PrismaService } from '../database/prisma.service';
import { TenantSchemaService } from '../tenant/services/tenant-schema.service';
import { tenantTable } from '../tenant/utils/schema-name.util';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, AuthUserResponse, JwtPayload } from './interfaces/auth.interface';
import { generateRefreshToken, hashToken } from './utils/token.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantSchemaService: TenantSchemaService,
  ) {}

  /**
   * Universal login - supports both Super Admin and tenant users
   */
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    // 1. Try Super Admin first
    const superAdmin = await this.prisma.superAdminUser.findUnique({
      where: { email },
    });

    if (superAdmin) {
      if (superAdmin.status !== SuperAdminStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, superAdmin.passwordHash);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const authUser: AuthenticatedUser = {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        tenantId: null,
        schemaName: null,
        roles: ['SUPER_ADMIN'],
        userType: 'SUPER_ADMIN',
      };

      const tokens = await this.issueTokens(authUser, 'SUPER_ADMIN');

      return {
        ...tokens,
        user: this.serializeUser(authUser),
      };
    }

    // 2. Try tenant users - find tenant by searching all schemas
    const tenantUser = await this.findTenantUser(email, dto.password);

    if (tenantUser) {
      const tokens = await this.issueTokens(tenantUser, 'TENANT_USER');

      return {
        ...tokens,
        user: this.serializeUser(tenantUser),
      };
    }

    throw new UnauthorizedException('Invalid email or password');
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    // Try super admin refresh token first
    const superAdminToken = await this.prisma.superAdminRefreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (superAdminToken) {
      if (
        superAdminToken.revokedAt ||
        superAdminToken.expiresAt <= new Date() ||
        superAdminToken.user.status !== SuperAdminStatus.ACTIVE
      ) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      await this.prisma.superAdminRefreshToken.update({
        where: { id: superAdminToken.id },
        data: { revokedAt: new Date() },
      });

      const authUser: AuthenticatedUser = {
        id: superAdminToken.user.id,
        email: superAdminToken.user.email,
        name: superAdminToken.user.name,
        tenantId: null,
        schemaName: null,
        roles: ['SUPER_ADMIN'],
        userType: 'SUPER_ADMIN',
      };

      return this.issueTokens(authUser, 'SUPER_ADMIN');
    }

    // TODO: Handle tenant user refresh tokens (stored in tenant schemas)
    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    // Try super admin
    await this.prisma.superAdminRefreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // TODO: Handle tenant user logout

    return { message: 'Logged out successfully' };
  }

  async getProfile(
    userId: string,
    userType: 'SUPER_ADMIN' | 'TENANT_USER',
    schemaName?: string,
  ): Promise<AuthUserResponse> {
    if (userType === 'SUPER_ADMIN') {
      const user = await this.prisma.superAdminUser.findUnique({
        where: { id: userId },
      });

      if (!user || user.status !== SuperAdminStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: null,
        roles: ['SUPER_ADMIN'],
      };
    }

    // Tenant user profile lookup
    if (!schemaName) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const usersTable = tenantTable(schemaName, 'users');
    const userRolesTable = tenantTable(schemaName, 'user_roles');
    const rolesTable = tenantTable(schemaName, 'roles');

    const profile = await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      const users = await tx.$queryRawUnsafe<
        Array<{ id: string; name: string; email: string; status: string }>
      >(
        `SELECT id, name, email, status::text AS status FROM ${usersTable} WHERE id = $1::uuid LIMIT 1`,
        userId,
      );

      if (users.length === 0 || users[0].status !== 'ACTIVE') {
        return null;
      }

      const roles = await tx.$queryRawUnsafe<Array<{ code: string }>>(
        `SELECT r.code FROM ${userRolesTable} ur
           INNER JOIN ${rolesTable} r ON ur.role_id = r.id
           WHERE ur.user_id = $1::uuid`,
        userId,
      );

      const tenant = await this.prisma.tenant.findFirst({
        where: { schemaName },
        select: { id: true },
      });

      return {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        tenantId: tenant?.id ?? null,
        roles: roles.map((r) => r.code),
      };
    });

    if (!profile) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return profile;
  }

  /**
   * Find tenant user across all tenant schemas
   */
  private async findTenantUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    // Get all active tenants
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        schemaName: true,
      },
    });

    for (const tenant of tenants) {
      try {
        const usersTable = tenantTable(tenant.schemaName, 'users');
        const userRolesTable = tenantTable(tenant.schemaName, 'user_roles');
        const rolesTable = tenantTable(tenant.schemaName, 'roles');

        const matchedUser = await this.tenantSchemaService.withTenantSchema(
          tenant.schemaName,
          async ({ tx }) => {
            const users = await tx.$queryRawUnsafe<
              Array<{
                id: string;
                name: string;
                email: string;
                phone: string | null;
                password_hash: string | null;
                status: string;
              }>
            >(
              `
              SELECT id, name, email, phone, password_hash, status
              FROM ${usersTable}
              WHERE LOWER(email) = LOWER($1) AND status = 'ACTIVE'
              LIMIT 1
            `,
              email,
            );

            if (users.length === 0) {
              return null;
            }

            const user = users[0];

            if (!user.password_hash) {
              return null;
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
              return { invalidPassword: true as const };
            }

            const roles = await tx.$queryRawUnsafe<Array<{ code: string }>>(
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
              roles: roles.map((role) => role.code),
            };
          },
        );

        if (matchedUser && 'invalidPassword' in matchedUser) {
          return null;
        }

        if (matchedUser) {
          return {
            id: matchedUser.user.id,
            email: matchedUser.user.email,
            name: matchedUser.user.name,
            tenantId: tenant.id,
            schemaName: tenant.schemaName,
            roles: matchedUser.roles,
            userType: 'TENANT_USER' as const,
          };
        }
      } catch {
        // Continue to next tenant
      }
    }

    return null;
  }

  private async issueTokens(user: AuthenticatedUser, userType: 'SUPER_ADMIN' | 'TENANT_USER') {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      tenantId: user.tenantId,
      schemaName: user.schemaName,
      userType,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '15m');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as StringValue,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = this.parseExpiry(refreshExpiresIn);

    if (userType === 'SUPER_ADMIN') {
      await this.prisma.superAdminRefreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt: refreshTokenExpiresAt,
        },
      });
    } else {
      // TODO: Store tenant user refresh tokens in tenant schema
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  private serializeUser(user: AuthenticatedUser): AuthUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    };
  }

  private parseExpiry(value: string): Date {
    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error(`Invalid JWT expiry format: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const now = Date.now();

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(now + amount * multipliers[unit]);
  }
}
