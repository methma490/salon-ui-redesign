import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarCheck,
  CalendarX,
  DollarSign,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  salonAnalyticsApi,
  type SalonAnalyticsDatePreset,
} from '@/features/super-admin/api/salon-analytics.api';
import { OpsError, OpsLoading } from '@/pages/salon/salon-ops-ui';
import { cn } from '@/lib/utils';
import './salon-analytics.css';

function formatMoney(amount: number, currency = 'LKR') {
  return `${currency} ${(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function SalonAnalyticsListPage() {
  const [preset, setPreset] = useState<SalonAnalyticsDatePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 15;

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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['super-admin', 'salon-analytics', 'list', dateParams, search, status, page],
    queryFn: () =>
      salonAnalyticsApi.getList({
        ...dateParams,
        search: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        page,
        limit,
      }),
  });

  const summary = data?.summary;
  const salons = data?.salons || [];
  const pagination = data?.pagination;

  return (
    <div className="sa-container">
      {/* Header */}
      <div className="sa-header">
        <div className="sa-header-title">
          <h1>Salon Analytics</h1>
          <p>Monitor customer activity, sales, services, appointments and financial performance across all salons.</p>
        </div>
      </div>

      {/* Date Filters Bar */}
      <div className="sa-filter-bar">
        <div className="sa-filter-presets">
          <button
            type="button"
            className={cn('sa-preset-btn', preset === '7d' && 'active')}
            onClick={() => setPreset('7d')}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            className={cn('sa-preset-btn', preset === '30d' && 'active')}
            onClick={() => setPreset('30d')}
          >
            Last 30 Days
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
            Custom Range
          </button>
        </div>

        {preset === 'custom' && (
          <div className="sa-custom-dates">
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

      {/* Summary KPI Cards */}
      {isLoading ? (
        <OpsLoading />
      ) : isError ? (
        <OpsError message="Failed to load salon analytics." onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="sa-kpi-grid six-cols">
            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Total Customers</span>
                <div className="sa-kpi-icon brand">
                  <Users size={16} />
                </div>
              </div>
              <div className="sa-kpi-number">{(summary?.totalCustomers ?? 0).toLocaleString()}</div>
              <span className="sa-kpi-sub">Across all tenant salons</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Total Sales</span>
                <div className="sa-kpi-icon blue">
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div className="sa-kpi-number">{(summary?.totalSales ?? 0).toLocaleString()}</div>
              <span className="sa-kpi-sub">Completed transactions</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Total Salon Revenue</span>
                <div className="sa-kpi-icon green">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="sa-kpi-number">{formatMoney(summary?.totalRevenue ?? 0)}</div>
              <span className="sa-kpi-sub">Gross salon business sales</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Estimated Profit</span>
                <div className="sa-kpi-icon amber">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div
                className={cn(
                  'sa-kpi-number',
                  (summary?.totalEstimatedProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {formatMoney(summary?.totalEstimatedProfit ?? 0)}
              </div>
              <span className="sa-kpi-sub">Revenue - Expenses - Salaries</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Appointments</span>
                <div className="sa-kpi-icon purple">
                  <CalendarCheck size={16} />
                </div>
              </div>
              <div className="sa-kpi-number">{(summary?.totalAppointments ?? 0).toLocaleString()}</div>
              <span className="sa-kpi-sub">Total bookings in period</span>
            </div>

            <div className="sa-kpi-card">
              <div className="sa-kpi-header">
                <span className="sa-kpi-title">Cancelled</span>
                <div className="sa-kpi-icon red">
                  <CalendarX size={16} />
                </div>
              </div>
              <div className="sa-kpi-number">{(summary?.cancelledAppointments ?? 0).toLocaleString()}</div>
              <span className="sa-kpi-sub">Cancelled appointments</span>
            </div>
          </div>

          {/* Performance Table Card */}
          <div className="sa-card">
            <div className="sa-card-header">
              <div>
                <h3 className="sa-card-title">All Salons Operational Performance</h3>
                <p className="sa-card-sub">Comparison of customers, sales, revenue, profit and appointments</p>
              </div>

              <div className="sa-card-actions">
                <div className="sa-search-input">
                  <Search size={14} className="text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search salon name or code..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                <select
                  className="sa-select"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Salon</th>
                    <th>Status</th>
                    <th>Customers</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th>Expenses</th>
                    <th>Estimated Profit</th>
                    <th>Appointments</th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                    <th>Top Service</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salons.map((s) => (
                    <tr key={s.tenantId}>
                      <td>
                        <div className="sa-table-salon">
                          <div className="sa-table-avatar">
                            {s.salonName ? s.salonName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="sa-table-name">{s.salonName}</div>
                            <div className="sa-table-sub">
                              {s.code} • {s.branchCount} {s.branchCount === 1 ? 'branch' : 'branches'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'sa-badge',
                            s.status === 'ACTIVE'
                              ? 'active'
                              : s.status === 'TRIAL'
                                ? 'trial'
                                : s.status === 'SUSPENDED'
                                  ? 'suspended'
                                  : 'default',
                          )}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td>{(s.customers ?? (s as any).customerCount ?? 0).toLocaleString()}</td>
                      <td>{(s.sales ?? (s as any).salesCount ?? 0).toLocaleString()}</td>
                      <td className="font-semibold">{formatMoney(s.revenue ?? 0)}</td>
                      <td>{formatMoney(s.expenses ?? 0)}</td>
                      <td>
                        <span
                          className={cn(
                            'sa-profit-pill',
                            (s.estimatedProfit ?? 0) >= 0 ? 'positive' : 'negative',
                          )}
                        >
                          {formatMoney(s.estimatedProfit ?? 0)}
                        </span>
                      </td>
                      <td>{(s.appointments ?? (s as any).appointmentCount ?? 0).toLocaleString()}</td>
                      <td className="text-emerald-600 font-medium">{(s.completedAppointments ?? 0).toLocaleString()}</td>
                      <td className="text-rose-600 font-medium">{(s.cancelledAppointments ?? 0).toLocaleString()}</td>
                      <td>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md max-w-[140px] truncate inline-block">
                          {s.topService || '—'}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/super-admin/salon-analytics/${s.tenantId}`}
                          className="sa-action-btn"
                        >
                          View Details
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {salons.length === 0 && (
                    <tr>
                      <td colSpan={12} className="sa-empty-box">
                        No salon performance records found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="sa-pagination">
                <span>
                  Showing {salons.length} of {pagination.total} salons (Page {pagination.page} of{' '}
                  {pagination.pages})
                </span>
                <div className="sa-pagination-btns">
                  <button
                    type="button"
                    className="sa-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="sa-page-btn"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
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
  );
}
