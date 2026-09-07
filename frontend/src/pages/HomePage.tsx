import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Salon SaaS</h1>
        <p className="text-muted-foreground">Project setup successful</p>
        <Button asChild className="w-full">
          <Link to="/salon/login">Salon Admin Login</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link to="/super-admin/login">Super Admin Login</Link>
        </Button>
      </div>
    </main>
  );
}

export default HomePage;
