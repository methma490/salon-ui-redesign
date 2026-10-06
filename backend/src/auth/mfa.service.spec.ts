import * as bcrypt from 'bcrypt';
import { MfaService } from './mfa.service';
import { generateTotpCode, generateTotpSecret } from '../common/utils/totp.util';

describe('MfaService', () => {
  let service: MfaService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(() => {
    prisma = {
      superAdminMfaRecoveryCode: {
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'jwt.accessSecret') return 'test-jwt-secret';
        return defaultValue;
      }),
    };

    service = new MfaService(prisma, jwtService, configService);
    jest.clearAllMocks();
  });

  describe('generateMfaSetup', () => {
    it('should generate a valid secret, otpauth URI, QR data URL, and 8 recovery codes', async () => {
      const result = await service.generateMfaSetup('superadmin@dartcodes.com');

      expect(result.secret).toBeDefined();
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.otpauthUrl).toContain('superadmin%40dartcodes.com');
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(result.recoveryCodes).toHaveLength(8);
      result.recoveryCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });
  });

  describe('verifyTotp', () => {
    it('should return true for a valid current TOTP code', () => {
      const secret = generateTotpSecret(20);
      const code = generateTotpCode(secret);

      expect(service.verifyTotp(code, secret)).toBe(true);
    });

    it('should return false for an incorrect TOTP code', () => {
      const secret = generateTotpSecret(20);
      expect(service.verifyTotp('000000', secret)).toBe(false);
    });

    it('should handle codes with whitespace gracefully', () => {
      const secret = generateTotpSecret(20);
      const code = generateTotpCode(secret);
      const codeWithSpace = `${code.slice(0, 3)} ${code.slice(3)}`;

      expect(service.verifyTotp(codeWithSpace, secret)).toBe(true);
    });
  });

  describe('verifyAndConsumeRecoveryCode', () => {
    it('should verify and consume a valid unused recovery code', async () => {
      const plainCode = 'ABCD-1234';
      const normalizedCode = 'ABCD1234';
      const codeHash = await bcrypt.hash(normalizedCode, 10);

      prisma.superAdminMfaRecoveryCode.findMany.mockResolvedValue([
        { id: 'rec-1', superAdminId: 'admin-1', codeHash, usedAt: null },
      ]);
      prisma.superAdminMfaRecoveryCode.update.mockResolvedValue({
        id: 'rec-1',
        usedAt: new Date(),
      });

      const isValid = await service.verifyAndConsumeRecoveryCode('admin-1', plainCode);
      expect(isValid).toBe(true);
      expect(prisma.superAdminMfaRecoveryCode.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should reject already used recovery codes', async () => {
      prisma.superAdminMfaRecoveryCode.findMany.mockResolvedValue([]);

      const isValid = await service.verifyAndConsumeRecoveryCode('admin-1', 'USED-CODE');
      expect(isValid).toBe(false);
      expect(prisma.superAdminMfaRecoveryCode.update).not.toHaveBeenCalled();
    });

    it('should reject invalid recovery codes', async () => {
      const codeHash = await bcrypt.hash('CORRECT1', 10);
      prisma.superAdminMfaRecoveryCode.findMany.mockResolvedValue([
        { id: 'rec-1', superAdminId: 'admin-1', codeHash, usedAt: null },
      ]);

      const isValid = await service.verifyAndConsumeRecoveryCode('admin-1', 'WRONG-CODE');
      expect(isValid).toBe(false);
    });
  });

  describe('saveRecoveryCodes', () => {
    it('should delete existing codes and insert hashed new codes', async () => {
      prisma.superAdminMfaRecoveryCode.deleteMany.mockResolvedValue({ count: 5 });
      prisma.superAdminMfaRecoveryCode.create.mockResolvedValue({ id: 'new-id' });

      await service.saveRecoveryCodes('admin-1', ['AAAA-1111', 'BBBB-2222']);

      expect(prisma.superAdminMfaRecoveryCode.deleteMany).toHaveBeenCalledWith({
        where: { superAdminId: 'admin-1' },
      });
      expect(prisma.superAdminMfaRecoveryCode.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('createPendingMfaToken & verifyPendingMfaToken', () => {
    it('should sign and verify ephemeral pending MFA session tokens', async () => {
      jwtService.signAsync.mockResolvedValue('signed.mfa.token');
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'admin-uuid',
        email: 'admin@example.com',
        userType: 'SUPER_ADMIN',
        purpose: 'SUPER_ADMIN_MFA_PENDING',
      });

      const token = await service.createPendingMfaToken('admin-uuid', 'admin@example.com');
      expect(token).toBe('signed.mfa.token');

      const payload = await service.verifyPendingMfaToken('signed.mfa.token');
      expect(payload.sub).toBe('admin-uuid');
      expect(payload.email).toBe('admin@example.com');
    });
  });
});
