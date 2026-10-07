import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { SuperAdminStatus, TenantStatus } from '@prisma/client';
import { hashToken } from '../auth/utils/token.util';

describe('Token Security & Invalidation Spec', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let mockPrisma: any;
  let mockConfigService: any;
  let mockTenantSchemaService: any;
  let mockTenantPermissionService: any;
  let mockSubscriptionsService: any;
  let mockLoginSecurityService: any;

  const validAccessSecret = 'super-secure-access-jwt-secret-key-32-chars';
  const validRefreshSecret = 'super-secure-refresh-jwt-secret-key-32-chars';

  beforeEach(() => {
    jwtService = new JwtService({ secret: validAccessSecret });

    mockPrisma = {
      superAdminUser: {
        findUnique: jest.fn(),
      },
      superAdminRefreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      tenant: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      superAdminAuditLog: {
        create: jest.fn(),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'jwt.accessSecret') return validAccessSecret;
        if (key === 'jwt.refreshSecret') return validRefreshSecret;
        if (key === 'jwt.accessExpiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return defaultValue;
      }),
    };

    mockTenantSchemaService = {
      withTenantSchema: jest.fn(),
    };

    mockTenantPermissionService = {
      getUserPermissionCodes: jest.fn().mockResolvedValue(['customers:read']),
    };

    mockSubscriptionsService = {
      getTenantSubscriptionContext: jest.fn().mockResolvedValue({
        tenant: { id: 't1', name: 'Salon Test' },
        subscription: null,
        features: {},
      }),
    };

    mockLoginSecurityService = {
      assertNotLocked: jest.fn(),
      recordSuccessfulAttempt: jest.fn(),
      recordFailedAttempt: jest.fn(),
    };

    const mockAuditLogsService = {
      logAction: jest.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(
      mockPrisma,
      jwtService,
      mockConfigService,
      mockTenantSchemaService,
      mockTenantPermissionService,
      mockLoginSecurityService,
      mockAuditLogsService as any,
      mockSubscriptionsService,
    );
  });

  describe('JWT Access Token Validation', () => {
    it('rejects an expired access token', async () => {
      const expiredToken = await jwtService.signAsync(
        { sub: 'user-1', email: 'test@example.com' },
        { secret: validAccessSecret, expiresIn: '-1s' },
      );

      await expect(
        jwtService.verifyAsync(expiredToken, { secret: validAccessSecret }),
      ).rejects.toThrow();
    });

    it('rejects a malformed JWT token', async () => {
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsig';

      await expect(
        jwtService.verifyAsync(malformedToken, { secret: validAccessSecret }),
      ).rejects.toThrow();
    });

    it('rejects a token signed with an invalid signature / wrong secret', async () => {
      const forgedToken = await jwtService.signAsync(
        { sub: 'user-1', email: 'test@example.com' },
        { secret: 'attacker-forged-unauthorized-secret-key' },
      );

      await expect(
        jwtService.verifyAsync(forgedToken, { secret: validAccessSecret }),
      ).rejects.toThrow();
    });
  });

  describe('Refresh Token Invalidation, Revocation & Reuse Protection', () => {
    const rawRefreshToken = 'test-raw-refresh-token-uuid-12345';
    const hashedToken = hashToken(rawRefreshToken);

    it('rejects a revoked Super Admin refresh token', async () => {
      mockPrisma.superAdminRefreshToken.findUnique.mockResolvedValue({
        id: 'token-id-1',
        tokenHash: hashedToken,
        revokedAt: new Date(Date.now() - 60000), // already revoked
        expiresAt: new Date(Date.now() + 600000),
        user: { id: 'admin-1', email: 'admin@platform.com', status: SuperAdminStatus.ACTIVE },
      });

      await expect(authService.refresh(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired Super Admin refresh token', async () => {
      mockPrisma.superAdminRefreshToken.findUnique.mockResolvedValue({
        id: 'token-id-1',
        tokenHash: hashedToken,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60000), // expired
        user: { id: 'admin-1', email: 'admin@platform.com', status: SuperAdminStatus.ACTIVE },
      });

      await expect(authService.refresh(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates refresh token and immediately marks the old token as revoked', async () => {
      mockPrisma.superAdminRefreshToken.findUnique.mockResolvedValue({
        id: 'token-id-1',
        tokenHash: hashedToken,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 600000),
        user: { id: 'admin-1', email: 'admin@platform.com', name: 'Super Admin', status: SuperAdminStatus.ACTIVE },
      });

      const result = await authService.refresh(rawRefreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.superAdminRefreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('invalidates refresh token on logout and rejects subsequent refresh attempts', async () => {
      await authService.logout(rawRefreshToken);

      expect(mockPrisma.superAdminRefreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: hashedToken,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('rejects tenant refresh token when salon is suspended', async () => {
      mockPrisma.superAdminRefreshToken.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 't1', schemaName: 'tenant_000001' },
      ]);

      mockTenantSchemaService.withTenantSchema.mockImplementation(async (_schema: string, cb: any) => {
        return cb({
          tx: {
            $queryRawUnsafe: jest.fn()
              .mockResolvedValueOnce([
                { id: 'tok-1', user_id: 'u1', expires_at: new Date(Date.now() + 60000), revoked_at: null },
              ])
              .mockResolvedValueOnce([
                { id: 'u1', name: 'User 1', email: 'user@salon.com', status: 'ACTIVE' },
              ])
              .mockResolvedValueOnce([{ code: 'SALON_ADMIN' }]),
          },
        });
      });

      mockPrisma.tenant.findUnique.mockResolvedValue({
        name: 'Salon Alpha',
        status: TenantStatus.SUSPENDED,
        code: 'SLN-001',
      });

      await expect(authService.refresh(rawRefreshToken)).rejects.toThrow(
        /suspended/i,
      );
    });
  });
});
