import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { tenantApi, type AppearanceSettings } from '@/api/tenant.api';
import {
  applyBrandCssVars,
  DEFAULT_PRIMARY_COLOR,
  readCachedPrimaryColor,
  writeCachedPrimaryColor,
  type BrandPalette,
  buildBrandPalette,
  THEME_CHANNEL_NAME,
} from '@/lib/brand-theme';
import { useAuth } from './AuthContext';

type TenantThemeContextValue = {
  primaryColor: string;
  defaultPrimaryColor: string;
  isDefault: boolean;
  palette: BrandPalette;
  isLoading: boolean;
  /** Temporary preview override (unsaved). Pass null to clear. */
  setPreviewColor: (color: string | null) => void;
  previewColor: string | null;
  applySaved: (settings: AppearanceSettings) => void;
};

const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const cached = readCachedPrimaryColor();
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [savedColor, setSavedColor] = useState(cached ?? DEFAULT_PRIMARY_COLOR);

  const appearanceQuery = useQuery({
    queryKey: ['tenant-appearance', user?.tenantId],
    queryFn: tenantApi.settings.getAppearance,
    staleTime: 60_000,
    enabled: !!user?.tenantId,
  });

  useEffect(() => {
    if (appearanceQuery.data?.primaryColor) {
      setSavedColor(appearanceQuery.data.primaryColor);
      writeCachedPrimaryColor(appearanceQuery.data.primaryColor);
    }
  }, [appearanceQuery.data?.primaryColor]);

  // Synchronize theme changes across open browser tabs
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const bc = new BroadcastChannel(THEME_CHANNEL_NAME);
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'THEME_SAVED' && event.data?.primaryColor) {
        setSavedColor(event.data.primaryColor);
        setPreviewColor(null);
        queryClient.invalidateQueries({ queryKey: ['tenant-appearance'] });
      } else if (event.data?.type === 'THEME_RESET') {
        setSavedColor(DEFAULT_PRIMARY_COLOR);
        setPreviewColor(null);
        queryClient.invalidateQueries({ queryKey: ['tenant-appearance'] });
      }
    };

    bc.addEventListener('message', onMessage);
    return () => {
      bc.removeEventListener('message', onMessage);
      bc.close();
    };
  }, [queryClient]);

  const effectiveColor = previewColor ?? savedColor;
  const palette = useMemo(() => buildBrandPalette(effectiveColor), [effectiveColor]);

  useLayoutEffect(() => {
    applyBrandCssVars(rootRef.current, effectiveColor);
    if (typeof document !== 'undefined') {
      applyBrandCssVars(document.documentElement, effectiveColor);
      applyBrandCssVars(document.body, effectiveColor);
    }
  }, [effectiveColor]);

  const setRootNode = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (node) applyBrandCssVars(node, effectiveColor);
      if (typeof document !== 'undefined') {
        applyBrandCssVars(document.documentElement, effectiveColor);
        applyBrandCssVars(document.body, effectiveColor);
      }
    },
    [effectiveColor],
  );

  const value = useMemo<TenantThemeContextValue>(
    () => ({
      primaryColor: savedColor,
      defaultPrimaryColor:
        appearanceQuery.data?.defaultPrimaryColor ?? DEFAULT_PRIMARY_COLOR,
      isDefault: appearanceQuery.data?.isDefault ?? savedColor === DEFAULT_PRIMARY_COLOR,
      palette,
      isLoading: appearanceQuery.isLoading,
      previewColor,
      setPreviewColor,
      applySaved: (settings) => {
        setSavedColor(settings.primaryColor);
        writeCachedPrimaryColor(settings.primaryColor);
        setPreviewColor(null);
        queryClient.setQueryData(['tenant-appearance', user?.tenantId], settings);
      },
    }),
    [appearanceQuery.data, appearanceQuery.isLoading, palette, previewColor, savedColor, queryClient, user?.tenantId],
  );

  return (
    <TenantThemeContext.Provider value={value}>
      <div ref={setRootNode} className="salon-theme-root min-h-full">
        {children}
      </div>
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  const ctx = useContext(TenantThemeContext);
  if (!ctx) {
    throw new Error('useTenantTheme must be used within TenantThemeProvider');
  }
  return ctx;
}
