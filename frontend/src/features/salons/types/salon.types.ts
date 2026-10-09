export type SalonStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface SalonSubscriptionSummary {
  id: string;
  planCode: string;
  planName: string;
  status: string;
  price: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  featureCodes: string[];
}

export interface AuthUser {
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
    lastDemoResetAt?: string | null;
  } | null;
  subscription?: {
    plan: string;
    planCode: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  } | null;
  features?: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface SalonListItem {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: SalonStatus;
  isDemo?: boolean;
  demoProfile?: string | null;
  lastDemoResetAt?: string | null;
  mainBranch: {
    id: string;
    code: string;
    name: string;
  } | null;
  subscription: SalonSubscriptionSummary | null;
  featuresManagedBySubscription: boolean;
  awaitingActivation?: boolean;
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
  isDemo?: boolean;
  demoProfile?: string | null;
  lastDemoResetAt?: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: SalonSubscriptionSummary | null;
  featuresManagedBySubscription: boolean;
  awaitingActivation?: boolean;
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
