import { Navigate, Route, Routes } from 'react-router-dom';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import AccessDeniedPage from '@/pages/super-admin/AccessDeniedPage';
import DashboardPage from '@/pages/super-admin/DashboardPage';
import LoginPage from '@/pages/super-admin/LoginPage';
import CreateSalonPage from '@/pages/super-admin/salons/CreateSalonPage';
import SalonDetailsPage from '@/pages/super-admin/salons/SalonDetailsPage';
import SalonListPage from '@/pages/super-admin/salons/SalonListPage';
import { SuperAdminGuestRoute, SuperAdminProtectedRoute } from '@/routes/SuperAdminProtectedRoute';

export default function SuperAdminRoutes() {
  return (
    <Routes>
      <Route element={<SuperAdminGuestRoute />}>
        <Route path="login" element={<LoginPage />} />
      </Route>

      <Route path="access-denied" element={<AccessDeniedPage />} />

      <Route element={<SuperAdminProtectedRoute />}>
        <Route element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="salons" element={<SalonListPage />} />
          <Route path="salons/new" element={<CreateSalonPage />} />
          <Route path="salons/:id" element={<SalonDetailsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
