import {
  getTenantMigrationFiles,
  splitSqlStatements,
  validateTenantSchemaName,
} from './tenant-migration-runner';

describe('TenantMigrationRunner', () => {
  describe('validateTenantSchemaName', () => {
    it('should accept valid tenant schema names like tenant_000001', () => {
      expect(validateTenantSchemaName('tenant_000001')).toBe('tenant_000001');
      expect(validateTenantSchemaName('tenant_123456')).toBe('tenant_123456');
    });

    it('should reject invalid or malicious schema names', () => {
      expect(() => validateTenantSchemaName('public')).toThrow();
      expect(() => validateTenantSchemaName('tenant_01')).toThrow();
      expect(() => validateTenantSchemaName('tenant_000001; DROP TABLE users;')).toThrow();
      expect(() => validateTenantSchemaName('tenant_000001"')).toThrow();
      expect(() => validateTenantSchemaName('')).toThrow();
      expect(() => validateTenantSchemaName(null as any)).toThrow();
    });
  });

  describe('getTenantMigrationFiles', () => {
    it('should discover all tenant migration files in deterministic alphabetical order', () => {
      const files = getTenantMigrationFiles();
      expect(files.length).toBeGreaterThanOrEqual(27);

      // Verify strict sorting
      const fileNames = files.map((f) => f.fileName);
      const sortedNames = [...fileNames].sort();
      expect(fileNames).toEqual(sortedNames);

      // Verify first and last migrations
      expect(fileNames[0]).toBe('001_core.sql');
      expect(fileNames[fileNames.length - 1]).toBe('027_supplier_payment_expenses.sql');

      // Verify each migration file has a valid SHA256 checksum
      for (const file of files) {
        expect(file.checksum).toHaveLength(64);
        expect(file.fileName).toMatch(/^[0-9]{3}_.*\.sql$/);
      }
    });
  });

  describe('splitSqlStatements', () => {
    it('should split simple statements by semicolon', () => {
      const sql = 'CREATE TABLE a (id int); CREATE TABLE b (id int);';
      const stmts = splitSqlStatements(sql);
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toBe('CREATE TABLE a (id int);');
      expect(stmts[1]).toBe('CREATE TABLE b (id int);');
    });

    it('should handle single-line comments with semicolons inside', () => {
      const sql = `
        -- This is a comment; with semicolon
        CREATE TABLE test (id int);
      `;
      const stmts = splitSqlStatements(sql);
      expect(stmts).toHaveLength(1);
      expect(stmts[0]).toContain('CREATE TABLE test (id int);');
    });

    it('should handle block comments with semicolons inside', () => {
      const sql = `
        /* comment block; with ; semicolons */
        CREATE TABLE test (id int);
      `;
      const stmts = splitSqlStatements(sql);
      expect(stmts).toHaveLength(1);
      expect(stmts[0]).toContain('CREATE TABLE test (id int);');
    });

    it('should handle dollar-quoted blocks correctly without splitting inner semicolons', () => {
      const sql = `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'my_enum') THEN
            CREATE TYPE my_enum AS ENUM ('A', 'B');
          END IF;
        END $$;

        CREATE TABLE test (val my_enum);
      `;
      const stmts = splitSqlStatements(sql);
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toContain('DO $$');
      expect(stmts[1]).toContain('CREATE TABLE test (val my_enum);');
    });

    it('should handle single-quoted strings containing semicolons and quotes', () => {
      const sql = "INSERT INTO test (name) VALUES ('Hello; World'); INSERT INTO test (name) VALUES ('O''Reilly');";
      const stmts = splitSqlStatements(sql);
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toBe("INSERT INTO test (name) VALUES ('Hello; World');");
      expect(stmts[1]).toBe("INSERT INTO test (name) VALUES ('O''Reilly');");
    });
  });
});
