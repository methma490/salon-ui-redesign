import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DemoResetService } from './demo-reset.service';
import { DemoSeedService } from './demo-seed.service';

describe('DemoResetService', () => {
  let service: DemoResetService;
  let prismaMock: any;
  let demoSeedServiceMock: any;
  let auditLogsServiceMock: any;

  beforeEach(() => {
    demoSeedServiceMock = {
      seedBaseline: jest.fn().mockResolvedValue(undefined),
    };

    auditLogsServiceMock = {
      logAction: jest.fn().mockResolvedValue(undefined),
    };

    prismaMock = {
      tenant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      superAdminUser: {
        findFirst: jest.fn().mockResolvedValue({ id: 'admin-123' }),
      },
      $transaction: jest.fn(),
    };

    service = new DemoResetService(
      prismaMock as any,
      demoSeedServiceMock as DemoSeedService,
      auditLogsServiceMock as any,
    );
  });

  describe('resetDemoTenant', () => {
    it('CRITICAL SECURITY: rejects reset for real non-demo customer tenant (isDemo === false)', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'real-tenant-001',
        code: 'SAL000001',
        name: 'Real Customer Salon',
        schemaName: 'tenant_real_salon_000001',
        isDemo: false,
        demoProfile: null,
        demoResetInProgress: false,
      });

      await expect(
        service.resetDemoTenant('real-tenant-001', { performedBy: 'SALON_ADMIN' }),
      ).rejects.toThrow(
        new ForbiddenException('Reset is allowed ONLY for dedicated demo salon accounts.'),
      );

      expect(demoSeedServiceMock.seedBaseline).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if tenant ID does not exist', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.resetDemoTenant('non-existent-id', { performedBy: 'SALON_ADMIN' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if demoResetInProgress is already true', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'demo-tenant-001',
        code: 'SAL000003',
        name: 'Demo Salon - Plan One',
        schemaName: 'tenant_demo_salon_plan_one_000003',
        isDemo: true,
        demoProfile: 'PLAN_ONE_DEMO',
        demoResetInProgress: true,
      });

      await expect(
        service.resetDemoTenant('demo-tenant-001', { performedBy: 'SALON_ADMIN' }),
      ).rejects.toThrow(
        new ConflictException(
          'A demo reset operation is already in progress for this demo salon. Please wait.',
        ),
      );
    });

    it('resets demo tenant successfully when isDemo === true and records audit log', async () => {
      const tenant = {
        id: 'demo-tenant-001',
        code: 'SAL000003',
        name: 'Demo Salon - Plan One',
        schemaName: 'tenant_demo_salon_plan_one_000003',
        isDemo: true,
        demoProfile: 'PLAN_ONE_DEMO',
        demoResetInProgress: false,
      };
      prismaMock.tenant.findUnique.mockResolvedValue(tenant);
      prismaMock.tenant.update.mockResolvedValue(tenant);

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          $queryRawUnsafe: jest.fn().mockResolvedValue([{ lock_acquired: true }]),
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
          tenant: {
            update: jest.fn().mockResolvedValue({ ...tenant, demoResetInProgress: false }),
          },
        };
        return callback(txMock);
      });

      const result = await service.resetDemoTenant('demo-tenant-001', {
        performedBy: 'SALON_ADMIN',
      });

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe('demo-tenant-001');
      expect(result.schemaName).toBe('tenant_demo_salon_plan_one_000003');
      expect(demoSeedServiceMock.seedBaseline).toHaveBeenCalledWith(
        'tenant_demo_salon_plan_one_000003',
        'PLAN_ONE_DEMO',
        expect.anything(),
      );
      expect(auditLogsServiceMock.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DEMO_DATA_RESET',
          entityId: 'demo-tenant-001',
        }),
      );
    });

    it('rejects concurrent reset when advisory lock cannot be acquired', async () => {
      const tenant = {
        id: 'demo-tenant-001',
        code: 'SAL000003',
        name: 'Demo Salon - Plan One',
        schemaName: 'tenant_demo_salon_plan_one_000003',
        isDemo: true,
        demoProfile: 'PLAN_ONE_DEMO',
        demoResetInProgress: false,
      };
      prismaMock.tenant.findUnique.mockResolvedValue(tenant);
      prismaMock.tenant.update.mockResolvedValue(tenant);

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          $queryRawUnsafe: jest.fn().mockResolvedValue([{ lock_acquired: false }]),
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        };
        return callback(txMock);
      });

      await expect(
        service.resetDemoTenant('demo-tenant-001', { performedBy: 'SALON_ADMIN' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resetByProfile', () => {
    it('finds demo tenant with profile and calls resetDemoTenant', async () => {
      const tenant = {
        id: 'demo-tenant-002',
        code: 'SAL000004',
        name: 'Demo Salon - Plan Two',
        schemaName: 'tenant_demo_salon_plan_two_000004',
        isDemo: true,
        demoProfile: 'PLAN_TWO_DEMO',
      };
      prismaMock.tenant.findMany.mockResolvedValue([tenant]);
      jest.spyOn(service, 'resetDemoTenant').mockResolvedValue({
        success: true,
        tenantId: tenant.id,
        schemaName: tenant.schemaName,
        demoProfile: tenant.demoProfile,
        lastDemoResetAt: new Date(),
      });

      const results = await service.resetByProfile('PLAN_TWO_DEMO', 'CLI_ADMIN');
      expect(results.length).toBe(1);
      expect(service.resetDemoTenant).toHaveBeenCalledWith(tenant.id, { performedBy: 'CLI_ADMIN' });
    });

    it('throws NotFoundException if no demo tenant with profile found', async () => {
      prismaMock.tenant.findMany.mockResolvedValue([]);

      await expect(service.resetByProfile('UNKNOWN_PROFILE')).rejects.toThrow(NotFoundException);
    });
  });
});
