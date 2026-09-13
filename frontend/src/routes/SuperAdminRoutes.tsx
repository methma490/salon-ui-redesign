import { Navigate, Route, Routes } from 'react-router-dom';
import SuperAdminPremiumLayout from '@/layouts/SuperAdminPremiumLayout';
import AccessDeniedPage from '@/pages/super-admin/AccessDeniedPage';
import PremiumDashboardPage from '@/pages/super-admin/PremiumDashboardPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import CreateSalonPage from '@/pages/super-admin/salons/CreateSalonPage';
import InvoiceListPage from '@/pages/super-admin/billing/InvoiceListPage';
import PaymentListPage from '@/pages/super-admin/billing/PaymentListPage';
import PlanListPage from '@/pages/super-admin/plans/PlanListPage';
import SubscriptionListPage from '@/pages/super-admin/subscriptions/SubscriptionListPage';
import SalonDetailsPage from '@/pages/super-admin/salons/SalonDetailsPage';
import SalonListPage from '@/pages/super-admin/salons/SalonListPage';
import { SuperAdminGuestRoute, SuperAdminProtectedRoute } from '@/routes/SuperAdminProtectedRoute';

export default function SuperAdminRoutes() {
  return (
    <Routes>
      <Route element={<SuperAdminGuestRoute />}>
        <Route path="forgot-password" element={<ForgotPasswordPage portal="super-admin" />} />
        <Route path="reset-password" element={<ResetPasswordPage portal="super-admin" />} />
      </Route>

      <Route path="access-denied" element={<AccessDeniedPage />} />

      <Route element={<SuperAdminProtectedRoute />}>
        <Route element={<SuperAdminPremiumLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PremiumDashboardPage />} />
          <Route path="salons" element={<SalonListPage />} />
          <Route path="salons/new" element={<CreateSalonPage />} />
          <Route path="salons/:id" element={<SalonDetailsPage />} />
          <Route path="plans" element={<PlanListPage />} />
          <Route path="subscriptions" element={<SubscriptionListPage />} />
          <Route path="payments" element={<PaymentListPage />} />
          <Route path="invoices" element={<InvoiceListPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
