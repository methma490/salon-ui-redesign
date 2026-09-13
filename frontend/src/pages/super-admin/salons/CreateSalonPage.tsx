import { Navigate } from 'react-router-dom';

/** Legacy route — opens the create salon modal on the salons list. */
export default function CreateSalonPage() {
  return <Navigate to="/super-admin/salons?create=1" replace />;
}
