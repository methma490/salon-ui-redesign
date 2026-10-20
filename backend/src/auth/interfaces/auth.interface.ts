export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId?: string | null;
  schemaName?: string | null;
  userType: 'SUPER_ADMIN' | 'TENANT_USER';
  permissions?: string[];
  tenantName?: string | null;
  tenantStatus?: string | null;
  tenantCode?: string | null;
  tokenVersion?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  schemaName: string | null;
  roles: string[];
  userType: 'SUPER_ADMIN' | 'TENANT_USER';
  permissions?: string[];
  tenantName?: string | null;
  tenantStatus?: string | null;
  tenantCode?: string | null;
  tokenVersion?: number;
}

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  tenantId: string | null;
  roles: string[];
  permissions?: string[];
  tenant?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    isDemo?: boolean;
    demoProfile?: string | null;
    lastDemoResetAt?: Date | null;
  } | null;
  subscription?: {
    plan: string;
    planCode: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
  } | null;
  features?: string[];
}
