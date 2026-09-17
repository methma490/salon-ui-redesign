import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '@/api/tenant.api';
import { useAuth } from '@/contexts/AuthContext';
import {
  firstAllowedSalonPath,
  resolveRouteAccess,
} from '@/lib/salon-access';

/**
 * Blocks deep-links to pages outside the user's role permissions.
 * Salon Admin / plans without Role Management stay unrestricted (plan features still apply).
 */
export default function SalonPermissionGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  if (isLoading || !user) {
    return <>{children}</>;
  }

  const roles = user.roles ?? [];
  const permissions = user.permissions ?? [];
  const access = resolveRouteAccess(location.pathname, features, roles, permissions);

  if (access === 'allowed') {
    return <>{children}</>;
  }

  const fallback = firstAllowedSalonPath(features, roles, permissions);
  if (fallback === location.pathname) {
    return <>{children}</>;
  }

  return <Navigate to={fallback} replace />;
}
