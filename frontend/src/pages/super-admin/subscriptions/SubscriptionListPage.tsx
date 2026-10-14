import { Clock, ExternalLink, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { ExtendTrialDialog } from '@/features/subscriptions/components/ExtendTrialDialog';
import { ManageSubscriptionAddonsDialog } from '@/features/subscriptions/components/ManageSubscriptionAddonsDialog';
import { BulkAddonAssignDialog } from '@/features/subscriptions/components/BulkAddonAssignDialog';
import '@/pages/super-admin/billing/admin-billing-page.css';

type StatusFilter = SubscriptionStatus | 'ALL';

function calculateDaysRemaining(endDateStr: string | null): number | null {
  if (!endDateStr) return null;
  const diff = new Date(endDateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function SubscriptionCard({
  sub,
  onViewSalon,
  onExtendTrial,
  onManageAddons,
}: {
  sub: AdminSubscriptionItem;
  onViewSalon: (tenantId: string) => void;
  onExtendTrial: (sub: AdminSubscriptionItem) => void;
  onManageAddons: (sub: AdminSubscriptionItem) => void;
}) {
  const isTrial = sub.status === 'TRIAL';
  const daysRemaining = calculateDaysRemaining(sub.trialEnd ?? sub.endDate);

  return (
    <article className="admin-card">
      <div className="admin-card-top">
        <div>
          <h3 className="admin-card-title">{sub.tenant.name}</h3>
          <div className="admin-card-sub">{sub.tenant.code}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={subscriptionStatusBadgeClass(sub.status)}>{sub.status}</span>
          {isTrial && daysRemaining !== null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
              {daysRemaining}d left
            </span>
          )}
        </div>
      </div>

      <div className="admin-kv-grid">
        <AdminKv label="Plan" value={sub.plan.name} />
        <AdminKv
          label={
            sub.totals && sub.totals.activeAddonsTotal > 0
              ? 'Next Renewal Total'
              : isTrial
                ? 'Price After Trial'
                : 'Amount'
          }
          value={
            sub.totals && sub.totals.activeAddonsTotal > 0
              ? `${formatAmount(sub.totals.nextRenewalTotal ?? sub.price, sub.currency)} / ${sub.billingCycle.toLowerCase()} (incl. ${formatAmount(sub.totals.activeAddonsTotal, sub.currency)} add-ons)`
              : `${formatAmount(sub.price, sub.currency)} / ${sub.billingCycle.toLowerCase()}`
          }
          amount
        />
        {isTrial ? (
          <>
            <AdminKv label="Trial Start" value={formatDate(sub.trialStart ?? sub.startDate)} />
            <AdminKv label="Trial End" value={formatDate(sub.trialEnd ?? sub.endDate)} />
          </>
        ) : (
          <>
            <AdminKv label="Start" value={formatDate(sub.startDate)} />
            <AdminKv label="End" value={formatDate(sub.endDate)} />
          </>
        )}
      </div>

      <div className="admin-row-actions flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => onManageAddons(sub)}
          >
            <Sparkles size={13} /> Add-ons
          </Button>
          {isTrial && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => onExtendTrial(sub)}
            >
              <Clock size={14} /> Extend Trial
            </Button>
          )}
        </div>
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
  onExtendTrial,
  onManageAddons,
}: {
  sub: AdminSubscriptionItem;
  onViewSalon: (tenantId: string) => void;
  onExtendTrial: (sub: AdminSubscriptionItem) => void;
  onManageAddons: (sub: AdminSubscriptionItem) => void;
}) {
  const isTrial = sub.status === 'TRIAL';
  const daysRemaining = calculateDaysRemaining(sub.trialEnd ?? sub.endDate);

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
        <div className="flex flex-col gap-1 items-start">
          <span className={subscriptionStatusBadgeClass(sub.status)}>{sub.status}</span>
          {isTrial && daysRemaining !== null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
              {daysRemaining} days remaining
            </span>
          )}
        </div>
      </td>
      <td>
        {sub.totals && sub.totals.activeAddonsTotal > 0 ? (
          <div>
            <div className="font-semibold text-foreground">
              {formatAmount(sub.totals.nextRenewalTotal ?? sub.price, sub.currency)} / {sub.billingCycle.toLowerCase()}
            </div>
            <div className="text-xs text-primary">
              Base: {formatAmount(sub.price, sub.currency)} + Add-ons: {formatAmount(sub.totals.activeAddonsTotal, sub.currency)}
            </div>
          </div>
        ) : (
          <div>{formatAmount(sub.price, sub.currency)} / {sub.billingCycle.toLowerCase()}</div>
        )}
        {isTrial && <div className="text-xs text-muted-foreground">(Expected after trial)</div>}
      </td>
      <td>
        {isTrial ? (
          <>
            <div className="admin-card-meta">Trial Start: {formatDate(sub.trialStart ?? sub.startDate)}</div>
            <div className="admin-card-meta font-medium">Trial End: {formatDate(sub.trialEnd ?? sub.endDate)}</div>
          </>
        ) : (
          <>
            <div className="admin-card-meta">Start: {formatDate(sub.startDate)}</div>
            <div className="admin-card-meta">End: {formatDate(sub.endDate)}</div>
          </>
        )}
      </td>
      <td>
        <div className="admin-row-actions flex items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2.5 gap-1"
            onClick={() => onManageAddons(sub)}
          >
            <Sparkles size={13} /> Add-ons
          </Button>
          {isTrial && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5 gap-1"
              onClick={() => onExtendTrial(sub)}
            >
              <Clock size={13} /> Extend
            </Button>
          )}
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
  const [extendSub, setExtendSub] = useState<AdminSubscriptionItem | null>(null);
  const [addonsSub, setAddonsSub] = useState<AdminSubscriptionItem | null>(null);
  const [bulkAddonOpen, setBulkAddonOpen] = useState(false);
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
        subtitle="View active, trial, suspended, expired, and cancelled salon subscriptions"
        action={
          <Button
            type="button"
            onClick={() => setBulkAddonOpen(true)}
            className="gap-2 text-xs font-semibold h-9 px-3.5 shadow-sm"
          >
            <Sparkles size={14} /> Bulk Assign Add-on
          </Button>
        }
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
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
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
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  onViewSalon={viewSalon}
                  onExtendTrial={setExtendSub}
                  onManageAddons={setAddonsSub}
                />
              ))}
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Salon</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Price / Expected</th>
                    <th>Period / Trial</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((sub) => (
                    <SubscriptionTableRow
                      key={sub.id}
                      sub={sub}
                      onViewSalon={viewSalon}
                      onExtendTrial={setExtendSub}
                      onManageAddons={setAddonsSub}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminPanel>

      {extendSub && (
        <ExtendTrialDialog
          open={!!extendSub}
          onOpenChange={(open) => {
            if (!open) setExtendSub(null);
          }}
          subscriptionId={extendSub.id}
          tenantId={extendSub.tenantId}
          salonName={extendSub.tenant.name}
          currentTrialEnd={extendSub.trialEnd ?? extendSub.endDate}
          onSuccess={() => void refetch()}
        />
      )}

      {addonsSub && (
        <ManageSubscriptionAddonsDialog
          open={!!addonsSub}
          onOpenChange={(open) => {
            if (!open) setAddonsSub(null);
          }}
          subscriptionId={addonsSub.id}
          salonName={addonsSub.tenant.name}
        />
      )}

      <BulkAddonAssignDialog
        open={bulkAddonOpen}
        onOpenChange={setBulkAddonOpen}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
