import api from '@/api/axios';
import type {
  AdminPlan,
  CreatePlanPayload,
  PublicPlan,
  UpdatePlanPayload,
  UpdatePlanPricingPayload,
} from '@/features/plans/types/plan.types';

export const publicPlansApi = {
  list: () =>
    api.get<PublicPlan[]>('/plans').then((r) => (Array.isArray(r.data) ? r.data : [])),
};

export const adminPlansApi = {
  list: () =>
    api.get<AdminPlan[]>('/super-admin/plans').then((r) => (Array.isArray(r.data) ? r.data : [])),
  getById: (id: string) => api.get<AdminPlan>(`/super-admin/plans/${id}`).then((r) => r.data),
  create: (payload: CreatePlanPayload) =>
    api.post<AdminPlan>('/super-admin/plans', payload).then((r) => r.data),
  update: (id: string, payload: UpdatePlanPayload) =>
    api.patch<AdminPlan>(`/super-admin/plans/${id}`, payload).then((r) => r.data),
  assignFeatures: (id: string, features: string[]) =>
    api.put<AdminPlan>(`/super-admin/plans/${id}/features`, { features }).then((r) => r.data),
  updatePricing: (id: string, payload: UpdatePlanPricingPayload) =>
    api.put<AdminPlan>(`/super-admin/plans/${id}/pricing`, payload).then((r) => r.data),
  activate: (id: string) =>
    api.patch<AdminPlan>(`/super-admin/plans/${id}/activate`).then((r) => r.data),
  deactivate: (id: string) =>
    api.patch<AdminPlan>(`/super-admin/plans/${id}/deactivate`).then((r) => r.data),
};
