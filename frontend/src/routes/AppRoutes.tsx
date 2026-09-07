import { Route, Routes } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import SuperAdminRoutes from '@/routes/SuperAdminRoutes';
import SalonAdminRoutes from '@/routes/SalonAdminRoutes';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/super-admin/*" element={<SuperAdminRoutes />} />
      <Route path="/salon/*" element={<SalonAdminRoutes />} />
    </Routes>
  );
}
