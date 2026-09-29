// In-memory token storage (XSS protected: not persisted in localStorage)
let inMemoryAccessToken: string | null = null;

// Safely purge legacy tokens from localStorage if they exist from previous versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('salon_saas_access_token');
    localStorage.removeItem('salon_saas_refresh_token');
  } catch {
    // ignore storage access errors
  }
}

export const authStorage = {
  getAccessToken: (): string | null => inMemoryAccessToken,
  setAccessToken: (token: string | null): void => {
    inMemoryAccessToken = token;
  },
  // Legacy alias for compatibility if needed
  setTokens: (accessToken: string, _refreshToken?: string): void => {
    inMemoryAccessToken = accessToken;
  },
  getRefreshToken: (): string | null => null,
  clearTokens: (): void => {
    inMemoryAccessToken = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('salon_saas_access_token');
        localStorage.removeItem('salon_saas_refresh_token');
      } catch {
        // ignore storage access errors
      }
    }
  },
};
