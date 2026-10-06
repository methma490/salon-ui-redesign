import { CreditCard, Layers3, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { CreatePlanDialog } from '@/features/plans/components/CreatePlanDialog';
import { EditPlanDialog } from '@/features/plans/components/EditPlanDialog';
import { ManagePlanFeaturesDialog } from '@/features/plans/components/ManagePlanFeaturesDialog';
import { ManagePlanPricingDialog } from '@/features/plans/components/ManagePlanPricingDialog';
import { ManageAddonPricingDialog } from '@/features/plans/components/ManageAddonPricingDialog';
import {
  useActivatePlan,
  useAdminPlans,
  useDeactivatePlan,
} from '@/features/plans/hooks/usePlans';
import {
  featureLabel,
  formatPrice,
  getPlanPriceSummary,
  isPopularPlan,
} from '@/features/plans/lib/plan-utils';
import type { AdminPlan } from '@/features/plans/types/plan.types';
import {
  OpsEditButton,
  OpsError,
  OpsIconButton,
  OpsLoading,
  OpsToggleStatusButton,
} from '@/pages/salon/salon-ops-ui';
import './plans-page.css';

type PlanAction = 'edit' | 'features' | 'pricing';

function PlanPricingBlock({ plan }: { plan: AdminPlan }) {
  const pricing = getPlanPriceSummary(plan);

  return (
    <div className="plans-pricing">
      <div className="plans-price-box">
        <div className="plans-price-label">Monthly</div>
        <div className="plans-price-value">
          {pricing.monthlyAmount != null
            ? formatPrice(pricing.monthlyAmount, pricing.currency)
            : 'Not set'}
        </div>
      </div>
      <div className="plans-price-box">
        <div className="plans-price-label">Yearly</div>
        <div className="plans-price-value">
          {pricing.yearlyAmount != null
            ? formatPrice(pricing.yearlyAmount, pricing.currency)
            : 'Not set'}
        </div>
      </div>
      {pricing.trialDays !== undefined && (
        <div className="plans-price-meta" style={{ gridColumn: '1 / -1' }}>
          {pricing.trialDays > 0 ? `${pricing.trialDays}-day free trial` : 'No trial period'}
        </div>
      )}
    </div>
  );
}

function PlanFeatures({ plan }: { plan: AdminPlan }) {
  const planFeatures = Array.isArray(plan?.planFeatures) ? plan.planFeatures : [];
  const featureCodes = planFeatures
    .filter((pf) => pf?.enabled)
    .map((pf) => pf?.feature?.code)
    .filter(Boolean);

  return (
    <div className="plans-feature-list">
      {featureCodes.slice(0, 5).map((code) => (
        <span key={code} className="plans-feature-chip">
          {featureLabel(code)}
        </span>
      ))}
      {featureCodes.length > 5 && (
        <span className="plans-feature-more">+{featureCodes.length - 5} more</span>
      )}
      {featureCodes.length === 0 && <span className="plans-feature-more">No features assigned</span>}
    </div>
  );
}

function PlanActions({
  plan,
  onEdit,
  onPricing,
  onFeatures,
  onToggle,
  disabled,
}: {
  plan: AdminPlan;
  onEdit: () => void;
  onPricing: () => void;
  onFeatures: () => void;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="plans-row-actions">
      <OpsEditButton onClick={onEdit} disabled={disabled} />
      <OpsIconButton
        label="Pricing"
        icon={<CreditCard size={16} strokeWidth={2} />}
        onClick={onPricing}
        disabled={disabled}
      />
      <OpsIconButton
        label="Features"
        icon={<Layers3 size={16} strokeWidth={2} />}
        onClick={onFeatures}
        disabled={disabled}
      />
      <OpsToggleStatusButton
        isActive={plan.status === 'ACTIVE'}
        onClick={onToggle}
        disabled={disabled}
      />
    </div>
  );
}

export default function PlanListPage() {
  const { data: plans = [], isLoading, error, refetch } = useAdminPlans();
  const activatePlan = useActivatePlan();
  const deactivatePlan = useDeactivatePlan();
  const [createOpen, setCreateOpen] = useState(false);
  const [addonPricingOpen, setAddonPricingOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<AdminPlan | null>(null);
  const [activeAction, setActiveAction] = useState<PlanAction | null>(null);

  const openAction = (plan: AdminPlan, action: PlanAction) => {
    setActivePlan(plan);
    setActiveAction(action);
  };

  const closeAction = () => {
    setActivePlan(null);
    setActiveAction(null);
  };

  const togglePlanStatus = async (plan: AdminPlan) => {
    if (plan.status === 'ACTIVE') {
      await deactivatePlan.mutateAsync(plan.id);
    } else {
      await activatePlan.mutateAsync(plan.id);
    }
  };

  if (isLoading) return <OpsLoading />;
  if (error) {
    return <OpsError message="Failed to load plans." onRetry={() => void refetch()} />;
  }

  const activeCount = plans.filter((p) => p.status === 'ACTIVE').length;
  const publicCount = plans.filter((p) => p.status === 'ACTIVE' && p.code !== 'CUSTOM').length;

  return (
    <div className="plans-page">
      <header className="plans-hero">
        <div>
          <h1>Subscription Plans</h1>
          <p>Define plan templates, pricing, and included features for salon tenants</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="plans-btn plans-btn-secondary"
            onClick={() => setAddonPricingOpen(true)}
          >
            <Sparkles size={16} /> Feature Add-on Pricing
          </button>
          <button type="button" className="plans-btn plans-btn-primary" onClick={() => setCreateOpen(true)}>
            + Create Plan
          </button>
        </div>
      </header>

      <section className="plans-stats" aria-label="Plan summary">
        <article className="plans-stat-card">
          <div className="plans-stat-label">Total Plans</div>
          <div className="plans-stat-value">{plans.length}</div>
        </article>
        <article className="plans-stat-card">
          <div className="plans-stat-label">Active</div>
          <div className="plans-stat-value">{activeCount}</div>
        </article>
        <article className="plans-stat-card">
          <div className="plans-stat-label">On Website</div>
          <div className="plans-stat-value">{publicCount}</div>
        </article>
      </section>

      <section className="plans-panel">
        <div className="plans-panel-head">
          <h2 className="plans-panel-title">Plan Catalog</h2>
          <p className="plans-panel-desc">Plans assigned to salons determine their feature access</p>
        </div>

        {plans.length === 0 ? (
          <div className="plans-empty">No plans yet. Create your first subscription plan.</div>
        ) : (
          <>
            <div className="plans-grid">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`plans-card${isPopularPlan(plan.code) ? ' is-popular' : ''}`}
                >
                  <div className="plans-card-top">
                    <div>
                      <h3 className="plans-card-name">{plan.name}</h3>
                      <div className="plans-card-code">{plan.code}</div>
                      {plan.description && <p className="plans-card-desc">{plan.description}</p>}
                    </div>
                    <div style={{ display: 'grid', gap: '0.35rem', justifyItems: 'end' }}>
                      <span
                        className={
                          plan.status === 'ACTIVE'
                            ? 'plans-badge plans-badge-active'
                            : 'plans-badge plans-badge-inactive'
                        }
                      >
                        {plan.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                      {isPopularPlan(plan.code) && (
                        <span className="plans-badge plans-badge-popular">Popular</span>
                      )}
                    </div>
                  </div>

                  <PlanPricingBlock plan={plan} />
                  <PlanFeatures plan={plan} />

                  <PlanActions
                    plan={plan}
                    onEdit={() => openAction(plan, 'edit')}
                    onPricing={() => openAction(plan, 'pricing')}
                    onFeatures={() => openAction(plan, 'features')}
                    onToggle={() => void togglePlanStatus(plan)}
                    disabled={activatePlan.isPending || deactivatePlan.isPending}
                  />
                </article>
              ))}
            </div>

            <div className="plans-table-wrap">
              <table className="plans-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Pricing</th>
                    <th>Features</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => {
                    const pricing = getPlanPriceSummary(plan);

                    return (
                      <tr key={plan.id}>
                        <td>
                          <div className="plans-card-name">{plan.name}</div>
                          <div className="plans-card-code">{plan.code}</div>
                          {plan.description && (
                            <div className="plans-card-desc">{plan.description}</div>
                          )}
                        </td>
                        <td>
                          <div className="plans-price-value">{pricing.monthly}</div>
                          {pricing.yearly && <div className="plans-card-desc">{pricing.yearly}</div>}
                          {pricing.trialDays !== undefined && (
                            <div className="plans-card-desc">
                              {pricing.trialDays > 0
                                ? `${pricing.trialDays}-day trial`
                                : 'No trial'}
                            </div>
                          )}
                        </td>
                        <td>
                          <PlanFeatures plan={plan} />
                        </td>
                        <td>
                          <span
                            className={
                              plan.status === 'ACTIVE'
                                ? 'plans-badge plans-badge-active'
                                : 'plans-badge plans-badge-inactive'
                            }
                          >
                            {plan.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <PlanActions
                            plan={plan}
                            onEdit={() => openAction(plan, 'edit')}
                            onPricing={() => openAction(plan, 'pricing')}
                            onFeatures={() => openAction(plan, 'features')}
                            onToggle={() => void togglePlanStatus(plan)}
                            disabled={activatePlan.isPending || deactivatePlan.isPending}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditPlanDialog
        plan={activeAction === 'edit' ? activePlan : null}
        open={activeAction === 'edit'}
        onOpenChange={(open) => {
          if (!open) closeAction();
        }}
      />

      <ManagePlanPricingDialog
        plan={activeAction === 'pricing' ? activePlan : null}
        open={activeAction === 'pricing'}
        onOpenChange={(open) => {
          if (!open) closeAction();
        }}
      />

      <ManagePlanFeaturesDialog
        plan={activeAction === 'features' ? activePlan : null}
        open={activeAction === 'features'}
        onOpenChange={(open) => {
          if (!open) closeAction();
        }}
      />

      <ManageAddonPricingDialog
        open={addonPricingOpen}
        onOpenChange={setAddonPricingOpen}
      />
    </div>
  );
}
