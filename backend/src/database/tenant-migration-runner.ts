import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const logger = new Logger('TenantMigrationRunner');

export type DbClient = Prisma.TransactionClient | PrismaClient;

export interface MigrationFileInfo {
  fileName: string;
  filePath: string;
  checksum: string;
}

export interface TenantMigrationResult {
  schema: string;
  totalAvailable: number;
  alreadyApplied: number;
  appliedNow: string[];
  success: boolean;
  error?: string;
}

export interface TenantMigrationStatus {
  schema: string;
  totalAvailable: number;
  appliedCount: number;
  appliedMigrations: string[];
  missingCount: number;
  missingMigrations: string[];
  isUpToDate: boolean;
}

/**
 * Validates tenant schema name against strict alphanumeric pattern (^tenant_[0-9]{6}$)
 * to completely eliminate any SQL injection vector.
 */
export function validateTenantSchemaName(schemaName: string): string {
  if (!schemaName || !/^tenant_[0-9]{6}$/.test(schemaName)) {
    throw new Error(`Invalid tenant schema name: "${schemaName}". Must match format tenant_XXXXXX (e.g. tenant_000001)`);
  }
  return schemaName;
}

/**
 * Resolves the directory containing tenant .sql migration files across dev, build, and Docker environments.
 */
export function resolveTenantMigrationsDirectory(): string {
  const candidates = [
    path.join(__dirname, 'tenant-migrations'),
    path.join(__dirname, '../database/tenant-migrations'),
    path.join(__dirname, '../../database/tenant-migrations'),
    path.join(__dirname, '../../src/database/tenant-migrations'),
    path.join(process.cwd(), 'src/database/tenant-migrations'),
    path.join(process.cwd(), 'dist/database/tenant-migrations'),
    path.join(process.cwd(), 'dist/src/database/tenant-migrations'),
    path.join(process.cwd(), 'backend/src/database/tenant-migrations'),
    path.join(process.cwd(), 'backend/dist/database/tenant-migrations'),
    path.join(process.cwd(), 'database/tenant-migrations'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const sqlFiles = fs.readdirSync(candidate).filter((f) => f.endsWith('.sql'));
        if (sqlFiles.length > 0) {
          return candidate;
        }
      } catch {
        // Continue searching
      }
    }
  }

  // Fallback to standard source directory
  return path.join(process.cwd(), 'src/database/tenant-migrations');
}

/**
 * Discovers and returns all tenant migration files in deterministic alphabetical order.
 */
export function getTenantMigrationFiles(): MigrationFileInfo[] {
  const dir = resolveTenantMigrationsDirectory();
  if (!fs.existsSync(dir)) {
    throw new Error(`Tenant migrations directory not found at: ${dir}`);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .sql migration files found in tenant migrations directory: ${dir}`);
  }

  return files.map((fileName) => {
    const filePath = path.join(dir, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
    return {
      fileName,
      filePath,
      checksum,
    };
  });
}

/**
 * Tokenizes and splits a SQL script into individual executable statements,
 * safely handling single-line comments, block comments, dollar-quoted blocks,
 * and single-quoted strings with escaped characters.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const len = sql.length;

  while (i < len) {
    // 1. Single-line comment: -- ... \n
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < len && sql[i] !== '\n') {
        current += sql[i];
        i++;
      }
      if (i < len) {
        current += sql[i];
        i++;
      }
      continue;
    }

    // 2. Block comment: /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      current += '/*';
      i += 2;
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) {
        current += sql[i];
        i++;
      }
      if (i < len) {
        current += '*/';
        i += 2;
      }
      continue;
    }

    // 3. Dollar-quoted block: $$ ... $$ or $<tag>$ ... $<tag>$
    if (sql[i] === '$') {
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        current += tag;
        i += tag.length;
        const endIdx = sql.indexOf(tag, i);
        if (endIdx !== -1) {
          current += sql.slice(i, endIdx + tag.length);
          i = endIdx + tag.length;
        } else {
          current += sql.slice(i);
          i = len;
        }
        continue;
      }
    }

    // 4. Single-quoted string: '...' (handles '' and \' escapes)
    if (sql[i] === "'") {
      current += "'";
      i++;
      while (i < len) {
        if (sql[i] === "'") {
          current += "'";
          i++;
          if (i < len && sql[i] === "'") {
            current += "'";
            i++;
          } else {
            break;
          }
        } else if (sql[i] === '\\' && i + 1 < len) {
          current += sql[i] + sql[i + 1];
          i += 2;
        } else {
          current += sql[i];
          i++;
        }
      }
      continue;
    }

    // 5. Statement delimiter: ;
    if (sql[i] === ';') {
      current += ';';
      i++;
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += sql[i];
    i++;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Ensures the migration history tracking table exists inside the given tenant schema.
 */
export async function ensureTenantMigrationTable(
  client: DbClient,
  schemaName: string,
): Promise<void> {
  const safeSchema = validateTenantSchemaName(schemaName);
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${safeSchema}"._applied_tenant_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
      checksum VARCHAR(64)
    )
  `);
}

