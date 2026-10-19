import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/axios';
import { authKeys } from '@/features/salons/hooks/query-keys';
import type { AuthUser } from '@/features/salons/types/salon.types';
import { authStorage } from '@/lib/auth-storage';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isTenantUser: boolean;
  login: (email: string, password: string, salonCode?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery<AuthUser | null>({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        // If accessToken is missing from memory, attempt refresh via HttpOnly cookie
        if (!authStorage.getAccessToken()) {
          const refreshRes = await authApi.refresh();
          authStorage.setAccessToken(refreshRes.accessToken);
        }
        return await authApi.me();
      } catch {
        authStorage.clearTokens();
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache lifetime
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const login = useCallback(
    async (email: string, password: string, salonCode?: string) => {
      const response = await authApi.login(email, password, salonCode);
      authStorage.setAccessToken(response.accessToken);
      queryClient.setQueryData<AuthUser | null>(authKeys.me, response.user);
      return response.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    authStorage.clearTokens();
    queryClient.setQueryData<AuthUser | null>(authKeys.me, null);
    queryClient.removeQueries({ queryKey: authKeys.me });
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isSuperAdmin: user?.roles?.includes('SUPER_ADMIN') ?? false,
      isTenantUser: !!user?.tenantId && !user?.roles?.includes('SUPER_ADMIN'),
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

