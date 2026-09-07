import { tenantTable } from '../../tenant/utils/schema-name.util';

export async function logAudit(
  tx: { $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> },
  schemaName: string,
  data: {
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const auditTable = tenantTable(schemaName, 'audit_logs');
  await tx.$queryRawUnsafe(
    `INSERT INTO ${auditTable} (user_id, action, entity_type, entity_id, details)
     VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb)`,
    data.userId ?? null,
    data.action,
    data.entityType ?? null,
    data.entityId ?? null,
    data.details ? JSON.stringify(data.details) : null,
  );
}
