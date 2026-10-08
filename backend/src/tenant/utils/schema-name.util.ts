import { ForbiddenException } from '@nestjs/common';
import {
  MAX_POSTGRES_IDENTIFIER_LENGTH,
  NEW_TENANT_SCHEMA_NAME_PATTERN,
  OLD_TENANT_SCHEMA_NAME_PATTERN,
  TENANT_SCHEMA_NAME_PATTERN,
} from '../constants/tenant.constants';

/**
 * Checks whether a given string is a valid, secure tenant schema identifier.
 * Accepts both:
 * - Legacy format: tenant_000001 (^tenant_[0-9]{6}$)
 * - New readable format: tenant_studio_zee_000004 (^tenant_[a-z0-9]+(?:_[a-z0-9]+)*_[0-9]{6}$)
 * Enforces PostgreSQL identifier length limit (<= 63 characters).
 */
export function isValidTenantSchemaName(schemaName: unknown): boolean {
  if (typeof schemaName !== 'string') {
    return false;
  }
  const trimmed = schemaName.trim();
  if (
    trimmed.length < 13 ||
    trimmed.length > MAX_POSTGRES_IDENTIFIER_LENGTH ||
    trimmed !== schemaName
  ) {
    return false;
  }
  return TENANT_SCHEMA_NAME_PATTERN.test(trimmed);
}

/**
 * Checks if schema is in the legacy format (e.g. tenant_000001).
 */
export function isLegacyTenantSchemaName(schemaName: string): boolean {
  return typeof schemaName === 'string' && OLD_TENANT_SCHEMA_NAME_PATTERN.test(schemaName.trim());
}

/**
 * Checks if schema is in the new readable format (e.g. tenant_studio_zee_000004).
 */
export function isNewTenantSchemaName(schemaName: string): boolean {
  return typeof schemaName === 'string' && NEW_TENANT_SCHEMA_NAME_PATTERN.test(schemaName.trim());
}

/**
 * Creates an immutable, safe slug from a salon name for PostgreSQL schema identifiers.
 * Slug rules:
 * - Convert to lowercase
 * - Trim whitespace
 * - Spaces and hyphens become underscores
 * - Remove apostrophes (e.g. Nimali's -> nimalis)
 * - Remove &, /, \, quotes, and any non-alphanumeric characters
 * - Collapse multiple underscores
 * - Trim leading and trailing underscores
 * - Truncate to maximum 49 characters to guarantee total schema name <= 63 characters
 * - Fallback to "salon" if sanitization produces an empty string
 */
export function sanitizeSalonSlug(salonName?: string | null): string {
  if (!salonName || typeof salonName !== 'string') {
    return 'salon';
  }

  let slug = salonName
    .toLowerCase()
    .trim()
    .replace(/['’`"]/g, '') // remove apostrophes & quotes
    .replace(/[\s\-_]+/g, '_') // convert spaces, hyphens, existing underscores to single underscore
    .replace(/[^a-z0-9_]/g, '') // strip all other characters (&, /, \, punctuation, symbols)
    .replace(/_+/g, '_') // collapse multiple underscores
    .replace(/^_+|_+$/g, ''); // trim leading and trailing underscores

  if (!slug) {
    slug = 'salon';
  }

  // PostgreSQL max identifier limit is 63 bytes.
  // Prefix "tenant_" (7) + "_" (1) + 6-digit-id (6) = 14 chars.
  // Max slug length is 63 - 14 = 49 characters.
  if (slug.length > 49) {
    slug = slug.substring(0, 49).replace(/_+$/, '');
    if (!slug) {
      slug = 'salon';
    }
  }

  return slug;
}

/**
 * Extracts and formats a 6-digit tenant numeric ID from various input representations:
 * - Number: 4 -> "000004"
 * - Numeric string: "4" or "000004" -> "000004"
 * - Tenant Code: "SAL000004" or "SAL-000004" -> "000004"
 * - Schema Name: "tenant_000004" or "tenant_studio_zee_000004" -> "000004"
 */
export function formatTenantNumericId(tenantId: number | string): string {
  if (typeof tenantId === 'number') {
    if (!Number.isFinite(tenantId) || tenantId < 0) {
      throw new Error(`Invalid numeric tenant ID: ${tenantId}`);
    }
    return String(Math.floor(tenantId)).padStart(6, '0');
  }

  if (typeof tenantId === 'string') {
    const trimmed = tenantId.trim();
    // 1. Pure numeric string
    if (/^\d+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 10);
      return String(parsed).padStart(6, '0');
    }
    // 2. Tenant code (SAL000001, SAL-000001, etc.)
    const codeMatch = trimmed.match(/^SAL-?(\d+)$/i);
    if (codeMatch) {
      const parsed = parseInt(codeMatch[1], 10);
      return String(parsed).padStart(6, '0');
    }
    // 3. Existing schema name (tenant_000004 or tenant_studio_zee_000004)
    const schemaMatch = trimmed.match(/^tenant_.*_?(\d{6})$/);
    if (schemaMatch) {
      return schemaMatch[1];
    }
  }

  throw new Error(`Unable to extract 6-digit tenant numeric ID from: "${tenantId}"`);
}

/**
 * Extracts integer value of tenant sequence number.
 */
export function extractTenantNumericId(identifier: number | string): number {
  return parseInt(formatTenantNumericId(identifier), 10);
}

/**
 * Central generator for the new readable tenant schema naming format:
 * tenant_<sanitized_salon_name>_<6_digit_tenant_id>
 * Examples:
 * - Studio Zee + 4 -> tenant_studio_zee_000004
 * - Salon Heart + 25 -> tenant_salon_heart_000025
 * - ABC Beauty & Spa + 125 -> tenant_abc_beauty_spa_000125
 */
export function buildTenantSchemaName(
  salonName: string | null | undefined,
  tenantId: number | string,
): string {
  const slug = sanitizeSalonSlug(salonName);
  const suffix = formatTenantNumericId(tenantId);
  const schemaName = `tenant_${slug}_${suffix}`;

  assertTrustedTenantSchemaName(schemaName);
  return schemaName;
}

/**
 * Security assertion that throws ForbiddenException if schema name is untrusted.
 */
export function assertTrustedTenantSchemaName(schemaName: string): void {
  if (!isValidTenantSchemaName(schemaName)) {
    throw new ForbiddenException('Invalid tenant context');
  }
}

/**
 * Validates tenant schema name against strict pattern.
 * Throws standard Error if invalid, returns schema name if valid.
 */
export function validateTenantSchemaName(schemaName: string): string {
  if (!isValidTenantSchemaName(schemaName)) {
    throw new Error(
      `Invalid tenant schema name: "${schemaName}". Must match format tenant_XXXXXX or tenant_<slug>_XXXXXX (e.g. tenant_000001 or tenant_studio_zee_000004)`,
    );
  }
  return schemaName;
}

/** Returns a safely quoted schema-qualified table reference, e.g. "tenant_000001"."users" */
export function tenantTable(schemaName: string, tableName: string): string {
  assertTrustedTenantSchemaName(schemaName);
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
    throw new ForbiddenException('Invalid table name');
  }
  return `"${schemaName}"."${tableName}"`;
}

/** Schema-qualified enum/type reference, e.g. "tenant_000001"."expense_status" */
export function tenantType(schemaName: string, typeName: string): string {
  assertTrustedTenantSchemaName(schemaName);
  if (!/^[a-z_][a-z0-9_]*$/i.test(typeName)) {
    throw new ForbiddenException('Invalid type name');
  }
  return `"${schemaName}"."${typeName}"`;
}
