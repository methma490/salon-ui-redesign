export type SalonStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  tenantId: string | null;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface SalonListItem {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: SalonStatus;
  mainBranch: {
    id: string;
    code: string;
    name: string;
  } | null;
  enabledFeatures: string[];
  createdAt: string;
}

export interface PaginatedSalons {
  data: SalonListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SalonDetails {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: SalonStatus;
  createdAt: string;
  updatedAt: string;
  mainBranch: {
    id: string;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    isMain: boolean;
  } | null;
  enabledFeatures: Array<{ code: string; name: string }>;
  admin: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    roles: string[];
  } | null;
}

export interface FeatureOption {
  code: string;
  name: string;
  description: string | null;
}

export interface SalonFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: SalonStatus | 'ALL';
}

export interface CreateSalonPayload {
  name: string;
  email?: string;
  phone?: string;
  features: string[];
  admin: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  };
}

export interface UpdateSalonPayload {
  name?: string;
  email?: string;
  phone?: string;
}
