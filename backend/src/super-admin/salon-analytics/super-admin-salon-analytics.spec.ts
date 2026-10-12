import { NotFoundException } from '@nestjs/common';
import { SuperAdminSalonAnalyticsService } from './super-admin-salon-analytics.service';
import { TenantStatus } from '@prisma/client';

describe('SuperAdminSalonAnalyticsService', () => {
  let service: SuperAdminSalonAnalyticsService;
  let mockPrisma: any;
  let mockTenantSchemaService: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      $queryRawUnsafe: jest.fn(),
    };

    mockTenantSchemaService = {
      withTenantSchema: jest.fn().mockImplementation((_schema, callback) => {
        return callback({ tx: mockTx });
      }),
    };

    mockPrisma = {
      tenant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockProfitLossService = {
      getProfitLoss: jest.fn(),
    } as any;

    service = new SuperAdminSalonAnalyticsService(mockPrisma, mockTenantSchemaService, mockProfitLossService);
  });

  describe('resolveTenantContext & Multi-Tenant Security', () => {
    it('3 & 17. should resolve tenant context with trusted schema name and support ACTIVE, TRIAL, SUSPENDED salons', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        name: 'Studio Luxe',
        code: 'SAL-0001',
        status: TenantStatus.SUSPENDED,
        schemaName: 'tenant_000001',
        subscriptions: [{ plan: { name: 'Gold Plan', code: 'GOLD' } }],
      });

      const context = await service.resolveTenantContext('tenant-123');
      expect(context.tenant.id).toBe('tenant-123');
      expect(context.schemaName).toBe('tenant_000001');
      expect(context.planName).toBe('Gold Plan');
      expect(context.tenant.status).toBe(TenantStatus.SUSPENDED);
    });

    it('4. should reject non-existent tenant ID with NotFoundException', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.resolveTenantContext('tenant-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('3. should reject malicious schema name if tenant record was corrupted', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-evil',
        name: 'Evil Salon',
        code: 'SAL-666',
        status: TenantStatus.ACTIVE,
        schemaName: 'tenant_000001; DROP TABLE users;--',
        subscriptions: [],
      });

      await expect(service.resolveTenantContext('tenant-evil')).rejects.toThrow();
    });
  });

  describe('getSalonAnalyticsList & Summary Aggregation', () => {
    it('1, 6, 7, 8, 9, 10, 15. should aggregate salon KPIs and platform summary accurately', async () => {
      mockPrisma.tenant.count.mockResolvedValue(2);
      mockPrisma.tenant.findMany.mockResolvedValue([
        {
          id: 'tenant-1',
          name: 'Salon Alpha',
          code: 'SAL-001',
          status: 'ACTIVE',
          schemaName: 'tenant_000001',
          subscriptions: [{ plan: { name: 'Silver' } }],
        },
        {
          id: 'tenant-2',
          name: 'Salon Beta',
          code: 'SAL-002',
          status: 'ACTIVE',
          schemaName: 'tenant_000002',
          subscriptions: [{ plan: { name: 'Gold' } }],
        },
      ]);

      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('sale_items')) {
          return Promise.resolve([{ name: 'Hair Cut & Styling' }]);
        }
        if (sql.includes('customers')) {
          return Promise.resolve([{ count: 150n }]);
        }
        if (sql.includes('sales') && sql.includes('COUNT(*)')) {
          return Promise.resolve([{ count: 80n, revenue: '250000' }]);
        }
        if (sql.includes('expenses')) {
          return Promise.resolve([{ total: '80000' }]);
        }
        if (sql.includes('payroll_runs')) {
          return Promise.resolve([{ total: '50000' }]);
        }
        if (sql.includes('appointments')) {
          return Promise.resolve([{ total: 100n, completed: 85n, cancelled: 10n }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getSalonAnalyticsList({
        from: '2026-03-01',
        to: '2026-03-31',
        limit: 10,
        page: 1,
      });

      expect(result.summary.totalSalons).toBe(2);
      expect(result.summary.totalCustomers).toBe(300); // 150 * 2
      expect(result.summary.totalSales).toBe(160); // 80 * 2
      expect(result.summary.totalRevenue).toBe(500000); // 250k * 2
      expect(result.summary.totalEstimatedProfit).toBe(240000); // (250k - 80k - 50k) * 2 = 120k * 2
      expect(result.summary.totalAppointments).toBe(200);
      expect(result.summary.cancelledAppointments).toBe(20);

      expect(result.salons).toHaveLength(2);
      expect(result.salons[0].revenue).toBe(250000);
      expect(result.salons[0].estimatedProfit).toBe(120000);
      expect(result.salons[0].topService).toBe('Hair Cut & Styling');
      expect(result.meta.totalPages).toBe(1);
    });

    it('14. should handle empty tenant data safely returning 0 and empty stats', async () => {
      mockPrisma.tenant.count.mockResolvedValue(1);
      mockPrisma.tenant.findMany.mockResolvedValue([
        {
          id: 'tenant-empty',
          name: 'Empty Salon',
          code: 'SAL-000',
          status: 'ACTIVE',
          schemaName: 'tenant_000003',
          subscriptions: [],
        },
      ]);

      mockTx.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.getSalonAnalyticsList({});
      expect(result.summary.totalRevenue).toBe(0);
      expect(result.summary.totalSales).toBe(0);
      expect(result.summary.totalCustomers).toBe(0);
      expect(result.salons[0].revenue).toBe(0);
      expect(result.salons[0].topService).toBeNull();
    });
  });

  describe('Salon 360 Detail Overview', () => {
    it('6, 7, 8, 9, 10, 13. should compute Salon Overview KPIs and trends', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-detail',
        name: 'Grand Salon',
        code: 'SAL-007',
        status: TenantStatus.ACTIVE,
        schemaName: 'tenant_000007',
        subscriptions: [{ plan: { name: 'Platinum', code: 'PLATINUM' } }],
      });

      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('branches')) {
          return Promise.resolve([{ count: 2n }]);
        }
        if (sql.includes('WHERE created_at >=') && sql.includes('customers')) {
          return Promise.resolve([{ count: 35n }]);
        }
        if (sql.includes('SELECT COUNT(*)::bigint AS count FROM') && sql.includes('customers')) {
          return Promise.resolve([{ count: 200n }]);
        }
        if (sql.includes('HAVING COUNT(*) > 1')) {
          return Promise.resolve([{ count: 65n }]);
        }
        if (sql.includes('sales') && sql.includes('COUNT(*)::bigint AS count')) {
          return Promise.resolve([{ count: 120n, revenue: '480000' }]);
        }
        if (sql.includes('expenses') && sql.includes('SUM(amount)')) {
          return Promise.resolve([{ total: '150000' }]);
        }
        if (sql.includes('payroll_runs') && sql.includes('SUM(total_net)')) {
          return Promise.resolve([{ total: '120000' }]);
        }
        if (sql.includes('appointments') && sql.includes('no_show')) {
          return Promise.resolve([{
            total: 140n,
            confirmed: 20n,
            completed: 100n,
            cancelled: 15n,
            no_show: 5n,
            pending: 10n,
            upcoming: 12n,
          }]);
        }
        return Promise.resolve([]);
      });

      const overview = await service.getSalonOverview('tenant-detail', {
        from: '2026-03-01',
        to: '2026-03-31',
      });

      expect(overview.salon.name).toBe('Grand Salon');
      expect(overview.salon.branchesCount).toBe(2);
      expect(overview.kpis.totalCustomers).toBe(200);
      expect(overview.kpis.newCustomers).toBe(35);
      expect(overview.kpis.returningCustomers).toBe(65);
      expect(overview.kpis.totalSales).toBe(120);
      expect(overview.kpis.revenue).toBe(480000);
      expect(overview.kpis.averageSaleValue).toBe(4000); // 480k / 120
      expect(overview.kpis.operatingExpenses).toBe(150000);
      expect(overview.kpis.salaries).toBe(120000);
      expect(overview.kpis.totalExpenses).toBe(270000);
      expect(overview.kpis.estimatedProfit).toBe(210000); // 480k - 270k
      expect(overview.kpis.completedAppointments).toBe(100);
      expect(overview.kpis.cancelledAppointments).toBe(15);
      expect(overview.kpis.noShowAppointments).toBe(5);
    });
  });

  describe('Salon 360 Customers Tab', () => {
    it('5 & 7. should query salon customers with visit and spend history in isolated schema', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-cust',
        name: 'Glamour Room',
        code: 'SAL-010',
        status: TenantStatus.ACTIVE,
        schemaName: 'tenant_000010',
        subscriptions: [],
      });

      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT COUNT(*)::bigint AS total FROM') && sql.includes('customers')) {
          return Promise.resolve([{ total: 50n }]);
        }
        if (sql.includes('SELECT COUNT(*)::bigint AS count FROM') && sql.includes('customers')) {
          return Promise.resolve([{ count: 1n }]);
        }
        if (sql.includes('SELECT c.id, c.name, c.phone')) {
          return Promise.resolve([
            {
              id: 'c-1',
              name: 'Dilshan Silva',
              phone: '0771234567',
              email: 'dilshan@gmail.com',
              status: 'ACTIVE',
              createdAt: new Date('2026-01-10'),
              totalVisits: 5n,
              totalSpend: '45000',
              lastVisit: '2026-03-20',
            },
          ]);
        }
        return Promise.resolve([{ total: 0n, top_spend: '45000' }]);
      });

      const res = await service.getSalonCustomers('tenant-cust', { search: 'Dilshan' });
      expect(res.customers).toHaveLength(1);
      expect(res.customers[0].name).toBe('Dilshan Silva');
      expect(res.customers[0].totalVisits).toBe(5);
      expect(res.customers[0].totalSpend).toBe(45000);
    });
  });

  describe('Salon 360 Services Tab', () => {
    it('10 & 11. should distinguish most booked service from highest revenue service', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-srv',
        name: 'Hair Studio',
        code: 'SAL-011',
        status: TenantStatus.ACTIVE,
        schemaName: 'tenant_000011',
        subscriptions: [],
      });

      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('HAVING COUNT(si.id) > 0')) {
          return Promise.resolve([
            { name: 'Keratin Treatment', bookings: 10n, revenue: '150000' },
            { name: 'Basic Haircut', bookings: 50n, revenue: '50000' },
          ]);
        }
        if (sql.includes('SELECT COUNT(*)::bigint AS count FROM')) {
          return Promise.resolve([{ count: 2n }]);
        }
        if (sql.includes('SELECT s.id, s.name, s.code')) {
          return Promise.resolve([
            {
              id: 's-1',
              name: 'Basic Haircut',
              code: 'SRV-01',
              categoryName: 'Hair',
              price: '1000',
              bookingsCount: 50n,
              uniqueCustomers: 40n,
              revenue: '50000',
            },
            {
              id: 's-2',
              name: 'Keratin Treatment',
              code: 'SRV-02',
              categoryName: 'Treatment',
              price: '15000',
              bookingsCount: 10n,
              uniqueCustomers: 10n,
              revenue: '150000',
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const res = await service.getSalonServices('tenant-srv', {});
      expect(res.highlights.mostBooked?.name).toBe('Basic Haircut');
      expect(res.highlights.mostBooked?.count).toBe(50);

      expect(res.highlights.highestRevenue?.name).toBe('Keratin Treatment');
      expect(res.highlights.highestRevenue?.revenue).toBe(150000);
    });
  });

  describe('Salon 360 Finance Tab', () => {
    it('9 & 12. should calculate Finance metrics with zero double-counting of supplier payment expenses', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-fin',
        name: 'Apex Salon',
        code: 'SAL-012',
        status: TenantStatus.ACTIVE,
        schemaName: 'tenant_000012',
        subscriptions: [],
      });

      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('sales') && sql.includes('SUM(total)')) {
          return Promise.resolve([{ total: '600000' }]);
        }
        if (sql.includes('expenses') && (sql.includes('SUPPLIER_PAYMENT') || sql.includes('supplier_payment_id'))) {
          return Promise.resolve([{ total: '80000' }]); // Part of operating expenses
        }
        if (sql.includes('expenses') && sql.includes('SUM(amount)')) {
          return Promise.resolve([{ total: '200000' }]); // Total active expenses (includes supplier payments)
        }
        if (sql.includes('payroll_runs') && sql.includes('SUM(total_net)')) {
          return Promise.resolve([{ total: '150000' }]);
        }
        if (sql.includes('expense_categories')) {
          return Promise.resolve([
            { category: 'Supplier Payments', amount: '80000' },
            { category: 'Utilities', amount: '70000' },
            { category: 'Rent', amount: '50000' },
          ]);
        }
        return Promise.resolve([]);
      });

      const fin = await service.getSalonFinance('tenant-fin', { from: '2026-03-01', to: '2026-03-31' });
      expect(fin.summary.revenue).toBe(600000);
      expect(fin.summary.operatingExpenses).toBe(200000);
      expect(fin.summary.supplierPaymentExpenses).toBe(80000);
      expect(fin.summary.salaries).toBe(150000);
      expect(fin.summary.totalExpenses).toBe(350000);
      expect(fin.summary.estimatedProfit).toBe(250000); // 600k - 200k - 150k
      expect(fin.expenseBreakdown).toHaveLength(3);
      expect(fin.expenseBreakdown[0].category).toBe('Supplier Payments');
    });
  });
});
