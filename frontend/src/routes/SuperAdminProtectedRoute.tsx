import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function SuperAdminProtectedRoute() {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace state={{ from: location }} />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/super-admin/access-denied" replace />;
  }

  return <Outlet />;
}

export function SuperAdminGuestRoute() {
  const { isAuthenticated, isLoading, isSuperAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated && isSuperAdmin) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  return <Outlet />;
}
