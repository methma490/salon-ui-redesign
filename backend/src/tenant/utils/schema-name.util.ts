import { ForbiddenException } from '@nestjs/common';
import { TENANT_SCHEMA_NAME_PATTERN } from '../constants/tenant.constants';

export function assertTrustedTenantSchemaName(schemaName: string): void {
  if (!TENANT_SCHEMA_NAME_PATTERN.test(schemaName)) {
    throw new ForbiddenException('Invalid tenant context');
  }
}

/** Returns a safely quoted schema-qualified table reference, e.g. "tenant_000001"."users" */
export function tenantTable(schemaName: string, tableName: string): string {
  assertTrustedTenantSchemaName(schemaName);
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
