import { BadRequestException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { ExpensesService } from '../expenses/expenses.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';

describe('Supplier Payments → Expenses Integration', () => {
  let suppliersService: SuppliersService;
  let expensesService: ExpensesService;
  let dashboardService: DashboardService;
  let mockTenantSchemaService: TenantSchemaService;
  let mockTx: any;

  const schemaName = 'tenant_000001';
  const userId = 'usr-1111-2222-3333';

  beforeEach(() => {
    mockTx = {
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
    };

    mockTenantSchemaService = {
      withTenantSchema: jest.fn().mockImplementation((_schema, callback) => {
        return callback({ tx: mockTx, schemaName });
      }),
    } as any;

    suppliersService = new SuppliersService(mockTenantSchemaService);
    expensesService = new ExpensesService(mockTenantSchemaService);
    dashboardService = new DashboardService(mockTenantSchemaService);
  });

  describe('1. CASH payment creates one ACTIVE expense', () => {
    it('should create an active linked expense immediately when CASH payment is made', async () => {
      // Mock supplier lookup
      mockTx.$queryRawUnsafe.mockImplementation((sql: string, ...params: any[]) => {
        if (sql.includes('SELECT id, name FROM')) {
          return Promise.resolve([{ id: 'sup-1', name: 'L\'Oreal Professional' }]);
        }
        if (sql.includes('SELECT id, grn_number, total_amount, paid_amount, status FROM')) {
          return Promise.resolve([
            { id: 'grn-1', grn_number: 'GRN-0001', total_amount: 10000, paid_amount: 0, status: 'RECEIVED' },
          ]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('supplier_payments')) {
          return Promise.resolve([{
            id: 'pay-1',
            payment_number: 'PAY-0001',
            supplier_id: 'sup-1',
            amount: 5000,
            payment_method: 'CASH',
            payment_date: '2026-03-01',
            cheque_status: null,
            reference_number: 'REF-123',
            notes: 'Test cash payment',
            created_by: userId,
          }]);
        }
        if (sql.includes('SELECT id FROM') && sql.includes('expense_categories') && sql.includes('SUPPLIER_PAYMENT')) {
          return Promise.resolve([{ id: 'cat-supplier-payment' }]);
        }
        if (sql.includes('SELECT g.branch_id FROM') && sql.includes('supplier_payment_allocations')) {
          return Promise.resolve([{ branch_id: 'branch-1' }]);
        }
        if (sql.includes('SELECT id, status FROM') && sql.includes('expenses') && sql.includes('supplier_payment_id')) {
          return Promise.resolve([]); // Not existing yet
        }
        if (sql.includes('INSERT INTO') && sql.includes('expenses')) {
          return Promise.resolve([{ id: 'exp-1' }]);
        }
        return Promise.resolve([]);
      });

      const result = await suppliersService.createSupplierPayment(
        schemaName,
        {
          supplierId: 'sup-1',
          amount: 5000,
          paymentDate: '2026-03-01',
          paymentMethod: 'CASH',
          referenceNumber: 'REF-123',
          allocations: [{ grnId: 'grn-1', amount: 5000 }],
        },
        userId,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('pay-1');

      // Verify expense insertion was called with ACTIVE status and is_system_generated = true
      const insertExpenseCall = mockTx.$queryRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO') && call[0].includes('expenses'),
      );
      expect(insertExpenseCall).toBeDefined();
      expect(insertExpenseCall[0]).toContain('supplier_payment_id');
      expect(insertExpenseCall[0]).toContain('is_system_generated');
      // Params check: status = ACTIVE, is_system_generated = true
      expect(insertExpenseCall).toEqual(
        expect.arrayContaining(['ACTIVE', true, 'pay-1', 'CASH']),
      );
    });
  });

  describe('2. BANK_TRANSFER creates one ACTIVE expense', () => {
    it('should create an active linked expense immediately with BANK_TRANSFER method', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name FROM')) {
          return Promise.resolve([{ id: 'sup-1', name: 'Wella Hair Care' }]);
        }
        if (sql.includes('SELECT id, grn_number, total_amount, paid_amount, status FROM')) {
          return Promise.resolve([
            { id: 'grn-1', grn_number: 'GRN-0001', total_amount: 10000, paid_amount: 0, status: 'RECEIVED' },
          ]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('supplier_payments')) {
          return Promise.resolve([{
            id: 'pay-2',
            payment_number: 'PAY-0002',
            supplier_id: 'sup-1',
            amount: 8000,
            payment_method: 'BANK_TRANSFER',
            payment_date: '2026-03-02',
            cheque_status: null,
            reference_number: 'BT-999',
            notes: null,
            created_by: userId,
          }]);
        }
        if (sql.includes('SELECT id FROM') && sql.includes('expense_categories') && sql.includes('SUPPLIER_PAYMENT')) {
          return Promise.resolve([{ id: 'cat-supplier-payment' }]);
        }
        if (sql.includes('SELECT g.branch_id FROM') && sql.includes('supplier_payment_allocations')) {
          return Promise.resolve([{ branch_id: 'branch-1' }]);
        }
        if (sql.includes('SELECT id, status FROM') && sql.includes('expenses') && sql.includes('supplier_payment_id')) {
          return Promise.resolve([]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('expenses')) {
          return Promise.resolve([{ id: 'exp-2' }]);
        }
        return Promise.resolve([]);
      });

      const result = await suppliersService.createSupplierPayment(
        schemaName,
        {
          supplierId: 'sup-1',
          amount: 8000,
          paymentDate: '2026-03-02',
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'BT-999',
          allocations: [{ grnId: 'grn-1', amount: 8000 }],
        },
        userId,
      );

      expect(result.id).toBe('pay-2');
      const insertExpenseCall = mockTx.$queryRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO') && call[0].includes('expenses'),
      );
      expect(insertExpenseCall).toBeDefined();
      expect(insertExpenseCall).toEqual(
        expect.arrayContaining(['ACTIVE', true, 'pay-2', 'BANK_TRANSFER']),
      );
    });
  });

  describe('3. CHEQUE PENDING creates no active expense', () => {
    it('should NOT create an active expense when CHEQUE is PENDING', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name FROM')) {
          return Promise.resolve([{ id: 'sup-1', name: 'Schwarzkopf' }]);
        }
        if (sql.includes('SELECT id, grn_number, total_amount, paid_amount, status FROM')) {
          return Promise.resolve([
            { id: 'grn-1', grn_number: 'GRN-0001', total_amount: 15000, paid_amount: 0, status: 'RECEIVED' },
          ]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('supplier_payments')) {
          return Promise.resolve([{
            id: 'pay-3',
            payment_number: 'PAY-0003',
            supplier_id: 'sup-1',
            amount: 15000,
            payment_method: 'CHEQUE',
            payment_date: '2026-03-03',
            cheque_number: 'CHQ-001',
            cheque_status: 'PENDING',
            created_by: userId,
          }]);
        }
        return Promise.resolve([]);
      });

      const result = await suppliersService.createSupplierPayment(
        schemaName,
        {
          supplierId: 'sup-1',
          amount: 15000,
          paymentDate: '2026-03-03',
          paymentMethod: 'CHEQUE',
          chequeNumber: 'CHQ-001',
          allocations: [{ grnId: 'grn-1', amount: 15000 }],
        },
        userId,
      );

      expect(result.id).toBe('pay-3');
      // No expense insertion should have occurred
      const insertExpenseCall = mockTx.$queryRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO') && call[0].includes('expenses'),
      );
      expect(insertExpenseCall).toBeUndefined();
    });
  });

  describe('4. CHEQUE CLEARED creates/activates expense', () => {
    it('should create or activate the linked Expense when cheque status changes to CLEARED', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT p.*, s.name as supplier_name') && sql.includes('supplier_payments')) {
          return Promise.resolve([{
            id: 'pay-chq',
            payment_number: 'PAY-0004',
            supplier_id: 'sup-1',
            supplier_name: 'Schwarzkopf',
            amount: 15000,
            payment_method: 'CHEQUE',
            payment_date: '2026-03-03',
            cheque_number: 'CHQ-001',
            cheque_status: 'PENDING',
            created_by: userId,
          }]);
        }
        if (sql.includes('SELECT spa.grn_id, spa.allocated_amount') && sql.includes('supplier_payment_allocations')) {
          return Promise.resolve([{ grn_id: 'grn-1', allocated_amount: 15000 }]);
        }
        if (sql.includes('UPDATE') && sql.includes('supplier_payments')) {
          return Promise.resolve([{ id: 'pay-chq', cheque_status: 'CLEARED' }]);
        }
        if (sql.includes('SELECT id FROM') && sql.includes('expense_categories') && sql.includes('SUPPLIER_PAYMENT')) {
          return Promise.resolve([{ id: 'cat-supplier-payment' }]);
        }
        if (sql.includes('SELECT g.branch_id FROM') && sql.includes('supplier_payment_allocations')) {
          return Promise.resolve([{ branch_id: 'branch-1' }]);
        }
        if (sql.includes('SELECT id, status FROM') && sql.includes('expenses') && sql.includes('supplier_payment_id')) {
          return Promise.resolve([]); // Not existing yet, so insert new
        }
        if (sql.includes('INSERT INTO') && sql.includes('expenses')) {
          return Promise.resolve([{ id: 'exp-chq-1' }]);
        }
        return Promise.resolve([]);
      });

      const updated = await suppliersService.updateChequeStatus(
        schemaName,
        'pay-chq',
        { chequeStatus: 'CLEARED' },
        userId,
      );

      expect(updated).toBeDefined();
      const insertExpenseCall = mockTx.$queryRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO') && call[0].includes('expenses'),
      );
      expect(insertExpenseCall).toBeDefined();
      expect(insertExpenseCall).toEqual(
        expect.arrayContaining(['ACTIVE', true, 'pay-chq', 'CHEQUE']),
      );
    });
  });

  describe('5. CHEQUE BOUNCED voids expense', () => {
    it('should mark linked Expense status = VOID when cheque status changes to BOUNCED', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT p.*, s.name as supplier_name') && sql.includes('supplier_payments')) {
          return Promise.resolve([{
            id: 'pay-chq-bounced',
            payment_number: 'PAY-0005',
            supplier_id: 'sup-1',
            supplier_name: 'Schwarzkopf',
            amount: 15000,
            payment_method: 'CHEQUE',
            payment_date: '2026-03-03',
            cheque_number: 'CHQ-001',
            cheque_status: 'CLEARED',
            created_by: userId,
          }]);
        }
        if (sql.includes('SELECT spa.grn_id, spa.allocated_amount') && sql.includes('supplier_payment_allocations')) {
          return Promise.resolve([{ grn_id: 'grn-1', allocated_amount: 15000 }]);
        }
        if (sql.includes('UPDATE') && sql.includes('supplier_payments')) {
          return Promise.resolve([{ id: 'pay-chq-bounced', cheque_status: 'BOUNCED' }]);
        }
        if (sql.includes('SELECT id, status FROM') && sql.includes('expenses') && sql.includes('supplier_payment_id')) {
          return Promise.resolve([{ id: 'exp-to-void', status: 'ACTIVE' }]);
        }
        return Promise.resolve([]);
      });

      await suppliersService.updateChequeStatus(
        schemaName,
        'pay-chq-bounced',
        { chequeStatus: 'BOUNCED', bounceReason: 'Insufficient funds' },
        userId,
      );

      // Verify that expense was updated to VOID
      const updateExpenseCall = mockTx.$executeRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('UPDATE') && call[0].includes('expenses') && call[0].includes("status = 'VOID'"),
      );
      expect(updateExpenseCall).toBeDefined();
    });
  });

  describe('6. Repeated operation does not duplicate expense (Idempotency)', () => {
    it('should update existing linked expense if cleared again instead of inserting duplicate', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT p.*, s.name as supplier_name') && sql.includes('supplier_payments')) {
          return Promise.resolve([{
            id: 'pay-reclear',
            payment_number: 'PAY-0006',
            supplier_id: 'sup-1',
            supplier_name: 'Schwarzkopf',
            amount: 15000,
            payment_method: 'CHEQUE',
            payment_date: '2026-03-03',
            cheque_number: 'CHQ-001',
            cheque_status: 'BOUNCED',
            created_by: userId,
          }]);
        }
        if (sql.includes('SELECT spa.grn_id, spa.allocated_amount') && sql.includes('supplier_payment_allocations')) {
          return Promise.resolve([{ grn_id: 'grn-1', allocated_amount: 15000 }]);
        }
        if (sql.includes('UPDATE') && sql.includes('supplier_payments')) {
          return Promise.resolve([{ id: 'pay-reclear', cheque_status: 'CLEARED' }]);
        }
        if (sql.includes('SELECT id FROM') && sql.includes('expense_categories') && sql.includes('SUPPLIER_PAYMENT')) {
          return Promise.resolve([{ id: 'cat-supplier-payment' }]);
        }
        if (sql.includes('SELECT g.branch_id FROM') && sql.includes('supplier_payment_allocations')) {
          return Promise.resolve([{ branch_id: 'branch-1' }]);
        }
        if (sql.includes('SELECT id, status FROM') && sql.includes('expenses') && sql.includes('supplier_payment_id')) {
          return Promise.resolve([{ id: 'exp-reclear-1', status: 'VOID' }]);
        }
        return Promise.resolve([]);
      });

      await suppliersService.updateChequeStatus(
        schemaName,
        'pay-reclear',
        { chequeStatus: 'CLEARED' },
        userId,
      );

      // Verify that it executed UPDATE to set status = 'ACTIVE' and did NOT do INSERT INTO expenses
      const updateExpenseCall = mockTx.$executeRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('UPDATE') && call[0].includes('expenses') && call[0].includes("status = 'ACTIVE'"),
      );
      expect(updateExpenseCall).toBeDefined();

      const insertExpenseCall = mockTx.$queryRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO') && call[0].includes('expenses'),
      );
      expect(insertExpenseCall).toBeUndefined();
    });
  });

  describe('7. GRN without payment creates no expense', () => {
    it('should create GRN with full outstanding and zero expense when no initial payment is provided', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name FROM') && sql.includes('suppliers')) {
          return Promise.resolve([{ id: 'sup-1', name: 'L\'Oreal' }]);
        }
        if (sql.includes('SELECT id, is_active FROM') && sql.includes('branches')) {
          return Promise.resolve([{ id: 'br-1', is_active: true }]);
        }
        if (sql.includes('SELECT id, name, unit, cost_price, is_active FROM') && sql.includes('inventory_items')) {
          return Promise.resolve([{ id: 'item-1', name: 'Shampoo 500ml', unit: 'pcs', cost_price: 500, is_active: true }]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('grns')) {
          return Promise.resolve([{
            id: 'grn-no-pay',
            grn_number: 'GRN-0010',
            supplier_id: 'sup-1',
            branch_id: 'br-1',
            status: 'RECEIVED',
            total_amount: 50000,
            paid_amount: 0,
            payment_status: 'UNPAID',
            created_by: userId,
          }]);
        }
        return Promise.resolve([]);
      });

      const grn = await suppliersService.createGrn(
        schemaName,
        {
          supplierId: 'sup-1',
          branchId: 'br-1',
          grnDate: '2026-03-01',
          status: 'RECEIVED',
          items: [{ itemId: 'item-1', quantity: 100, unitCost: 500 }],
        },
        userId,
      );

      expect(grn).toBeDefined();
      // No expense should have been created
      const insertExpenseCall = mockTx.$queryRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO') && call[0].includes('expenses'),
      );
      expect(insertExpenseCall).toBeUndefined();
    });
  });

  describe('8. GRN with CASH initial payment creates exactly one expense', () => {
    it('should create exactly one linked expense when GRN is received with a CASH initial payment', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name FROM') && sql.includes('suppliers')) {
          return Promise.resolve([{ id: 'sup-1', name: 'L\'Oreal' }]);
        }
        if (sql.includes('SELECT id, is_active FROM') && sql.includes('branches')) {
          return Promise.resolve([{ id: 'br-1', is_active: true }]);
        }
        if (sql.includes('SELECT id, name, unit, cost_price, is_active FROM') && sql.includes('inventory_items')) {
          return Promise.resolve([{ id: 'item-1', name: 'Shampoo 500ml', unit: 'pcs', cost_price: 500, is_active: true }]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('grns')) {
          return Promise.resolve([{
            id: 'grn-cash-pay',
            grn_number: 'GRN-0011',
            supplier_id: 'sup-1',
            branch_id: 'br-1',
            status: 'RECEIVED',
            total_amount: 50000,
            paid_amount: 20000,
            payment_status: 'PARTIALLY_PAID',
            created_by: userId,
          }]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('supplier_payments')) {
          return Promise.resolve([{
            id: 'pay-init-cash',
            payment_number: 'PAY-0011',
            supplier_id: 'sup-1',
            amount: 20000,
            payment_method: 'CASH',
            payment_date: '2026-03-01',
            cheque_status: null,
            created_by: userId,
          }]);
        }
        if (sql.includes('SELECT id FROM') && sql.includes('expense_categories') && sql.includes('SUPPLIER_PAYMENT')) {
          return Promise.resolve([{ id: 'cat-supplier-payment' }]);
        }
        if (sql.includes('SELECT g.branch_id FROM') && sql.includes('supplier_payment_allocations')) {
          return Promise.resolve([{ branch_id: 'br-1' }]);
        }
        if (sql.includes('SELECT id, status FROM') && sql.includes('expenses') && sql.includes('supplier_payment_id')) {
          return Promise.resolve([]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('expenses')) {
          return Promise.resolve([{ id: 'exp-init-1' }]);
        }
        return Promise.resolve([]);
      });

      const grn = await suppliersService.createGrn(
        schemaName,
        {
          supplierId: 'sup-1',
          branchId: 'br-1',
          grnDate: '2026-03-01',
          status: 'RECEIVED',
          items: [{ itemId: 'item-1', quantity: 100, unitCost: 500 }],
          initialPayment: {
            amount: 20000,
            paymentMethod: 'CASH',
            paymentDate: '2026-03-01',
          },
        },
        userId,
      );

      expect(grn).toBeDefined();
      const expenseInsertions = mockTx.$queryRawUnsafe.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO') && call[0].includes('expenses'),
      );
      expect(expenseInsertions).toHaveLength(1);
      expect(expenseInsertions[0]).toEqual(
        expect.arrayContaining(['ACTIVE', true, 'pay-init-cash', 'CASH']),
      );
    });
  });

  describe('9. GRN with CHEQUE pending creates no active expense', () => {
    it('should create pending payment but NO active expense when GRN has CHEQUE initial payment', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name FROM') && sql.includes('suppliers')) {
          return Promise.resolve([{ id: 'sup-1', name: 'L\'Oreal' }]);
        }
        if (sql.includes('SELECT id, is_active FROM') && sql.includes('branches')) {
          return Promise.resolve([{ id: 'br-1', is_active: true }]);
        }
        if (sql.includes('SELECT id, name, unit, cost_price, is_active FROM') && sql.includes('inventory_items')) {
          return Promise.resolve([{ id: 'item-1', name: 'Shampoo 500ml', unit: 'pcs', cost_price: 500, is_active: true }]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('grns')) {
          return Promise.resolve([{
            id: 'grn-chq-pay',
            grn_number: 'GRN-0012',
            supplier_id: 'sup-1',
            branch_id: 'br-1',
            status: 'RECEIVED',
            total_amount: 50000,
            paid_amount: 0,
            payment_status: 'UNPAID',
            created_by: userId,
          }]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('supplier_payments')) {
          return Promise.resolve([{
            id: 'pay-init-chq',
            payment_number: 'PAY-0012',
            supplier_id: 'sup-1',
            amount: 20000,
            payment_method: 'CHEQUE',
            cheque_number: 'CHQ-999',
            cheque_status: 'PENDING',
            created_by: userId,
          }]);
        }
        return Promise.resolve([]);
      });

      const grn = await suppliersService.createGrn(
        schemaName,
        {
          supplierId: 'sup-1',
          branchId: 'br-1',
          grnDate: '2026-03-01',
          status: 'RECEIVED',
          items: [{ itemId: 'item-1', quantity: 100, unitCost: 500 }],
          initialPayment: {
            amount: 20000,
            paymentMethod: 'CHEQUE',
            chequeNumber: 'CHQ-999',
            paymentDate: '2026-03-01',
          },
        },
        userId,
      );

      expect(grn).toBeDefined();
      const expenseInsertions = mockTx.$queryRawUnsafe.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO') && call[0].includes('expenses'),
      );
      expect(expenseInsertions).toHaveLength(0);
    });
  });

  describe('10. Supplier outstanding calculations remain correct', () => {
    it('should accurately calculate outstanding balances without interference from expenses', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)') && sql.includes('suppliers')) {
          return Promise.resolve([{ count: 1n }]);
        }
        if (sql.includes('SELECT s.id, s.name') && sql.includes('suppliers')) {
          return Promise.resolve([
            {
              id: 'sup-1',
              supplier_name: 'L\'Oreal',
              phone: '0771234567',
              email: 'info@loreal.lk',
              total_grn_amount: '50000.00',
              total_paid_amount: '20000.00',
              total_outstanding: '30000.00',
              unpaid_grn_count: '1',
              last_payment_date: '2026-03-01',
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const outstandingReport = await suppliersService.listSupplierOutstanding(schemaName, {});
      expect(outstandingReport.items).toHaveLength(1);
      expect(outstandingReport.items[0].totalOutstanding).toBe(30000);
      expect(outstandingReport.items[0].totalGrnAmount).toBe(50000);
      expect(outstandingReport.items[0].totalPaidAmount).toBe(20000);
    });
  });

  describe('11 & 12. Dashboard excludes VOID expenses and includes ACTIVE supplier payment expenses', () => {
    it('should query lifetime and period financial totals with status = ACTIVE', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SUM(amount)') && sql.includes('expenses') && sql.includes("status = 'ACTIVE'")) {
          return Promise.resolve([{ sum: 20000 }]);
        }
        if (sql.includes('SUM(grand_total)') && sql.includes('sales')) {
          return Promise.resolve([{ sum: 100000 }]);
        }
        return Promise.resolve([{ count: 0, sum: 0 }]);
      });

      const lifetimeTotals = await dashboardService.getLifetimeFinancialTotals(schemaName);
      expect(lifetimeTotals.lifetimeExpenses).toBe(20000);

      // Verify that the query executed for expenses includes status = 'ACTIVE'
      const expenseCalls = mockTx.$queryRawUnsafe.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('expenses'),
      );
      for (const call of expenseCalls) {
        expect(call[0]).toContain("status = 'ACTIVE'");
      }
    });
  });

  describe('13. Edit / Delete protection for system-generated expenses', () => {
    it('should block manual edit of system-generated supplier payment expenses', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT e.id') && sql.includes('expenses')) {
          return Promise.resolve([{
            id: 'exp-sys-1',
            title: 'Supplier Payment - L\'Oreal',
            amount: 20000,
            is_system_generated: true,
            supplier_payment_id: 'pay-1',
          }]);
        }
        return Promise.resolve([]);
      });

      await expect(
        expensesService.update(schemaName, 'exp-sys-1', { amount: 25000 }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block manual void/status change of system-generated supplier payment expenses', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT e.id') && sql.includes('expenses')) {
          return Promise.resolve([{
            id: 'exp-sys-1',
            title: 'Supplier Payment - L\'Oreal',
            amount: 20000,
            is_system_generated: true,
            supplier_payment_id: 'pay-1',
          }]);
        }
        return Promise.resolve([]);
      });

      await expect(
        expensesService.updateStatus(schemaName, 'exp-sys-1', { status: 'VOID' }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block manual delete of system-generated supplier payment expenses', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT e.id') && sql.includes('expenses')) {
          return Promise.resolve([{
            id: 'exp-sys-1',
            title: 'Supplier Payment - L\'Oreal',
            amount: 20000,
            is_system_generated: true,
            supplier_payment_id: 'pay-1',
          }]);
        }
        return Promise.resolve([]);
      });

      await expect(
        expensesService.delete(schemaName, 'exp-sys-1', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('14. System category SUPPLIER_PAYMENT protection', () => {
    it('should prevent deletion of SUPPLIER_PAYMENT system category', async () => {
      mockTx.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, code, name') && sql.includes('expense_categories')) {
          return Promise.resolve([{
            id: 'cat-sp-1',
            code: 'SUPPLIER_PAYMENT',
            name: 'Supplier Payments',
          }]);
        }
        return Promise.resolve([]);
      });

      await expect(
        expensesService.deleteCategory(schemaName, 'cat-sp-1', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
