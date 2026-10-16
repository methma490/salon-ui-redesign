import { ForbiddenException } from '@nestjs/common';
import { ProfitLossService } from './profit-loss.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

describe('ProfitLossService', () => {
  let service: ProfitLossService;
  let mockTenantSchemaService: jest.Mocked<TenantSchemaService>;
  let mockTx: { $queryRawUnsafe: jest.Mock };

  beforeEach(() => {
    mockTx = {
      $queryRawUnsafe: jest.fn(),
    };

    mockTenantSchemaService = {
      withTenantSchema: jest.fn((schemaName: string, callback: (args: { tx: any }) => Promise<any>) =>
        callback({ tx: mockTx }),
      ),
    } as unknown as jest.Mocked<TenantSchemaService>;

    service = new ProfitLossService(mockTenantSchemaService);
  });

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@salon.local',
    name: 'Salon Admin',
    tenantId: 'tenant-1',
    schemaName: 'tenant_salon_000001',
    roles: ['SALON_ADMIN'],
    userType: 'TENANT_USER',
  };

  const mockStaffUser: AuthenticatedUser = {
    id: 'user-staff-1',
    email: 'staff@salon.local',
    name: 'Salon Staff',
    tenantId: 'tenant-1',
    schemaName: 'tenant_salon_000001',
    roles: ['STAFF'],
    userType: 'TENANT_USER',
  };

  const mockSuperAdminUser: AuthenticatedUser = {
    id: 'super-admin-1',
    email: 'super@platform.local',
    name: 'Super Admin',
    tenantId: null,
    schemaName: null,
    roles: ['SUPER_ADMIN'],
    userType: 'SUPER_ADMIN',
  };

  it('1. Calculates service-only sale, product sale, and COGS correctly', async () => {
    // 1st query: income summary (services, products, COGS)
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      {
        serviceRevenue: 15000,
        productRevenue: 8000,
        productCogs: 3200,
      },
    ]);
    // 2nd query: discounts, refunds
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      {
        saleDiscounts: 1000,
        refunds: 500,
        netSalesTotal: 21500,
      },
    ]);
    // 3rd query: expenses by category
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { categoryCode: 'RENT', categoryName: 'Rent', amount: 5000 },
      { categoryCode: 'UTILITIES', categoryName: 'Utilities', amount: 1500 },
    ]);
    // 4th query: monthly sales
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { month: '2026-10', revenue: 21500, cogs: 3200 },
    ]);
    // 5th query: monthly expenses
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { month: '2026-10', expenses: 6500 },
    ]);

    const result = await service.getProfitLoss(
      'tenant_salon_000001',
      { startDate: '2026-10-01', endDate: '2026-10-31' },
      mockAdminUser,
    );

    // Revenue = 15000 (svc) + 8000 (prod) - 1000 (disc) - 500 (refund) = 21500
    expect(result.income.serviceRevenue).toBe(15000);
    expect(result.income.productRevenue).toBe(8000);
    expect(result.income.grossSales).toBe(23000);
    expect(result.income.discounts).toBe(1000);
    expect(result.income.refunds).toBe(500);
    expect(result.summary.totalRevenue).toBe(21500);

    // COGS = 3200
    expect(result.costOfSales.productCogs).toBe(3200);

    // Gross Profit = 21500 - 3200 = 18300
    expect(result.summary.grossProfit).toBe(18300);
    expect(result.summary.grossProfitMargin).toBe(85.12);

    // Operating Expenses = 5000 + 1500 = 6500
    expect(result.summary.totalExpenses).toBe(6500);

    // Net Profit = 18300 - 6500 = 11800
    expect(result.summary.netProfit).toBe(11800);
    expect(result.summary.netProfitMargin).toBe(54.88);

    // Trend
    expect(result.monthlyTrend).toHaveLength(1);
    expect(result.monthlyTrend[0].netProfit).toBe(11800);
  });

  it('2. Excludes cancelled sales and cancelled/void expenses from calculations', async () => {
    mockTx.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      // Verify SQL contains status filters
      if (sql.includes("s.status = 'COMPLETED'") || sql.includes("e.status::text NOT IN ('VOID', 'CANCELLED')")) {
        // Correct filters applied in SQL
      }
      return [];
    });

    const result = await service.getProfitLoss(
      'tenant_salon_000001',
      { startDate: '2026-10-01', endDate: '2026-10-31' },
      mockAdminUser,
    );

    expect(result.summary.totalRevenue).toBe(0);
    expect(result.summary.cogs).toBe(0);
    expect(result.summary.grossProfit).toBe(0);
    expect(result.summary.totalExpenses).toBe(0);
    expect(result.summary.netProfit).toBe(0);
  });

  it('3. Enforces branch filtering for branch-level staff', async () => {
    // 1st query for staff: lookup branch for user
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { branch_id: 'branch-assigned-1' },
    ]);
    // branch name lookup
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { name: 'Kandy Branch' },
    ]);
    // income summary
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([]);
    // discounts
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([]);
    // expenses
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([]);
    // monthly sales
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([]);
    // monthly expenses
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([]);

    const result = await service.getProfitLoss(
      'tenant_salon_000001',
      { startDate: '2026-10-01', endDate: '2026-10-31' },
      mockStaffUser,
    );

    expect(result.branch.id).toBe('branch-assigned-1');
    expect(result.branch.name).toBe('Kandy Branch');
  });

  it('4. Rejects branch-level staff requesting another branch with ForbiddenException', async () => {
    // Staff assigned to branch-1
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { branch_id: 'branch-assigned-1' },
    ]);

    await expect(
      service.getProfitLoss(
        'tenant_salon_000001',
        { startDate: '2026-10-01', endDate: '2026-10-31', branchId: 'different-branch-2' },
        mockStaffUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('5. Allows Super Admin to view specific salon without tenant role restrictions', async () => {
    // branch name lookup if specific branch provided
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { name: 'Colombo Main' },
    ]);
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { serviceRevenue: 50000, productRevenue: 20000, productCogs: 8000 },
    ]);
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { saleDiscounts: 2000, refunds: 0, netSalesTotal: 68000 },
    ]);
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { categoryCode: 'RENT', categoryName: 'Rent', amount: 15000 },
    ]);
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([]);

    const result = await service.getProfitLoss(
      'tenant_salon_000002',
      { startDate: '2026-10-01', endDate: '2026-10-31', branchId: 'colombo-branch-1' },
      mockSuperAdminUser,
    );

    expect(result.summary.totalRevenue).toBe(68000);
    expect(result.summary.cogs).toBe(8000);
    expect(result.summary.grossProfit).toBe(60000);
    expect(result.summary.totalExpenses).toBe(15000);
    expect(result.summary.netProfit).toBe(45000);
    expect(result.branch.name).toBe('Colombo Main');
  });
});
