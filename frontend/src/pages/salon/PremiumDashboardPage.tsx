import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Package,
  Scissors,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  tenantApi,
  type SalonDashboardPeriod,
} from '@/api/tenant.api';
import {
  AppointmentStackedChart,
  CustomerGrowthChart,
  EmployeePerformanceChart,
  InventoryDonutChart,
  SalesTrendChart,
  ServiceDonutChart,
  TopServicesBarChart,
} from '@/components/salon/SalonDashboardCharts';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import { cn } from '@/lib/utils';
import { OpsError, OpsLoading } from './salon-ops-ui';
import '../super-admin/super-admin-dashboard.css';
import './salon-owner-dashboard.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatApptTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function paymentStatusClass(status: string) {
  const key = status.toUpperCase();
  if (key === 'COMPLETED' || key === 'PAID') return 'sd360-status-paid';
  if (key === 'PENDING') return 'sd360-status-pending';
  return 'sd360-status-failed';
}

function paymentStatusLabel(status: string) {
  const key = status.toUpperCase();
  if (key === 'COMPLETED') return 'Paid';
  if (key === 'PENDING') return 'Pending';
  return status;
}

const PERIODS: { key: SalonDashboardPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

function EmptyChart({ message }: { message: string }) {
  return <div className="s360-empty-chart">{message}</div>;
}

export default function PremiumDashboardPage() {
  const { branchId } = useSalonBranch();
  const [period, setPeriod] = useState<SalonDashboardPeriod>('today');

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantApi.settings.get,
    staleTime: 60_000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', branchId, period],
    queryFn: () =>
      tenantApi.dashboard.get(branchId === 'all' ? undefined : branchId, period),
  });

  if (isLoading) return <OpsLoading />;
  if (isError || !data) {
    return <OpsError message="Failed to load dashboard data." onRetry={() => void refetch()} />;
  }

  const salonName = settings?.salon.name ?? 'Your Salon';
  const { kpis, charts, recentTransactions, upcomingAppointments } = data;

  const inventoryDonut = [
    { name: 'Available', value: charts.inventoryOverview.available },
    { name: 'Low Stock', value: charts.inventoryOverview.low },
    { name: 'Out of Stock', value: charts.inventoryOverview.outOfStock },
  ].filter((d) => d.value > 0);

  const revenueLabel =
    period === 'today'
      ? "Today's Revenue"
      : period === 'week'
        ? 'Weekly Revenue'
        : period === 'month'
          ? 'Monthly Revenue'
          : 'Yearly Revenue';

  return (
    <div className="sd360-dash">
      <div className="s360-hero">
        <div>
          <h1>
            {getGreeting()}, {salonName} 👋
          </h1>
          <p>Here is your business overview today</p>
        </div>
      </div>

      <div className="s360-period-filter">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={cn('s360-period-btn', period === p.key && 'active')}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="sd360-kpi-row">
        <div className="sd360-kpi-compact">
          <div className="sd360-kpi-compact-top">
            <span className="sd360-kpi-compact-label">{revenueLabel}</span>
            <div className="sd360-kpi-icon">
              <Wallet size={14} />
            </div>
          </div>
          <div className="sd360-kpi-compact-value green">{formatMoneyLkr(kpis.periodRevenue, { maximumFractionDigits: 0 })}</div>
          <div className="sd360-kpi-compact-foot">
            <span className="sd360-kpi-compact-stat">
              <span className="s360-dot green" />
              <strong>{kpis.periodSalesCount}</strong> txns
            </span>
          </div>
        </div>

        <div className="sd360-kpi-compact">
          <div className="sd360-kpi-compact-top">
            <span className="sd360-kpi-compact-label">Appointments</span>
            <div className="sd360-kpi-icon">
              <CalendarDays size={14} />
            </div>
          </div>
          <div className="sd360-kpi-compact-value">{kpis.todayAppointments}</div>
          <div className="sd360-kpi-compact-foot">
            <span className="sd360-kpi-compact-stat">
              <span className="s360-dot blue" />
              <strong>{kpis.periodAppointments}</strong> in period
            </span>
          </div>
        </div>

        <div className="sd360-kpi-compact">
          <div className="sd360-kpi-compact-top">
            <span className="sd360-kpi-compact-label">Customers</span>
            <div className="sd360-kpi-icon">
              <Users size={14} />
            </div>
          </div>
          <div className="sd360-kpi-compact-value">{kpis.totalCustomers.toLocaleString()}</div>
          <div className="sd360-kpi-compact-foot">
            <span className="sd360-kpi-compact-stat">
              <span className="s360-dot green" />
              <strong>+{kpis.newCustomers}</strong> new
            </span>
          </div>
        </div>

        <div className="sd360-kpi-compact">
          <div className="sd360-kpi-compact-top">
            <span className="sd360-kpi-compact-label">Services Done</span>
            <div className="sd360-kpi-icon">
              <Scissors size={14} />
            </div>
          </div>
          <div className="sd360-kpi-compact-value">{kpis.servicesCompleted}</div>
          <div className="sd360-kpi-compact-foot">
            <span className="sd360-kpi-compact-stat">
              <span className="s360-dot green" />
              in period
            </span>
          </div>
        </div>

        <div className="sd360-kpi-compact">
          <div className="sd360-kpi-compact-top">
            <span className="sd360-kpi-compact-label">Low Stock</span>
            <div className="sd360-kpi-icon">
              <Package size={14} />
            </div>
          </div>
          <div className="sd360-kpi-compact-value">{kpis.lowStockCount}</div>
          <div className="sd360-kpi-compact-foot">
            <Link to="/salon/stock" className="sd360-kpi-compact-stat" style={{ textDecoration: 'none' }}>
              <AlertTriangle size={10} color="#d97706" />
              View
            </Link>
          </div>
        </div>

        <div className="sd360-kpi-compact">
          <div className="sd360-kpi-compact-top">
            <span className="sd360-kpi-compact-label">Employees</span>
            <div className="sd360-kpi-icon">
              <Users size={14} />
            </div>
          </div>
          <div className="sd360-kpi-compact-value">{kpis.employeeCount}</div>
          <div className="sd360-kpi-compact-foot">
            <span className="sd360-kpi-compact-stat">
              <span className="s360-dot green" />
              active
            </span>
          </div>
        </div>
      </div>

      <div className="sd360-charts-grid">
        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Sales Performance</h3>
              <p className="s360-card-sub">Revenue trend for selected period</p>
            </div>
            <TrendingUp size={18} color="var(--brand-primary, #0d5c3d)" />
          </div>
          <div className="s360-card-body chart">
            {charts.salesTrend.length > 0 ? (
              <SalesTrendChart data={charts.salesTrend} />
            ) : (
              <EmptyChart message="No sales data for this period" />
            )}
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Revenue by Service</h3>
              <p className="s360-card-sub">Share of revenue by service type</p>
            </div>
          </div>
          <div className="s360-card-body chart">
            {charts.revenueByService.length > 0 ? (
              <ServiceDonutChart data={charts.revenueByService} />
            ) : (
              <EmptyChart message="No service revenue data" />
            )}
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Top Performing Services</h3>
              <p className="s360-card-sub">Most booked services</p>
            </div>
          </div>
          <div className="s360-card-body chart">
            {charts.topServices.length > 0 ? (
              <TopServicesBarChart data={charts.topServices} />
            ) : (
              <EmptyChart message="No service bookings yet" />
            )}
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Employee Performance</h3>
              <p className="s360-card-sub">Revenue and services completed</p>
            </div>
          </div>
          <div className="s360-card-body chart">
            {charts.employeePerformance.length > 0 ? (
              <EmployeePerformanceChart data={charts.employeePerformance} />
            ) : (
              <EmptyChart message="No employee performance data" />
            )}
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Appointment Analytics</h3>
              <p className="s360-card-sub">Completed, pending, and cancelled</p>
            </div>
          </div>
          <div className="s360-card-body chart">
            {charts.appointmentAnalytics.length > 0 ? (
              <>
                <AppointmentStackedChart data={charts.appointmentAnalytics} />
                <div className="s360-legend">
                  <span className="s360-legend-item">
                    <span
                      className="s360-legend-dot"
                      style={{ background: 'var(--brand-primary, #0d5c3d)' }}
                    />
                    Completed
                  </span>
                  <span className="s360-legend-item">
                    <span className="s360-legend-dot" style={{ background: '#f59e0b' }} />
                    Pending
                  </span>
                  <span className="s360-legend-item">
                    <span className="s360-legend-dot" style={{ background: '#ef4444' }} />
                    Cancelled
                  </span>
                </div>
              </>
            ) : (
              <EmptyChart message="No appointment data for this period" />
            )}
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Inventory Overview</h3>
              <p className="s360-card-sub">Stock health across products</p>
            </div>
          </div>
          <div className="s360-card-body chart">
            {inventoryDonut.length > 0 ? (
              <>
                <InventoryDonutChart data={inventoryDonut} />
                <div className="s360-legend">
                  <span className="s360-legend-item">
                    <span className="s360-legend-dot" style={{ background: '#10b981' }} />
                    Available ({charts.inventoryOverview.available})
                  </span>
                  <span className="s360-legend-item">
                    <span className="s360-legend-dot" style={{ background: '#f59e0b' }} />
                    Low ({charts.inventoryOverview.low})
                  </span>
                  <span className="s360-legend-item">
                    <span className="s360-legend-dot" style={{ background: '#ef4444' }} />
                    Out ({charts.inventoryOverview.outOfStock})
                  </span>
                </div>
              </>
            ) : (
              <EmptyChart message="No inventory data" />
            )}
          </div>
        </div>
      </div>

      <div className="sd360-row-split">
        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Recent Transactions</h3>
              <p className="s360-card-sub">Latest completed sales</p>
            </div>
            <Link to="/salon/sales" className="s360-btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
              View all
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="s360-table-wrap">
            <table className="s360-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Employee</th>
                  <th>Amount (LKR)</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <Link to={`/salon/sales/${tx.id}`} className="s360-table-name">
                          {tx.invoiceNo}
                        </Link>
                      </td>
                      <td>{tx.customer ?? 'Walk-in'}</td>
                      <td>{tx.service ?? '—'}</td>
                      <td>{tx.employee ?? '—'}</td>
                      <td>{formatMoneyAmount(tx.amount, { maximumFractionDigits: 0 })}</td>
                      <td>
                        <span className={paymentStatusClass(tx.paymentStatus)}>
                          {paymentStatusLabel(tx.paymentStatus)}
                        </span>
                      </td>
                      <td>{formatDate(tx.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Upcoming Appointments</h3>
              <p className="s360-card-sub">Next scheduled bookings</p>
            </div>
            <Link
              to="/salon/appointments"
              className="s360-btn-primary"
              style={{ padding: '8px 14px', fontSize: 12 }}
            >
              Calendar
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="s360-card-body">
            {upcomingAppointments.length === 0 ? (
              <EmptyChart message="No upcoming appointments" />
            ) : (
              <div className="sd360-appt-list">
                {upcomingAppointments.map((appt) => (
                  <div key={appt.id} className="sd360-appt-item">
                    <div className="sd360-appt-time">{formatApptTime(appt.time)}</div>
                    <div className="sd360-appt-meta">
                      <p className="sd360-appt-customer">{appt.customer}</p>
                      <p className="sd360-appt-service">{appt.service ?? 'Service'}</p>
                    </div>
                    <div className="sd360-appt-employee">{appt.employee ?? 'Unassigned'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="s360-card">
        <div className="s360-card-head">
          <div>
            <h3 className="s360-card-title">Customer Growth</h3>
            <p className="s360-card-sub">New customers over the last 12 months</p>
          </div>
        </div>
        <div className="s360-card-body chart">
          {charts.customerGrowth.some((d) => d.count > 0) ? (
            <CustomerGrowthChart data={charts.customerGrowth} />
          ) : (
            <EmptyChart message="No customer growth data yet" />
          )}
        </div>
      </div>
    </div>
  );
}
