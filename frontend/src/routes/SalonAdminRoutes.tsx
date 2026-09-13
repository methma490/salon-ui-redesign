import { Navigate, Route, Routes } from 'react-router-dom';
import SalonAdminLayout from '@/layouts/SalonAdminLayout';
import BranchesPage from '@/pages/salon/BranchesPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import SalonLoginPage from '@/pages/salon/LoginPage';
import SalonAdminProtectedRoute from '@/routes/SalonAdminProtectedRoute';

// Lazy-ish imports - pages created by subagent or inline
import PremiumDashboardPage from '@/pages/salon/PremiumDashboardPage';
import EmployeesPage from '@/pages/salon/EmployeesPage';
import CustomersPage from '@/pages/salon/CustomersPage';
import AppointmentsPage from '@/pages/salon/AppointmentsPage';
import ServiceCategoriesPage from '@/pages/salon/ServiceCategoriesPage';
import ServicesPage from '@/pages/salon/ServicesPage';
import ProductCategoriesPage from '@/pages/salon/ProductCategoriesPage';
import ProductsPage from '@/pages/salon/ProductsPage';
import StockPage from '@/pages/salon/StockPage';
import PosPage from '@/pages/salon/PosPage';
import SalesPage from '@/pages/salon/SalesPage';
import SaleDetailsPage from '@/pages/salon/SaleDetailsPage';
import ReportsPage from '@/pages/salon/ReportsPage';
import SettingsPage from '@/pages/salon/SettingsPage';
import SubscriptionPage from '@/pages/salon/SubscriptionPage';

export default function SalonAdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<SalonLoginPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage portal="salon" />} />
      <Route path="reset-password" element={<ResetPasswordPage portal="salon" />} />
      <Route element={<SalonAdminProtectedRoute />}>
        <Route element={<SalonAdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PremiumDashboardPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="service-categories" element={<ServiceCategoriesPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="product-categories" element={<ProductCategoriesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales/:id" element={<SaleDetailsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
