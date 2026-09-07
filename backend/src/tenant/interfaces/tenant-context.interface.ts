import { TenantStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export interface TenantContext {
  tenantId: string;
  schemaName: string;
  tenantCode: string;
  tenantName: string;
  status: TenantStatus;
  userId: string;
  userEmail: string;
  userRoles: string[];
}

export interface TenantAuthenticatedRequest {
  user: AuthenticatedUser;
  tenantContext: TenantContext;
}
