import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantThemeProvider } from '@/contexts/TenantThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/queryClient';
import AppRoutes from '@/routes/AppRoutes';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TenantThemeProvider>
              <AppRoutes />
              <Toaster
                position="top-right"
                richColors
                closeButton
                theme="light"
                toastOptions={{
                  duration: 4000,
                  style: {
                    fontSize: '0.875rem',
                    borderRadius: '12px',
                  },
                }}
              />
            </TenantThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
