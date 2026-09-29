import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, featuresApi, salonsApi } from '@/api/axios';
import { authKeys, featureKeys, salonKeys } from '@/features/salons/hooks/query-keys';
import type {
  CreateSalonPayload,
  SalonFilters,
  SalonStatus,
  UpdateSalonPayload,
} from '@/features/salons/types/salon.types';

export function useAuthMe(enabled = true) {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useSalons(filters: SalonFilters) {
  return useQuery({
    queryKey: salonKeys.list(filters),
    queryFn: () => salonsApi.list(filters),
  });
}

export function useSalon(id: string) {
  return useQuery({
    queryKey: salonKeys.detail(id),
    queryFn: () => salonsApi.getById(id),
    enabled: !!id,
  });
}

export function useFeatures() {
  return useQuery({
    queryKey: featureKeys.all,
    queryFn: featuresApi.list,
  });
}

export function useSalonStats() {
  return useQuery({
    queryKey: [...salonKeys.all, 'stats'],
    queryFn: async () => {
      const [total, active, suspended, archived, recent] = await Promise.all([
        salonsApi.list({ page: 1, limit: 1 }),
        salonsApi.list({ page: 1, limit: 1, status: 'ACTIVE' }),
        salonsApi.list({ page: 1, limit: 1, status: 'SUSPENDED' }),
        salonsApi.list({ page: 1, limit: 1, status: 'ARCHIVED' }),
        salonsApi.list({ page: 1, limit: 5 }),
      ]);

      return {
        total: total.meta.total,
        active: active.meta.total,
        suspended: suspended.meta.total,
        archived: archived.meta.total,
        recent: recent.data,
      };
    },
  });
}

export function useCreateSalon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSalonPayload) => salonsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salonKeys.all });
    },
  });
}

export function useUpdateSalon(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSalonPayload) => salonsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salonKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: salonKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...salonKeys.all, 'stats'] });
    },
  });
}

export function useUpdateSalonStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: SalonStatus) => salonsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salonKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: salonKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...salonKeys.all, 'stats'] });
    },
  });
}

export function useUpdateSalonFeatures(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (features: string[]) => salonsApi.updateFeatures(id, features),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salonKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: salonKeys.lists() });
    },
  });
}
