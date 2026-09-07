import axios from 'axios';
import { authStorage } from '@/lib/auth-storage';
import type {
  AuthUser,
  CreateSalonPayload,
  FeatureOption,
  LoginResponse,
  PaginatedSalons,
  SalonDetails,
  SalonFilters,
  SalonStatus,
  UpdateSalonPayload,
} from '@/features/salons/types/salon.types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const processQueue = (token: string | null) => {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
};

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    const refreshToken = authStorage.getRefreshToken();

    if (!refreshToken) {
      authStorage.clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<Pick<LoginResponse, 'accessToken' | 'refreshToken'>>(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        { refreshToken },
      );

      authStorage.setTokens(data.accessToken, data.refreshToken);
      processQueue(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      authStorage.clearTokens();
      processQueue(null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }).then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
};

export const salonsApi = {
  list: (filters: SalonFilters) =>
    api
      .get<PaginatedSalons>('/super-admin/salons', {
        params: {
          page: filters.page,
          limit: filters.limit,
          search: filters.search || undefined,
          status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
        },
      })
      .then((r) => r.data),
  getById: (id: string) => api.get<SalonDetails>(`/super-admin/salons/${id}`).then((r) => r.data),
  create: (payload: CreateSalonPayload) =>
    api.post('/super-admin/salons', payload).then((r) => r.data),
  update: (id: string, payload: UpdateSalonPayload) =>
    api.patch<SalonDetails>(`/super-admin/salons/${id}`, payload).then((r) => r.data),
  updateStatus: (id: string, status: SalonStatus) =>
    api.patch<SalonDetails>(`/super-admin/salons/${id}/status`, { status }).then((r) => r.data),
  updateFeatures: (id: string, features: string[]) =>
    api.put<SalonDetails>(`/super-admin/salons/${id}/features`, { features }).then((r) => r.data),
};

export const featuresApi = {
  list: () => api.get<FeatureOption[]>('/features').then((r) => r.data),
};

export default api;
