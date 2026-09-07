import {
  BarChart3,
  Boxes,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Scissors,
  ShoppingCart,
  Sparkles,
  Users,
  UserSquare2,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const allNavItems = [
  { to: '/salon/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/salon/branches', label: 'Branches', icon: GitBranch },
  { to: '/salon/employees', label: 'Employees', icon: UserSquare2 },
  { to: '/salon/customers', label: 'Customers', icon: Users, feature: 'CUSTOMERS' },
  {
    to: '/salon/service-categories',
    label: 'Service Categories',
    icon: Sparkles,
    feature: 'SERVICES',
  },
  { to: '/salon/services', label: 'Services', icon: Scissors, feature: 'SERVICES' },
  {
    to: '/salon/product-categories',
    label: 'Product Categories',
    icon: Package,
    feature: 'INVENTORY',
  },
  { to: '/salon/products', label: 'Products', icon: Boxes, feature: 'INVENTORY' },
  { to: '/salon/stock', label: 'Inventory', icon: Package, feature: 'INVENTORY' },
  { to: '/salon/pos', label: 'POS', icon: ShoppingCart, feature: 'POS' },
  { to: '/salon/sales', label: 'Sales History', icon: Receipt },
  { to: '/salon/reports', label: 'Reports', icon: BarChart3 },
];

function NavItems({
  enabledFeatures,
  onNavigate,
}: {
  enabledFeatures: string[];
  onNavigate?: () => void;
}) {
  const items = allNavItems.filter(
    (item) => !item.feature || enabledFeatures.includes(item.feature),
  );

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
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

export default function SalonAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: features = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/salon/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <Scissors className="h-5 w-5" />
            <span className="font-semibold">Salon Admin</span>
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <NavItems enabledFeatures={features} />
            <div>
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

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Salon Admin</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex h-[calc(100%-4rem)] flex-col justify-between">
                    <NavItems enabledFeatures={features} onNavigate={() => setOpen(false)} />
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => void handleLogout()}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <div>
                <p className="text-sm text-muted-foreground">Salon Management</p>
                <p className="font-medium">{user?.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="hidden md:inline-flex gap-2"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
