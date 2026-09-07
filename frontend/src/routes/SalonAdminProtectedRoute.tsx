import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function SalonAdminProtectedRoute() {
  const { isLoading, isAuthenticated, isSuperAdmin, isTenantUser } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/salon/login" replace />;
  }

  if (isSuperAdmin) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  if (!isTenantUser) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
