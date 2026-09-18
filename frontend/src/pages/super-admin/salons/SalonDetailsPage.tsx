import { ArrowLeft, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditSalonDialog } from '@/features/salons/components/EditSalonDialog';
import { ManageFeaturesDialog } from '@/features/salons/components/ManageFeaturesDialog';
import { StatusBadge } from '@/features/salons/components/StatusBadge';
import { StatusChangeDialog } from '@/features/salons/components/StatusChangeDialog';
import { useSalon } from '@/features/salons/hooks/useSalons';
import type { SalonStatus } from '@/features/salons/types/salon.types';
import { ManageSubscriptionDialog } from '@/features/subscriptions/components/ManageSubscriptionDialog';
import { formatPrice } from '@/features/plans/lib/plan-utils';
import { formatSriLankaDate, formatSriLankaDateTime } from '@/lib/sri-lanka-time';
import { OpsError, OpsLoading } from '@/pages/salon/salon-ops-ui';
import './salon-details-page.css';

function subscriptionStatusClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'emp-badge emp-badge-active';
    case 'PENDING':
      return 'emp-badge emp-badge-inactive';
    default:
      return 'emp-badge emp-type-out';
  }
}

function formatDateTime(value: string): string {
  return formatSriLankaDateTime(value);
}

function formatDate(value: string): string {
  return formatSriLankaDate(value);
}

