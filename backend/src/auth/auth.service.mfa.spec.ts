import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SuperAdminStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginSecurityService } from './login-security.service';
import { MfaService } from './mfa.service';

describe('AuthService - Super Admin MFA & Tenant Isolation', () => {
  let authService: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let tenantSchemaService: any;
  let tenantPermissionService: any;
  let loginSecurityService: LoginSecurityService;
  let mfaService: MfaService;
  let auditLogsService: any;
  let subscriptionsService: any;

  beforeEach(() => {
    prisma = {
      superAdminUser: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      superAdminRefreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      tenant: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      superAdminMfaRecoveryCode: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'jwt.accessSecret') return 'access-secret';
        if (key === 'jwt.refreshSecret') return 'refresh-secret';
        if (key === 'jwt.accessExpiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return defaultValue;
      }),
    };

    tenantSchemaService = {
      withTenantSchema: jest.fn(),
    };

    tenantPermissionService = {
      getUserPermissionCodes: jest.fn().mockResolvedValue(['SALON_DASHBOARD_VIEW']),
    };

    subscriptionsService = {
      getTenantSubscriptionContext: jest.fn(),
    };

    auditLogsService = {
      logAction: jest.fn().mockResolvedValue(undefined),
    };

    loginSecurityService = new LoginSecurityService();
    loginSecurityService.resetState();

    mfaService = new MfaService(prisma, jwtService, configService);

    authService = new AuthService(
      prisma,
      jwtService,
      configService,
      tenantSchemaService,
      tenantPermissionService,
      loginSecurityService,
      mfaService,
      auditLogsService,
      subscriptionsService,
    );

    jest.clearAllMocks();
  });

  describe('Super Admin Login with MFA', () => {
    it('should NOT issue privileged access tokens on password success, but require MFA', async () => {
      const passwordHash = await bcrypt.hash('SecretPass123!', 10);
      prisma.superAdminUser.findUnique.mockResolvedValue({
        id: 'super-admin-1',
        name: 'Super Admin',
        email: 'superadmin@dartcodes.com',
        passwordHash,
        status: SuperAdminStatus.ACTIVE,
        mfaEnabled: true,
        mfaSecret: 'JBSWY3DPEHPK3PXP',
      });

      jest.spyOn(mfaService, 'createPendingMfaToken').mockResolvedValue('mfa-pending-session-jwt');

      const result = await authService.login(
        { email: 'superadmin@dartcodes.com', password: 'SecretPass123!' },
        '127.0.0.1',
      );

      // Verify no privileged access token was returned
      expect(result.mfaRequired).toBe(true);
      expect((result as any).accessToken).toBeUndefined();
      expect((result as any).refreshToken).toBeUndefined();
      expect(result.mfaSessionToken).toBe('mfa-pending-session-jwt');
      expect(result.user.email).toBe('superadmin@dartcodes.com');
    });

    it('should reject invalid password for Super Admin and increment failed attempts', async () => {
      const passwordHash = await bcrypt.hash('RealPass123!', 10);
      prisma.superAdminUser.findUnique.mockResolvedValue({
        id: 'super-admin-1',
        name: 'Super Admin',
        email: 'superadmin@dartcodes.com',
        passwordHash,
        status: SuperAdminStatus.ACTIVE,
        mfaEnabled: true,
      });

      await expect(
        authService.login(
          { email: 'superadmin@dartcodes.com', password: 'WrongPassword!' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should grant full privileged access token only upon valid TOTP verification', async () => {
      jest.spyOn(mfaService, 'verifyPendingMfaToken').mockResolvedValue({
        sub: 'super-admin-1',
        email: 'superadmin@dartcodes.com',
        userType: 'SUPER_ADMIN',
        purpose: 'SUPER_ADMIN_MFA_PENDING',
      });

      prisma.superAdminUser.findUnique.mockResolvedValue({
        id: 'super-admin-1',
        name: 'Super Admin',
        email: 'superadmin@dartcodes.com',
        status: SuperAdminStatus.ACTIVE,
        mfaEnabled: true,
        mfaSecret: 'JBSWY3DPEHPK3PXP',
      });

      jest.spyOn(mfaService, 'verifyTotp').mockReturnValue(true);
      prisma.superAdminRefreshToken.create.mockResolvedValue({ id: 'ref-1' });

      const result = await authService.verifyMfaLogin(
        { mfaSessionToken: 'valid-session', code: '123456' },
        '127.0.0.1',
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.roles).toContain('SUPER_ADMIN');
    });

    it('should reject invalid TOTP code during MFA login', async () => {
      jest.spyOn(mfaService, 'verifyPendingMfaToken').mockResolvedValue({
        sub: 'super-admin-1',
        email: 'superadmin@dartcodes.com',
        userType: 'SUPER_ADMIN',
        purpose: 'SUPER_ADMIN_MFA_PENDING',
      });

      prisma.superAdminUser.findUnique.mockResolvedValue({
        id: 'super-admin-1',
        name: 'Super Admin',
        email: 'superadmin@dartcodes.com',
        status: SuperAdminStatus.ACTIVE,
        mfaEnabled: true,
        mfaSecret: 'JBSWY3DPEHPK3PXP',
      });

      jest.spyOn(mfaService, 'verifyTotp').mockReturnValue(false);

      await expect(
        authService.verifyMfaLogin(
          { mfaSessionToken: 'valid-session', code: '000000' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should allow login with valid backup recovery code', async () => {
      jest.spyOn(mfaService, 'verifyPendingMfaToken').mockResolvedValue({
        sub: 'super-admin-1',
        email: 'superadmin@dartcodes.com',
        userType: 'SUPER_ADMIN',
        purpose: 'SUPER_ADMIN_MFA_PENDING',
      });

      prisma.superAdminUser.findUnique.mockResolvedValue({
        id: 'super-admin-1',
        name: 'Super Admin',
        email: 'superadmin@dartcodes.com',
        status: SuperAdminStatus.ACTIVE,
        mfaEnabled: true,
      });

      jest.spyOn(mfaService, 'verifyAndConsumeRecoveryCode').mockResolvedValue(true);
      prisma.superAdminRefreshToken.create.mockResolvedValue({ id: 'ref-1' });

      const result = await authService.verifyMfaLogin(
        { mfaSessionToken: 'valid-session', recoveryCode: 'RECO-VERY' },
        '127.0.0.1',
      );

      expect(result.accessToken).toBeDefined();
      expect(result.user.roles).toContain('SUPER_ADMIN');
    });

    it('should reject already used recovery code', async () => {
      jest.spyOn(mfaService, 'verifyPendingMfaToken').mockResolvedValue({
        sub: 'super-admin-1',
        email: 'superadmin@dartcodes.com',
        userType: 'SUPER_ADMIN',
        purpose: 'SUPER_ADMIN_MFA_PENDING',
      });

      prisma.superAdminUser.findUnique.mockResolvedValue({
        id: 'super-admin-1',
        name: 'Super Admin',
        email: 'superadmin@dartcodes.com',
        status: SuperAdminStatus.ACTIVE,
        mfaEnabled: true,
      });

      jest.spyOn(mfaService, 'verifyAndConsumeRecoveryCode').mockResolvedValue(false);

      await expect(
        authService.verifyMfaLogin(
          { mfaSessionToken: 'valid-session', recoveryCode: 'USED-CODE' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
