import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  Coins,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Scissors,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
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
import { NotificationBell } from '@/components/salon/NotificationBell';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SalonBranchProvider } from '@/contexts/SalonBranchContext';
import { TenantThemeProvider } from '@/contexts/TenantThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveUploadUrl } from '@/lib/upload-url';
import { cn } from '@/lib/utils';
import { resolveNavAccess, type NavAccessState } from '@/lib/salon-access';
import SalonPermissionGate from '@/routes/SalonPermissionGate';
import { formatRoleLabel } from '@/pages/salon/settings-feature-modules';
import { SubscriptionBanner } from '@/components/salon/SubscriptionBanner';
import { APP_NAME } from '@/config/brand';
import './salon-admin-sidebar.css';
import './salon-brand-overrides.css';

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
  collapsed = false,
}: {
  salonName: string;
  logoUrl: string | null;
  collapsed?: boolean;
}) {
  return (
    <div
      title={collapsed ? salonName : undefined}
      className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-3')}
    >
      <SalonLogo logoUrl={logoUrl} />
      {!collapsed && (
        <div className="salon-brand-text-wrap min-w-0">
          <p className="text-xs text-muted-foreground">{APP_NAME}</p>
          <p className="truncate text-base font-semibold leading-tight">{salonName}</p>
        </div>
      )}
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
        to: '/salon/quotations',
        label: 'Quotations',
        icon: FileText,
        feature: 'QUOTATIONS',
        module: 'QUOTATIONS',
      },
      {
        to: '/salon/reports?tab=sales',
        label: 'Sales Report',
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
    label: 'Suppliers & GRN',
    icon: Truck,
    feature: 'INVENTORY',
    module: 'INVENTORY',
    children: [
      {
        to: '/salon/suppliers',
        label: 'Suppliers',
        icon: Truck,
        feature: 'INVENTORY',
        module: 'INVENTORY',
      },
      {
        to: '/salon/grns',
        label: 'GRN / Purchases',
        icon: FileText,
        feature: 'INVENTORY',
        module: 'INVENTORY',
      },
      {
        to: '/salon/supplier-payments',
        label: 'Supplier Payments',
        icon: CreditCard,
        feature: 'INVENTORY',
        module: 'INVENTORY',
      },
      {
        to: '/salon/supplier-outstanding',
        label: 'Outstanding / Credit',
        icon: Coins,
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
    feature: 'EMPLOYEES',
    children: [
      {
        to: '/salon/employees',
        label: 'Staff Management',
        icon: UserSquare2,
        feature: 'EMPLOYEES',
      },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    children: [
      {
        to: '/salon/reports?tab=sales',
        label: 'Sales Report',
        icon: Receipt,
        feature: 'SALES_REPORTS',
        module: 'POS',
      },
      {
        to: '/salon/reports?tab=employee-performance',
        label: 'Employee Performance',
        icon: UserSquare2,
        feature: 'EMPLOYEE_REPORTS',
        module: 'POS',
      },
      {
        to: '/salon/reports?tab=inventory',
        label: 'Inventory Report',
        icon: Package,
        feature: 'INVENTORY_REPORTS',
        module: 'INVENTORY',
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
  collapsed = false,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  onNavigate?: () => void;
  access?: NavAccessState;
  collapsed?: boolean;
}) {
  const location = useLocation();

  if (access === 'disabled') {
    return (
      <div
        className="salon-sidebar-link salon-sidebar-link-disabled"
        title={`${label} (No access)`}
        aria-disabled="true"
      >
        <Icon className="salon-sidebar-link-icon" strokeWidth={2} />
        {!collapsed && <span className="salon-sidebar-link-label">{label}</span>}
      </div>
    );
  }

  const currentUrl = location.pathname + location.search;
  const isQueryLink = to.includes('?');
  const isActive = isQueryLink
    ? currentUrl === to || (to === '/salon/reports?tab=sales' && location.pathname === '/salon/reports' && !location.search)
    : location.pathname === to || (to !== '/salon/dashboard' && location.pathname.startsWith(to));

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={label}
      aria-label={label}
      className={() => cn('salon-sidebar-link', isActive && 'active')}
    >
      <Icon className="salon-sidebar-link-icon" strokeWidth={2} />
      {!collapsed && <span className="salon-sidebar-link-label">{label}</span>}
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
  collapsed = false,
  onExpandSidebar,
}: {
  enabledFeatures: string[];
  roles: string[];
  permissions: string[];
  onNavigate?: () => void;
  collapsed?: boolean;
  onExpandSidebar?: () => void;
}) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    const activeGroup = navGroups.find(
      (group) => group.label && group.children?.some(
        (item) => {
          const itemPath = item.to.split('?')[0];
          return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
        },
      ),
    );
    if (activeGroup?.label) {
      setExpandedGroups((current) =>
        current.includes(activeGroup.label!) ? current : [...current, activeGroup.label!],
      );
    }
  }, [location.pathname]);

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
              collapsed={collapsed}
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
            entry.access === 'allowed' &&
            location.pathname.startsWith(entry.item.to.split('?')[0]),
        );
        const canCollapse = childrenWithAccess.length > 1;
        const isExpanded = !collapsed && (
          !canCollapse || expandedGroups.includes(group.label ?? '')
        );

        if (!canCollapse) {
          const [{ item, access }] = childrenWithAccess;
          return (
            <SidebarLink
              key={group.label}
              to={item.to}
              label={group.label ?? item.label}
              icon={GroupIcon}
              onNavigate={onNavigate}
              access={access}
              collapsed={collapsed}
            />
          );
        }

        return (
          <div key={group.label} title={collapsed ? group.label : undefined}>
            <button
              type="button"
              className={cn('salon-sidebar-section', isChildActive && 'active')}
              aria-expanded={isExpanded}
              onClick={() => {
                const label = group.label ?? '';
                if (collapsed) {
                  onExpandSidebar?.();
                  setExpandedGroups((current) =>
                    current.includes(label) ? current : [...current, label],
                  );
                  return;
                }
                setExpandedGroups((current) =>
                  current.includes(label)
                    ? current.filter((entry) => entry !== label)
                    : [...current, label],
                );
              }}
            >
              <GroupIcon className="salon-sidebar-section-icon" strokeWidth={2.25} />
              <span>{group.label}</span>
              <ChevronDown
                className={cn('salon-sidebar-chevron', isExpanded && 'expanded')}
                aria-hidden="true"
              />
            </button>
            {isExpanded && (
              <div className="salon-sidebar-children">
                {childrenWithAccess.map(({ item, access }) => (
                  <SidebarLink
                    key={`${item.to}-${item.label}`}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    onNavigate={onNavigate}
                    access={access}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            )}
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
  collapsed = false,
  onToggleCollapse,
}: {
  salonName: string;
  salonLogoUrl: string | null;
  onLogout: () => void;
  enabledFeatures: string[];
  roles: string[];
  permissions: string[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  const headerActions = (
    <>
      <NotificationBell />

      <div className="relative" ref={profileRef}>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-auto sm:w-auto sm:gap-2 sm:pl-1 sm:pr-2"
          onClick={() => setProfileOpen((v) => !v)}
        >
          <div className="salon-brand-avatar flex h-8 w-8 items-center justify-center rounded-full">
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
                <p className="salon-brand-text truncate text-xs font-medium">{roleLabel}</p>
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

          {/* Centered Mobile Salon Brand */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 pr-2">
            <SalonLogo logoUrl={salonLogoUrl} size="sm" />
            <div className="min-w-0 text-left">
              <p className="salon-mobile-header-title truncate">{salonName}</p>
            </div>
          </div>
        </div>

        {/* Desktop: expand a collapsed sidebar from the top header ribbon */}
        {collapsed && onToggleCollapse && (
          <div className="hidden items-center md:flex">
            <button
              type="button"
              className="salon-header-expand-btn"
              title="Expand sidebar"
              aria-label="Expand sidebar"
              onClick={onToggleCollapse}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="salon-header-actions flex shrink-0 items-center gap-1 md:gap-2">
        {headerActions}
      </div>
    </header>
  );
}

function SalonAdminLayoutInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('salon_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('salon_sidebar_collapsed', String(next));
      } catch {
        // Keep the in-memory preference if storage is unavailable.
      }
      return next;
    });
  };

  const expandSidebar = () => {
    setCollapsed(false);
    try {
      localStorage.setItem('salon_sidebar_collapsed', 'false');
    } catch {
      // Keep the in-memory preference if storage is unavailable.
    }
  };

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

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside
        className={cn(
          'salon-sidebar-aside hidden h-dvh shrink-0 flex-col border-r border-border md:flex',
          collapsed ? 'is-collapsed w-[72px]' : 'w-[260px]',
        )}
      >
        <div
          className={cn(
            'salon-sidebar-brand flex h-16 shrink-0 items-center border-b border-border',
            collapsed ? 'flex-col justify-center gap-0 px-2' : 'justify-between px-4',
          )}
        >
          <SalonBrand salonName={salonName} logoUrl={salonLogoUrl} collapsed={collapsed} />
          {!collapsed && (
            <button
              type="button"
              className="salon-collapse-btn"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              onClick={toggleCollapsed}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="salon-sidebar-scroll min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          <NavItems
            enabledFeatures={features}
            roles={roles}
            permissions={permissions}
            collapsed={collapsed}
            onExpandSidebar={expandSidebar}
          />
        </div>
        <div className="salon-sidebar-footer shrink-0 p-2 sm:p-3">
          <Separator className="salon-sidebar-separator mb-4" />
          {!collapsed && (
            <div className="mb-3 px-3">
              {roleLabel && (
                <div className="salon-sidebar-user-role truncate text-xs font-medium">{roleLabel}</div>
              )}
              <div className="salon-sidebar-user-email truncate text-xs">{user?.email}</div>
            </div>
          )}
          {collapsed ? (
            <Button
              variant="outline"
              size="icon"
              className="salon-sidebar-logout is-icon mx-auto h-10 w-10"
              title={`Logout (${user?.email})`}
              aria-label="Logout"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              className="salon-sidebar-logout w-full justify-start gap-2"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SubscriptionBanner />
        <SalonAdminHeader
          salonName={salonName}
          salonLogoUrl={salonLogoUrl}
          onLogout={() => void handleLogout()}
          enabledFeatures={features}
          roles={roles}
          permissions={permissions}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />

        <main
          ref={mainRef}
          className="salon-admin-main min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] p-4 md:p-6"
        >
          <SalonPermissionGate>
            <div className="admin-page-content">
              <Outlet />
            </div>
          </SalonPermissionGate>
        </main>
      </div>
    </div>
  );
}

export default function SalonAdminLayout() {
  return (
    <TenantThemeProvider>
      <SalonBranchProvider>
        <SalonAdminLayoutInner />
      </SalonBranchProvider>
    </TenantThemeProvider>
  );
}
