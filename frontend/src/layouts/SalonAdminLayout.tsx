import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  Coins,
  CreditCard,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Scissors,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  User,
  Users,
  UserSquare2,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SalonBranchProvider, useSalonBranch } from '@/contexts/SalonBranchContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveUploadUrl } from '@/lib/upload-url';
import { cn } from '@/lib/utils';
import { resolveNavAccess, type NavAccessState } from '@/lib/salon-access';
import SalonPermissionGate from '@/routes/SalonPermissionGate';
import { formatRoleLabel } from '@/pages/salon/settings-feature-modules';
import './salon-admin-sidebar.css';

function primaryRoleLabel(roles: string[] | undefined | null): string | null {
  if (!roles?.length) return null;
  const preferred =
    roles.find((role) => role === 'SALON_ADMIN') ??
    roles.find((role) => role !== 'SUPER_ADMIN') ??
    roles[0];
  return formatRoleLabel(preferred);
}

function SalonLogo({
  logoUrl,
  size = 'md',
}: {
  logoUrl: string | null;
  size?: 'sm' | 'md';
}) {
  const logoSrc = resolveUploadUrl(logoUrl);

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
      )}
    >
      {logoSrc ? (
        <img src={logoSrc} alt="" className="h-full w-full object-cover" />
      ) : (
        <Scissors className={cn('text-muted-foreground', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} />
      )}
    </div>
  );
}

function SalonBrand({
  salonName,
  logoUrl,
}: {
  salonName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <SalonLogo logoUrl={logoUrl} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Salon360</p>
        <p className="truncate text-base font-semibold leading-tight">{salonName}</p>
      </div>
    </div>
  );
}

type NavLinkItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  feature?: string;
  module?: string;
  adminOnly?: boolean;
};

type NavGroup = {
  label?: string;
  to?: string;
  icon?: LucideIcon;
  feature?: string;
  module?: string;
  adminOnly?: boolean;
  children?: NavLinkItem[];
};

