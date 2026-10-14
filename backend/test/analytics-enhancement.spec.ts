import { describe, it, expect } from '@jest/globals';

describe('Employee Performance & Customer Loyalty Analytics Logic Tests', () => {
  // Test Mock Types
  type SaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'VOID';

  interface MockSaleItem {
    id: string;
    itemType: 'service' | 'product';
    serviceId?: string;
    serviceName?: string;
    quantity: number;
    total: number;
    assignedEmployeeIds: string[];
  }

  interface MockSale {
    id: string;
    customerId: string | null;
    status: SaleStatus;
    total: number;
    refundedAmount: number;
    branchId: string;
    completedAt: Date;
    items: MockSaleItem[];
  }

  const isSaleIncludedInAnalytics = (status: SaleStatus) => status === 'COMPLETED';

  // 1. Employee Performance Calculation Helper
  function calculateEmployeePerformance(
    employeeId: string,
    sales: MockSale[],
    dateRange?: { from: Date; to: Date },
    branchId?: string,
  ) {
    const validSales = sales.filter((s) => {
      if (!isSaleIncludedInAnalytics(s.status)) return false;
      if (branchId && branchId !== 'all' && s.branchId !== branchId) return false;
      if (dateRange && (s.completedAt < dateRange.from || s.completedAt > dateRange.to)) return false;
      return true;
    });

    let servicesDone = 0;
    let salesGenerated = 0;
    const servedCustomerIds = new Set<string>();
    const serviceCounts = new Map<string, { name: string; count: number; revenue: number }>();

    for (const sale of validSales) {
      const netSaleTotal = Math.max(0, sale.total - (sale.refundedAmount || 0));
      const saleRatio = sale.total > 0 ? netSaleTotal / sale.total : 1;

      let employeePerformedInThisSale = false;

      for (const item of sale.items) {
        if (!item.assignedEmployeeIds.includes(employeeId)) continue;

        employeePerformedInThisSale = true;
        const itemNetRevenue = item.total * saleRatio;
        salesGenerated += itemNetRevenue;

        // Requirement: Services Done must only count completed SERVICE items
        if (item.itemType === 'service') {
          servicesDone += item.quantity;
          const sId = item.serviceId || 'unknown';
          const existing = serviceCounts.get(sId) || {
            name: item.serviceName || 'Unknown Service',
            count: 0,
            revenue: 0,
          };
          existing.count += item.quantity;
          existing.revenue += itemNetRevenue;
          serviceCounts.set(sId, existing);
        }
      }

      if (employeePerformedInThisSale && sale.customerId) {
        servedCustomerIds.add(sale.customerId);
      }
    }

    // Top service with deterministic tie-breaking:
    // 1. count DESC, 2. revenue DESC, 3. name ASC
    const sortedServices = Array.from(serviceCounts.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return a.name.localeCompare(b.name);
    });

    return {
      servicesDone,
      salesGenerated: Math.round(salesGenerated * 100) / 100,
      customersServed: servedCustomerIds.size,
      topService: sortedServices[0] ? { name: sortedServices[0].name, count: sortedServices[0].count } : null,
      top5Services: sortedServices.slice(0, 5),
    };
  }

  // 2. Customer Loyalty Analytics Helper
  function calculateCustomerLoyalty(
    customerId: string,
    sales: MockSale[],
    dateRange?: { from: Date; to: Date },
  ) {
    const validSales = sales.filter((s) => {
      if (s.customerId !== customerId) return false;
      if (!isSaleIncludedInAnalytics(s.status)) return false;
      if (dateRange && (s.completedAt < dateRange.from || s.completedAt > dateRange.to)) return false;
      return true;
    });

    const visitCount = validSales.length;
    let servicesTaken = 0;
    let totalSpend = 0;
    let latestVisit: Date | null = null;
    const serviceCounts = new Map<string, { name: string; count: number; revenue: number }>();

    for (const sale of validSales) {
      const netTotal = Math.max(0, sale.total - (sale.refundedAmount || 0));
      totalSpend += netTotal;
      if (!latestVisit || sale.completedAt > latestVisit) {
        latestVisit = sale.completedAt;
      }

      for (const item of sale.items) {
        if (item.itemType === 'service') {
          servicesTaken += item.quantity;
          const sId = item.serviceId || 'unknown';
          const existing = serviceCounts.get(sId) || {
            name: item.serviceName || 'Unknown Service',
            count: 0,
            revenue: 0,
          };
          existing.count += item.quantity;
          existing.revenue += item.total;
          serviceCounts.set(sId, existing);
        }
      }
    }

    const sortedServices = Array.from(serviceCounts.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return a.name.localeCompare(b.name);
    });

    return {
      visitCount,
      servicesTaken,
      totalSpend: Math.round(totalSpend * 100) / 100,
      lastVisit: latestVisit ? latestVisit.toISOString() : null,
      favouriteService: sortedServices[0] ? { name: sortedServices[0].name, count: sortedServices[0].count } : null,
    };
  }

  // ==========================================
  // EMPLOYEE PERFORMANCE SUITE
  // ==========================================
  describe('Employee Performance Calculations', () => {
    it('calculates employee sales generated from attributed items only', () => {
      const mockSales: MockSale[] = [
        {
          id: 'sale-1',
          customerId: 'cust-1',
          status: 'COMPLETED',
          total: 10000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-01'),
          items: [
            {
              id: 'item-1',
              itemType: 'service',
              serviceId: 's-1',
              serviceName: 'Hair Cut',
              quantity: 1,
              total: 4000,
              assignedEmployeeIds: ['emp-kasun'],
            },
            {
              id: 'item-2',
              itemType: 'service',
              serviceId: 's-2',
              serviceName: 'Coloring',
              quantity: 1,
              total: 6000,
              assignedEmployeeIds: ['emp-nimal'], // not Kasun
            },
          ],
        },
      ];

      const res = calculateEmployeePerformance('emp-kasun', mockSales);
      expect(res.salesGenerated).toBe(4000);
      expect(res.servicesDone).toBe(1);
      expect(res.customersServed).toBe(1);
    });

    it('excludes product-only items from Services Done count', () => {
      const mockSales: MockSale[] = [
        {
          id: 'sale-1',
          customerId: 'cust-1',
          status: 'COMPLETED',
          total: 5000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-01'),
          items: [
            {
              id: 'item-1',
              itemType: 'product',
              quantity: 2,
              total: 5000,
              assignedEmployeeIds: ['emp-kasun'],
            },
          ],
        },
      ];

      const res = calculateEmployeePerformance('emp-kasun', mockSales);
      expect(res.servicesDone).toBe(0);
      expect(res.salesGenerated).toBe(5000);
    });

    it('excludes cancelled and void sales from employee analytics', () => {
      const mockSales: MockSale[] = [
        {
          id: 'sale-void',
          customerId: 'cust-1',
          status: 'VOID',
          total: 3000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-01'),
          items: [
            {
              id: 'i-1',
              itemType: 'service',
              serviceId: 's-1',
              serviceName: 'Hair Cut',
              quantity: 1,
              total: 3000,
              assignedEmployeeIds: ['emp-kasun'],
            },
          ],
        },
        {
          id: 'sale-cancelled',
          customerId: 'cust-2',
          status: 'CANCELLED',
          total: 3000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-01'),
          items: [
            {
              id: 'i-2',
              itemType: 'service',
              serviceId: 's-1',
              serviceName: 'Hair Cut',
              quantity: 1,
              total: 3000,
              assignedEmployeeIds: ['emp-kasun'],
            },
          ],
        },
      ];

      const res = calculateEmployeePerformance('emp-kasun', mockSales);
      expect(res.servicesDone).toBe(0);
      expect(res.salesGenerated).toBe(0);
      expect(res.customersServed).toBe(0);
      expect(res.topService).toBeNull();
    });

    it('determines Top Service with deterministic count and revenue tie-break', () => {
      const mockSales: MockSale[] = [
        {
          id: 'sale-1',
          customerId: 'cust-1',
          status: 'COMPLETED',
          total: 9000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-01'),
          items: [
            {
              id: 'i-1',
              itemType: 'service',
              serviceId: 's-haircut',
              serviceName: 'Hair Cut',
              quantity: 2,
              total: 4000,
              assignedEmployeeIds: ['emp-kasun'],
            },
            {
              id: 'i-2',
              itemType: 'service',
              serviceId: 's-beard',
              serviceName: 'Beard Trim',
              quantity: 2,
              total: 5000, // Tied in count (2 vs 2), but higher revenue (5000 vs 4000)
              assignedEmployeeIds: ['emp-kasun'],
            },
          ],
        },
      ];

      const res = calculateEmployeePerformance('emp-kasun', mockSales);
      expect(res.servicesDone).toBe(4);
      expect(res.topService?.name).toBe('Beard Trim');
    });

    it('counts unique customers served even if served across multiple sales, excluding null walk-ins', () => {
      const mockSales: MockSale[] = [
        {
          id: 'sale-1',
          customerId: 'cust-amal',
          status: 'COMPLETED',
          total: 2000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-01'),
          items: [{ id: 'i-1', itemType: 'service', quantity: 1, total: 2000, assignedEmployeeIds: ['emp-kasun'] }],
        },
        {
          id: 'sale-2',
          customerId: 'cust-amal', // Same customer
          status: 'COMPLETED',
          total: 2000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-02'),
          items: [{ id: 'i-2', itemType: 'service', quantity: 1, total: 2000, assignedEmployeeIds: ['emp-kasun'] }],
        },
        {
          id: 'sale-3',
          customerId: null, // Walk-in without profile
          status: 'COMPLETED',
          total: 2000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-03'),
          items: [{ id: 'i-3', itemType: 'service', quantity: 1, total: 2000, assignedEmployeeIds: ['emp-kasun'] }],
        },
      ];

      const res = calculateEmployeePerformance('emp-kasun', mockSales);
      expect(res.customersServed).toBe(1); // Only cust-amal
      expect(res.servicesDone).toBe(3);
    });

    it('handles employee with zero sales cleanly', () => {
      const res = calculateEmployeePerformance('emp-idle', []);
      expect(res.servicesDone).toBe(0);
      expect(res.salesGenerated).toBe(0);
      expect(res.customersServed).toBe(0);
      expect(res.topService).toBeNull();
    });
  });

  // ==========================================
  // CUSTOMER LOYALTY ANALYTICS SUITE
  // ==========================================
  describe('Customer Loyalty Analytics Calculations', () => {
    it('calculates Visits, Services Taken, Total Spend, and Favourite Service according to specs', () => {
      // Customer Amal:
      // Visit 1: Hair Cut + Beard Trim
      // Visit 2: Hair Cut
      // Visit 3: Product only
      const mockSales: MockSale[] = [
        {
          id: 'sale-1',
          customerId: 'cust-amal',
          status: 'COMPLETED',
          total: 5000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-01T10:00:00Z'),
          items: [
            { id: 'i-1', itemType: 'service', serviceId: 's-1', serviceName: 'Hair Cut', quantity: 1, total: 3000, assignedEmployeeIds: ['emp-1'] },
            { id: 'i-2', itemType: 'service', serviceId: 's-2', serviceName: 'Beard Trim', quantity: 1, total: 2000, assignedEmployeeIds: ['emp-1'] },
          ],
        },
        {
          id: 'sale-2',
          customerId: 'cust-amal',
          status: 'COMPLETED',
          total: 3000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-05T14:00:00Z'),
          items: [
            { id: 'i-3', itemType: 'service', serviceId: 's-1', serviceName: 'Hair Cut', quantity: 1, total: 3000, assignedEmployeeIds: ['emp-1'] },
          ],
        },
        {
          id: 'sale-3',
          customerId: 'cust-amal',
          status: 'COMPLETED',
          total: 1500,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-10T16:00:00Z'),
          items: [
            { id: 'i-4', itemType: 'product', quantity: 1, total: 1500, assignedEmployeeIds: ['emp-1'] },
          ],
        },
      ];

      const res = calculateCustomerLoyalty('cust-amal', mockSales);

      expect(res.visitCount).toBe(3); // 3 completed sales
      expect(res.servicesTaken).toBe(3); // Hair Cut + Beard Trim + Hair Cut (product excluded)
      expect(res.totalSpend).toBe(9500); // 5000 + 3000 + 1500
      expect(res.favouriteService?.name).toBe('Hair Cut');
      expect(res.favouriteService?.count).toBe(2);
      expect(res.lastVisit).toBe('2026-10-10T16:00:00.000Z');
    });

    it('excludes cancelled or void sales from customer visits and total spend', () => {
      const mockSales: MockSale[] = [
        {
          id: 'sale-1',
          customerId: 'cust-amal',
          status: 'CANCELLED',
          total: 5000,
          refundedAmount: 0,
          branchId: 'b-1',
          completedAt: new Date('2026-10-01'),
          items: [{ id: 'i-1', itemType: 'service', quantity: 1, total: 5000, assignedEmployeeIds: ['emp-1'] }],
        },
      ];

      const res = calculateCustomerLoyalty('cust-amal', mockSales);
      expect(res.visitCount).toBe(0);
      expect(res.servicesTaken).toBe(0);
      expect(res.totalSpend).toBe(0);
      expect(res.lastVisit).toBeNull();
    });

    it('handles customer with zero activity cleanly', () => {
      const res = calculateCustomerLoyalty('cust-new', []);
      expect(res.visitCount).toBe(0);
      expect(res.servicesTaken).toBe(0);
      expect(res.totalSpend).toBe(0);
      expect(res.lastVisit).toBeNull();
      expect(res.favouriteService).toBeNull();
    });
  });
});
