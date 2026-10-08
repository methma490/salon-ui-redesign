import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BarChart2,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Clock,
  DollarSign,
  Search,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  salonAnalyticsApi,
  type SalonAnalyticsDatePreset,
} from '@/features/super-admin/api/salon-analytics.api';
import { OpsError, OpsLoading } from '@/pages/salon/salon-ops-ui';
import { cn } from '@/lib/utils';
import './salon-analytics.css';

const PIE_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#dc2626', '#8b5cf6', '#64748b'];

function formatMoney(amount: number, currency = 'LKR') {
  return `${currency} ${(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type TabType = 'overview' | 'customers' | 'sales' | 'services' | 'appointments' | 'finance';

export default function SalonAnalyticsDetailPage() {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Date filters
  const [preset, setPreset] = useState<SalonAnalyticsDatePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Tab-specific filters & pagination
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);

  const [salesPaymentMethod, setSalesPaymentMethod] = useState('ALL');
  const [salesPage, setSalesPage] = useState(1);

  const [serviceSort, setServiceSort] = useState('bookings');
  const [servicePage, setServicePage] = useState(1);

  const [appointmentStatus, setAppointmentStatus] = useState('ALL');
  const [appointmentPage, setAppointmentPage] = useState(1);

  const dateParams = useMemo(() => {
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const now = new Date();
    if (preset === '7d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 7);
      return { from: formatDate(from), to: formatDate(now) };
    }
    if (preset === '30d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 30);
      return { from: formatDate(from), to: formatDate(now) };
    }
    if (preset === 'mtd') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDate(from), to: formatDate(now) };
    }
    if (preset === 'custom' && customFrom && customTo) {
      return {
        from: customFrom,
        to: customTo,
      };
    }
    return {};
  }, [preset, customFrom, customTo]);

  // Overview Query
  const overviewQuery = useQuery({
    queryKey: ['super-admin', 'salon-analytics', tenantId, 'overview', dateParams],
    queryFn: () => salonAnalyticsApi.getOverview(tenantId, dateParams),
    enabled: !!tenantId,
  });

  // Customers Query
  const customersQuery = useQuery({
    queryKey: [
      'super-admin',
      'salon-analytics',
      tenantId,
      'customers',
      dateParams,
      customerSearch,
      customerPage,
    ],
    queryFn: () =>
      salonAnalyticsApi.getCustomers(tenantId, {
        ...dateParams,
        search: customerSearch.trim() || undefined,
        page: customerPage,
        limit: 15,
      }),
    enabled: !!tenantId && activeTab === 'customers',
  });

  // Sales Query
  const salesQuery = useQuery({
    queryKey: [
      'super-admin',
      'salon-analytics',
      tenantId,
      'sales',
      dateParams,
      salesPaymentMethod,
      salesPage,
    ],
    queryFn: () =>
      salonAnalyticsApi.getSales(tenantId, {
        ...dateParams,
        paymentMethod: salesPaymentMethod !== 'ALL' ? salesPaymentMethod : undefined,
        page: salesPage,
        limit: 15,
      }),
    enabled: !!tenantId && activeTab === 'sales',
  });

  // Services Query
  const servicesQuery = useQuery({
    queryKey: ['super-admin', 'salon-analytics', tenantId, 'services', dateParams, serviceSort, servicePage],
    queryFn: () =>
      salonAnalyticsApi.getServices(tenantId, {
        ...dateParams,
        sort: serviceSort,
        page: servicePage,
        limit: 15,
      }),
    enabled: !!tenantId && activeTab === 'services',
  });

  // Appointments Query
  const appointmentsQuery = useQuery({
    queryKey: [
      'super-admin',
      'salon-analytics',
      tenantId,
      'appointments',
      dateParams,
      appointmentStatus,
      appointmentPage,
    ],
    queryFn: () =>
      salonAnalyticsApi.getAppointments(tenantId, {
        ...dateParams,
        status: appointmentStatus !== 'ALL' ? appointmentStatus : undefined,
        page: appointmentPage,
        limit: 15,
      }),
    enabled: !!tenantId && activeTab === 'appointments',
  });

  // Finance Query
  const financeQuery = useQuery({
    queryKey: ['super-admin', 'salon-analytics', tenantId, 'finance', dateParams],
    queryFn: () => salonAnalyticsApi.getFinance(tenantId, dateParams),
    enabled: !!tenantId && activeTab === 'finance',
  });

  if (overviewQuery.isLoading) return <OpsLoading />;
  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <OpsError
        message="Failed to load salon analytics detail."
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  const salon = overviewQuery.data.salon;

  return (
    <div className="sa-container">
      {/* Header with Back Link */}
      <div className="sa-detail-header">
        <Link to="/super-admin/salon-analytics" className="sa-back-link">
          <ArrowLeft size={16} />
          Back to Salon Analytics
        </Link>

        <div className="sa-detail-hero">
          <div className="sa-detail-salon-info">
            <div className="sa-detail-avatar">
              {salon.name ? salon.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h1 className="sa-detail-title">{salon.name}</h1>
              <div className="sa-detail-badges">
                <span className="text-xs font-semibold text-slate-500">{salon.code}</span>
                <span
                  className={cn(
                    'sa-badge',
                    salon.status === 'ACTIVE'
                      ? 'active'
                      : salon.status === 'TRIAL'
                        ? 'trial'
                        : salon.status === 'SUSPENDED'
                          ? 'suspended'
                          : 'default',
                  )}
                >
                  {salon.status}
                </span>
                {salon.planName && (
                  <span className="sa-badge default">{salon.planName}</span>
                )}
                <span className="text-xs text-slate-500">
                  {salon.branchCount} {salon.branchCount === 1 ? 'branch' : 'branches'}
                </span>
              </div>
            </div>
          </div>

          {/* Date Filter */}
          <div className="sa-filter-presets">
            <button
              type="button"
              className={cn('sa-preset-btn', preset === '7d' && 'active')}
              onClick={() => setPreset('7d')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={cn('sa-preset-btn', preset === '30d' && 'active')}
              onClick={() => setPreset('30d')}
            >
              30 Days
            </button>
            <button
              type="button"
              className={cn('sa-preset-btn', preset === 'mtd' && 'active')}
              onClick={() => setPreset('mtd')}
            >
              This Month
            </button>
            <button
              type="button"
              className={cn('sa-preset-btn', preset === 'custom' && 'active')}
              onClick={() => setPreset('custom')}
            >
              Custom
            </button>
          </div>
        </div>

        {preset === 'custom' && (
          <div className="sa-custom-dates mt-3">
            <input
              type="date"
              className="sa-date-input"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              className="sa-date-input"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="sa-tabs-bar">
        <button
          type="button"
          className={cn('sa-tab-btn', activeTab === 'overview' && 'active')}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart2 size={16} />
          Overview
        </button>
        <button
          type="button"
          className={cn('sa-tab-btn', activeTab === 'customers' && 'active')}
          onClick={() => setActiveTab('customers')}
        >
          <Users size={16} />
          Customers
        </button>
        <button
          type="button"
          className={cn('sa-tab-btn', activeTab === 'sales' && 'active')}
          onClick={() => setActiveTab('sales')}
        >
          <ShoppingBag size={16} />
          Sales
        </button>
        <button
          type="button"
          className={cn('sa-tab-btn', activeTab === 'services' && 'active')}
          onClick={() => setActiveTab('services')}
        >
          <Award size={16} />
          Services
        </button>
        <button
          type="button"
          className={cn('sa-tab-btn', activeTab === 'appointments' && 'active')}
          onClick={() => setActiveTab('appointments')}
        >
          <CalendarCheck size={16} />
          Appointments
        </button>
        <button
          type="button"
          className={cn('sa-tab-btn', activeTab === 'finance' && 'active')}
          onClick={() => setActiveTab('finance')}
        >
          <Wallet size={16} />
          Finance
        </button>
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && overviewQuery.data && (
        <div>
          {/* Overview KPIs */}
          <div className="sa-kpi-grid six-cols">
            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Customers</span>
                <div className="sa-kpi-icon brand"><Users size={16} /></div>
              </div>
              <div className="sa-kpi-number">{(overviewQuery.data.kpis?.totalCustomers ?? 0).toLocaleString()}</div>
              <span className="sa-kpi-sub">
                +{overviewQuery.data.kpis?.newCustomers ?? 0} new / {overviewQuery.data.kpis?.returningCustomers ?? 0} returning
              </span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Sales Count</span>
                <div className="sa-kpi-icon blue"><ShoppingBag size={16} /></div>
              </div>
              <div className="sa-kpi-number">{(overviewQuery.data.kpis?.totalSales ?? 0).toLocaleString()}</div>
              <span className="sa-kpi-sub">Avg: {formatMoney(overviewQuery.data.kpis.averageSaleValue)}</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Salon Revenue</span>
                <div className="sa-kpi-icon green"><DollarSign size={16} /></div>
              </div>
              <div className="sa-kpi-number">{formatMoney(overviewQuery.data.kpis.revenue)}</div>
              <span className="sa-kpi-sub">Total gross sales</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Expenses</span>
                <div className="sa-kpi-icon red"><TrendingDown size={16} /></div>
              </div>
              <div className="sa-kpi-number">{formatMoney(overviewQuery.data.kpis.totalExpenses)}</div>
              <span className="sa-kpi-sub">Operating costs</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Estimated Profit</span>
                <div className="sa-kpi-icon amber"><TrendingUp size={16} /></div>
              </div>
              <div
                className={cn(
                  'sa-kpi-number',
                  overviewQuery.data.kpis.estimatedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {formatMoney(overviewQuery.data.kpis.estimatedProfit)}
              </div>
              <span className="sa-kpi-sub">Net after expenses</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Appointments</span>
                <div className="sa-kpi-icon purple"><CalendarCheck size={16} /></div>
              </div>
              <div className="sa-kpi-number">{(overviewQuery.data.kpis?.totalAppointments ?? 0).toLocaleString()}</div>
              <span className="sa-kpi-sub">
                {overviewQuery.data.kpis?.completedAppointments ?? 0} completed / {overviewQuery.data.kpis?.cancelledAppointments ?? 0} cancelled
              </span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="sa-charts-grid split">
            <div className="sa-chart-box">
              <h3 className="sa-chart-title">Revenue & Profit Trend</h3>
              <p className="sa-chart-sub">Daily revenue vs estimated profit trajectory</p>
              {overviewQuery.data.charts.revenueTrend.length > 0 ? (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <AreaChart data={overviewQuery.data.charts.revenueTrend}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a44a5c" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#a44a5c" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" tickLine={false} />
                      <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} />
                      <Tooltip
                        formatter={(val: any) => formatMoney(Number(val ?? 0))}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#a44a5c" fillOpacity={1} fill="url(#colorRev)" />
                      <Area type="monotone" dataKey="profit" name="Profit" stroke="#059669" fillOpacity={1} fill="url(#colorProf)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="sa-empty-box">No revenue trend data available for this date range.</div>
              )}
            </div>

            <div className="sa-chart-box">
              <h3 className="sa-chart-title">Appointment Distribution</h3>
              <p className="sa-chart-sub">Breakdown by booking status</p>
              {overviewQuery.data.charts.appointmentDistribution.length > 0 ? (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={overviewQuery.data.charts.appointmentDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {overviewQuery.data.charts.appointmentDistribution.map((entry, idx) => (
                          <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="sa-empty-box">No appointments recorded in this date range.</div>
              )}
            </div>
          </div>

          {/* Second Charts Row */}
          <div className="sa-charts-grid two-cols">
            <div className="sa-chart-box">
              <h3 className="sa-chart-title">Sales Volume Trend</h3>
              <p className="sa-chart-sub">Number of completed sales transactions</p>
              {overviewQuery.data.charts.salesTrend.length > 0 ? (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={overviewQuery.data.charts.salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" tickLine={false} />
                      <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="sales" name="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="sa-empty-box">No sales data in this period.</div>
              )}
            </div>

            <div className="sa-chart-box">
              <h3 className="sa-chart-title">Top Performing Services</h3>
              <p className="sa-chart-sub">Highest revenue contributing services</p>
              {overviewQuery.data.charts.topServices.length > 0 ? (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={overviewQuery.data.charts.topServices}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                      <YAxis type="category" dataKey="name" fontSize={11} stroke="#94a3b8" width={110} />
                      <Tooltip formatter={(val: any) => formatMoney(Number(val ?? 0))} />
                      <Bar dataKey="revenue" name="Revenue" fill="#a44a5c" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="sa-empty-box">No service transactions recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. CUSTOMERS */}
      {activeTab === 'customers' && (
        <div>
          {customersQuery.isLoading ? (
            <OpsLoading />
          ) : customersQuery.isError || !customersQuery.data ? (
            <OpsError
              message="Failed to load salon customers."
              onRetry={() => void customersQuery.refetch()}
            />
          ) : (
            <>
              {/* Customer Metrics */}
              <div className="sa-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Total Customers</span>
                    <div className="sa-kpi-icon brand"><Users size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(customersQuery.data.metrics?.totalCustomers ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">Registered client profiles</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">New Customers</span>
                    <div className="sa-kpi-icon green"><UserPlus size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(customersQuery.data.metrics?.newCustomers ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">Joined in selected period</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Returning Customers</span>
                    <div className="sa-kpi-icon blue"><UserCheck size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(customersQuery.data.metrics?.returningCustomers ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">&gt; 1 completed visit</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Inactive Customers</span>
                    <div className="sa-kpi-icon amber"><Clock size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(customersQuery.data.metrics?.inactiveCustomers ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">0 completed sales</span>
                </div>
              </div>

              {/* Customers Table */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">Customer Directory</h3>
                    <p className="sa-card-sub">Client visits, spend history and contact details</p>
                  </div>

                  <div className="sa-search-input">
                    <Search size={14} className="text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search name, phone, email..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Total Visits</th>
                        <th>Total Spend</th>
                        <th>Last Visit</th>
                        <th>Created Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customersQuery.data.customers.map((c) => (
                        <tr key={c.id}>
                          <td className="font-semibold">{c.name}</td>
                          <td>{c.phone || '—'}</td>
                          <td>{c.email || '—'}</td>
                          <td>{c.totalVisits}</td>
                          <td className="font-medium text-emerald-700">{formatMoney(c.totalSpend)}</td>
                          <td>{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : 'Never'}</td>
                          <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span
                              className={cn(
                                'sa-badge',
                                c.status === 'ACTIVE'
                                  ? 'active'
                                  : c.status === 'RETURNING'
                                    ? 'trial'
                                    : 'default',
                              )}
                            >
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {customersQuery.data.customers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="sa-empty-box">
                            No customer records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {customersQuery.data.pagination.pages > 1 && (
                  <div className="sa-pagination">
                    <span>
                      Showing {customersQuery.data.customers.length} of{' '}
                      {customersQuery.data.pagination.total} (Page {customersQuery.data.pagination.page} of{' '}
                      {customersQuery.data.pagination.pages})
                    </span>
                    <div className="sa-pagination-btns">
                      <button
                        type="button"
                        className="sa-page-btn"
                        disabled={customerPage <= 1}
                        onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="sa-page-btn"
                        disabled={customerPage >= customersQuery.data.pagination.pages}
                        onClick={() => setCustomerPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. SALES */}
      {activeTab === 'sales' && (
        <div>
          {salesQuery.isLoading ? (
            <OpsLoading />
          ) : salesQuery.isError || !salesQuery.data ? (
            <OpsError message="Failed to load salon sales." onRetry={() => void salesQuery.refetch()} />
          ) : (
            <>
              {/* Sales KPIs */}
              <div className="sa-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Total Sales</span>
                    <div className="sa-kpi-icon blue"><ShoppingBag size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(salesQuery.data.kpis?.totalSales ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">Completed transactions</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Total Revenue</span>
                    <div className="sa-kpi-icon green"><DollarSign size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{formatMoney(salesQuery.data.kpis.totalRevenue)}</div>
                  <span className="sa-kpi-sub">Gross sales amount</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Avg Sale Value</span>
                    <div className="sa-kpi-icon brand"><BarChart2 size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{formatMoney(salesQuery.data.kpis.averageSaleValue)}</div>
                  <span className="sa-kpi-sub">Per completed invoice</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Service Revenue</span>
                    <div className="sa-kpi-icon purple"><Award size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{formatMoney(salesQuery.data.kpis.serviceRevenue)}</div>
                  <span className="sa-kpi-sub">Salon services</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Product Revenue</span>
                    <div className="sa-kpi-icon amber"><ShoppingBag size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{formatMoney(salesQuery.data.kpis.productRevenue)}</div>
                  <span className="sa-kpi-sub">Retail items</span>
                </div>
              </div>

              {/* Sales Table */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">Completed Sales Invoices</h3>
                    <p className="sa-card-sub">Individual transaction records</p>
                  </div>

                  <div className="sa-card-actions">
                    <select
                      className="sa-select"
                      value={salesPaymentMethod}
                      onChange={(e) => {
                        setSalesPaymentMethod(e.target.value);
                        setSalesPage(1);
                      }}
                    >
                      <option value="ALL">All Payment Methods</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="ONLINE">Online</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th>Branch</th>
                        <th>Employee</th>
                        <th>Amount</th>
                        <th>Payment Method</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesQuery.data.sales.map((s) => (
                        <tr key={s.id}>
                          <td className="font-mono text-xs font-semibold">{s.invoiceNumber}</td>
                          <td>{s.customerName}</td>
                          <td>{s.branchName}</td>
                          <td>{s.employeeName}</td>
                          <td className="font-bold">{formatMoney(s.amount)}</td>
                          <td>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                              {s.paymentMethod}
                            </span>
                          </td>
                          <td>{new Date(s.saleDate).toLocaleString()}</td>
                          <td>
                            <span className="sa-badge active">{s.status}</span>
                          </td>
                        </tr>
                      ))}

                      {salesQuery.data.sales.length === 0 && (
                        <tr>
                          <td colSpan={8} className="sa-empty-box">
                            No sales transactions recorded in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {salesQuery.data.pagination.pages > 1 && (
                  <div className="sa-pagination">
                    <span>
                      Showing {salesQuery.data.sales.length} of {salesQuery.data.pagination.total} (Page{' '}
                      {salesQuery.data.pagination.page} of {salesQuery.data.pagination.pages})
                    </span>
                    <div className="sa-pagination-btns">
                      <button
                        type="button"
                        className="sa-page-btn"
                        disabled={salesPage <= 1}
                        onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="sa-page-btn"
                        disabled={salesPage >= salesQuery.data.pagination.pages}
                        onClick={() => setSalesPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: 4. SERVICES */}
      {activeTab === 'services' && (
        <div>
          {servicesQuery.isLoading ? (
            <OpsLoading />
          ) : servicesQuery.isError || !servicesQuery.data ? (
            <OpsError
              message="Failed to load salon services."
              onRetry={() => void servicesQuery.refetch()}
            />
          ) : (
            <>
              {/* Highlight Cards: Most Booked vs Highest Revenue */}
              <div className="sa-highlight-grid">
                <div className="sa-highlight-card gold">
                  <div className="sa-highlight-icon">
                    <Award size={24} />
                  </div>
                  <div className="sa-highlight-content">
                    <h4>Most Booked Service</h4>
                    <div className="sa-highlight-name">
                      {servicesQuery.data.highlights.mostBookedService?.name || 'No bookings recorded'}
                    </div>
                    {servicesQuery.data.highlights.mostBookedService && (
                      <div className="sa-highlight-stats">
                        <span>
                          Bookings:{' '}
                          <strong>
                            {servicesQuery.data.highlights.mostBookedService.bookingCount}
                          </strong>
                        </span>
                        <span>
                          Revenue:{' '}
                          <strong>
                            {formatMoney(servicesQuery.data.highlights.mostBookedService.revenue)}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sa-highlight-card brand">
                  <div className="sa-highlight-icon">
                    <DollarSign size={24} />
                  </div>
                  <div className="sa-highlight-content">
                    <h4>Highest Revenue Service</h4>
                    <div className="sa-highlight-name">
                      {servicesQuery.data.highlights.highestRevenueService?.name || 'No revenue recorded'}
                    </div>
                    {servicesQuery.data.highlights.highestRevenueService && (
                      <div className="sa-highlight-stats">
                        <span>
                          Revenue:{' '}
                          <strong>
                            {formatMoney(
                              servicesQuery.data.highlights.highestRevenueService.revenue,
                            )}
                          </strong>
                        </span>
                        <span>
                          Bookings:{' '}
                          <strong>
                            {servicesQuery.data.highlights.highestRevenueService.bookingCount}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Performance Table */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">Service Performance Breakdown</h3>
                    <p className="sa-card-sub">Booking volume, customer reach, and revenue contribution</p>
                  </div>

                  <div className="sa-card-actions">
                    <select
                      className="sa-select"
                      value={serviceSort}
                      onChange={(e) => {
                        setServiceSort(e.target.value);
                        setServicePage(1);
                      }}
                    >
                      <option value="bookings">Sort: Most Booked</option>
                      <option value="revenue_desc">Sort: Highest Revenue</option>
                      <option value="revenue_asc">Sort: Lowest Revenue</option>
                    </select>
                  </div>
                </div>

                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Service Name</th>
                        <th>Category</th>
                        <th>Bookings / Usage Count</th>
                        <th>Unique Customers</th>
                        <th>Revenue</th>
                        <th>Average Selling Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesQuery.data.services.map((svc) => (
                        <tr key={svc.id}>
                          <td className="font-semibold">{svc.name}</td>
                          <td>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                              {svc.category}
                            </span>
                          </td>
                          <td>{(svc.bookingsCount ?? 0).toLocaleString()}</td>
                          <td>{(svc.uniqueCustomers ?? 0).toLocaleString()}</td>
                          <td className="font-bold text-slate-900">{formatMoney(svc.revenue)}</td>
                          <td>{formatMoney(svc.averageSellingPrice)}</td>
                        </tr>
                      ))}

                      {servicesQuery.data.services.length === 0 && (
                        <tr>
                          <td colSpan={6} className="sa-empty-box">
                            No service transactions recorded in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {servicesQuery.data.pagination.pages > 1 && (
                  <div className="sa-pagination">
                    <span>
                      Showing {servicesQuery.data.services.length} of{' '}
                      {servicesQuery.data.pagination.total} (Page {servicesQuery.data.pagination.page}{' '}
                      of {servicesQuery.data.pagination.pages})
                    </span>
                    <div className="sa-pagination-btns">
                      <button
                        type="button"
                        className="sa-page-btn"
                        disabled={servicePage <= 1}
                        onClick={() => setServicePage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="sa-page-btn"
                        disabled={servicePage >= servicesQuery.data.pagination.pages}
                        onClick={() => setServicePage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: 5. APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div>
          {appointmentsQuery.isLoading ? (
            <OpsLoading />
          ) : appointmentsQuery.isError || !appointmentsQuery.data ? (
            <OpsError
              message="Failed to load salon appointments."
              onRetry={() => void appointmentsQuery.refetch()}
            />
          ) : (
            <>
              {/* Appointment Status KPIs */}
              <div className="sa-kpi-grid six-cols">
                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Total</span>
                    <div className="sa-kpi-icon brand"><Calendar size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(appointmentsQuery.data.kpis?.total ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">Total bookings</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Confirmed</span>
                    <div className="sa-kpi-icon blue"><CheckCircle size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(appointmentsQuery.data.kpis?.confirmed ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">Active scheduled</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Completed</span>
                    <div className="sa-kpi-icon green"><CalendarCheck size={16} /></div>
                  </div>
                  <div className="sa-kpi-number text-emerald-600">
                    {(appointmentsQuery.data.kpis?.completed ?? 0).toLocaleString()}
                  </div>
                  <span className="sa-kpi-sub">Fulfilled visits</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Cancelled</span>
                    <div className="sa-kpi-icon red"><XCircle size={16} /></div>
                  </div>
                  <div className="sa-kpi-number text-rose-600">
                    {(appointmentsQuery.data.kpis?.cancelled ?? 0).toLocaleString()}
                  </div>
                  <span className="sa-kpi-sub">Customer/Staff cancelled</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">No Show</span>
                    <div className="sa-kpi-icon amber"><AlertCircle size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(appointmentsQuery.data.kpis?.noShow ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">Missed bookings</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Upcoming</span>
                    <div className="sa-kpi-icon purple"><Clock size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">{(appointmentsQuery.data.kpis?.upcoming ?? 0).toLocaleString()}</div>
                  <span className="sa-kpi-sub">Future dates</span>
                </div>
              </div>

              {/* Status Distribution Chart & Filters */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">Appointments Directory</h3>
                    <p className="sa-card-sub">Client appointments and fulfilment status</p>
                  </div>

                  <div className="sa-card-actions">
                    <select
                      className="sa-select"
                      value={appointmentStatus}
                      onChange={(e) => {
                        setAppointmentStatus(e.target.value);
                        setAppointmentPage(1);
                      }}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="NO_SHOW">No Show</option>
                    </select>
                  </div>
                </div>

                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Employee</th>
                        <th>Branch</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointmentsQuery.data.appointments.map((apt) => (
                        <tr key={apt.id}>
                          <td className="font-semibold">{apt.customerName}</td>
                          <td>{apt.serviceName}</td>
                          <td>{apt.employeeName}</td>
                          <td>{apt.branchName}</td>
                          <td>{new Date(apt.appointmentDateTime).toLocaleString()}</td>
                          <td>
                            <span
                              className={cn(
                                'sa-badge',
                                apt.status === 'COMPLETED'
                                  ? 'active'
                                  : apt.status === 'CONFIRMED'
                                    ? 'trial'
                                    : apt.status === 'CANCELLED'
                                      ? 'suspended'
                                      : 'default',
                              )}
                            >
                              {apt.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {appointmentsQuery.data.appointments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="sa-empty-box">
                            No appointments found for the selected criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {appointmentsQuery.data.pagination.pages > 1 && (
                  <div className="sa-pagination">
                    <span>
                      Showing {appointmentsQuery.data.appointments.length} of{' '}
                      {appointmentsQuery.data.pagination.total} (Page{' '}
                      {appointmentsQuery.data.pagination.page} of{' '}
                      {appointmentsQuery.data.pagination.pages})
                    </span>
                    <div className="sa-pagination-btns">
                      <button
                        type="button"
                        className="sa-page-btn"
                        disabled={appointmentPage <= 1}
                        onClick={() => setAppointmentPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="sa-page-btn"
                        disabled={appointmentPage >= appointmentsQuery.data.pagination.pages}
                        onClick={() => setAppointmentPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: 6. FINANCE */}
      {activeTab === 'finance' && (
        <div>
          {financeQuery.isLoading ? (
            <OpsLoading />
          ) : financeQuery.isError || !financeQuery.data ? (
            <OpsError
              message="Failed to load salon financial performance."
              onRetry={() => void financeQuery.refetch()}
            />
          ) : (
            <>
              {/* Financial KPIs */}
              <div className="sa-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Gross Revenue</span>
                    <div className="sa-kpi-icon green"><DollarSign size={16} /></div>
                  </div>
                  <div className="sa-kpi-number text-emerald-700">
                    {formatMoney(financeQuery.data.metrics.revenue)}
                  </div>
                  <span className="sa-kpi-sub">Total completed sales</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Operating Expenses</span>
                    <div className="sa-kpi-icon red"><TrendingDown size={16} /></div>
                  </div>
                  <div className="sa-kpi-number text-rose-700">
                    {formatMoney(financeQuery.data.metrics.operatingExpenses)}
                  </div>
                  <span className="sa-kpi-sub">Includes supplier payments</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Payroll / Salaries</span>
                    <div className="sa-kpi-icon amber"><Users size={16} /></div>
                  </div>
                  <div className="sa-kpi-number text-amber-700">
                    {formatMoney(financeQuery.data.metrics.salaries)}
                  </div>
                  <span className="sa-kpi-sub">Disbursed employee payroll</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Supplier Payments</span>
                    <div className="sa-kpi-icon purple"><Wallet size={16} /></div>
                  </div>
                  <div className="sa-kpi-number">
                    {formatMoney(financeQuery.data.metrics.supplierPaymentExpenses)}
                  </div>
                  <span className="sa-kpi-sub">Part of operating expenses</span>
                </div>

                <div className="sa-kpi-card">
                  <div className="sa-kpi-header">
                    <span className="sa-kpi-title">Estimated Profit</span>
                    <div className="sa-kpi-icon brand"><TrendingUp size={16} /></div>
                  </div>
                  <div
                    className={cn(
                      'sa-kpi-number',
                      financeQuery.data.metrics.estimatedProfit >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600',
                    )}
                  >
                    {formatMoney(financeQuery.data.metrics.estimatedProfit)}
                  </div>
                  <span className="sa-kpi-sub">Revenue - Expenses - Salaries</span>
                </div>
              </div>

              {/* Monthly Financial Trend Chart & Category Breakdown */}
              <div className="sa-charts-grid split">
                <div className="sa-chart-box">
                  <h3 className="sa-chart-title">Monthly Financial Trajectory</h3>
                  <p className="sa-chart-sub">Revenue, expenses, and estimated net profit</p>
                  {financeQuery.data.monthlyTrend.length > 0 ? (
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart data={financeQuery.data.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                          <YAxis fontSize={11} stroke="#94a3b8" />
                          <Tooltip formatter={(val: any) => formatMoney(Number(val ?? 0))} />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="salaries" name="Salaries" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" name="Est. Profit" fill="#a44a5c" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="sa-empty-box">No monthly financial data recorded.</div>
                  )}
                </div>

                <div className="sa-chart-box">
                  <h3 className="sa-chart-title">Expense Breakdown by Category</h3>
                  <p className="sa-chart-sub">Operational expenditure allocation</p>
                  {financeQuery.data.expenseBreakdown.length > 0 ? (
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={financeQuery.data.expenseBreakdown}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={3}
                          >
                            {financeQuery.data.expenseBreakdown.map((entry, idx) => (
                              <Cell key={entry.category} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any) => formatMoney(Number(val ?? 0))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="sa-empty-box">No expense category data recorded.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
