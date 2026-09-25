import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import {
  DashboardBarChart,
  DashboardPieChart,
  fillWeeklySales,
} from '@/components/dashboard/dashboard-charts';
import {
  DashboardEmpty,
  DashboardPanel,
  DashboardStatCard,
} from '@/components/dashboard/dashboard-ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { OpsError, OpsLoading } from './salon-ops-ui';
import '@/components/dashboard/dashboard-page.css';
import './employees-page.css';

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const { branchId, setBranchId, branches } = useSalonBranch();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', branchId],
    queryFn: () => tenantApi.dashboard.get(branchId === 'all' ? undefined : branchId),
  });

  const weeklyChart = useMemo(
    () => fillWeeklySales(data?.weeklySales ?? []),
    [data?.weeklySales],
  );

  const servicePie = useMemo(
    () =>
      (data?.topServices ?? []).map((svc) => ({
        name: svc.name,
        value: svc.revenue,
      })),
    [data?.topServices],
  );

  if (isLoading) return <OpsLoading />;
  if (isError || !data) {
    return <OpsError message="Failed to load dashboard." onRetry={() => void refetch()} />;
  }

  return (
    <div className="dash-page emp-page">
      <header className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of sales, customers, inventory, and top services</p>
        </div>
        <div className="dash-header-actions">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="dash-filter-select">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="dash-stats">
        <DashboardStatCard
          icon={Wallet}
          label="Today's sales"
          value={formatMoney(data.todaySales.total)}
          sub={`${data.todaySales.count} transactions`}
          isMoney
        />
        <DashboardStatCard
          icon={TrendingUp}
          label="Monthly sales"
          value={formatMoney(data.monthlySales.total)}
          sub={`${data.monthlySales.count} transactions`}
          isMoney
        />
        <DashboardStatCard
          icon={Users}
          label="Active customers"
          value={String(data.totalCustomers)}
          sub="Registered customers"
        />
        <DashboardStatCard
          icon={AlertTriangle}
          label="Low stock"
          value={String(data.lowStockProducts.length)}
          sub="Items at or below 5"
        />
      </div>

      <div className="dash-grid dash-grid-2">
        <DashboardPanel title="Sales trend" description="Last 7 days revenue (LKR)">
          {weeklyChart.some((d) => d.value > 0) ? (
            <div className="dash-chart-wrap">
              <DashboardBarChart data={weeklyChart} valuePrefix="LKR " />
            </div>
          ) : (
            <DashboardEmpty message="No sales in the last 7 days yet." />
          )}
        </DashboardPanel>

        <DashboardPanel title="Top services" description="Revenue share (30 days)">
          {servicePie.length > 0 ? (
            <div className="dash-chart-wrap">
              <DashboardPieChart data={servicePie} valuePrefix="LKR " />
            </div>
          ) : (
            <DashboardEmpty message="No service sales yet." />
          )}
        </DashboardPanel>
      </div>

      <div className="dash-grid dash-grid-bottom" style={{ marginTop: '1rem' }}>
        <DashboardPanel
          title="Low stock products"
          description="Needs restocking soon"
          action={
            <Link to="/salon/inventory" className="dash-link-btn">
              View inventory
            </Link>
          }
        >
          {data.lowStockProducts.length === 0 ? (
            <DashboardEmpty message="All products are above the low-stock threshold." />
          ) : (
            <div className="dash-list">
              {data.lowStockProducts.map((item) => (
                <div key={`${item.branchId}-${item.productId}`} className="dash-list-item">
                  <div className="dash-list-item-main">
                    <div className="dash-list-item-name">{item.productName}</div>
                    <div className="dash-list-item-sub">Branch stock alert</div>
                  </div>
                  <span className="dash-badge-warn">Qty {item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Top performing services"
          description="By sales count (30 days)"
          action={
            <Link to="/salon/reports" className="dash-link-btn">
              <CalendarDays size={14} />
              Reports
            </Link>
          }
        >
          {data.topServices.length === 0 ? (
            <DashboardEmpty message="No service sales yet." />
          ) : (
            <div className="dash-list">
              {data.topServices.map((svc) => (
                <div key={svc.id} className="dash-list-item">
                  <div className="dash-list-item-main">
                    <div className="dash-list-item-name">{svc.name}</div>
                    <div className="dash-list-item-sub">{svc.saleCount} sales</div>
                  </div>
                  <span className="dash-list-item-value">LKR {formatMoney(svc.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}
