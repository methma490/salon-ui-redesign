import { assertTrustedTenantSchemaName, tenantTable } from './utils/schema-name.util';
describe('Tenant Isolation', () => {
  it('rejects invalid schema names', () => {
    expect(() => assertTrustedTenantSchemaName('public')).toThrow();
    expect(() => assertTrustedTenantSchemaName('tenant_abc')).toThrow();
    expect(() => assertTrustedTenantSchemaName('tenant_000001; DROP TABLE users;--')).toThrow();
  });

  it('accepts valid tenant schema names', () => {
    expect(() => assertTrustedTenantSchemaName('tenant_000001')).not.toThrow();
    expect(() => assertTrustedTenantSchemaName('tenant_999999')).not.toThrow();
  });

  it('generates schema-qualified table references', () => {
    expect(tenantTable('tenant_000001', 'branches')).toBe('"tenant_000001"."branches"');
    expect(tenantTable('tenant_000002', 'users')).toBe('"tenant_000002"."users"');
  });
});

describe('Schema name isolation between tenants', () => {
  it('different tenants produce different table references', () => {
    const salonA = tenantTable('tenant_000001', 'customers');
    const salonB = tenantTable('tenant_000002', 'customers');
    expect(salonA).not.toEqual(salonB);
  });
});
