import { ForbiddenException } from '@nestjs/common';
import { TenantDemoController } from '../../tenant/tenant-demo.controller';
import { DemoResetService } from './demo-reset.service';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';

describe('TenantDemoController', () => {
  let controller: TenantDemoController;
  let demoResetServiceMock: any;

  beforeEach(() => {
    demoResetServiceMock = {
      resetDemoTenant: jest.fn(),
    };
    controller = new TenantDemoController(demoResetServiceMock as DemoResetService);
  });

  it('calls resetDemoTenant using authenticated tenant context', async () => {
    const mockTenantContext: TenantContext = {
      tenantId: 'demo-tenant-001',
      userId: 'admin-user-001',
      userEmail: 'demo.plan1@salon.local',
      userRoles: ['SALON_ADMIN'],
      schemaName: 'tenant_demo_salon_plan_one_000003',
      tenantCode: 'SAL000003',
      tenantName: 'Demo Salon - Plan One',
      status: 'ACTIVE',
    };

    const mockReq = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Jest-Test-Agent',
      },
    } as any;

    demoResetServiceMock.resetDemoTenant.mockResolvedValue({
      success: true,
      tenantId: 'demo-tenant-001',
      schemaName: 'tenant_demo_salon_plan_one_000003',
      demoProfile: 'PLAN_ONE_DEMO',
      lastDemoResetAt: new Date('2026-10-09T10:00:00Z'),
    });

    const response = await controller.resetDemoData(mockTenantContext, mockReq);

    expect(demoResetServiceMock.resetDemoTenant).toHaveBeenCalledWith('demo-tenant-001', {
      performedBy: 'demo.plan1@salon.local',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest-Test-Agent',
    });

    expect(response).toEqual({
      success: true,
      message: 'Demo data restored successfully.',
      tenantId: 'demo-tenant-001',
      schemaName: 'tenant_demo_salon_plan_one_000003',
      lastDemoResetAt: new Date('2026-10-09T10:00:00Z'),
    });
  });

  it('propagates ForbiddenException when tenant is not a demo tenant', async () => {
    const mockTenantContext: TenantContext = {
      tenantId: 'real-customer-salon-001',
      userId: 'real-admin-user',
      userEmail: 'owner@realsalon.lk',
      userRoles: ['SALON_ADMIN'],
      schemaName: 'tenant_real_salon_000001',
      tenantCode: 'SAL000001',
      tenantName: 'Real Customer Salon',
      status: 'ACTIVE',
    };

    const mockReq = {
      ip: '127.0.0.1',
      headers: {},
    } as any;

    demoResetServiceMock.resetDemoTenant.mockRejectedValue(
      new ForbiddenException('Reset is allowed ONLY for dedicated demo salon accounts.'),
    );

    await expect(controller.resetDemoData(mockTenantContext, mockReq)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
