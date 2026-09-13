import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateSalonDialog } from '@/features/salons/components/CreateSalonDialog';
import { EditSalonDialog } from '@/features/salons/components/EditSalonDialog';
import { ManageFeaturesDialog } from '@/features/salons/components/ManageFeaturesDialog';
import { StatusBadge } from '@/features/salons/components/StatusBadge';
import { StatusChangeDialog } from '@/features/salons/components/StatusChangeDialog';
import { useSalons } from '@/features/salons/hooks/useSalons';
import type { SalonFilters, SalonListItem, SalonStatus } from '@/features/salons/types/salon.types';
import { ManageSubscriptionDialog } from '@/features/subscriptions/components/ManageSubscriptionDialog';
import {
  OpsEditButton,
  OpsError,
  OpsLoading,
  OpsPageHeader,
  OpsToggleStatusButton,
} from '@/pages/salon/salon-ops-ui';
import '@/pages/salon/employees-page.css';

type ListAction = 'edit' | 'features' | 'subscription' | 'status' | 'create';

function subscriptionBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'emp-badge emp-badge-active';
    case 'PENDING':
      return 'emp-badge emp-badge-inactive';
    default:
      return 'emp-badge emp-type-out';
  }
}

export default function SalonListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SalonFilters['status']>('ALL');
  const [page, setPage] = useState(1);
  const [activeSalon, setActiveSalon] = useState<SalonListItem | null>(null);
  const [activeAction, setActiveAction] = useState<ListAction | null>(null);
  const [statusTarget, setStatusTarget] = useState<SalonStatus | null>(null);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setActiveAction('create');
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filters = useMemo(
    () => ({ page, limit: 10, search: search || undefined, status }),
    [page, search, status],
  );

  const { data, isLoading, isError, refetch } = useSalons(filters);

  const openAction = (salon: SalonListItem, action: ListAction) => {
    setActiveSalon(salon);
    setActiveAction(action);
  };

  const closeAction = () => {
    setActiveSalon(null);
    setActiveAction(null);
    setStatusTarget(null);
  };

  if (isLoading) return <OpsLoading />;
  if (isError) {
    return <OpsError message="Failed to load salons." onRetry={() => void refetch()} />;
  }

  const salons = data?.data ?? [];

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Salons"
        subtitle="Manage tenant salons, subscriptions, and access"
        action={
          <button
            type="button"
            className="emp-btn emp-btn-primary"
            onClick={() => setActiveAction('create')}
          >
            + Create Salon
          </button>
        }
      />

      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{data?.meta.total ?? 0}</div>
          <div className="emp-stat-label">Total</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">
            {salons.filter((s) => s.subscription?.status === 'ACTIVE').length}
          </div>
          <div className="emp-stat-label">Active Plans</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">
            {salons.filter((s) => s.awaitingActivation).length}
          </div>
          <div className="emp-stat-label">Awaiting Activation</div>
        </div>
      </div>

      <div className="emp-panel emp-form-panel">
        <div className="emp-form-panel-title">Filters</div>
        <div className="emp-filter-grid">
          <div className="emp-filter-field">
            <Label htmlFor="salon-search">Search</Label>
            <Input
              id="salon-search"
              placeholder="Name, code, email, phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="emp-filter-field">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as SalonFilters['status']);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="emp-panel">
        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">Salon Directory</h2>
            <p className="emp-panel-desc">
              Page {data?.meta.page ?? 1} of {data?.meta.totalPages || 1}
            </p>
          </div>
        </div>

        {salons.length === 0 ? (
          <div className="emp-empty">No salons found for the selected filters.</div>
        ) : (
          <>
            <div className="emp-cards">
              {salons.map((salon) => (
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
                    <span>
                      <strong>Plan:</strong>{' '}
                      {salon.subscription ? (
                        <>
                          {salon.subscription.planName}{' '}
                          <span className={subscriptionBadgeClass(salon.subscription.status)}>
                            {salon.subscription.status}
                          </span>
                        </>
                      ) : (
                        'Manual features'
                      )}
                    </span>
                    <span>
                      <strong>Contact:</strong> {salon.email || salon.phone || '—'}
                    </span>
                    {salon.awaitingActivation && (
                      <span className="emp-type-badge emp-type-in">Paid · Awaiting activation</span>
                    )}
                  </div>
                  <div className="emp-card-actions">
                    <OpsEditButton onClick={() => openAction(salon, 'edit')} />
                    <button
                      type="button"
                      className="emp-btn emp-btn-secondary"
                      onClick={() => openAction(salon, 'subscription')}
                    >
                      Plan
                    </button>
                    <button
                      type="button"
                      className="emp-btn emp-btn-secondary"
                      onClick={() => openAction(salon, 'features')}
                    >
                      Features
                    </button>
                    <OpsToggleStatusButton
                      isActive={salon.status === 'ACTIVE'}
                      onClick={() => {
                        setActiveSalon(salon);
                        setStatusTarget(salon.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                        setActiveAction('status');
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Salon</th>
                    <th>Plan</th>
                    <th>Contact</th>
                    <th>Features</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salons.map((salon) => (
                    <tr key={salon.id}>
                      <td>
                        <Link to={`/super-admin/salons/${salon.id}`} className="emp-name-cell">
                          {salon.name}
                        </Link>
                        <div className="emp-code">{salon.code}</div>
                      </td>
                      <td>
                        {salon.subscription ? (
                          <>
                            <div>{salon.subscription.planName}</div>
                            <span className={subscriptionBadgeClass(salon.subscription.status)}>
                              {salon.subscription.status}
                            </span>
                          </>
                        ) : (
                          <span className="emp-panel-desc">Manual</span>
                        )}
                      </td>
                      <td>
                        <div>{salon.email || '—'}</div>
                        <div className="emp-code">{salon.phone || '—'}</div>
                      </td>
                      <td>
                        <div className="emp-card-meta">
                          {salon.enabledFeatures.slice(0, 3).join(', ')}
                          {salon.enabledFeatures.length > 3 &&
                            ` +${salon.enabledFeatures.length - 3}`}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={salon.status} />
                      </td>
                      <td>{new Date(salon.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="emp-actions">
                          <button
                            type="button"
                            className="emp-link-btn"
                            onClick={() => openAction(salon, 'subscription')}
                          >
                            Plan
                          </button>
                          <button
                            type="button"
                            className="emp-link-btn"
                            onClick={() => openAction(salon, 'features')}
                          >
                            Features
                          </button>
                          <OpsEditButton onClick={() => openAction(salon, 'edit')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="emp-toolbar" style={{ marginTop: '1rem' }}>
              <span className="emp-panel-desc">{data?.meta.total ?? 0} total salons</span>
              <div className="emp-toolbar-filters">
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  disabled={page >= (data?.meta.totalPages ?? 1)}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {activeSalon && activeAction === 'edit' && (
        <EditSalonDialog salon={activeSalon} open onOpenChange={(open) => !open && closeAction()} />
      )}
      {activeSalon && activeAction === 'features' && (
        <ManageFeaturesDialog
          salon={{
            id: activeSalon.id,
            name: activeSalon.name,
            enabledFeatures: activeSalon.enabledFeatures,
            featuresManagedBySubscription: activeSalon.featuresManagedBySubscription,
            subscription: activeSalon.subscription
              ? {
                  planName: activeSalon.subscription.planName,
                  status: activeSalon.subscription.status,
                }
              : null,
          }}
          open
          onOpenChange={(open) => !open && closeAction()}
        />
      )}
      {activeSalon && activeAction === 'subscription' && (
        <ManageSubscriptionDialog
          tenantId={activeSalon.id}
          salonName={activeSalon.name}
          subscription={activeSalon.subscription}
          open
          onOpenChange={(open) => !open && closeAction()}
        />
      )}
      {activeSalon && statusTarget && activeAction === 'status' && (
        <StatusChangeDialog
          salonId={activeSalon.id}
          salonName={activeSalon.name}
          targetStatus={statusTarget}
          open
          onOpenChange={(open) => !open && closeAction()}
        />
      )}
      {activeAction === 'create' && (
        <CreateSalonDialog
          open
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
        />
      )}
    </div>
  );
}
