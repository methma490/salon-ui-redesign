import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import SignupPage from '@/pages/signup/SignupPage';
import SignupSuccessPage from '@/pages/signup/SignupSuccessPage';
import SignupCancelPage from '@/pages/signup/SignupCancelPage';
import SuperAdminRoutes from '@/routes/SuperAdminRoutes';
import SalonAdminRoutes from '@/routes/SalonAdminRoutes';
import LoginPage from '@/pages/super-admin/LoginPage';
import { SuperAdminGuestRoute } from '@/routes/SuperAdminProtectedRoute';
import { SUPER_ADMIN_LOGIN_PATH } from '@/config/auth-paths';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/signup/:planId" element={<SignupPage />} />
      <Route path="/signup/success" element={<SignupSuccessPage />} />
      <Route path="/signup/cancel" element={<SignupCancelPage />} />

      <Route element={<SuperAdminGuestRoute />}>
        <Route path={SUPER_ADMIN_LOGIN_PATH} element={<LoginPage />} />
      </Route>
      <Route
        path="/super-admin/login"
        element={<Navigate to={SUPER_ADMIN_LOGIN_PATH} replace />}
      />

      <Route path="/super-admin/*" element={<SuperAdminRoutes />} />
      <Route path="/salon/*" element={<SalonAdminRoutes />} />
    </Routes>
  );
}
