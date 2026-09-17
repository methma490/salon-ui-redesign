import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  MoreHorizontal,
  Plus,
  Sparkles,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RevenueStackedBarChart,
  SalonGrowthAreaChart,
  SparklineChart,
  SubscriptionDonutChart,
} from '@/components/super-admin/PremiumCharts';
import {
  superAdminDashboardApi,
  type DashboardPeriod,
} from '@/features/super-admin/api/dashboard.api';
import { OpsError, OpsLoading } from '@/pages/salon/salon-ops-ui';
import { cn } from '@/lib/utils';
import './super-admin-dashboard.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatMoney(amount: number, currency = 'LKR') {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function planColorClass(planName?: string | null) {
  const key = planName?.toLowerCase() ?? '';
  if (key.includes('gold')) return '#d4a017';
  if (key.includes('platinum')) return '#6366f1';
  if (key.includes('silver')) return '#94a3b8';
  return '#0d5c3d';
}

export default function PremiumDashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('30d');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['super-admin', 'dashboard', period],
    queryFn: () => superAdminDashboardApi.get(period),
  });

  if (isLoading) return <OpsLoading />;
  if (isError || !data) {
    return <OpsError message="Failed to load dashboard data." onRetry={() => void refetch()} />;
  }

  const { tenants, revenue, subscriptions, payments, charts, alerts, platformHealth } = data;
  const growthTrend = tenants.growthPercent;
  const trendLabel = `${growthTrend >= 0 ? '+' : ''}${growthTrend}%`;

  return (
    <div className="s360-dash">
      <div className="s360-hero">
        <div>
          <h1>{getGreeting()}, Admin 👋</h1>
          <p>Here is your Dart Smart Salon platform overview</p>
        </div>
        <div className="s360-hero-right">
          <Link to="/super-admin/salons?create=1" className="s360-btn-primary">
            <Plus size={16} />
            Add Salon
          </Link>
        </div>
      </div>

      <div className="s360-period-filter">
        {(['7d', '30d', 'mtd'] as DashboardPeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            className={cn('s360-period-btn', period === p && 'active')}
            onClick={() => setPeriod(p)}
          >
            {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'This month'}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="s360-kpi-grid">
        <div className="s360-kpi">
          <div className="s360-kpi-top">
            <span className="s360-kpi-label">Total Salons</span>
            <span className="s360-kpi-trend">
              <TrendingUp size={11} /> {trendLabel}
            </span>
          </div>
          <div className="s360-kpi-value">{tenants.total.toLocaleString()}</div>
          <div className="s360-kpi-spark">
            <SparklineChart data={charts.sparklines.salons} color="#0d5c3d" />
          </div>
          <div className="s360-kpi-foot">
            <span className="s360-kpi-stat"><span className="s360-dot green" /> Active <strong>{tenants.active}</strong></span>
            <span className="s360-kpi-stat"><span className="s360-dot amber" /> Suspended <strong>{tenants.suspended}</strong></span>
            <span className="s360-kpi-stat"><span className="s360-dot blue" /> Trial <strong>{tenants.trial}</strong></span>
          </div>
        </div>

        <div className="s360-kpi">
          <div className="s360-kpi-top">
            <span className="s360-kpi-label">Monthly Recurring Revenue</span>
          </div>
          <div className="s360-kpi-value green">{formatMoney(revenue.mrr, revenue.currency)}</div>
          <div className="s360-kpi-spark">
            <SparklineChart data={charts.sparklines.revenue} color="#10b981" />
          </div>
          <div className="s360-kpi-foot">
            <span className="s360-kpi-stat">ARR <strong>{formatMoney(revenue.arr, revenue.currency)}</strong></span>
            <span className="s360-kpi-stat">ARPU <strong>{formatMoney(revenue.arpu, revenue.currency)}</strong></span>
          </div>
        </div>

        <div className="s360-kpi">
          <div className="s360-kpi-top">
            <span className="s360-kpi-label">Active Subscriptions</span>
          </div>
          <div className="s360-kpi-value">{subscriptions.total.toLocaleString()}</div>
          <div className="s360-kpi-spark">
            <SparklineChart data={charts.sparklines.subscriptions} color="#0d5c3d" />
          </div>
          <div className="s360-kpi-foot">
            {subscriptions.byPlan.slice(0, 3).map((plan) => (
              <span key={plan.planId} className="s360-kpi-stat">
                <span className="s360-dot green" style={{ background: planColorClass(plan.planName) }} />
                {plan.planName} <strong>{plan.count}</strong>
              </span>
            ))}
            {subscriptions.byPlan.length === 0 && (
              <span className="s360-kpi-stat">No active subscriptions yet</span>
            )}
          </div>
        </div>

        <div className="s360-kpi">
          <div className="s360-kpi-top">
            <span className="s360-kpi-label">Platform Health</span>
            <span className="s360-health-badge">{platformHealth.score}% {platformHealth.label}</span>
          </div>
          <div className="s360-kpi-value">{platformHealth.score}%</div>
          <div className="s360-health-list">
            <div className="s360-health-row"><span>API Status</span><span>{platformHealth.api}</span></div>
            <div className="s360-health-row"><span>Database</span><span>{platformHealth.database}</span></div>
            <div className="s360-health-row"><span>Payment Service</span><span>{platformHealth.payments}</span></div>
            <div className="s360-health-row"><span>System Performance</span><span>{platformHealth.performance}</span></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="s360-row-3">
        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Salon Growth</h3>
              <p className="s360-card-sub">New salons vs cancelled salons</p>
            </div>
          </div>
          <div className="s360-card-body chart">
            {charts.salonGrowth.some((r) => r.newSalons > 0 || r.cancelledSalons > 0) ? (
              <SalonGrowthAreaChart data={charts.salonGrowth} />
            ) : (
              <div className="s360-empty-chart">No salon growth data yet</div>
            )}
          </div>
          <div className="s360-legend">
            <span className="s360-legend-item"><span className="s360-legend-dot" style={{ background: '#0d5c3d' }} /> New Salons</span>
            <span className="s360-legend-item"><span className="s360-legend-dot" style={{ background: '#ef4444' }} /> Cancelled Salons</span>
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Revenue Overview</h3>
              <p className="s360-card-sub">Subscriptions, upgrades & renewals</p>
            </div>
          </div>
          <div className="s360-card-body chart">
            {charts.revenueByMonth.some((r) => r.subscription + r.upgrade + r.renewal > 0) ? (
              <RevenueStackedBarChart data={charts.revenueByMonth} />
            ) : (
              <div className="s360-empty-chart">No revenue data yet</div>
            )}
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Subscription Distribution</h3>
              <p className="s360-card-sub">Plan breakdown across tenants</p>
            </div>
          </div>
          <div className="s360-card-body chart">
            {charts.subscriptionDistribution.length > 0 ? (
              <SubscriptionDonutChart
                data={charts.subscriptionDistribution}
                centerTotal={subscriptions.total}
              />
            ) : (
              <div className="s360-empty-chart">No subscription data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="s360-row-3">
        <div className="s360-card">
          <div className="s360-card-head">
            <h3 className="s360-card-title">Payment Status</h3>
          </div>
          <div className="s360-card-body">
            <div className="s360-pay-grid">
              <div className="s360-pay-item">
                <div className="s360-pay-icon success"><CheckCircle2 size={18} /></div>
                <div className="s360-pay-count">{payments.successful}</div>
                <div className="s360-pay-label">Successful</div>
              </div>
              <div className="s360-pay-item">
                <div className="s360-pay-icon warning"><Clock size={18} /></div>
                <div className="s360-pay-count">{payments.pending}</div>
                <div className="s360-pay-label">Pending</div>
              </div>
              <div className="s360-pay-item">
                <div className="s360-pay-icon danger"><XCircle size={18} /></div>
                <div className="s360-pay-count">{payments.failed}</div>
                <div className="s360-pay-label">Failed</div>
              </div>
            </div>
            <div className="s360-pay-total">
              <div>
                <div className="s360-pay-total-label">Total Amount ({period})</div>
                <div className="s360-pay-total-value">{formatMoney(payments.periodTotal, payments.currency)}</div>
              </div>
              <span className="s360-kpi-trend"><ArrowUpRight size={11} /> {period}</span>
            </div>
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <h3 className="s360-card-title">Attention Required</h3>
          </div>
          <div className="s360-card-body">
            <div className="s360-alert-list">
              <Link to="/super-admin/subscriptions" className="s360-alert">
                <div className="s360-alert-icon warn"><AlertTriangle size={16} /></div>
                <span className="s360-alert-text"><strong>{alerts.expiringSubscriptions} salons</strong> — subscription expires in 7 days</span>
                <ChevronRight size={16} color="#94a3b8" />
              </Link>
              <Link to="/super-admin/payments" className="s360-alert">
                <div className="s360-alert-icon danger"><CreditCard size={16} /></div>
                <span className="s360-alert-text"><strong>{alerts.failedPaymentsThisWeek} salons</strong> — payment failed this week</span>
                <ChevronRight size={16} color="#94a3b8" />
              </Link>
              <Link to="/super-admin/salons" className="s360-alert">
                <div className="s360-alert-icon info"><Building2 size={16} /></div>
                <span className="s360-alert-text"><strong>{alerts.awaitingActivation} salons</strong> — awaiting activation</span>
                <ChevronRight size={16} color="#94a3b8" />
              </Link>
            </div>
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <h3 className="s360-card-title">Platform Summary</h3>
          </div>
          <div className="s360-card-body">
            <div className="s360-kpi-foot" style={{ border: 'none', padding: 0 }}>
              <span className="s360-kpi-stat">New this month <strong>{tenants.newThisMonth}</strong></span>
              <span className="s360-kpi-stat">Provisioning <strong>{tenants.provisioning}</strong></span>
              <span className="s360-kpi-stat">Archived <strong>{tenants.archived}</strong></span>
              <span className="s360-kpi-stat">Period revenue <strong>{formatMoney(revenue.periodTotal, revenue.currency)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="s360-row-bottom">
        <div className="s360-card">
          <div className="s360-card-head">
            <div>
              <h3 className="s360-card-title">Recent Salons</h3>
              <p className="s360-card-sub">Latest tenant registrations</p>
            </div>
            <Link to="/super-admin/salons" className="s360-btn-primary" style={{ padding: '7px 12px', fontSize: 12 }}>
              View all
            </Link>
          </div>
          <div className="s360-table-wrap">
            <table className="s360-table">
              <thead>
                <tr>
                  <th>Salon</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.recentSalons.map((salon) => (
                  <tr key={salon.id}>
                    <td>
                      <div className="s360-table-salon">
                        <div className="s360-table-avatar">{salon.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="s360-table-name">{salon.name}</div>
                          <div className="s360-table-id">{salon.code}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="s360-pill">{salon.planName ?? '—'}</span>
                    </td>
                    <td>
                      <span className="s360-status">
                        <span className="s360-dot green" />
                        {salon.status}
                      </span>
                    </td>
                    <td>{new Date(salon.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/super-admin/salons/${salon.id}`} style={{ color: '#64748b' }}>
                        <MoreHorizontal size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {data.recentSalons.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                      No salons registered yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="s360-card">
          <div className="s360-card-head">
            <h3 className="s360-card-title">Recent Activities</h3>
          </div>
          <div className="s360-card-body">
            {data.recentActivities.length === 0 ? (
              <div className="s360-empty-chart">No recent activity</div>
            ) : (
              data.recentActivities.map((activity, idx) => (
                <div key={idx} className="s360-timeline-item">
                  <div className={cn('s360-timeline-icon', activity.type)}>
                    {activity.type === 'success' && <TrendingUp size={14} />}
                    {activity.type === 'info' && <Sparkles size={14} />}
                    {activity.type === 'payment' && <DollarSign size={14} />}
                    {activity.type === 'warning' && <AlertTriangle size={14} />}
                  </div>
                  <div>
                    <p className="s360-timeline-text">{activity.message}</p>
                    <span className="s360-timeline-time">{formatRelativeTime(activity.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="s360-promo-banner">
          <div>
            <h3>Together for a more beautiful tomorrow</h3>
            <p>Onboard new salon partners and grow the Dart Smart Salon ecosystem.</p>
            <Link to="/super-admin/salons?create=1" className="s360-btn-outline">
              <Plus size={14} />
              Add New Salon
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
