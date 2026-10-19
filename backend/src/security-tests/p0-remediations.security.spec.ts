import { ExecutionContext, ForbiddenException, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubscriptionWriteGuard } from '../tenant/guards/subscription-write.guard';
import { AuthService } from '../auth/auth.service';
import { PasswordResetService } from '../auth/password-reset.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { SettingsService } from '../salon/settings/settings.service';
import {
  PLATFORM_RESERVED_ROLE_CODES,
  isReservedPlatformRole,
  isReservedRoleCode,
  normalizeRoleCode,
} from '../salon/utils/permission-feature.util';
import { TenantStatus, SuperAdminStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { hashToken } from '../auth/utils/token.util';

describe('P0 Security Remediation Suite (Findings 01, 02, 05, 06, 11, 12, 13)', () => {
  const mockJwtSecret = 'p0-test-jwt-secret-with-at-least-32-chars-long';

  // =========================================================================
  // FINDING 01: Tenant Super Admin Privilege Escalation
  // =========================================================================
  describe('Finding 01: Tenant SUPER_ADMIN Privilege Escalation', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    it('identifies and reserves platform roles case-insensitively with formatting variants', () => {
      expect(PLATFORM_RESERVED_ROLE_CODES).toContain('SUPER_ADMIN');
      expect(isReservedPlatformRole('SUPER_ADMIN')).toBe(true);
      expect(isReservedPlatformRole('super_admin')).toBe(true);
      expect(isReservedPlatformRole('  Super_Admin  ')).toBe(true);
      expect(isReservedPlatformRole('super-admin')).toBe(true);
      expect(isReservedPlatformRole('SYSTEM_ADMIN')).toBe(true);
      expect(isReservedRoleCode('super_admin')).toBe(true);
      expect(normalizeRoleCode('super_admin')).toBe('SUPER_ADMIN');
      expect(normalizeRoleCode('Super-Admin')).toBe('SUPER_ADMIN');
      expect(isReservedPlatformRole('CASHIER')).toBe(false);
      expect(isReservedPlatformRole('HAIRSTYLIST')).toBe(false);
    });

    it('rejects tenant user with forged or assigned SUPER_ADMIN role on platform routes', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);

      const tenantUserWithSuperAdminRole = {
        id: 'user-malicious-1',
        email: 'tenant_attacker@salon.com',
        tenantId: 'tenant-123',
        schemaName: 'tenant_000001',
        roles: ['SUPER_ADMIN'],
        userType: 'TENANT_USER',
      };

      const ctx = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            user: tenantUserWithSuperAdminRole,
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows verified platform Super Admin with userType SUPER_ADMIN and no tenantId', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);

      const verifiedPlatformAdmin = {
        id: 'super-admin-root',
        email: 'superadmin@dartcodes.com',
        tenantId: null,
        schemaName: null,
        roles: ['SUPER_ADMIN'],
        userType: 'SUPER_ADMIN',
      };

      const ctx = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            user: verifiedPlatformAdmin,
          }),
        }),
      } as unknown as ExecutionContext;

      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('rejects custom role creation using reserved platform codes in SettingsService', async () => {
      const mockSubscriptionsService = {
        getTenantSubscriptionContext: jest.fn().mockResolvedValue({
          features: ['STAFF_MANAGEMENT', 'CUSTOM_ROLES'],
        }),
      };
      const settingsService = new SettingsService(
        {} as any,
        mockSubscriptionsService as any,
        {} as any,
        {} as any,
        {} as any,
      );

      await expect(
        settingsService.createRole('t1', 'tenant_000001', ['SALON_ADMIN'], {
          name: 'Super Admin',
          code: 'SUPER_ADMIN',
          description: 'Hacked role',
          moduleAccess: [{ moduleCode: 'customers', level: 'manage' }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        settingsService.createRole('t1', 'tenant_000001', ['SALON_ADMIN'], {
          name: 'super_admin',
          code: 'super_admin',
          description: 'Hacked role',
          moduleAccess: [{ moduleCode: 'customers', level: 'manage' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // FINDING 02: Cross-Tenant Email Shadowing During Login
  // =========================================================================
  describe('Finding 02: Cross-Tenant Email Shadowing During Login', () => {
    let authService: AuthService;
    let mockPrisma: any;
    let mockTenantSchemaService: any;
    let mockTenantPermissionService: any;

    beforeEach(async () => {
      const passwordA = await bcrypt.hash('TenantAPassword123!', 10);
      const passwordB = await bcrypt.hash('TenantBPassword456!', 10);

      mockPrisma = {
        tenant: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
        },
        superAdminUser: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      mockTenantSchemaService = {
        withTenantSchema: jest.fn(async (schemaName: string, callback: any) => {
          const tx = {
            $queryRawUnsafe: jest.fn(async (sql: string, ..._params: any[]) => {
              if (sql.includes('FROM') && sql.includes('users')) {
                if (schemaName === 'tenant_000001') {
                  return [
                    {
                      id: 'user-tenant-a',
                      name: 'Alice Salon A',
                      email: 'shared@example.com',
                      phone: '111',
                      password_hash: passwordA,
                      status: 'ACTIVE',
                      token_version: 1,
                      employee_status: 'ACTIVE',
                    },
                  ];
                }
                if (schemaName === 'tenant_000002') {
                  return [
                    {
                      id: 'user-tenant-b',
                      name: 'Alice Salon B',
                      email: 'shared@example.com',
                      phone: '222',
                      password_hash: passwordB,
                      status: 'ACTIVE',
                      token_version: 1,
                      employee_status: 'ACTIVE',
                    },
                  ];
                }
              }
              if (sql.includes('user_roles')) {
                return [{ code: 'SALON_ADMIN' }];
              }
              if (sql.includes('INSERT INTO')) {
                return [];
              }
              return [];
            }),
          };
          return callback({ tx });
        }),
      };

      mockTenantPermissionService = {
        getUserPermissionCodes: jest.fn().mockResolvedValue(['customers:read', 'customers:create']),
      };

      const mockConfigService = {
        get: jest.fn((key: string, def?: any) => {
          if (key === 'jwt.accessSecret') return mockJwtSecret;
          if (key === 'jwt.refreshSecret') return mockJwtSecret;
          if (key === 'jwt.accessExpiresIn') return '15m';
          if (key === 'jwt.refreshExpiresIn') return '7d';
          return def;
        }),
      };

      authService = new AuthService(
        mockPrisma,
        new JwtService({ secret: mockJwtSecret }),
        mockConfigService as any,
        mockTenantSchemaService,
        mockTenantPermissionService,
        {
          assertNotLocked: jest.fn(),
          recordSuccessfulLogin: jest.fn(),
          recordSuccessfulAttempt: jest.fn(),
          recordFailedAttempt: jest.fn(),
        } as any,
        { logAction: jest.fn().mockResolvedValue(undefined) } as any,
        { getTenantSubscriptionContext: jest.fn() } as any,
      );
    });

    it('rejects ambiguous login when duplicate email exists in multiple tenants and no salonCode is provided', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant-a-id', schemaName: 'tenant_000001', status: TenantStatus.ACTIVE, name: 'Salon A', code: 'SALON-A' },
        { id: 'tenant-b-id', schemaName: 'tenant_000002', status: TenantStatus.ACTIVE, name: 'Salon B', code: 'SALON-B' },
      ]);

      await expect(
        authService.login(
          { email: 'shared@example.com', password: 'TenantAPassword123!' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('scopes login strictly to Tenant A when salonCode SALON-A is supplied', async () => {
      mockPrisma.tenant.findUnique.mockImplementation(async (query: any) => {
        if (query?.where?.code === 'SALON-A') {
          return { id: 'tenant-a-id', schemaName: 'tenant_000001', status: TenantStatus.ACTIVE, name: 'Salon A', code: 'SALON-A' };
        }
        return null;
      });

      const res = await authService.login(
        { email: 'shared@example.com', password: 'TenantAPassword123!', salonCode: 'SALON-A' },
        '127.0.0.1',
      );

      expect(res).toBeDefined();
      expect(res.user.tenantId).toBe('tenant-a-id');
      expect(res.user.id).toBe('user-tenant-a');
    });

    it('scopes login strictly to Tenant B when salonCode SALON-B is supplied', async () => {
      mockPrisma.tenant.findUnique.mockImplementation(async (query: any) => {
        if (query?.where?.code === 'SALON-B') {
          return { id: 'tenant-b-id', schemaName: 'tenant_000002', status: TenantStatus.ACTIVE, name: 'Salon B', code: 'SALON-B' };
        }
        return null;
      });

      const res = await authService.login(
        { email: 'shared@example.com', password: 'TenantBPassword456!', salonCode: 'SALON-B' },
        '127.0.0.1',
      );

      expect(res).toBeDefined();
      expect(res.user.tenantId).toBe('tenant-b-id');
      expect(res.user.id).toBe('user-tenant-b');
    });

    it('rejects wrong password when logging into specified salon', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-a-id',
        schemaName: 'tenant_000001',
        status: TenantStatus.ACTIVE,
        name: 'Salon A',
        code: 'SALON-A',
      });

      await expect(
        authService.login(
          { email: 'shared@example.com', password: 'WrongPassword!', salonCode: 'SALON-A' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // FINDING 05: Read-Only Tenant Write Bypass
  // =========================================================================
  describe('Finding 05: Read-Only Tenant Write Bypass', () => {
    let guard: SubscriptionWriteGuard;
    let mockSubscriptionsService: any;

    beforeEach(() => {
      mockSubscriptionsService = {
        canTenantWrite: jest.fn(),
      };
      guard = new SubscriptionWriteGuard(mockSubscriptionsService);
    });

    function mockContext(method: string, url: string, user: any, tenantContext?: any): ExecutionContext {
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            method,
            originalUrl: url,
            url,
            path: url.split('?')[0],
            user,
            tenantContext: tenantContext || (user?.tenantId ? {
              tenantId: user.tenantId,
              schemaName: user.schemaName,
              userId: user.id,
            } : undefined),
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('allows read methods (GET, HEAD, OPTIONS) even when tenant write is blocked', async () => {
      mockSubscriptionsService.canTenantWrite.mockResolvedValue(false);
      const user = { id: 'u1', tenantId: 't1', schemaName: 'tenant_000001', roles: ['SALON_ADMIN'] };

      const ctxGet = mockContext('GET', '/api/v1/tenant/customers', user);
      expect(await guard.canActivate(ctxGet)).toBe(true);

      const ctxOptions = mockContext('OPTIONS', '/tenant/appointments', user);
      expect(await guard.canActivate(ctxOptions)).toBe(true);
    });

    it('allows mutation requests from platform SUPER_ADMIN', async () => {
      const superAdmin = { id: 'sa-1', roles: ['SUPER_ADMIN'], userType: 'SUPER_ADMIN' };
      const ctx = mockContext('POST', '/api/v1/super-admin/salons', superAdmin);
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('allows exempt subscription renewal paths for suspended tenants', async () => {
      mockSubscriptionsService.canTenantWrite.mockResolvedValue(false);
      const user = { id: 'u1', tenantId: 't1', schemaName: 'tenant_000001', roles: ['SALON_ADMIN'] };

      const ctx = mockContext('POST', '/api/v1/subscriptions/renew', user);
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it.each([
      ['POST', '/api/v1/tenant/customers'],
      ['POST', '/api/v1/TENANT/customers'],
      ['PUT', '/Tenant/Customers/123'],
      ['PATCH', '/TENANT//services/456'],
      ['DELETE', '/api/v1/tenant/employees/789'],
    ])('blocks mutation %s on %s when tenant subscription is read-only regardless of casing or formatting', async (method, path) => {
      mockSubscriptionsService.canTenantWrite.mockResolvedValue(false);
      const user = { id: 'u1', tenantId: 't1', schemaName: 'tenant_000001', roles: ['SALON_ADMIN'] };

      const ctx = mockContext(method, path, user);
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // FINDING 06: Stale JWT Roles and Permissions
  // =========================================================================
  describe('Finding 06: Stale JWT Roles and Permissions', () => {
    let jwtStrategy: JwtStrategy;
    let mockPrisma: any;
    let mockTenantSchemaService: any;
    let mockTenantPermissionService: any;

    beforeEach(() => {
      mockPrisma = {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant-1',
            status: TenantStatus.ACTIVE,
            schemaName: 'tenant_000001',
            name: 'Elite Salon',
            code: 'SLN-ELITE',
          }),
        },
      };

      mockTenantSchemaService = {
        withTenantSchema: jest.fn(async (_schema: string, callback: any) => {
          const tx = {
            $queryRawUnsafe: jest.fn(async (sql: string) => {
              if (sql.includes('FROM') && sql.includes('users')) {
                return [
                  {
                    id: 'user-1',
                    name: 'Test Staff',
                    email: 'staff@salon.com',
                    status: 'ACTIVE',
                    token_version: 1,
                    employee_status: 'ACTIVE',
                  },
                ];
              }
              if (sql.includes('user_roles')) {
                // Return updated role in DB: downgraded from SALON_ADMIN to CASHIER
                return [{ code: 'CASHIER' }];
              }
              return [];
            }),
          };
          return callback({ tx });
        }),
      };

      mockTenantPermissionService = {
        // Authoritative permissions in DB (customers:create revoked)
        getUserPermissionCodes: jest.fn().mockResolvedValue(['customers:read']),
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(mockJwtSecret),
      };

      jwtStrategy = new JwtStrategy(
        mockConfig as any,
        mockPrisma,
        mockTenantSchemaService,
        mockTenantPermissionService,
      );
    });

    it('revalidates roles against DB and ignores stale roles claimed in the JWT payload', async () => {
      const stalePayload = {
        sub: 'user-1',
        email: 'staff@salon.com',
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        roles: ['SALON_ADMIN', 'SUPER_ADMIN'],
        permissions: ['customers:read', 'customers:create', 'customers:delete'],
        tokenVersion: 1,
        userType: 'TENANT_USER' as const,
      };

      const authenticated = await jwtStrategy.validate(stalePayload as any);

      // Must reflect authoritative DB state, NOT stale token claims
      expect(authenticated.roles).toEqual(['CASHIER']);
      expect(authenticated.roles).not.toContain('SALON_ADMIN');
      expect(authenticated.roles).not.toContain('SUPER_ADMIN');
      expect(authenticated.permissions).toEqual(['customers:read']);
    });
  });

  // =========================================================================
  // FINDING 11: Password Change/Reset Does Not Revoke Sessions
  // =========================================================================
  describe('Finding 11: Password Change/Reset Session Revocation', () => {
    let jwtStrategy: JwtStrategy;
    let mockPrisma: any;
    let mockTenantSchemaService: any;

    beforeEach(() => {
      mockPrisma = {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant-1',
            status: TenantStatus.ACTIVE,
            schemaName: 'tenant_000001',
            name: 'Salon 1',
            code: 'SLN-1',
          }),
        },
      };

      mockTenantSchemaService = {
        withTenantSchema: jest.fn(async (_schema: string, callback: any) => {
          const tx = {
            $queryRawUnsafe: jest.fn(async (sql: string) => {
              if (sql.includes('FROM') && sql.includes('users')) {
                return [
                  {
                    id: 'user-1',
                    name: 'Test Staff',
                    email: 'staff@salon.com',
                    status: 'ACTIVE',
                    // DB token_version was incremented after password change from 1 to 2
                    token_version: 2,
                    employee_status: 'ACTIVE',
                  },
                ];
              }
              if (sql.includes('user_roles')) {
                return [{ code: 'SALON_ADMIN' }];
              }
              return [];
            }),
          };
          return callback({ tx });
        }),
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(mockJwtSecret),
      };

      jwtStrategy = new JwtStrategy(
        mockConfig as any,
        mockPrisma,
        mockTenantSchemaService,
        { getUserPermissionCodes: jest.fn().mockResolvedValue([]) } as any,
      );
    });

    it('rejects access tokens issued prior to password change/reset due to token_version mismatch', async () => {
      const deviceATokenPayload = {
        sub: 'user-1',
        email: 'staff@salon.com',
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        roles: ['SALON_ADMIN'],
        tokenVersion: 1, // Stale tokenVersion before password reset
        userType: 'TENANT_USER' as const,
      };

      await expect(jwtStrategy.validate(deviceATokenPayload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('accepts new access tokens issued after password change with matching token_version', async () => {
      const newDeviceTokenPayload = {
        sub: 'user-1',
        email: 'staff@salon.com',
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        roles: ['SALON_ADMIN'],
        tokenVersion: 2, // Fresh tokenVersion matching DB
        userType: 'TENANT_USER' as const,
      };

      const authenticated = await jwtStrategy.validate(newDeviceTokenPayload as any);
      expect(authenticated.id).toBe('user-1');
      expect(authenticated.tokenVersion).toBe(2);
    });
  });

  // =========================================================================
  // FINDING 12: Deactivated User Remains Active
  // =========================================================================
  describe('Finding 12: Deactivated User Session Invalidation', () => {
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant-1',
            status: TenantStatus.ACTIVE,
            schemaName: 'tenant_000001',
            name: 'Salon 1',
            code: 'SLN-1',
          }),
        },
      };
    });

    it('rejects previously active token when user account status is INACTIVE', async () => {
      const mockTenantSchemaService = {
        withTenantSchema: jest.fn(async (_schema: string, callback: any) => {
          const tx = {
            $queryRawUnsafe: jest.fn(async () => [
              {
                id: 'deactivated-user-1',
                email: 'former@salon.com',
                status: 'INACTIVE', // User deactivated
                token_version: 2,
                employee_status: 'ACTIVE',
              },
            ]),
          };
          return callback({ tx });
        }),
      };

      const strategy = new JwtStrategy(
        { get: jest.fn().mockReturnValue(mockJwtSecret) } as any,
        mockPrisma,
        mockTenantSchemaService as any,
        { getUserPermissionCodes: jest.fn().mockResolvedValue([]) } as any,
      );

      await expect(
        strategy.validate({
          sub: 'deactivated-user-1',
          tenantId: 'tenant-1',
          schemaName: 'tenant_000001',
          tokenVersion: 1,
          userType: 'TENANT_USER' as const,
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects previously active token when employee status is TERMINATED/INACTIVE', async () => {
      const mockTenantSchemaService = {
        withTenantSchema: jest.fn(async (_schema: string, callback: any) => {
          const tx = {
            $queryRawUnsafe: jest.fn(async () => [
              {
                id: 'fired-emp-1',
                email: 'staff@salon.com',
                status: 'ACTIVE',
                token_version: 1,
                employee_status: 'TERMINATED', // Employee deactivated
              },
            ]),
          };
          return callback({ tx });
        }),
      };

      const strategy = new JwtStrategy(
        { get: jest.fn().mockReturnValue(mockJwtSecret) } as any,
        mockPrisma,
        mockTenantSchemaService as any,
        { getUserPermissionCodes: jest.fn().mockResolvedValue([]) } as any,
      );

      await expect(
        strategy.validate({
          sub: 'fired-emp-1',
          tenantId: 'tenant-1',
          schemaName: 'tenant_000001',
          tokenVersion: 1,
          userType: 'TENANT_USER' as const,
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // FINDING 13: Password Reset Can Resolve Wrong Tenant Account
  // =========================================================================
  describe('Finding 13: Password Reset Resolves Wrong Tenant Account', () => {
    let passwordResetService: PasswordResetService;
    let mockPrisma: any;
    let mockTenantSchemaService: any;

    beforeEach(() => {
      mockPrisma = {
        tenant: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
        },
        passwordResetToken: {
          create: jest.fn().mockResolvedValue({ id: 'prt-1' }),
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        superAdminUser: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      mockTenantSchemaService = {
        withTenantSchema: jest.fn(async (_schema: string, callback: any) => {
          const tx = {
            $queryRawUnsafe: jest.fn(async (sql: string) => {
              if (sql.includes('users') && sql.includes('SELECT')) {
                return [{ id: 'user-tenant-a', email: 'shared@example.com', status: 'ACTIVE' }];
              }
              return [];
            }),
          };
          return callback({ tx });
        }),
      };

      passwordResetService = new PasswordResetService(
        mockPrisma,
        { get: jest.fn().mockReturnValue('http://localhost:5173') } as any,
        { sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined) } as any,
        mockTenantSchemaService,
        {
          assertNotLocked: jest.fn(),
          recordSuccessfulLogin: jest.fn(),
          recordFailedAttempt: jest.fn(),
        } as any,
      );
    });

    it('rejects ambiguous password reset request when email exists across multiple tenants without salonCode', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant-a-id', schemaName: 'tenant_000001', status: TenantStatus.ACTIVE, name: 'Salon A', code: 'SALON-A' },
        { id: 'tenant-b-id', schemaName: 'tenant_000002', status: TenantStatus.ACTIVE, name: 'Salon B', code: 'SALON-B' },
      ]);

      await expect(
        passwordResetService.requestReset('shared@example.com', 'salon', '127.0.0.1'),
      ).rejects.toThrow(ConflictException);
    });

    it('successfully scopes password reset request to specific salon when salonCode is provided', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-a-id',
        schemaName: 'tenant_000001',
        status: TenantStatus.ACTIVE,
        name: 'Salon A',
        code: 'SALON-A',
      });

      const result = await passwordResetService.requestReset(
        'shared@example.com',
        'salon',
        '127.0.0.1',
        'SALON-A',
      );

      expect(result).toHaveProperty('message');
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a-id',
            tenantSchema: 'tenant_000001',
          }),
        }),
      );
    });

    it('rejects resetting password when token is expired or already used', async () => {
      const rawToken = 'sample-expired-token';
      const tokenHash = hashToken(rawToken);

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        tokenHash,
        userId: 'user-tenant-a',
        tenantId: 'tenant-a-id',
        usedAt: new Date(), // Already used
        expiresAt: new Date(Date.now() + 3600000),
      });

      await expect(
        passwordResetService.resetPassword(rawToken, 'NewSecurePassword123!', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