export default function SalonDetailsPage() {
  const { id = '' } = useParams();
  const { data: salon, isLoading, error, refetch } = useSalon(id);
  const [editOpen, setEditOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<SalonStatus | null>(null);

  if (isLoading) return <OpsLoading />;
  if (error || !salon) {
    return <OpsError message="Salon not found." onRetry={() => void refetch()} />;
  }

  return (
    <div className="sd-page">
      <Link to="/super-admin/salons" className="sd-back">
        <ArrowLeft className="h-4 w-4" />
        Back to salons
      </Link>

      <header className="sd-hero">
        <div>
          <h1>{salon.name}</h1>
          <p className="sd-hero-meta">
            {salon.code} · Tenant details and subscription management
          </p>
        </div>
        <div className="sd-hero-actions">
          <button type="button" className="sd-btn sd-btn-secondary" onClick={() => setEditOpen(true)}>
            Edit Salon
          </button>
          <button
            type="button"
            className="sd-btn sd-btn-primary"
            onClick={() => setSubscriptionOpen(true)}
          >
            {salon.subscription ? 'Manage Plan' : 'Assign Plan'}
          </button>
        </div>
      </header>

      {salon.awaitingActivation && (
        <div className="sd-alert">
          <p className="sd-alert-title">Payment received — awaiting activation</p>
          <p className="sd-alert-text">
            Customer paid for the {salon.subscription?.planName ?? 'selected'} plan. Activate this
            salon to allow login and enable plan features.
          </p>
          <button type="button" className="sd-btn sd-btn-primary" onClick={() => setStatusTarget('ACTIVE')}>
            Activate Salon
          </button>
        </div>
      )}

      <section className="sd-stats" aria-label="Salon summary">
        <article className="sd-stat-card">
          <div className="sd-stat-icon">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="sd-stat-label">Salon Status</div>
            <div className="sd-stat-value">
              <StatusBadge status={salon.status} />
            </div>
          </div>
        </article>

        <article className="sd-stat-card">
          <div className="sd-stat-icon">
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <div className="sd-stat-label">Plan</div>
            <div className="sd-stat-value">{salon.subscription?.planCode ?? 'Manual'}</div>
          </div>
        </article>

        <article className="sd-stat-card">
          <div className="sd-stat-icon">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="sd-stat-label">Enabled Features</div>
            <div className="sd-stat-value">{salon.enabledFeatures.length}</div>
          </div>
        </article>
      </section>

      <div className="sd-layout">
        <div className="sd-main-stack">
          <section className="sd-panel">
            <div className="sd-panel-head">
              <h2 className="sd-panel-title">Subscription</h2>
              <p className="sd-panel-desc">Current billing plan and renewal dates</p>
            </div>
            <div className="sd-panel-body">
              {salon.subscription ? (
                <dl className="sd-detail-list">
                  <div className="sd-detail-item">
                    <dt>Plan</dt>
                    <dd className="sd-detail-strong">
                      {salon.subscription.planName}{' '}
                      <span className={subscriptionStatusClass(salon.subscription.status)}>
                        {salon.subscription.status}
                      </span>
                    </dd>
                  </div>
                  <div className="sd-detail-item">
                    <dt>Price</dt>
                    <dd className="sd-detail-strong">
                      {formatPrice(salon.subscription.price, salon.subscription.currency)}
                    </dd>
                  </div>
                  {salon.subscription.startDate && (
                    <div className="sd-detail-item">
                      <dt>Started</dt>
                      <dd>{formatDate(salon.subscription.startDate)}</dd>
                    </div>
                  )}
                  {salon.subscription.endDate && (
                    <div className="sd-detail-item">
                      <dt>Renews / Ends</dt>
                      <dd>{formatDate(salon.subscription.endDate)}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="sd-empty">
                  No subscription assigned. Features are managed manually for this legacy salon.
                </div>
              )}
            </div>
          </section>

          <section className="sd-panel">
            <div className="sd-panel-head">
              <h2 className="sd-panel-title">Salon Information</h2>
              <p className="sd-panel-desc">Contact details and tenant admin</p>
            </div>
            <div className="sd-panel-body">
              <dl className="sd-detail-list">
                <div className="sd-detail-item">
                  <dt>Email</dt>
                  <dd>{salon.email || '—'}</dd>
                </div>
                <div className="sd-detail-item">
                  <dt>Phone</dt>
                  <dd>{salon.phone || '—'}</dd>
                </div>
                <div className="sd-detail-item">
                  <dt>Created</dt>
                  <dd>{formatDateTime(salon.createdAt)}</dd>
                </div>
                <div className="sd-detail-item">
                  <dt>Main Branch</dt>
                  <dd>{salon.mainBranch?.name ?? '—'}</dd>
                </div>
                <div className="sd-detail-item">
                  <dt>Admin</dt>
                  <dd>
                    {salon.admin ? (
                      <>
                        <span className="sd-detail-strong">{salon.admin.name}</span>
                        <br />
                        <span className="sd-detail-muted">{salon.admin.email}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <aside className="sd-sidebar-stack">
          <section className="sd-panel">
            <div className="sd-panel-head">
              <h2 className="sd-panel-title">Quick Actions</h2>
              <p className="sd-panel-desc">Manage plan, features, and salon status</p>
            </div>
            <div className="sd-panel-body">
              <div className="sd-action-stack">
                <button
                  type="button"
                  className="sd-btn sd-btn-secondary"
                  onClick={() => setFeaturesOpen(true)}
                >
                  Manage Features
                </button>
                <button
                  type="button"
                  className="sd-btn sd-btn-secondary"
                  onClick={() => setSubscriptionOpen(true)}
                >
                  {salon.subscription ? 'Change Plan' : 'Assign Plan'}
                </button>

                <div className="sd-action-divider" />

                {salon.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    className="sd-btn sd-btn-primary"
                    onClick={() => setStatusTarget('ACTIVE')}
                  >
                    Activate Salon
                  </button>
                )}
                {salon.status !== 'SUSPENDED' && (
                  <button
                    type="button"
                    className="sd-btn sd-btn-secondary"
                    onClick={() => setStatusTarget('SUSPENDED')}
                  >
                    Suspend Salon
                  </button>
                )}
                {salon.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    className="sd-btn sd-btn-danger"
                    onClick={() => setStatusTarget('ARCHIVED')}
                  >
                    Archive Salon
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="sd-panel">
            <div className="sd-panel-head">
              <h2 className="sd-panel-title">Enabled Features</h2>
              <p className="sd-panel-desc">
                {salon.featuresManagedBySubscription
                  ? 'Module access for this subscription-managed salon'
                  : 'Manually assigned modules'}
              </p>
            </div>
            <div className="sd-panel-body">
              {salon.enabledFeatures.length ? (
                <div className="sd-feature-grid">
                  {salon.enabledFeatures.map((feature) => (
                    <div key={feature.code} className="sd-feature-chip">
                      <span className="sd-feature-name">{feature.name}</span>
                      <span className="sd-feature-code">{feature.code}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sd-empty">
                  {salon.subscription?.status === 'PENDING'
                    ? 'Features activate after the subscription is activated.'
                    : 'No features enabled.'}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <EditSalonDialog salon={salon} open={editOpen} onOpenChange={setEditOpen} />
      <ManageFeaturesDialog salon={salon} open={featuresOpen} onOpenChange={setFeaturesOpen} />
      <ManageSubscriptionDialog
        tenantId={salon.id}
        salonName={salon.name}
        subscription={salon.subscription}
        open={subscriptionOpen}
        onOpenChange={setSubscriptionOpen}
      />
      {statusTarget && (
        <StatusChangeDialog
          salonId={salon.id}
          salonName={salon.name}
          targetStatus={statusTarget}
          open={!!statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
        />
      )}
    </div>
  );
}