/**
 * Retrieves the set of migration file names already applied to the given tenant schema.
 */
export async function getAppliedTenantMigrations(
  client: DbClient,
  schemaName: string,
): Promise<Set<string>> {
  const safeSchema = validateTenantSchemaName(schemaName);
  await ensureTenantMigrationTable(client, safeSchema);

  const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM "${safeSchema}"._applied_tenant_migrations ORDER BY name ASC`,
  );

  return new Set(rows.map((r) => r.name));
}

/**
 * Runs all missing migrations for a single tenant schema inside atomic transactions.
 * When client is a TransactionClient (during provisioning), statements execute directly.
 * When client is PrismaClient, each missing migration executes within its own dedicated $transaction.
 */
export async function runMigrationsForTenant(
  schemaName: string,
  client: DbClient,
): Promise<TenantMigrationResult> {
  const safeSchema = validateTenantSchemaName(schemaName);
  const migrationFiles = getTenantMigrationFiles();
  const appliedSet = await getAppliedTenantMigrations(client, safeSchema);

  const appliedNow: string[] = [];

  for (const migration of migrationFiles) {
    if (appliedSet.has(migration.fileName)) {
      continue;
    }

    const sqlContent = fs.readFileSync(migration.filePath, 'utf-8');
    const statements = splitSqlStatements(sqlContent);

    // If client has $transaction (i.e. is PrismaClient), wrap each migration in a dedicated transaction
    if ('$transaction' in client && typeof client.$transaction === 'function') {
      const prisma = client as PrismaClient;
      await prisma.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(`SET search_path TO "${safeSchema}", public`);

          let stmtIdx = 0;
          for (const statement of statements) {
            stmtIdx++;
            const executable = statement
              .replace(/--.*$/gm, '')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .trim();
            if (!executable) continue;

            try {
              await tx.$executeRawUnsafe(statement);
            } catch (err: any) {
              logger.error(
                `[MIGRATION FAILURE] Schema: ${safeSchema}, File: ${migration.fileName}, Stmt #${stmtIdx}: ${err.message || err}`,
              );
              throw new Error(
                `Failed executing tenant migration "${migration.fileName}" on "${safeSchema}" at statement #${stmtIdx}: ${err.message || err}`,
              );
            }
          }

          await tx.$executeRawUnsafe(
            `INSERT INTO "${safeSchema}"._applied_tenant_migrations (name, applied_at, checksum)
             VALUES ($1, NOW(), $2)
             ON CONFLICT (name) DO UPDATE SET applied_at = NOW(), checksum = EXCLUDED.checksum`,
            migration.fileName,
            migration.checksum,
          );
        },
        {
          timeout: 60000,
          maxWait: 10000,
        },
      );
    } else {
      // In-transaction execution (already pinned to a transaction connection)
      await client.$executeRawUnsafe(`SET search_path TO "${safeSchema}", public`);

      let stmtIdx = 0;
      for (const statement of statements) {
        stmtIdx++;
        const executable = statement
          .replace(/--.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .trim();
        if (!executable) continue;

        try {
          await client.$executeRawUnsafe(statement);
        } catch (err: any) {
          logger.error(
            `[MIGRATION FAILURE] Schema: ${safeSchema}, File: ${migration.fileName}, Stmt #${stmtIdx}: ${err.message || err}`,
          );
          throw new Error(
            `Failed executing tenant migration "${migration.fileName}" on "${safeSchema}" at statement #${stmtIdx}: ${err.message || err}`,
          );
        }
      }

      await client.$executeRawUnsafe(
        `INSERT INTO "${safeSchema}"._applied_tenant_migrations (name, applied_at, checksum)
         VALUES ($1, NOW(), $2)
         ON CONFLICT (name) DO UPDATE SET applied_at = NOW(), checksum = EXCLUDED.checksum`,
        migration.fileName,
        migration.checksum,
      );
    }

    appliedNow.push(migration.fileName);
    logger.log(`✓ Migration [${migration.fileName}] applied to schema [${safeSchema}]`);
  }

  return {
    schema: safeSchema,
    totalAvailable: migrationFiles.length,
    alreadyApplied: appliedSet.size,
    appliedNow,
    success: true,
  };
}

