import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { SuperAdminAuditLogsService } from './super-admin-audit-logs.service';

describe('SuperAdminAuditLogsService', () => {
  let service: SuperAdminAuditLogsService;
  let prisma: PrismaService;

  const mockPrisma = {
    superAdminAuditLog: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminAuditLogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SuperAdminAuditLogsService>(SuperAdminAuditLogsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('sanitizeData', () => {
    it('should deeply sanitize and redact sensitive fields', () => {
      const payload = {
        name: 'Grand Luxury Salon',
        password: 'SuperSecretPassword123!',
        password_hash: '$2b$12$somehashhere',
        apiKey: 'sk_live_12345',
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        recovery_codes: ['AAAA-1111', 'BBBB-2222'],
        payhereSecret: '4x0912j0192',
        nested: {
          user: 'admin',
          passwordHash: 'secret_hash',
          normalField: 'all-good',
        },
      };

      const sanitized = service.sanitizeData(payload);

      expect(sanitized.name).toBe('Grand Luxury Salon');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.password_hash).toBe('[REDACTED]');
      expect(sanitized.mfa_secret).toBe('[REDACTED]');
      expect(sanitized.recovery_codes).toBe('[REDACTED]');
      expect(sanitized.payhereSecret).toBe('[REDACTED]');
      expect(sanitized.nested.passwordHash).toBe('[REDACTED]');
      expect(sanitized.nested.normalField).toBe('all-good');
    });
  });

  describe('logAction', () => {
    it('should create an audit log record with sanitized payloads', async () => {
      mockPrisma.superAdminAuditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logAction({
        adminUserId: 'admin-1',
        action: 'SALON_CREATE',
        entityType: 'TENANT',
        entityId: 'tenant-1',
        tenantId: 'tenant-1',
        newValue: {
          name: 'Salon Central',
          adminPassword: 'plaintext-pass',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockPrisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminUserId: 'admin-1',
          action: 'SALON_CREATE',
          entityType: 'TENANT',
          entityId: 'tenant-1',
          tenantId: 'tenant-1',
          newValue: expect.objectContaining({
            name: 'Salon Central',
            adminPassword: '[REDACTED]',
          }),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs with search and filtering', async () => {
      mockPrisma.superAdminAuditLog.count.mockResolvedValue(1);
      mockPrisma.superAdminAuditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          adminUserId: 'admin-1',
          action: 'SALON_CREATE',
          entityType: 'TENANT',
          adminUser: { id: 'admin-1', name: 'Super Admin', email: 'admin@dartcodes.com' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.getAuditLogs({
        page: 1,
        limit: 10,
        action: 'SALON_CREATE',
        entityType: 'TENANT',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.data[0].action).toBe('SALON_CREATE');
    });
  });
});
