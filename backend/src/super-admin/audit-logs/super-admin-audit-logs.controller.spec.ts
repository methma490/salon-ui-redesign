import { SuperAdminAuditLogsController } from './super-admin-audit-logs.controller';

describe('SuperAdminAuditLogsController', () => {
  let controller: SuperAdminAuditLogsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      getAuditLogs: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'log-1',
            action: 'SALON_CREATE',
            entityType: 'TENANT',
            entityId: 'tenant-1',
            adminUser: { name: 'Super Admin', email: 'admin@platform.com' },
            createdAt: new Date(),
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    };

    controller = new SuperAdminAuditLogsController(mockService);
    jest.clearAllMocks();
  });

  it('should return paginated audit logs from service', async () => {
    const result = await controller.getAuditLogs({
      page: 1,
      limit: 10,
      action: 'SALON_CREATE',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].action).toBe('SALON_CREATE');
    expect(mockService.getAuditLogs).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      action: 'SALON_CREATE',
    });
  });
});