/**
 * Discovers all valid tenant schemas physically existing in PostgreSQL.
 */
export async function discoverTenantSchemas(prisma: PrismaClient): Promise<string[]> {
  const [schemaRows, tenantRows] = await Promise.all([
    prisma.$queryRaw<Array<{ schema_name: string }>>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name ~ '^tenant_[0-9]{6}$'
      ORDER BY schema_name ASC
    `,
    prisma.$queryRaw<Array<{ schemaName: string }>>`
      SELECT "schemaName"
      FROM tenants
      WHERE "schemaName" IS NOT NULL AND "schemaName" ~ '^tenant_[0-9]{6}$'
    `,
  ]);

  const physicallyExisting = new Set(schemaRows.map((r) => r.schema_name));
  const combined = Array.from(
    new Set([
      ...schemaRows.map((r) => r.schema_name),
      ...tenantRows.map((r) => r.schemaName),
    ]),
  ).filter((s) => Boolean(s) && physicallyExisting.has(s));

  return combined.sort();
}

/**
 * Runs missing tenant migrations across ALL discovered tenant schemas.
 */
export async function runAllTenantMigrations(
  prisma: PrismaClient,
): Promise<TenantMigrationResult[]> {
  const schemas = await discoverTenantSchemas(prisma);
  const results: TenantMigrationResult[] = [];

  logger.log(`Found ${schemas.length} tenant schema(s) to verify: [${schemas.join(', ')}]`);

  for (const schema of schemas) {
    try {
      const result = await runMigrationsForTenant(schema, prisma);
      results.push(result);
    } catch (err: any) {
      logger.error(`Failed migrations for tenant schema "${schema}": ${err.message || err}`);
      results.push({
        schema,
        totalAvailable: getTenantMigrationFiles().length,
        alreadyApplied: 0,
        appliedNow: [],
        success: false,
        error: err.message || String(err),
      });
      throw err; // Fail startup / setup on migration error
    }
  }

  return results;
}

/**
 * Diagnostic tool: inspects tenant migration statuses without modifying any data.
 */
export async function getTenantMigrationStatuses(
  prisma: PrismaClient,
): Promise<TenantMigrationStatus[]> {
  const schemas = await discoverTenantSchemas(prisma);
  const allFiles = getTenantMigrationFiles();
  const allFileNames = allFiles.map((f) => f.fileName);

  const statuses: TenantMigrationStatus[] = [];

  for (const schema of schemas) {
    try {
      const appliedSet = await getAppliedTenantMigrations(prisma, schema);
      const appliedList = Array.from(appliedSet).sort();
      const missingList = allFileNames.filter((name) => !appliedSet.has(name));

      statuses.push({
        schema,
        totalAvailable: allFiles.length,
        appliedCount: appliedList.length,
        appliedMigrations: appliedList,
        missingCount: missingList.length,
        missingMigrations: missingList,
        isUpToDate: missingList.length === 0,
      });
    } catch (err: any) {
      statuses.push({
        schema,
        totalAvailable: allFiles.length,
        appliedCount: 0,
        appliedMigrations: [],
        missingCount: allFiles.length,
        missingMigrations: allFileNames,
        isUpToDate: false,
      });
    }
  }

  return statuses;
}
