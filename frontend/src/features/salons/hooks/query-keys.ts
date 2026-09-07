import type { SalonFilters } from '@/features/salons/types/salon.types';

export const salonKeys = {
  all: ['salons'] as const,
  lists: () => [...salonKeys.all, 'list'] as const,
  list: (filters: SalonFilters) => [...salonKeys.lists(), filters] as const,
  details: () => [...salonKeys.all, 'detail'] as const,
  detail: (id: string) => [...salonKeys.details(), id] as const,
};

export const featureKeys = {
  all: ['features'] as const,
};

export const authKeys = {
  me: ['auth', 'me'] as const,
};
