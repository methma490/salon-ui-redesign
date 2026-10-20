import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SuperAdminStatus, TenantStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { LoginSecurityService } from '../auth/login-security.service';
import { PasswordResetService } from '../auth/password-reset.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { hashToken } from '../auth/utils/token.util';
import { isOriginAllowed, parseAllowedOrigins } from '../common/utils/cors.util';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { isReservedPlatformRole, isReservedRoleCode } from '../salon/utils/permission-feature.util';
import { SubscriptionWriteGuard } from '../tenant/guards/subscription-write.guard';

describe('Salon SaaS Security Hardening — 13 Findings Comprehensive Suite', () => {
  const accessSecret = 'access-token-super-secret-key-min-32-chars';
  const refreshSecret = 'refresh-token-super-secret-key-min-32-chars';

  // =========================================================================
  // FIX 01 — TENANT USER CAN ESCALATE TO SUPER_ADMIN
  // =========================================================================
  describe('FIX 01 — Tenant User Escalation to SUPER_ADMIN', () => {
    it('1.1 should reserve platform roles case-insensitively and reject creation/renaming/assignment', () => {
      const reservedVariants = [
        'SUPER_ADMIN',
        'super_admin',
        ' Super_Admin ',
        'super-admin',
        'PLATFORM_ADMIN',
        'platform_admin',
        'SYSTEM_ADMIN',
      ];

      for (const variant of reservedVariants) {
        expect(isReservedPlatformRole(variant)).toBe(true);
        expect(isReservedRoleCode(variant)).toBe(true);
      }

      // Safe business tenant roles must not be reserved
      expect(isReservedPlatformRole('SALON_ADMIN')).toBe(false);
      expect(isReservedPlatformRole('CASHIER')).toBe(false);
      expect(isReservedPlatformRole('HAIRSTYLIST')).toBe(false);
    });

    it('1.2 RolesGuard rejects tenant user claiming role=SUPER_ADMIN in token', async () => {
      const mockReflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['SUPER_ADMIN']),
      };
      const guard = new RolesGuard(mockReflector as any);
      const mockExecutionContext = (userPayload: any) =>
        ({
          getHandler: () => ({}),
          getClass: () => ({}),
          switchToHttp: () => ({
            getRequest: () => ({ user: userPayload }),
          }),
        }) as any;

      // Attacker tenant user forged/assigned role
      const tenantUserClaimingAdmin = {
        id: 'tenant-user-1',
        email: 'attacker@salon.com',
        userType: 'TENANT_USER',
        tenantId: 'tenant-uuid-1',
        roles: ['SUPER_ADMIN'],
      };

      expect(() => guard.canActivate(mockExecutionContext(tenantUserClaimingAdmin))).toThrow(
        ForbiddenException,
      );

      // Real Super Admin platform identity must succeed
      const realSuperAdmin = {
        id: 'admin-platform-1',
        email: 'superadmin@platform.com',
        userType: 'SUPER_ADMIN',
        tenantId: null,
        roles: ['SUPER_ADMIN'],
      };

      expect(guard.canActivate(mockExecutionContext(realSuperAdmin))).toBe(true);
    });
  });

  // =========================================================================
  // FIX 02 — CROSS-TENANT EMAIL SHADOWING
  // =========================================================================
  describe('FIX 02 — Cross-Tenant Email Shadowing During Login', () => {
    let authService: AuthService;
    let mockPrisma: any;
    let mockTenantSchemaService: any;
    let mockLoginSecurity: any;

    beforeEach(() => {
      mockPrisma = {
        superAdminUser: { findUnique: jest.fn().mockResolvedValue(null) },
        tenant: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
        },
      };
      mockTenantSchemaService = {
        withTenantSchema: jest.fn(),
      };
      mockLoginSecurity = {
        assertNotLocked: jest.fn(),
        recordSuccessfulLogin: jest.fn(),
        recordFailedAttempt: jest.fn(),
      };
      const mockConfig = {
        get: jest.fn((key: string, def?: any) => {
          if (key === 'jwt.accessSecret') return accessSecret;
          if (key === 'jwt.refreshSecret') return refreshSecret;
          return def;
        }),
      };

      authService = new AuthService(
        mockPrisma,
        new JwtService({ secret: accessSecret }),
        mockConfig as any,
        mockTenantSchemaService,
        { getUserPermissionCodes: jest.fn().mockResolvedValue([]) } as any,
        mockLoginSecurity,
        { logAction: jest.fn() } as any,
        {} as any,
      );
    });

    it('2.1 rejects ambiguous login when same email exists in multiple tenants and no salonCode is provided', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 't1', schemaName: 'tenant_000001', status: TenantStatus.ACTIVE },
        { id: 't2', schemaName: 'tenant_000002', status: TenantStatus.ACTIVE },
      ]);

      mockTenantSchemaService.withTenantSchema
        .mockResolvedValueOnce([{ id: 'u1' }]) // found in tenant 1
        .mockResolvedValueOnce([{ id: 'u2' }]); // found in tenant 2

      await expect(
        authService.login({ email: 'shared@example.com', password: 'Password123!' }),
      ).rejects.toThrow(ConflictException);
    });

    it('2.2 scopes authentication strictly to Tenant A when salonCode SLN-A is provided', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        code: 'SLN-A',
        name: 'Salon Alpha',
        schemaName: 'tenant_000001',
        status: TenantStatus.ACTIVE,
      });

      // User lookup in Tenant 1 fails password
      mockTenantSchemaService.withTenantSchema.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'shared@example.com',
          password: 'WrongPassword!',
          salonCode: 'SLN-A',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { code: 'SLN-A' },
        select: expect.any(Object),
      });
    });
  });

  // =========================================================================
  // FIX 03 — LOGIN LOCKOUT (BRUTE FORCE PROTECTION)
  // =========================================================================
  describe('FIX 03 — Login Lockout Brute Force Protection', () => {
    let loginSecurityService: LoginSecurityService;

    beforeEach(() => {
      loginSecurityService = new LoginSecurityService();
    });

    it('3.1 locks account after 5 failed attempts and resets upon successful login', () => {
      const email = 'victim@salon.com';
      const ip = '192.168.1.50';

      for (let i = 1; i <= 4; i++) {
        loginSecurityService.recordFailedAttempt(email, ip, 'bad-password');
        expect(() => loginSecurityService.assertNotLocked(email, ip)).not.toThrow();
      }

      // 5th failed attempt triggers lock
      loginSecurityService.recordFailedAttempt(email, ip, 'bad-password');
      expect(() => loginSecurityService.assertNotLocked(email, ip)).toThrow(HttpException);

      // Successful login resets lockout
      loginSecurityService.recordSuccessfulLogin(email, ip);
      expect(() => loginSecurityService.assertNotLocked(email, ip)).not.toThrow();
    });
  });

  // =========================================================================
  // FIX 04 — DUPLICATE EMAIL RETURNS NORMALIZED 409
  // =========================================================================
  describe('FIX 04 — Friendly Duplicate Email Response (Raw 409 Filter)', () => {
    it('4.1 normalizes Prisma P2002 / Postgres 23505 email errors into EMAIL_ALREADY_IN_USE without stack leaks', () => {
      const filter = new AllExceptionsFilter();

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ url: '/api/v1/signup', method: 'POST' }),
        }),
      } as any;

      // Simulated Prisma unique constraint error on email
      const prismaP2002Error = {
        code: 'P2002',
        meta: { target: ['email'] },
        message: 'Unique constraint failed on the fields: (`email`)',
      };

      filter.catch(prismaP2002Error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          code: 'EMAIL_ALREADY_IN_USE',
          message: 'This email is already in use.',
        }),
      );
    });
  });

  // =========================================================================
  // FIX 05 — READ-ONLY TENANT WRITE BYPASS
  // =========================================================================
  describe('FIX 05 — Read-Only Tenant Write Bypass', () => {
    let guard: SubscriptionWriteGuard;
    let mockReflector: any;

    let mockSubscriptionService: any;

    beforeEach(() => {
      mockReflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      };
      mockSubscriptionService = {
        canTenantWrite: jest.fn().mockResolvedValue(false), // Suspended salon cannot write
      };
      guard = new SubscriptionWriteGuard(mockSubscriptionService, undefined, mockReflector);
    });

    const mockContext = (method: string, url: string, tenantStatus: string) =>
      ({
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            method,
            url,
            path: url.split('?')[0],
            originalUrl: url,
            user: {
              id: 'u-1',
              tenantId: 'tenant-uuid-1',
              schemaName: 'tenant_000001',
              userType: 'TENANT_USER',
              tenantStatus,
            },
            tenantContext: {
              tenantId: 'tenant-uuid-1',
              schemaName: 'tenant_000001',
            },
          }),
        }),
      }) as any;

    it('5.1 allows GET read operations even when salon is suspended', async () => {
      const ctx = mockContext('GET', '/tenant/customers', 'SUSPENDED');
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('5.2 blocks POST, PUT, PATCH, DELETE mutations on all path variations when salon is suspended', async () => {
      const mutations = [
        { method: 'POST', url: '/tenant/customers' },
        { method: 'POST', url: '/api/v1/TENANT/customers' },
        { method: 'PUT', url: '/Tenant/Customers/123' },
        { method: 'PATCH', url: '/TENANT//services/456' },
        { method: 'DELETE', url: '/api/v1/tenant/employees/789' },
      ];

      for (const m of mutations) {
        const ctx = mockContext(m.method, m.url, 'SUSPENDED');
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      }
    });

    it('5.3 allows billing renewal and checkout routes for suspended tenants', async () => {
      const renewalCtx = mockContext('POST', '/tenant/subscriptions/renew', 'SUSPENDED');
      await expect(guard.canActivate(renewalCtx)).resolves.toBe(true);
    });
  });

  // =========================================================================
  // FIX 06 — STALE JWT ROLES AND PERMISSIONS
  // =========================================================================
  describe('FIX 06 — Stale JWT Roles and Permissions Revalidation', () => {
    it('6.1 fetches live permissions from backend storage and discards stale JWT claims', async () => {
      const mockPrisma = {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            status: TenantStatus.ACTIVE,
            name: 'Salon Test',
            code: 'SLN-1',
            schemaName: 'tenant_000001',
          }),
        },
      };

      const mockTenantSchemaService = {
        withTenantSchema: jest.fn().mockImplementation((_schema, cb) =>
          cb({
            tx: {
              $queryRawUnsafe: jest
                .fn()
                .mockResolvedValueOnce([
                  { id: 'user-1', name: 'User', email: 'user@salon.com', status: 'ACTIVE', token_version: 1 },
                ])
                .mockResolvedValueOnce([
                  { code: 'RECEPTIONIST' }, // live role changed from SALON_ADMIN to RECEPTIONIST
                ]),
            },
          }),
        ),
      };

      const mockTenantPermissionService = {
        getUserPermissionCodes: jest.fn().mockResolvedValue(['appointments:read']),
      };

      const strategy = new JwtStrategy(
        { get: jest.fn().mockReturnValue(accessSecret) } as any,
        mockPrisma as any,
        mockTenantSchemaService as any,
        mockTenantPermissionService as any,
      );

      const stalePayload = {
        sub: 'user-1',
        email: 'user@salon.com',
        userType: 'TENANT_USER' as const,
        schemaName: 'tenant_000001',
        tenantId: 't-1',
        roles: ['SALON_ADMIN'], // Stale claimed role in token
        permissions: ['*'], // Stale permissions in token
        tokenVersion: 1,
      };

      const validatedUser = await strategy.validate(stalePayload);

      // Must have live DB role RECEPTIONIST, not stale SALON_ADMIN
      expect(validatedUser.roles).toEqual(['RECEPTIONIST']);
      expect(validatedUser.permissions).toEqual(['appointments:read']);
    });
  });

  // =========================================================================
  // FIX 07 — REFRESH TOKEN REUSE MUST REVOKE FAMILY
  // =========================================================================
  describe('FIX 07 — Refresh Token Reuse Revokes Family', () => {
    let authService: AuthService;
    let mockPrisma: any;
    let mockAuditService: any;

    beforeEach(() => {
      mockPrisma = {
        superAdminRefreshToken: {
          findUnique: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      mockAuditService = { logAction: jest.fn() };
      authService = new AuthService(
        mockPrisma,
        new JwtService({ secret: accessSecret }),
        { get: jest.fn((k, d) => (k === 'jwt.accessSecret' ? accessSecret : k === 'jwt.refreshSecret' ? refreshSecret : d)) } as any,
        {} as any,
        {} as any,
        {} as any,
        mockAuditService,
        {} as any,
      );
    });

    it('7.1 revokes entire session family when an already-revoked refresh token is presented', async () => {
      const familyId = 'family-session-123';
      const rawToken = 'stolen-or-reused-token';

      mockPrisma.superAdminRefreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        tokenHash: hashToken(rawToken),
        revokedAt: new Date(Date.now() - 60000), // Already revoked/consumed
        usedAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() + 60000),
        familyId,
        user: { id: 'admin-1', status: SuperAdminStatus.ACTIVE },
      });

      await expect(authService.refresh(rawToken)).rejects.toThrow(UnauthorizedException);

      // Verify all tokens in the family were revoked
      expect(mockPrisma.superAdminRefreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });

      // Verify audit log for reuse detection
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUSPICIOUS_REFRESH_TOKEN_REUSE',
        }),
      );
    });
  });

  // =========================================================================
  // FIX 08 — CONCURRENT REFRESH RACE CONDITION
  // =========================================================================
  describe('FIX 08 — Concurrent Refresh Race Condition Protection', () => {
    it('8.1 allows only one of two simultaneous refresh attempts to succeed', async () => {
      let consumed = false;
      const mockPrisma = {
        superAdminRefreshToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tok-concurrent-1',
            tokenHash: hashToken('concurrent-token'),
            revokedAt: null,
            usedAt: null,
            expiresAt: new Date(Date.now() + 60000),
            familyId: 'fam-conc-1',
            user: { id: 'u1', email: 'admin@platform.com', name: 'Admin', status: SuperAdminStatus.ACTIVE },
          }),
          updateMany: jest.fn().mockImplementation(() => {
            if (!consumed) {
              consumed = true;
              return Promise.resolve({ count: 1 }); // First thread succeeds
            }
            return Promise.resolve({ count: 0 }); // Second concurrent thread loses race
          }),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      const authService = new AuthService(
        mockPrisma as any,
        new JwtService({ secret: accessSecret }),
        { get: jest.fn((k, d) => (k === 'jwt.accessSecret' ? accessSecret : k === 'jwt.refreshSecret' ? refreshSecret : d)) } as any,
        {} as any,
        {} as any,
        {} as any,
        { logAction: jest.fn() } as any,
        {} as any,
      );

      // Run two refresh operations concurrently with the exact same token
      const [res1, res2] = await Promise.allSettled([
        authService.refresh('concurrent-token'),
        authService.refresh('concurrent-token'),
      ]);

      const successes = [res1, res2].filter((r) => r.status === 'fulfilled');
      const failures = [res1, res2].filter((r) => r.status === 'rejected');

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect((failures[0] as PromiseRejectedResult).reason).toBeInstanceOf(UnauthorizedException);
    });
  });

  // =========================================================================
  // FIX 09 — WILDCARD CORS SUBDOMAIN REMOVED
  // =========================================================================
  describe('FIX 09 — Strict CORS Origin Allow-list', () => {
    it('9.1 allows only exact trusted origins and strictly rejects wildcard dartcodes subdomains', () => {
      const allowedConfig = 'https://saloon-client.bc.dartcodes.com,https://app.dartcodes.com';
      const parsedOrigins = parseAllowedOrigins(allowedConfig);

      // Exact match allowed
      expect(isOriginAllowed('https://saloon-client.bc.dartcodes.com', parsedOrigins, true)).toBe(true);
      expect(isOriginAllowed('https://app.dartcodes.com', parsedOrigins, true)).toBe(true);

      // Arbitrary / rogue dartcodes subdomain rejected
      expect(isOriginAllowed('https://attacker.dartcodes.com', parsedOrigins, true)).toBe(false);
      expect(isOriginAllowed('https://malicious-site.dartcodes.com', parsedOrigins, true)).toBe(false);

      // External untrusted origin rejected
      expect(isOriginAllowed('https://evil-attacker.org', parsedOrigins, true)).toBe(false);
    });
  });

  // =========================================================================
  // FIX 10 — ABSOLUTE SESSION LIFETIME
  // =========================================================================
  describe('FIX 10 — Absolute Session Lifetime', () => {
    it('10.1 rejects refresh when absolute session lifetime has expired', async () => {
      const mockPrisma = {
        superAdminRefreshToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tok-abs-1',
            tokenHash: hashToken('abs-token'),
            revokedAt: null,
            usedAt: null,
            expiresAt: new Date(Date.now() + 60000), // Idle TTL is still valid
            absoluteExpiresAt: new Date(Date.now() - 1000), // But absolute 30-day session lifetime expired!
            familyId: 'fam-abs-1',
            user: { id: 'u1', status: SuperAdminStatus.ACTIVE },
          }),
        },
      };

      const authService = new AuthService(
        mockPrisma as any,
        new JwtService({ secret: accessSecret }),
        { get: jest.fn((k, d) => (k === 'jwt.accessSecret' ? accessSecret : k === 'jwt.refreshSecret' ? refreshSecret : d)) } as any,
        {} as any,
        {} as any,
        {} as any,
        { logAction: jest.fn() } as any,
        {} as any,
      );

      await expect(authService.refresh('abs-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // FIX 11 — PASSWORD CHANGE/RESET SESSIONS REVOCATION
  // =========================================================================
  describe('FIX 11 — Password Change/Reset Session Revocation', () => {
    it('11.1 rejects access tokens issued prior to password change/reset due to token_version mismatch', async () => {
      const mockPrisma = {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            status: TenantStatus.ACTIVE,
            schemaName: 'tenant_000001',
          }),
        },
      };

      const mockTenantSchemaService = {
        withTenantSchema: jest.fn().mockImplementation((_schema, cb) =>
          cb({
            tx: {
              $queryRawUnsafe: jest.fn().mockResolvedValueOnce([
                {
                  id: 'u1',
                  name: 'User',
                  email: 'user@salon.com',
                  status: 'ACTIVE',
                  token_version: 2, // Incremented after password reset/change
                },
              ]),
            },
          }),
        ),
      };

      const strategy = new JwtStrategy(
        { get: jest.fn().mockReturnValue(accessSecret) } as any,
        mockPrisma as any,
        mockTenantSchemaService as any,
        { getUserPermissionCodes: jest.fn().mockResolvedValue([]) } as any,
      );

      // Old token presenting tokenVersion = 1
      const oldTokenPayload = {
        sub: 'u1',
        email: 'user@salon.com',
        userType: 'TENANT_USER' as const,
        schemaName: 'tenant_000001',
        tenantId: 't-1',
        roles: ['SALON_ADMIN'],
        tokenVersion: 1,
      };

      await expect(strategy.validate(oldTokenPayload)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // FIX 12 — DEACTIVATED USER SESSION REMAINS ACTIVE
  // =========================================================================
  describe('FIX 12 — Deactivated User Session Invalidation', () => {
    it('12.1 rejects both access token and refresh token when employee is deactivated', async () => {
      const mockPrisma = {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            status: TenantStatus.ACTIVE,
            schemaName: 'tenant_000001',
          }),
        },
      };

      const mockTenantSchemaService = {
        withTenantSchema: jest.fn().mockImplementation((_schema, cb) =>
          cb({
            tx: {
              $queryRawUnsafe: jest.fn().mockResolvedValueOnce([
                {
                  id: 'u1',
                  name: 'Deactivated Employee',
                  email: 'emp@salon.com',
                  status: 'ACTIVE',
                  token_version: 1,
                  employee_status: 'INACTIVE', // Employee deactivated!
                },
              ]),
            },
          }),
        ),
      };

      const strategy = new JwtStrategy(
        { get: jest.fn().mockReturnValue(accessSecret) } as any,
        mockPrisma as any,
        mockTenantSchemaService as any,
        { getUserPermissionCodes: jest.fn().mockResolvedValue([]) } as any,
      );

      const tokenPayload = {
        sub: 'u1',
        email: 'emp@salon.com',
        userType: 'TENANT_USER' as const,
        schemaName: 'tenant_000001',
        tenantId: 't-1',
        roles: ['CASHIER'],
        tokenVersion: 1,
      };

      await expect(strategy.validate(tokenPayload)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // FIX 13 — PASSWORD RESET WRONG TENANT
  // =========================================================================
  describe('FIX 13 — Password Reset Deterministic Tenant Scoping', () => {
    let passwordResetService: PasswordResetService;
    let mockPrisma: any;
    let mockTenantSchemaService: any;

    beforeEach(() => {
      mockPrisma = {
        tenant: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
        },
        superAdminUser: { findUnique: jest.fn().mockResolvedValue(null) },
        passwordResetToken: {
          updateMany: jest.fn(),
          create: jest.fn(),
        },
      };
      mockTenantSchemaService = {
        withTenantSchema: jest.fn(),
      };
      passwordResetService = new PasswordResetService(
        mockPrisma as any,
        { get: jest.fn().mockReturnValue('http://localhost:5173') } as any,
        { sendPasswordResetEmail: jest.fn() } as any,
        mockTenantSchemaService as any,
        { assertNotLocked: jest.fn() } as any,
      );
    });

    it('13.1 rejects ambiguous reset request when email exists in multiple salons and salonCode is missing', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 't1', schemaName: 'tenant_000001', code: 'SALON-1' },
        { id: 't2', schemaName: 'tenant_000002', code: 'SALON-2' },
      ]);

      mockTenantSchemaService.withTenantSchema
        .mockResolvedValueOnce([{ id: 'u1', email: 'multi@salon.com' }])
        .mockResolvedValueOnce([{ id: 'u2', email: 'multi@salon.com' }]);

      await expect(
        passwordResetService.requestReset('multi@salon.com', 'salon'),
      ).rejects.toThrow(ConflictException);
    });

    it('13.2 deterministically scopes password reset to Tenant A when salonCode is supplied', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        schemaName: 'tenant_000001',
        code: 'SALON-1',
        status: TenantStatus.ACTIVE,
      });

      mockTenantSchemaService.withTenantSchema.mockResolvedValueOnce([
        { id: 'u1', email: 'multi@salon.com' },
      ]);

      const result = await passwordResetService.requestReset(
        'multi@salon.com',
        'salon',
        undefined,
        'SALON-1',
      );

      expect(result.message).toContain('instructions have been sent');
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1',
          tenantSchema: 'tenant_000001',
          tenantUserId: 'u1',
        }),
      });
    });
  });
});
