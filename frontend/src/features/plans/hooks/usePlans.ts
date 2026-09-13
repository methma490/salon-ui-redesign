import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminPlansApi, publicPlansApi } from '@/features/plans/api/plans.api';
import { planKeys } from '@/features/plans/hooks/query-keys';
import type {
  CreatePlanPayload,
  UpdatePlanPayload,
  UpdatePlanPricingPayload,
} from '@/features/plans/types/plan.types';

export function usePublicPlans() {
  return useQuery({
    queryKey: planKeys.public(),
    queryFn: publicPlansApi.list,
    staleTime: 60_000,
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: planKeys.admin(),
    queryFn: adminPlansApi.list,
  });
}

export function useAdminPlan(id: string) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => adminPlansApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlanPayload) => adminPlansApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePlanPayload) => adminPlansApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.admin() });
      queryClient.invalidateQueries({ queryKey: planKeys.public() });
    },
  });
}

export function useAssignPlanFeatures(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (features: string[]) => adminPlansApi.assignFeatures(id, features),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.admin() });
      queryClient.invalidateQueries({ queryKey: planKeys.public() });
    },
  });
}

export function useUpdatePlanPricing(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePlanPricingPayload) => adminPlansApi.updatePricing(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.admin() });
      queryClient.invalidateQueries({ queryKey: planKeys.public() });
    },
  });
}

export function useActivatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminPlansApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useDeactivatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminPlansApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}
