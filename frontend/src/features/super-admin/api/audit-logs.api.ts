import api from '@/api/axios';

export interface SuperAdminAuditLogItem {
  id: string;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  tenantId: string | null;
  oldValue: any | null;
  newValue: any | null;
  metadata: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  adminUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  adminUserId?: string;
  tenantId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogsResponse {
  data: SuperAdminAuditLogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const auditLogsApi = {
  getAll: (params: GetAuditLogsParams = {}) =>
    api.get<AuditLogsResponse>('/super-admin/audit-logs', { params }).then((r) => r.data),
};
