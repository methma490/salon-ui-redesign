import { useQuery } from '@tanstack/react-query';
import {
  Archive,
  Building2,
  CreditCard,
  PauseCircle,
  Receipt,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { salonsApi } from '@/api/axios';
import {
  DashboardBarChart,
  DashboardPieChart,
} from '@/components/dashboard/dashboard-charts';
import {
  DashboardEmpty,
  DashboardPanel,
  DashboardStatCard,
} from '@/components/dashboard/dashboard-ui';
import { adminBillingApi } from '@/features/billing/api/billing.api';
import { StatusBadge } from '@/features/salons/components/StatusBadge';
import { useSalonStats } from '@/features/salons/hooks/useSalons';
import { OpsError, OpsLoading } from '@/pages/salon/salon-ops-ui';
import '@/components/dashboard/dashboard-page.css';
import '@/pages/salon/employees-page.css';

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useSalonStats();

  const { data: signupSalons = [] } = useQuery({
    queryKey: ['super-admin', 'dashboard-signups'],
    queryFn: () => salonsApi.list({ page: 1, limit: 100 }).then((r) => r.data),
  });

  const { data: subscriptionMeta } = useQuery({
    queryKey: ['super-admin', 'dashboard-subscriptions'],
    queryFn: () => adminBillingApi.listSubscriptions({ page: 1, limit: 1 }),
  });

  const { data: paymentMeta } = useQuery({
    queryKey: ['super-admin', 'dashboard-payments'],
    queryFn: () => adminBillingApi.listPayments({ page: 1, limit: 1, filter: 'SUCCESS' }),
  });

  const statusPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Active', value: data.active },
      { name: 'Suspended', value: data.suspended },
      { name: 'Archived', value: data.archived },
    ].filter((item) => item.value > 0);
  }, [data]);

  const signupBars = useMemo(() => {
    const counts = new Map<string, number>();
    for (const salon of signupSalons) {
      const key = monthKey(salon.createdAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .slice(-6)
      .map(([name, value]) => ({ name, value }));
  }, [signupSalons]);

  if (isLoading) return <OpsLoading />;
  if (isError || !data) {
    return (
      <OpsError message="Failed to load dashboard data." onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="dash-page emp-page">
      <header className="dash-header">
        <div>
          <h1>Platform Dashboard</h1>
          <p>Salons, subscriptions, payments, and tenant activity</p>
        </div>
        <div className="dash-header-actions">
          <Link to="/super-admin/salons" className="dash-link-btn">
            Manage salons
          </Link>
          <Link to="/super-admin/subscriptions" className="dash-link-btn">
            Subscriptions
          </Link>
        </div>
      </header>

      <div className="dash-stats">
        <DashboardStatCard
          icon={Building2}
          label="Total salons"
          value={String(data.total)}
          sub="All tenants"
        />
        <DashboardStatCard
          icon={Users}
          label="Active"
          value={String(data.active)}
          sub="Live tenants"
        />
        <DashboardStatCard
          icon={PauseCircle}
          label="Suspended"
          value={String(data.suspended)}
          sub="Access restricted"
        />
        <DashboardStatCard
          icon={Archive}
          label="Archived"
          value={String(data.archived)}
          sub="Inactive tenants"
        />
      </div>

      <div className="dash-stats dash-stats-2" style={{ marginTop: '-0.25rem' }}>
        <DashboardStatCard
          icon={Receipt}
          label="Subscriptions"
          value={String(subscriptionMeta?.meta.total ?? 0)}
          sub="Billing records"
        />
        <DashboardStatCard
          icon={CreditCard}
          label="Successful payments"
          value={String(paymentMeta?.meta.total ?? 0)}
          sub="Completed gateway payments"
        />
      </div>

      <div className="dash-grid dash-grid-2">
        <DashboardPanel title="Salon status" description="Distribution by tenant status">
          {statusPie.length > 0 ? (
            <div className="dash-chart-wrap">
              <DashboardPieChart data={statusPie} />
            </div>
          ) : (
            <DashboardEmpty message="No salons registered yet." />
          )}
        </DashboardPanel>

        <DashboardPanel title="New signups" description="Salons created per month">
          {signupBars.length > 0 ? (
            <div className="dash-chart-wrap">
              <DashboardBarChart data={signupBars} color="#0d5c3d" valuePrefix="" />
            </div>
          ) : (
            <DashboardEmpty message="No signup trend data yet." />
          )}
        </DashboardPanel>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <DashboardPanel
          title="Recent salons"
          description="Latest tenant signups and registrations"
          action={
            <Link to="/super-admin/salons" className="dash-link-btn">
              View all
            </Link>
          }
        >
          {!data.recent.length ? (
            <DashboardEmpty message="No salons yet. They will appear here after signup." />
          ) : (
            <>
              <div className="dash-recent-cards">
                {data.recent.map((salon) => (
                  <article key={salon.id} className="emp-card">
                    <div className="emp-card-top">
                      <div>
                        <Link to={`/super-admin/salons/${salon.id}`} className="emp-name-cell">
                          {salon.name}
                        </Link>
                        <div className="emp-code">{salon.code}</div>
                      </div>
                      <StatusBadge status={salon.status} />
                    </div>
                    <div className="emp-card-meta">
                      <span>{new Date(salon.createdAt).toLocaleDateString()}</span>
                      {salon.subscription?.planName && (
                        <span>
                          Plan: <strong>{salon.subscription.planName}</strong>
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="dash-recent-table">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Salon</th>
                      <th>Code</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((salon) => (
                      <tr key={salon.id}>
                        <td>
                          <Link
                            to={`/super-admin/salons/${salon.id}`}
                            className="emp-name-cell"
                            style={{ textDecoration: 'none' }}
                          >
                            {salon.name}
                          </Link>
                        </td>
                        <td className="emp-code">{salon.code}</td>
                        <td>{salon.subscription?.planName ?? '—'}</td>
                        <td>
                          <StatusBadge status={salon.status} />
                        </td>
                        <td>{new Date(salon.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}
