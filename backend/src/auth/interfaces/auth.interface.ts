export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId?: string | null;
  schemaName?: string | null; // For tenant users, identifies their schema
  userType: 'SUPER_ADMIN' | 'TENANT_USER'; // Discriminator
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  schemaName: string | null;
  roles: string[];
  userType: 'SUPER_ADMIN' | 'TENANT_USER';
}

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  tenantId: string | null;
  roles: string[];
}
