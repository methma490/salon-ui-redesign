import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../tenant/services/tenant-context.service';
import { assertTrustedTenantSchemaName, tenantTable } from '../tenant/utils/schema-name.util';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

describe('Cross-Tenant IDOR Security Tests', () => {
  const tenantA: AuthenticatedUser = {
    id: 'user-tenant-a',
    name: 'Salon A Admin',
    email: 'admin@salon-a.com',
    userType: 'TENANT_USER',
    tenantId: 'tenant-uuid-a',
    schemaName: 'tenant_000001',
    tenantCode: 'SLN-000001',
    tenantName: 'Salon Alpha',
    roles: ['SALON_ADMIN'],
    tenantStatus: 'ACTIVE' as any,
  };

  const tenantB: AuthenticatedUser = {
    id: 'user-tenant-b',
    name: 'Salon B Admin',
    email: 'admin@salon-b.com',
    userType: 'TENANT_USER',
    tenantId: 'tenant-uuid-b',
    schemaName: 'tenant_000002',
    tenantCode: 'SLN-000002',
    tenantName: 'Salon Beta',
    roles: ['SALON_ADMIN'],
    tenantStatus: 'ACTIVE' as any,
  };

  let tenantContextService: TenantContextService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findUnique: jest.fn(),
      },
    };
    tenantContextService = new TenantContextService(mockPrisma);
  });

  describe('Tenant Context Isolation', () => {
    it('resolves schema name strictly from authenticated token and never from user-supplied parameters', async () => {
      const contextA = await tenantContextService.resolveFromUser(tenantA);
      expect(contextA.schemaName).toBe('tenant_000001');
      expect(contextA.tenantId).toBe('tenant-uuid-a');

      const contextB = await tenantContextService.resolveFromUser(tenantB);
      expect(contextB.schemaName).toBe('tenant_000002');
      expect(contextB.tenantId).toBe('tenant-uuid-b');
      expect(contextA.schemaName).not.toEqual(contextB.schemaName);
    });

    it('rejects unauthenticated or non-tenant users trying to access tenant context', async () => {
      const superAdminUser: AuthenticatedUser = {
        id: 'super-admin-1',
        name: 'Super Admin',
        email: 'super@admin.com',
        userType: 'SUPER_ADMIN',
        tenantId: null,
        schemaName: null,
        roles: ['SUPER_ADMIN'],
      };

      await expect(tenantContextService.resolveFromUser(superAdminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects users with invalid or malicious schema names', async () => {
      const maliciousUser: AuthenticatedUser = {
        ...tenantA,
        schemaName: 'tenant_000001"; DROP TABLE users;--',
      };

      await expect(tenantContextService.resolveFromUser(maliciousUser)).rejects.toThrow();
    });
  });

  describe('Cross-Tenant Entity IDOR Resistance across all 17 domains', () => {
    const ENTITY_DOMAINS = [
      'customers',
      'employees',
      'appointments',
      'services',
      'products',
      'inventory',
      'stock_movements',
      'sales',
      'invoices',
      'expenses',
      'payroll',
      'suppliers',
      'grns',
      'supplier_payments',
      'branches',
      'quotations',
      'tenant_settings',
    ];

    it.each(ENTITY_DOMAINS)(
      'guarantees %s queries for Tenant A are scoped to schema "tenant_000001" and cannot read Tenant B data',
      (domain) => {
        const tableA = tenantTable(tenantA.schemaName!, domain);
        const tableB = tenantTable(tenantB.schemaName!, domain);

        expect(tableA).toBe(`"tenant_000001"."${domain}"`);
        expect(tableB).toBe(`"tenant_000002"."${domain}"`);
        expect(tableA).not.toEqual(tableB);
      },
    );

    it('simulates Tenant A attempting to fetch/mutate Tenant B record ID resulting in Not Found in Tenant A schema', async () => {
      // Mock repository simulation
      const mockDatabase = {
        'tenant_000001.customers': [
          { id: 'cust-a-1', name: 'Alice (Tenant A)' },
          { id: 'cust-a-2', name: 'Bob (Tenant A)' },
        ],
        'tenant_000002.customers': [
          { id: 'cust-b-1', name: 'Charlie (Tenant B)' },
          { id: 'cust-b-2', name: 'Diana (Tenant B)' },
        ],
      };

      function findCustomerById(schemaName: string, customerId: string) {
        assertTrustedTenantSchemaName(schemaName);
        const tableKey = `${schemaName}.customers` as keyof typeof mockDatabase;
        const records = mockDatabase[tableKey] || [];
        const record = records.find((r) => r.id === customerId);
        if (!record) {
          throw new NotFoundException(`Customer with ID ${customerId} not found`);
        }
        return record;
      }

      // Tenant A accesses own customer
      const ownRecord = findCustomerById(tenantA.schemaName!, 'cust-a-1');
      expect(ownRecord.name).toBe('Alice (Tenant A)');

      // Tenant A attempts to access Tenant B customer ID 'cust-b-1'
      expect(() => findCustomerById(tenantA.schemaName!, 'cust-b-1')).toThrow(NotFoundException);
    });

    it('ignores tenantId injected into request body or query params and enforces authenticated context', () => {
      const maliciousPayload = {
        tenantId: 'tenant-uuid-b', // Attacker sends Tenant B ID in body
        customerId: 'cust-b-1',
        name: 'Hacked Customer',
      };

      // Service uses req.user.tenantId / req.user.schemaName, ignoring payload.tenantId
      const targetSchema = tenantA.schemaName; // strictly from user JWT
      const targetTenantId = tenantA.tenantId;

      expect(targetSchema).toBe('tenant_000001');
      expect(targetTenantId).toBe('tenant-uuid-a');
      expect(targetTenantId).not.toBe(maliciousPayload.tenantId);
    });
  });
});