const navGroups: NavGroup[] = [
  { to: '/salon/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'POS' },
  {
    label: 'Sales',
    icon: ShoppingCart,
    module: 'POS',
    children: [
      { to: '/salon/pos', label: 'POS', icon: ShoppingCart, feature: 'POS', module: 'POS' },
      { to: '/salon/sales', label: 'Transactions', icon: Receipt, module: 'POS' },
      {
        to: '/salon/sales-analytics',
        label: 'Sales Analytics',
        icon: BarChart3,
        feature: 'POS',
        module: 'POS',
      },
    ],
  },
  {
    label: 'Appointments',
    icon: CalendarDays,
    feature: 'APPOINTMENTS',
    module: 'APPOINTMENTS',
    children: [
      {
        to: '/salon/appointments',
        label: 'Calendar & Bookings',
        icon: CalendarDays,
        feature: 'APPOINTMENTS',
        module: 'APPOINTMENTS',
      },
    ],
  },
  {
    label: 'Customers',
    icon: Users,
    feature: 'CUSTOMERS',
    module: 'CUSTOMERS',
    children: [
      {
        to: '/salon/customers',
        label: 'Customer List',
        icon: Users,
        feature: 'CUSTOMERS',
        module: 'CUSTOMERS',
      },
    ],
  },
  {
    label: 'Services',
    icon: Scissors,
    feature: 'SERVICES',
    module: 'SERVICES',
    children: [
      {
        to: '/salon/services',
        label: 'Service Catalog',
        icon: Scissors,
        feature: 'SERVICES',
        module: 'SERVICES',
      },
      {
        to: '/salon/service-categories',
        label: 'Categories',
        icon: Sparkles,
        feature: 'SERVICES',
        module: 'SERVICES',
      },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    feature: 'INVENTORY',
    module: 'INVENTORY',
    children: [
      {
        to: '/salon/products',
        label: 'Products',
        icon: Package,
        feature: 'INVENTORY',
        module: 'INVENTORY',
      },
      {
        to: '/salon/stock',
        label: 'Stock Management',
        icon: Boxes,
        feature: 'INVENTORY',
        module: 'INVENTORY',
      },
      {
        to: '/salon/product-categories',
        label: 'Categories',
        icon: Sparkles,
        feature: 'INVENTORY',
        module: 'INVENTORY',
      },
    ],
  },
  {
    label: 'Expenses',
    icon: Coins,
    feature: 'EXPENSES',
    module: 'EXPENSES',
    children: [
      {
        to: '/salon/expenses',
        label: 'Expense List',
        icon: Coins,
        feature: 'EXPENSES',
        module: 'EXPENSES',
      },
      {
        to: '/salon/expense-categories',
        label: 'Categories',
        icon: Sparkles,
        feature: 'EXPENSES',
        module: 'EXPENSES',
      },
    ],
  },
  {
    label: 'Payroll',
    icon: Wallet,
    feature: 'PAYROLL',
    module: 'PAYROLL',
    children: [
      {
        to: '/salon/payroll',
        label: 'Run Payroll',
        icon: Wallet,
        feature: 'PAYROLL',
        module: 'PAYROLL',
      },
      {
        to: '/salon/employees',
        label: 'Employee Registration',
        icon: UserSquare2,
        feature: 'PAYROLL',
        module: 'CORE',
      },
      {
        to: '/salon/payroll/advances',
        label: 'Advance Payments',
        icon: Wallet,
        feature: 'PAYROLL',
        module: 'PAYROLL',
      },
      {
        to: '/salon/payroll/loans',
        label: 'Employee Loans',
        icon: Wallet,
        feature: 'PAYROLL',
        module: 'PAYROLL',
      },
      {
        to: '/salon/payroll/payslips',
        label: 'Payslips',
        icon: Wallet,
        feature: 'PAYROLL',
        module: 'PAYROLL',
      },
    ],
  },
  {
    label: 'Employees',
    icon: UserSquare2,
    module: 'CORE',
    children: [
      {
        to: '/salon/employees',
        label: 'Staff Management',
        icon: UserSquare2,
        module: 'CORE',
      },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    feature: 'REPORTS',
    module: 'POS',
    children: [
      {
        to: '/salon/reports',
        label: 'Business Reports',
        icon: BarChart3,
        feature: 'REPORTS',
        module: 'POS',
      },
      {
        to: '/salon/sales-analytics',
        label: 'Sales Analytics',
        icon: BarChart3,
        feature: 'POS',
        module: 'POS',
      },
    ],
  },
  {
    to: '/salon/branches',
    label: 'Branches',
    icon: GitBranch,
    module: 'MULTI_BRANCH',
  },
  {
    to: '/salon/subscription',
    label: 'Subscription',
    icon: CreditCard,
    adminOnly: true,
  },
  {
    to: '/salon/settings',
    label: 'Settings',
    icon: Settings,
    adminOnly: true,
  },
];

function SidebarLink({
  to,
  label,
  icon: Icon,
  onNavigate,
  access = 'allowed',
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  onNavigate?: () => void;
  access?: NavAccessState;
}) {
  if (access === 'disabled') {
    return (
      <div
        className="salon-sidebar-link salon-sidebar-link-disabled"
        title="No access for your role"
        aria-disabled="true"
      >
        <Icon className="salon-sidebar-link-icon" strokeWidth={2} />
        <span className="salon-sidebar-link-label">{label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => cn('salon-sidebar-link', isActive && 'active')}
    >
      <Icon className="salon-sidebar-link-icon" strokeWidth={2} />
      <span className="salon-sidebar-link-label">{label}</span>
    </NavLink>
  );
}

function itemAccess(
  item: Pick<NavLinkItem, 'feature' | 'module' | 'adminOnly'>,
  enabledFeatures: string[],
  roles: string[],
  permissions: string[],
): NavAccessState {
  return resolveNavAccess({
    feature: item.feature,
    module: item.module,
    adminOnly: item.adminOnly,
    enabledFeatures,
    roles,
    permissions,
  });
}

function NavItems({
  enabledFeatures,
  roles,
  permissions,
  onNavigate,
}: {
  enabledFeatures: string[];
  roles: string[];
  permissions: string[];
  onNavigate?: () => void;
}) {
  const location = useLocation();

  return (
    <nav className="salon-sidebar">
      {navGroups.map((group) => {
        if (group.to && group.icon) {
          const access = itemAccess(group, enabledFeatures, roles, permissions);
          if (access === 'hidden') return null;
          return (
            <SidebarLink
              key={group.to}
              to={group.to}
              label={group.label ?? ''}
              icon={group.icon}
              onNavigate={onNavigate}
              access={access}
            />
          );
        }

        const childrenWithAccess = (group.children ?? [])
          .map((c) => ({
            item: c,
            access: itemAccess(c, enabledFeatures, roles, permissions),
          }))
          .filter((entry) => entry.access !== 'hidden');

        if (childrenWithAccess.length === 0) return null;

        const GroupIcon = group.icon ?? LayoutDashboard;
        const isChildActive = childrenWithAccess.some(
          (entry) =>
            entry.access === 'allowed' && location.pathname.startsWith(entry.item.to),
        );

        return (
          <div key={group.label}>
            <div className={cn('salon-sidebar-section', isChildActive && 'active')}>
              <GroupIcon className="salon-sidebar-section-icon" strokeWidth={2.25} />
              <span>{group.label}</span>
            </div>
            <div className="salon-sidebar-children">
              {childrenWithAccess.map(({ item, access }) => (
                <SidebarLink
                  key={`${item.to}-${item.label}`}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  onNavigate={onNavigate}
                  access={access}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function SalonAdminHeader({
  salonName,
  salonLogoUrl,
  onLogout,
  enabledFeatures,
  roles,
  permissions,
}: {
  salonName: string;
  salonLogoUrl: string | null;
  onLogout: () => void;
  enabledFeatures: string[];
  roles: string[];
  permissions: string[];
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { branchId, setBranchId } = useSalonBranch();
  const [search, setSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', branchId, 'today'],
    queryFn: () =>
      tenantApi.dashboard.get(branchId === 'all' ? undefined : branchId, 'today'),
    staleTime: 120_000,
  });

  const lowStockCount = dashboard?.kpis.lowStockCount ?? 0;
  const roleLabel = primaryRoleLabel(roles);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/salon/customers?search=${encodeURIComponent(q)}`);
  };

  const headerActions = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => navigate('/salon/stock')}
        title={lowStockCount > 0 ? `${lowStockCount} low stock items` : 'Notifications'}
      >
        <Bell className="h-4 w-4" />
        {lowStockCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {lowStockCount > 9 ? '9+' : lowStockCount}
          </span>
        )}
      </Button>

      <div className="relative" ref={profileRef}>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-auto sm:w-auto sm:gap-2 sm:pl-1 sm:pr-2"
          onClick={() => setProfileOpen((v) => !v)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden min-w-0 flex-col items-start text-left sm:flex">
            <span className="max-w-[140px] truncate text-sm font-medium leading-tight">
              {user?.name ?? 'Profile'}
            </span>
            {roleLabel && (
              <span className="max-w-[140px] truncate text-[11px] font-normal text-muted-foreground leading-tight">
                {roleLabel}
              </span>
            )}
          </span>
        </Button>

        {profileOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              {roleLabel && (
                <p className="truncate text-xs font-medium text-primary">{roleLabel}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              onClick={() => {
                setProfileOpen(false);
                navigate('/salon/settings');
              }}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
              onClick={() => {
                setProfileOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <header className="salon-app-header flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 md:h-16 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        {/* Mobile: menu + brand */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="salon-mobile-sheet">
              <div className="salon-mobile-sheet-header">
                <SalonBrand salonName={salonName} logoUrl={salonLogoUrl} />
              </div>
              <div className="salon-mobile-sheet-nav">
                <NavItems
                  enabledFeatures={enabledFeatures}
                  roles={roles}
                  permissions={permissions}
                  onNavigate={() => setMenuOpen(false)}
                />
              </div>
              <div className="salon-mobile-sheet-footer">
                {user?.email && (
                  <div className="mb-3 px-1">
                    {roleLabel && (
                      <p className="truncate text-xs font-medium text-foreground">{roleLabel}</p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <SalonLogo logoUrl={salonLogoUrl} size="sm" />
          <p className="salon-mobile-header-title">{salonName}</p>
        </div>

        {/* Desktop: branch + search */}
        <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-9 w-[160px] shrink-0">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <form onSubmit={handleSearch} className="min-w-0 flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="h-9 pl-9"
              />
            </div>
          </form>
        </div>
      </div>

      <div className="salon-header-actions flex shrink-0 items-center gap-1 md:gap-2">
        {headerActions}
      </div>
    </header>
  );
}

function SalonAdminLayoutInner() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const { data: features = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantApi.settings.get,
    staleTime: 60_000,
  });

  const salonName = settings?.salon.name ?? 'Salon Admin';
  const salonLogoUrl = settings?.salon.logoUrl ?? null;
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const roleLabel = primaryRoleLabel(roles);

  const handleLogout = async () => {
    await logout();
    navigate('/salon/login');
  };

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!user?.tenantId) return;

    const validateSession = () => {
      void refreshUser().catch(async () => {
        await logout();
        navigate('/salon/login');
      });
    };

    const timer = window.setInterval(validateSession, 30_000);
    return () => window.clearInterval(timer);
  }, [user?.tenantId, refreshUser, logout, navigate]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="salon-sidebar-aside hidden h-dvh w-[260px] shrink-0 flex-col border-r border-border md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <SalonBrand salonName={salonName} logoUrl={salonLogoUrl} />
        </div>
        <div className="salon-sidebar-scroll flex min-h-0 flex-1 flex-col justify-between overflow-y-auto p-3">
          <NavItems
            enabledFeatures={features}
            roles={roles}
            permissions={permissions}
          />
          <div className="mt-4 shrink-0">
            <Separator className="mb-4" />
            <div className="mb-3 px-3">
              {roleLabel && (
                <div className="truncate text-xs font-medium text-foreground">{roleLabel}</div>
              )}
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
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
        <SalonAdminHeader
          salonName={salonName}
          salonLogoUrl={salonLogoUrl}
          onLogout={() => void handleLogout()}
          enabledFeatures={features}
          roles={roles}
          permissions={permissions}
        />

        <main
          ref={mainRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] p-4 md:p-6"
        >
          <SalonPermissionGate>
            <Outlet />
          </SalonPermissionGate>
        </main>
      </div>
    </div>
  );
}

export default function SalonAdminLayout() {
  return (
    <SalonBranchProvider>
      <SalonAdminLayoutInner />
    </SalonBranchProvider>
  );
}
