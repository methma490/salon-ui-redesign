import { ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminSubscriptions } from '@/features/billing/hooks/useBilling';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import {
  formatAmount,
  formatDate,
  subscriptionStatusBadgeClass,
} from '@/features/billing/lib/billing-utils';
import type { AdminSubscriptionItem, SubscriptionStatus } from '@/features/billing/types/billing.types';
import {
  AdminEmpty,
  AdminKv,
  AdminPageHero,
  AdminPagination,
  AdminPanel,
  AdminStatCard,
} from '@/pages/super-admin/billing/AdminBillingUi';
import { OpsError, OpsIconButton, OpsLoading } from '@/pages/salon/salon-ops-ui';
import '@/pages/super-admin/billing/admin-billing-page.css';

type StatusFilter = SubscriptionStatus | 'ALL';

function SubscriptionCard({
  sub,
  onViewSalon,
}: {
  sub: AdminSubscriptionItem;
  onViewSalon: (tenantId: string) => void;
}) {
  return (
    <article className="admin-card">
      <div className="admin-card-top">
        <div>
          <h3 className="admin-card-title">{sub.tenant.name}</h3>
          <div className="admin-card-sub">{sub.tenant.code}</div>
        </div>
        <span className={subscriptionStatusBadgeClass(sub.status)}>{sub.status}</span>
      </div>

      <div className="admin-kv-grid">
        <AdminKv label="Plan" value={sub.plan.name} />
        <AdminKv
          label="Amount"
          value={`${formatAmount(sub.price, sub.currency)} / ${sub.billingCycle.toLowerCase()}`}
          amount
        />
        <AdminKv label="Start" value={formatDate(sub.startDate ?? sub.trialStart)} />
        <AdminKv label="End" value={formatDate(sub.endDate ?? sub.trialEnd)} />
      </div>

      <div className="admin-row-actions">
        <OpsIconButton
          label="View salon"
          icon={<ExternalLink size={16} strokeWidth={2} />}
          onClick={() => onViewSalon(sub.tenantId)}
        />
      </div>
    </article>
  );
}

function SubscriptionTableRow({
  sub,
  onViewSalon,
}: {
  sub: AdminSubscriptionItem;
  onViewSalon: (tenantId: string) => void;
}) {
  return (
    <tr>
      <td>
        <div className="admin-card-title">{sub.tenant.name}</div>
        <div className="admin-card-sub">{sub.tenant.code}</div>
      </td>
      <td>
        <div>{sub.plan.name}</div>
        <div className="admin-card-sub">{sub.plan.code}</div>
      </td>
      <td>
        <span className={subscriptionStatusBadgeClass(sub.status)}>{sub.status}</span>
      </td>
      <td>
        {formatAmount(sub.price, sub.currency)} / {sub.billingCycle.toLowerCase()}
      </td>
      <td>
        <div className="admin-card-meta">Start: {formatDate(sub.startDate ?? sub.trialStart)}</div>
        <div className="admin-card-meta">End: {formatDate(sub.endDate ?? sub.trialEnd)}</div>
      </td>
      <td>
        <div className="admin-row-actions">
          <OpsIconButton
            label="View salon"
            icon={<ExternalLink size={16} strokeWidth={2} />}
            onClick={() => onViewSalon(sub.tenantId)}
          />
        </div>
      </td>
    </tr>
  );
}

export default function SubscriptionListPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedSearch(search, 400, 2);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: status === 'ALL' ? undefined : status,
    }),
    [page, debouncedSearch, status],
  );

  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAdminSubscriptions(params);
  const items = data?.data ?? [];

  const viewSalon = (tenantId: string) => {
    void navigate(`/super-admin/salons/${tenantId}`);
  };

  if (isLoading) return <OpsLoading />;
  if (isError) {
    return (
      <OpsError message="Failed to load subscriptions." onRetry={() => void refetch()} />
    );
  }

  const activeOnPage = items.filter((s) => s.status === 'ACTIVE').length;
  const trialOnPage = items.filter((s) => s.status === 'TRIAL').length;

  return (
    <div className="admin-page">
      <AdminPageHero
        title="Subscriptions"
        subtitle="View active, trial, expired, and cancelled salon subscriptions"
      />

      <section className="admin-stats" aria-label="Subscription summary">
        <AdminStatCard label="Total" value={data?.meta.total ?? 0} />
        <AdminStatCard label="Active (page)" value={activeOnPage} />
        <AdminStatCard label="Trial (page)" value={trialOnPage} />
      </section>

      <AdminPanel
        title="All Subscriptions"
        description="Filter by status or search by salon or plan name"
        filters={
          <div className="admin-filters">
            <div className="admin-filter-field">
              <Label htmlFor="sub-search">Search</Label>
              <Input
                id="sub-search"
                placeholder="Salon or plan..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="admin-filter-field">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v as StatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        footer={
          <AdminPagination meta={data?.meta} page={page} onPageChange={setPage} />
        }
      >
        {items.length === 0 ? (
          <AdminEmpty message="No subscriptions match your filters." />
        ) : (
          <>
            <div className="admin-grid">
              {items.map((sub) => (
                <SubscriptionCard key={sub.id} sub={sub} onViewSalon={viewSalon} />
              ))}
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Salon</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Period</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((sub) => (
                    <SubscriptionTableRow key={sub.id} sub={sub} onViewSalon={viewSalon} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminPanel>
    </div>
  );
}
