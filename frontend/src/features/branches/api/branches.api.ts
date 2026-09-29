import api from '@/api/axios';

export interface Branch {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isMain: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchPayload {
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateBranchPayload {
  code?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export const branchesApi = {
  list: () => api.get<Branch[]>('/tenant/branches').then((r) => r.data),
  suggestCode: (name?: string) =>
    api.get<{ code: string }>('/tenant/branches/suggest-code', { params: { name } }).then((r) => r.data),
  create: (payload: CreateBranchPayload) =>
    api.post<Branch>('/tenant/branches', payload).then((r) => r.data),
  update: (id: string, payload: UpdateBranchPayload) =>
    api.patch<Branch>(`/tenant/branches/${id}`, payload).then((r) => r.data),
  updateStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    api.patch<Branch>(`/tenant/branches/${id}/status`, { status }).then((r) => r.data),
};
