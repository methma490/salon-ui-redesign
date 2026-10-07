import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SuperAdminStatus, TenantStatus } from '@prisma/client';
import type { StringValue } from 'ms';
import { PrismaService } from '../database/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TenantPermissionService } from '../tenant/services/tenant-permission.service';
import { TenantSchemaService } from '../tenant/services/tenant-schema.service';
import { tenantTable } from '../tenant/utils/schema-name.util';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, AuthUserResponse, JwtPayload } from './interfaces/auth.interface';
import { LoginSecurityService } from './login-security.service';

import { SuperAdminAuditLogsService } from '../super-admin/audit-logs/super-admin-audit-logs.service';
import { generateRefreshToken, hashToken } from './utils/token.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly tenantPermissionService: TenantPermissionService,
    private readonly loginSecurityService: LoginSecurityService,
    private readonly auditLogsService: SuperAdminAuditLogsService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Universal login for Super Admin and tenant users
   */
  async login(dto: LoginDto, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();
    const authDebug = this.configService.get<string>('AUTH_DEBUG') === 'true';

    // Account & IP brute force lockout assertion
    this.loginSecurityService.assertNotLocked(email, ipAddress);

    if (authDebug) {
      this.logger.debug(`Login attempt for email: ${email}`);
    }

    // 1. Try Super Admin first
    const superAdmin = await this.prisma.superAdminUser.findUnique({
      where: { email },
    });

    if (superAdmin) {
      if (authDebug) {
        this.logger.debug(`Super admin record found for ${email}, status=${superAdmin.status}`);
        this.logger.debug(`Super admin password hash present: ${!!superAdmin.passwordHash}`);
      }

      if (superAdmin.status !== SuperAdminStatus.ACTIVE) {
        this.loginSecurityService.recordFailedAttempt(email, ipAddress, 'super-admin-inactive');
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, superAdmin.passwordHash);

      if (authDebug) {
        this.logger.debug(`Super admin password comparison result: ${isPasswordValid}`);
      }

      if (!isPasswordValid) {
        this.loginSecurityService.recordFailedAttempt(email, ipAddress, 'super-admin-wrong-password');
        throw new UnauthorizedException('Invalid email or password');
      }

      // MFA not enabled — issue tokens directly
      this.loginSecurityService.recordSuccessfulLogin(email, ipAddress);
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
        user: {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name,
          tenantId: null,
          roles: ['SUPER_ADMIN'],
        },
      };
    }

    // 2. Try tenant users - find tenant by searching all schemas
    const tenantUser = await this.findTenantUser(email, dto.password, authDebug);

    if (tenantUser) {
      this.loginSecurityService.recordSuccessfulLogin(email, ipAddress);
      const tokens = await this.issueTokens(tenantUser, 'TENANT_USER');

      return {

        ...tokens,
        user: this.serializeUser(tenantUser),
      };
    }

    this.loginSecurityService.recordFailedAttempt(email, ipAddress, 'unknown-credentials');
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

    const tenantRefresh = await this.findTenantRefreshToken(tokenHash);
    if (!tenantRefresh) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.revokeTenantRefreshToken(tenantRefresh.schemaName, tenantRefresh.tokenId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantRefresh.tenantId },
      select: { name: true, status: true, code: true },
    });

    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException(
        tenant?.status === TenantStatus.SUSPENDED
          ? 'Your salon has been suspended. Please contact support.'
          : 'Your salon account is not active.',
      );
    }

    const permissions = await this.tenantPermissionService.getUserPermissionCodes(
      tenantRefresh.schemaName,
      tenantRefresh.user.id,
    );

    const authUser: AuthenticatedUser = {
      id: tenantRefresh.user.id,
      email: tenantRefresh.user.email,
      name: tenantRefresh.user.name,
      tenantId: tenantRefresh.tenantId,
      schemaName: tenantRefresh.schemaName,
      roles: tenantRefresh.roles,
      userType: 'TENANT_USER',
      permissions,
      tenantName: tenant?.name ?? null,
      tenantStatus: tenant?.status ?? null,
      tenantCode: tenant?.code ?? null,
    };

    return this.issueTokens(authUser, 'TENANT_USER');
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

    const tenantRefresh = await this.findTenantRefreshToken(tokenHash);
    if (tenantRefresh) {
      await this.revokeTenantRefreshToken(tenantRefresh.schemaName, tenantRefresh.tokenId);
    }

    return { message: 'Logged out successfully' };
  }

  async revokeAllTenantSessions(schemaName: string): Promise<void> {
    const refreshTable = tenantTable(schemaName, 'refresh_tokens');
    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${refreshTable} SET revoked_at = NOW() WHERE revoked_at IS NULL`,
      );
    });
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
        select: { id: true, status: true },
      });

      return {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        tenantId: tenant?.id ?? null,
        tenantStatus: tenant?.status ?? null,
        roles: roles.map((r) => r.code),
      };
    });

    if (!profile) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (profile.tenantStatus && profile.tenantStatus !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException(
        profile.tenantStatus === TenantStatus.SUSPENDED
          ? 'Your salon has been suspended. Please contact support.'
          : 'Your salon account is not active.',
      );
    }

    if (!profile.tenantId) {
      return profile;
    }

    const permissions = await this.tenantPermissionService.getUserPermissionCodes(
      schemaName,
      userId,
    );

    const subscriptionContext = await this.subscriptionsService.getTenantSubscriptionContext(
      profile.tenantId,
    );

    return {
      ...profile,
      permissions,
      tenant: subscriptionContext.tenant,
      subscription: subscriptionContext.subscription
        ? {
            plan: subscriptionContext.subscription.plan,
            planCode: subscriptionContext.subscription.planCode,
            status: subscriptionContext.subscription.status,
            startDate: subscriptionContext.subscription.startDate,
            endDate: subscriptionContext.subscription.endDate,
          }
        : null,
      features: subscriptionContext.features,
    };
  }

  /**
   * Find tenant user across all tenant schemas.
   * Scans every tenant (including SUSPENDED) so we can return a clear activation message
   * instead of a misleading "Invalid email or password" after signup/payment.
   */
  private async findTenantUser(
    email: string,
    password: string,
    authDebug = false,
  ): Promise<AuthenticatedUser | null> {
    const tenants = await this.prisma.tenant.findMany({
      select: {
        id: true,
        schemaName: true,
        status: true,
        code: true,
        name: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let pendingActivation = false;

    for (const tenant of tenants) {
      try {
        const matchedUser = await this.lookupTenantUserCredentials(
          tenant.schemaName,
          email,
          password,
          authDebug,
        );

        if (!matchedUser) {
          continue;
        }

        if ('invalidPassword' in matchedUser) {
          if (authDebug) {
            this.logger.debug(
              `Tenant ${tenant.code}: user found but password mismatch for ${email}`,
            );
          }
          return null;
        }

        if (tenant.status !== TenantStatus.ACTIVE) {
          if (authDebug) {
            this.logger.debug(
              `Tenant ${tenant.code}: valid credentials but tenant status=${tenant.status}`,
            );
          }
          pendingActivation = true;
          continue;
        }

        const permissions = await this.tenantPermissionService.getUserPermissionCodes(
          tenant.schemaName,
          matchedUser.user.id,
        );

        return {
          id: matchedUser.user.id,
          email: matchedUser.user.email,
          name: matchedUser.user.name,
          tenantId: tenant.id,
          schemaName: tenant.schemaName,
          roles: matchedUser.roles,
          userType: 'TENANT_USER' as const,
          permissions,
          tenantName: tenant.name,
          tenantStatus: tenant.status,
          tenantCode: tenant.code,
        };
      } catch (error) {
        if (authDebug) {
          this.logger.warn(
            `Tenant login scan failed for ${tenant.code} (${tenant.schemaName})`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    if (pendingActivation) {
      throw new ForbiddenException(
        'Your salon account is pending activation. Please wait for platform administrator approval.',
      );
    }

    if (authDebug) {
      this.logger.debug(`No matching tenant user found for ${email}`);
    }

    return null;
  }

  private async lookupTenantUserCredentials(
    schemaName: string,
    email: string,
    password: string,
    authDebug = false,
  ): Promise<
    | { user: { id: string; name: string; email: string }; roles: string[] }
    | { invalidPassword: true }
    | null
  > {
    const usersTable = tenantTable(schemaName, 'users');
    const userRolesTable = tenantTable(schemaName, 'user_roles');
    const rolesTable = tenantTable(schemaName, 'roles');

    return this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
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
        `SELECT id, name, email, phone, password_hash, status::text AS status
         FROM ${usersTable}
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
         LIMIT 1`,
        email,
      );

      if (authDebug) {
        this.logger.debug(
          `Schema ${schemaName}: user record found=${users.length > 0}, status=${users[0]?.status ?? 'n/a'}`,
        );
        this.logger.debug(
          `Schema ${schemaName}: password hash present=${!!users[0]?.password_hash}`,
        );
      }

      if (users.length === 0 || users[0].status !== 'ACTIVE') {
        return null;
      }

      const user = users[0];

      if (!user.password_hash) {
        if (authDebug) {
          this.logger.debug(`Schema ${schemaName}: user has no password_hash`);
        }
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (authDebug) {
        this.logger.debug(`Schema ${schemaName}: bcrypt.compare result=${isPasswordValid}`);
      }

      if (!isPasswordValid) {
        return { invalidPassword: true };
      }

      const roles = await tx.$queryRawUnsafe<Array<{ code: string }>>(
        `SELECT r.code
         FROM ${userRolesTable} ur
         INNER JOIN ${rolesTable} r ON ur.role_id = r.id
         WHERE ur.user_id = $1::uuid`,
        user.id,
      );

      return {
        user,
        roles: roles.map((role) => role.code),
      };
    });
  }

  private async issueTokens(user: AuthenticatedUser, userType: 'SUPER_ADMIN' | 'TENANT_USER') {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      tenantId: user.tenantId,
      schemaName: user.schemaName,
      userType,
      permissions: user.permissions,
      tenantName: user.tenantName,
      tenantStatus: user.tenantStatus,
      tenantCode: user.tenantCode,
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
    } else if (user.schemaName) {
      await this.storeTenantRefreshToken(
        user.schemaName,
        user.id,
        hashToken(refreshToken),
        refreshTokenExpiresAt,
      );
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  private async storeTenantRefreshToken(
    schemaName: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const refreshTable = tenantTable(schemaName, 'refresh_tokens');
    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `INSERT INTO ${refreshTable} (user_id, token_hash, expires_at)
         VALUES ($1::uuid, $2, $3)`,
        userId,
        tokenHash,
        expiresAt,
      );
    });
  }

  private async revokeTenantRefreshToken(schemaName: string, tokenId: string): Promise<void> {
    const refreshTable = tenantTable(schemaName, 'refresh_tokens');
    await this.tenantSchemaService.withTenantSchema(schemaName, async ({ tx }) => {
      await tx.$queryRawUnsafe(
        `UPDATE ${refreshTable} SET revoked_at = NOW() WHERE id = $1::uuid`,
        tokenId,
      );
    });
  }

  private async findTenantRefreshToken(tokenHash: string): Promise<{
    tokenId: string;
    tenantId: string;
    schemaName: string;
    user: { id: string; name: string; email: string };
    roles: string[];
  } | null> {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, schemaName: true },
    });

    for (const tenant of tenants) {
      try {
        const refreshTable = tenantTable(tenant.schemaName, 'refresh_tokens');
        const usersTable = tenantTable(tenant.schemaName, 'users');
        const userRolesTable = tenantTable(tenant.schemaName, 'user_roles');
        const rolesTable = tenantTable(tenant.schemaName, 'roles');

        const matched = await this.tenantSchemaService.withTenantSchema(
          tenant.schemaName,
          async ({ tx }) => {
            const tokens = await tx.$queryRawUnsafe<
              Array<{ id: string; user_id: string; expires_at: Date; revoked_at: Date | null }>
            >(
              `SELECT id, user_id, expires_at, revoked_at
               FROM ${refreshTable}
               WHERE token_hash = $1
               LIMIT 1`,
              tokenHash,
            );

            if (tokens.length === 0) {
              return null;
            }

            const token = tokens[0];
            if (token.revoked_at || token.expires_at <= new Date()) {
              return null;
            }

            const users = await tx.$queryRawUnsafe<
              Array<{ id: string; name: string; email: string; status: string }>
            >(
              `SELECT id, name, email, status::text AS status
               FROM ${usersTable}
               WHERE id = $1::uuid AND status = 'ACTIVE'
               LIMIT 1`,
              token.user_id,
            );

            if (users.length === 0) {
              return null;
            }

            const roles = await tx.$queryRawUnsafe<Array<{ code: string }>>(
              `SELECT r.code
               FROM ${userRolesTable} ur
               INNER JOIN ${rolesTable} r ON ur.role_id = r.id
               WHERE ur.user_id = $1::uuid`,
              token.user_id,
            );

            return {
              tokenId: token.id,
              user: users[0],
              roles: roles.map((role) => role.code),
            };
          },
        );

        if (matched) {
          return {
            tokenId: matched.tokenId,
            tenantId: tenant.id,
            schemaName: tenant.schemaName,
            user: matched.user,
            roles: matched.roles,
          };
        }
      } catch {
        // Continue to next tenant
      }
    }

    return null;
  }

  private serializeUser(user: AuthenticatedUser): AuthUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions ?? [],
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
