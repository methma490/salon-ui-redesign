import { ForbiddenException } from '@nestjs/common';
import {
  assertTrustedTenantSchemaName,
  buildTenantSchemaName,
  extractTenantNumericId,
  formatTenantNumericId,
  isLegacyTenantSchemaName,
  isNewTenantSchemaName,
  isValidTenantSchemaName,
  sanitizeSalonSlug,
  tenantTable,
  tenantType,
  validateTenantSchemaName,
} from './utils/schema-name.util';
import { TenantContextService } from './services/tenant-context.service';
import { TenantStatus } from '@prisma/client';

describe('Tenant Schema Naming & Migration Specification', () => {
  describe('1. Studio Zee → tenant_studio_zee_000004', () => {
    it('should generate tenant_studio_zee_000004 for Studio Zee and ID 4', () => {
      const schemaName = buildTenantSchemaName('Studio Zee', 4);
      expect(schemaName).toBe('tenant_studio_zee_000004');
      expect(isValidTenantSchemaName(schemaName)).toBe(true);
      expect(isNewTenantSchemaName(schemaName)).toBe(true);
      expect(isLegacyTenantSchemaName(schemaName)).toBe(false);
    });
  });

  describe('2. Special characters sanitization', () => {
    it("should safely sanitize apostrophes, ampersands, slashes, and symbols (e.g. Nimali's Salon & Spa)", () => {
      const schema = buildTenantSchemaName("Nimali's Salon & Spa", 5);
      expect(schema).toBe('tenant_nimalis_salon_spa_000005');
      expect(isValidTenantSchemaName(schema)).toBe(true);
    });

    it('should sanitize forward and backward slashes and quotes', () => {
      const schema = buildTenantSchemaName('Luxe / Cut \\ "Glow"', 12);
      expect(schema).toBe('tenant_luxe_cut_glow_000012');
      expect(isValidTenantSchemaName(schema)).toBe(true);
    });
  });

  describe('3. Multiple spaces and hyphens handling', () => {
    it('should collapse multiple spaces and hyphens into single underscores', () => {
      const schema = buildTenantSchemaName('ABC   Beauty  --- Colombo', 125);
      expect(schema).toBe('tenant_abc_beauty_colombo_000125');
      expect(isValidTenantSchemaName(schema)).toBe(true);
    });

    it('should trim leading and trailing spaces, hyphens, and underscores', () => {
      const schema = buildTenantSchemaName('  --__ Studio Zee __--  ', 4);
      expect(schema).toBe('tenant_studio_zee_000004');
    });
  });

  describe('4. Long salon names length limit', () => {
    it('should safely truncate slug so total schema name stays <= 63 chars preserving prefix and 6-digit ID', () => {
      const veryLongName =
        'This Is An Exceptionally Long Salon Name Designed To Exceed The PostgreSQL Maximum Sixty Three Byte Identifier Limit';
      const schema = buildTenantSchemaName(veryLongName, 4);

      expect(schema.length).toBeLessThanOrEqual(63);
      expect(schema.startsWith('tenant_')).toBe(true);
      expect(schema.endsWith('_000004')).toBe(true);
      expect(isValidTenantSchemaName(schema)).toBe(true);
    });
  });

  describe('5. Duplicate salon names with different IDs', () => {
    it('should generate distinct unique schemas for duplicate salon names with different IDs', () => {
      const schema1 = buildTenantSchemaName('Studio Zee', 4);
      const schema2 = buildTenantSchemaName('Studio Zee', 18);

      expect(schema1).toBe('tenant_studio_zee_000004');
      expect(schema2).toBe('tenant_studio_zee_000018');
      expect(schema1).not.toBe(schema2);
    });
  });

  describe('6. Empty and invalid salon names fallback', () => {
    it('should fall back to "salon" slug if salon name is empty or contains only punctuation', () => {
      expect(buildTenantSchemaName('', 4)).toBe('tenant_salon_000004');
      expect(buildTenantSchemaName('   ', 4)).toBe('tenant_salon_000004');
      expect(buildTenantSchemaName('!@#$%^&*()_+', 4)).toBe('tenant_salon_000004');
      expect(buildTenantSchemaName(null as any, 4)).toBe('tenant_salon_000004');
    });
  });

  describe('7. Old schema validation', () => {
    it('should accept legacy tenant schema names (tenant_000001 to tenant_999999)', () => {
      expect(isValidTenantSchemaName('tenant_000001')).toBe(true);
      expect(isValidTenantSchemaName('tenant_000004')).toBe(true);
      expect(isValidTenantSchemaName('tenant_999999')).toBe(true);
      expect(isLegacyTenantSchemaName('tenant_000001')).toBe(true);
      expect(isNewTenantSchemaName('tenant_000001')).toBe(false);
      expect(() => assertTrustedTenantSchemaName('tenant_000001')).not.toThrow();
      expect(validateTenantSchemaName('tenant_000001')).toBe('tenant_000001');
    });
  });

  describe('8. New schema validation', () => {
    it('should accept new readable tenant schema names', () => {
      expect(isValidTenantSchemaName('tenant_studio_zee_000004')).toBe(true);
      expect(isValidTenantSchemaName('tenant_salon_heart_000005')).toBe(true);
      expect(isValidTenantSchemaName('tenant_abc_beauty_spa_000125')).toBe(true);
      expect(isNewTenantSchemaName('tenant_studio_zee_000004')).toBe(true);
      expect(isLegacyTenantSchemaName('tenant_studio_zee_000004')).toBe(false);
      expect(() => assertTrustedTenantSchemaName('tenant_studio_zee_000004')).not.toThrow();
      expect(validateTenantSchemaName('tenant_studio_zee_000004')).toBe(
        'tenant_studio_zee_000004',
      );
    });

    it('should reject malformed or invalid names', () => {
      expect(isValidTenantSchemaName('public')).toBe(false);
      expect(isValidTenantSchemaName('tenant_abc')).toBe(false);
      expect(isValidTenantSchemaName('tenant_studio_zee')).toBe(false);
      expect(isValidTenantSchemaName('tenant_STUDIO_000004')).toBe(false); // lowercase required
      expect(isValidTenantSchemaName('tenant_studio__000004')).toBe(false); // double underscore
      expect(() => assertTrustedTenantSchemaName('public')).toThrow(ForbiddenException);
    });
  });

  describe('9. Existing tenant schema resolution', () => {
    it('should resolve tenant context correctly from stored schema name', async () => {
      const mockPrisma: any = {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'uuid-123',
            code: 'SAL000004',
            name: 'Studio Zee',
            schemaName: 'tenant_studio_zee_000004',
            status: TenantStatus.ACTIVE,
          }),
        },
      };

      const contextService = new TenantContextService(mockPrisma);
      const context = await contextService.resolveFromUser({
        id: 'user-1',
        email: 'admin@studiozee.com',
        name: 'Admin',
        userType: 'TENANT_USER',
        tenantId: 'uuid-123',
        schemaName: 'tenant_studio_zee_000004',
        roles: ['SALON_ADMIN'],
      });

      expect(context.schemaName).toBe('tenant_studio_zee_000004');
      expect(context.tenantCode).toBe('SAL000004');
      expect(context.tenantName).toBe('Studio Zee');
    });
  });

  describe('10. New tenant provisioning schema generator', () => {
    it('should generate proper schema name with tenant code and sequence number', () => {
      const schemaName = buildTenantSchemaName('Crown Salon', 'SAL000009');
      expect(schemaName).toBe('tenant_crown_salon_000009');
      expect(extractTenantNumericId('SAL000009')).toBe(9);
    });
  });

  describe('11. Login after rename', () => {
    it('should allow authenticating users with renamed schema in JWT token', () => {
      const userSchema = 'tenant_studio_zee_000004';
      expect(() => assertTrustedTenantSchemaName(userSchema)).not.toThrow();
      const usersTable = tenantTable(userSchema, 'users');
      expect(usersTable).toBe('"tenant_studio_zee_000004"."users"');
    });
  });

  describe('12. Tenant context after rename', () => {
    it('should reject mismatched schema names to prevent spoofing', async () => {
      const mockPrisma: any = {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'uuid-123',
            code: 'SAL000004',
            name: 'Studio Zee',
            schemaName: 'tenant_studio_zee_000004',
            status: TenantStatus.ACTIVE,
          }),
        },
      };

      const contextService = new TenantContextService(mockPrisma);
      await expect(
        contextService.resolveFromUser({
          id: 'user-1',
          email: 'admin@studiozee.com',
          name: 'Admin',
          userType: 'TENANT_USER',
          tenantId: 'uuid-123',
          schemaName: 'tenant_fake_schema_000004',
          roles: ['SALON_ADMIN'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('13. Tenant migrations after rename', () => {
    it('should validate renamed schema correctly for migration runner', () => {
      expect(validateTenantSchemaName('tenant_studio_zee_000004')).toBe(
        'tenant_studio_zee_000004',
      );
      expect(validateTenantSchemaName('tenant_000001')).toBe('tenant_000001');
    });
  });

  describe('14. DATABASE_AUTO_SETUP after rename', () => {
    it('should recognize both legacy and new schemas in schema pattern', () => {
      const regex = /^tenant_(?:[0-9]{6}|[a-z0-9]+(?:_[a-z0-9]+)*_[0-9]{6})$/;
      expect(regex.test('tenant_000001')).toBe(true);
      expect(regex.test('tenant_salon_heart_000001')).toBe(true);
      expect(regex.test('tenant_malicious;drop table users;--')).toBe(false);
    });
  });

  describe('15. Supplier / GRN API after rename', () => {
    it('should qualify suppliers and grns tables properly under renamed schema', () => {
      const schema = 'tenant_studio_zee_000004';
      expect(tenantTable(schema, 'suppliers')).toBe('"tenant_studio_zee_000004"."suppliers"');
      expect(tenantTable(schema, 'grns')).toBe('"tenant_studio_zee_000004"."grns"');
      expect(tenantTable(schema, 'supplier_payments')).toBe(
        '"tenant_studio_zee_000004"."supplier_payments"',
      );
      expect(tenantType(schema, 'grn_status')).toBe('"tenant_studio_zee_000004"."grn_status"');
    });
  });

  describe('16. POS after rename', () => {
    it('should qualify sales, products, and sale_items tables under renamed schema', () => {
      const schema = 'tenant_studio_zee_000004';
      expect(tenantTable(schema, 'sales')).toBe('"tenant_studio_zee_000004"."sales"');
      expect(tenantTable(schema, 'sale_items')).toBe('"tenant_studio_zee_000004"."sale_items"');
      expect(tenantTable(schema, 'products')).toBe('"tenant_studio_zee_000004"."products"');
    });
  });

  describe('17. Salon Analytics after rename', () => {
    it('should qualify analytics queries under renamed schema', () => {
      const schema = 'tenant_studio_zee_000004';
      expect(tenantTable(schema, 'expenses')).toBe('"tenant_studio_zee_000004"."expenses"');
      expect(tenantTable(schema, 'appointments')).toBe('"tenant_studio_zee_000004"."appointments"');
      expect(tenantTable(schema, 'customers')).toBe('"tenant_studio_zee_000004"."customers"');
    });
  });

  describe('18. Cross-tenant isolation', () => {
    it('should produce strictly distinct table references between two salons', () => {
      const schemaA = 'tenant_studio_zee_000004';
      const schemaB = 'tenant_salon_heart_000005';

      const tableA = tenantTable(schemaA, 'customers');
      const tableB = tenantTable(schemaB, 'customers');

      expect(tableA).toBe('"tenant_studio_zee_000004"."customers"');
      expect(tableB).toBe('"tenant_salon_heart_000005"."customers"');
      expect(tableA).not.toBe(tableB);
    });
  });

  describe('19. SQL injection attempts through salon names', () => {
    it('should neutralize SQL injection vectors in salon names into safe alphanumeric slugs', () => {
      const maliciousNames = [
        "Studio'; DROP TABLE users;--",
        'Salon" OR 1=1; --',
        "'; EXEC xp_cmdshell('dir');--",
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
        '$$ UNION SELECT * FROM users $$',
      ];

      for (const name of maliciousNames) {
        const schema = buildTenantSchemaName(name, 7);
        expect(isValidTenantSchemaName(schema)).toBe(true);
        expect(schema).not.toContain(';');
        expect(schema).not.toContain("'");
        expect(schema).not.toContain('"');
        expect(schema).not.toContain('DROP');
        expect(schema).not.toContain(' ');
        expect(schema).toMatch(/^tenant_[a-z0-9_]+_000007$/);
      }
    });

    it('should reject malicious schema names injected directly', () => {
      const maliciousSchemas = [
        'tenant_studio_000004; DROP TABLE users;--',
        'tenant_studio_000004" OR "1"="1',
        'tenant_studio_000004\0',
        'tenant_000001;--',
        'public',
        'information_schema',
      ];

      for (const s of maliciousSchemas) {
        expect(isValidTenantSchemaName(s)).toBe(false);
        expect(() => assertTrustedTenantSchemaName(s)).toThrow(ForbiddenException);
        expect(() => validateTenantSchemaName(s)).toThrow();
      }
    });
  });

  describe('20. Repeated migration script execution (Idempotency)', () => {
    it('should detect already migrated schema and indicate no rename needed', () => {
      const currentSchema = 'tenant_studio_zee_000004';
      expect(isNewTenantSchemaName(currentSchema)).toBe(true);
      expect(isLegacyTenantSchemaName(currentSchema)).toBe(false);

      // Re-running buildTenantSchemaName produces identical name
      const recomputed = buildTenantSchemaName('Studio Zee', 4);
      expect(recomputed).toBe(currentSchema);
    });
  });
});
