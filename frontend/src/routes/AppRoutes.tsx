import { Navigate, Route, Routes } from 'react-router-dom';
import SignupPage from '@/pages/signup/SignupPage';
import SignupSuccessPage from '@/pages/signup/SignupSuccessPage';
import SignupCancelPage from '@/pages/signup/SignupCancelPage';
import SuperAdminRoutes from '@/routes/SuperAdminRoutes';
import SalonAdminRoutes from '@/routes/SalonAdminRoutes';
import LoginPage from '@/pages/super-admin/LoginPage';
import PublicQuotationPage from '@/pages/public/PublicQuotationPage';
import PublicEbillPage from '@/pages/public/PublicEbillPage';
import { SuperAdminGuestRoute } from '@/routes/SuperAdminProtectedRoute';
import { SUPER_ADMIN_LOGIN_PATH, SALON_LOGIN_PATH } from '@/config/auth-paths';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Default / & /login redirect to Salon Login */}
      <Route path="/" element={<Navigate to={SALON_LOGIN_PATH} replace />} />
      <Route path="/login" element={<Navigate to={SALON_LOGIN_PATH} replace />} />

      {/* Public Signup Flow */}
      <Route path="/signup/:planId" element={<SignupPage />} />
      <Route path="/signup/success" element={<SignupSuccessPage />} />
      <Route path="/signup/cancel" element={<SignupCancelPage />} />

      {/* Public Quotation & E-Bills */}
      <Route path="/q/:token" element={<PublicQuotationPage />} />
      <Route path="/i/:token" element={<PublicEbillPage />} />
      <Route path="/ebill/:id" element={<PublicEbillPage />} />

      {/* Super Admin Auth & Dashboard */}
      <Route element={<SuperAdminGuestRoute />}>
        <Route path={SUPER_ADMIN_LOGIN_PATH} element={<LoginPage />} />
      </Route>
      <Route
        path="/super-admin/login"
        element={<Navigate to={SUPER_ADMIN_LOGIN_PATH} replace />}
      />
      <Route path="/super-admin/*" element={<SuperAdminRoutes />} />

      {/* Salon Admin / Staff App */}
      <Route path="/salon/*" element={<SalonAdminRoutes />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={SALON_LOGIN_PATH} replace />} />
    </Routes>
  );
}
