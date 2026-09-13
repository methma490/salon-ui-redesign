import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Repeat,
  Scissors,
  Store,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { SUPER_ADMIN_LOGIN_PATH } from '@/config/auth-paths';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/super-admin/salons', label: 'Salons', icon: Store },
  { to: '/super-admin/plans', label: 'Plans', icon: CreditCard },
  { to: '/super-admin/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/super-admin/payments', label: 'Payments', icon: Receipt },
  { to: '/super-admin/invoices', label: 'Invoices', icon: FileText },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate(SUPER_ADMIN_LOGIN_PATH);
  };

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted">
            <Scissors className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Platform</p>
            <p className="font-semibold leading-tight">Super Admin</p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto p-4">
          <NavItems />
          <div className="mt-4 shrink-0">
            <Separator className="mb-4" />
            <div className="mb-3 px-3 text-xs text-muted-foreground">{user?.email}</div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 md:h-16 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Super Admin</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex h-[calc(100%-4rem)] flex-col justify-between">
                  <NavItems onNavigate={() => setOpen(false)} />
                  <div className="space-y-3">
                    {user?.email && (
                      <p className="truncate px-3 text-xs text-muted-foreground">{user.email}</p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => void handleLogout()}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 items-center gap-2.5 md:hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                <Scissors className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="truncate text-sm font-semibold">Super Admin</p>
            </div>

            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm font-medium">{user?.name ?? 'Super Admin'}</p>
              {user?.email && (
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>

        <main
          ref={mainRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
