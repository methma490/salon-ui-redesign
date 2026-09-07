import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/api/axios';
import type { AuthUser } from '@/features/salons/types/salon.types';
import { authStorage } from '@/lib/auth-storage';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isTenantUser: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }

    const me = await authApi.me();
    setUser(me);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (authStorage.getAccessToken()) {
          await refreshUser();
        }
      } catch {
        authStorage.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    authStorage.setTokens(response.accessToken, response.refreshToken);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = authStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore logout errors
      }
    }
    authStorage.clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isSuperAdmin: user?.roles.includes('SUPER_ADMIN') ?? false,
      isTenantUser: !!user?.tenantId && !user?.roles.includes('SUPER_ADMIN'),
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
