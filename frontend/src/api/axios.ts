import axios from 'axios';
import { SUPER_ADMIN_LOGIN_PATH } from '@/config/auth-paths';
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

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3000/api'
  : 'https://saloon-server.bc.dartcodes.com/api';

const rawApiBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (
  rawApiBase && rawApiBase.trim() !== '' && rawApiBase.trim() !== '/api'
    ? rawApiBase
    : DEFAULT_API_BASE_URL
).replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
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

const AUTH_REDIRECT_MESSAGE_KEY = 'auth_redirect_message';

function getErrorMessage(error: unknown): string | undefined {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  if (Array.isArray(message)) {
    return message[0];
  }
  return typeof message === 'string' ? message : undefined;
}

function redirectToLoginIfNeeded(message?: string) {
  if (typeof window === 'undefined') return;
  if (message) {
    sessionStorage.setItem(AUTH_REDIRECT_MESSAGE_KEY, message);
  }
  const path = window.location.pathname;
  if (path.startsWith('/salon') && !path.startsWith('/salon/login')) {
    window.location.href = '/salon/login';
    return;
  }
  if (
    path.startsWith('/super-admin') &&
    !path.includes('/login') &&
    !path.includes('/forgot-password') &&
    !path.includes('/reset-password')
  ) {
    window.location.href = SUPER_ADMIN_LOGIN_PATH;
  }
}

function forceLogout(message?: string) {
  authStorage.clearTokens();
  redirectToLoginIfNeeded(message);
}

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // If backend or proxy returned HTML (e.g., SPA fallback on invalid API URL)
    if (
      typeof response.data === 'string' &&
      (response.data.trim().startsWith('<!DOCTYPE') ||
        response.data.trim().startsWith('<!doctype') ||
        response.data.trim().startsWith('<html'))
    ) {
      return Promise.reject(
        new Error('Received HTML response instead of JSON. Check backend API URL configuration.'),
      );
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    const status = error.response?.status;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';

    if (
      status === 403 &&
      path.startsWith('/salon') &&
      !path.startsWith('/salon/login')
    ) {
      forceLogout(getErrorMessage(error));
      return Promise.reject(error);
    }

    if (status !== 401 || originalRequest._retry) {
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
      forceLogout(getErrorMessage(error));
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
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
      );

      authStorage.setTokens(data.accessToken, data.refreshToken);
      processQueue(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(null);
      forceLogout(getErrorMessage(refreshError) ?? getErrorMessage(error));
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
  forgotPassword: (email: string, portal: 'salon' | 'super-admin') =>
    api.post<{ message: string }>('/auth/forgot-password', { email, portal }).then((r) => r.data),
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }).then((r) => r.data),
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
