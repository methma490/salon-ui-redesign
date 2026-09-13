import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminPlans } from '@/features/plans/hooks/usePlans';
import { billingCycleLabel, formatPrice, getPlanPriceSummary } from '@/features/plans/lib/plan-utils';
import type { SalonSubscriptionSummary } from '@/features/salons/types/salon.types';
import {
  FormError,
  FormSubmit,
  getErrorMessage,
  SimpleForm,
  SimpleFormDialog,
} from '@/pages/salon/salon-ops-ui';
import { subscriptionsApi } from '../api/subscriptions.api';

type Props = {
  tenantId: string;
  salonName: string;
  subscription: SalonSubscriptionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageSubscriptionDialog({
  tenantId,
  salonName,
  subscription,
  open,
  onOpenChange,
}: Props) {
  const qc = useQueryClient();
  const { data: plans = [] } = useAdminPlans();
  const [planId, setPlanId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const activePlans = plans.filter((plan) => plan.status === 'ACTIVE' && plan.code !== 'CUSTOM');

  useEffect(() => {
    if (!open) return;
    const currentPlanId = subscription?.planCode
      ? activePlans.find((p) => p.code === subscription.planCode)?.id
      : undefined;
    setPlanId(currentPlanId ?? activePlans[0]?.id ?? '');
    setPaymentReference('');
    setFormError(null);
  }, [open, subscription?.planCode, activePlans]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['salons'] });
    qc.invalidateQueries({ queryKey: ['salon', tenantId] });
    qc.invalidateQueries({ queryKey: ['subscription', tenantId] });
  };

  const assignMutation = useMutation({
    mutationFn: () => subscriptionsApi.assignPlan({ tenantId, planId }),
    onSuccess: () => {
      invalidate();
      setFormError(null);
      onOpenChange(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const activateMutation = useMutation({
    mutationFn: () =>
      subscriptionsApi.activate(subscription!.id, {
        tenantId,
        paymentMethod: 'MANUAL',
        paymentReference: paymentReference.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setFormError(null);
      onOpenChange(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const changePlanMutation = useMutation({
    mutationFn: () => subscriptionsApi.changePlan(subscription!.id, { tenantId, planId }),
    onSuccess: () => {
      invalidate();
      setFormError(null);
      onOpenChange(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const selectedPlan = activePlans.find((plan) => plan.id === planId);
  const mode = !subscription ? 'assign' : subscription.status === 'PENDING' ? 'pending' : 'active';
  const pending = assignMutation.isPending || activateMutation.isPending || changePlanMutation.isPending;

  return (
    <SimpleFormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFormError(null);
        onOpenChange(next);
      }}
      title={
        mode === 'assign'
          ? 'Assign Subscription Plan'
          : mode === 'pending'
            ? 'Activate Subscription'
            : 'Change Subscription Plan'
      }
    >
      <SimpleForm
        onSubmit={(e) => {
          e.preventDefault();
          if (!planId && mode !== 'pending') {
            setFormError('Please select a plan.');
            return;
          }
          setFormError(null);
          if (mode === 'assign') assignMutation.mutate();
          else if (mode === 'pending') activateMutation.mutate();
          else changePlanMutation.mutate();
        }}
      >
        <FormError message={formError} />

        <p className="text-sm text-muted-foreground">
          {mode === 'assign' && `Assign a subscription plan to ${salonName}.`}
          {mode === 'pending' &&
            `${salonName} has a pending ${subscription?.planName} subscription. Activate it to enable plan features.`}
          {mode === 'active' &&
            `Change the active plan for ${salonName}. Features will update immediately.`}
        </p>

        {subscription && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <div className="font-medium">
              Current: {subscription.planName}{' '}
              <span className="text-muted-foreground">({subscription.status})</span>
            </div>
            <div className="text-muted-foreground">
              {subscription.currency} {Number(subscription.price).toLocaleString()}
            </div>
          </div>
        )}

        {mode !== 'pending' && (
          <div className="space-y-2">
            <Label htmlFor="sub-plan">Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger id="sub-plan">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map((plan) => {
                  const monthly = plan.planPrices?.find((p) => p.billingCycle === 'MONTHLY');
                  const priceLabel = monthly
                    ? `${formatPrice(Number(monthly.price), monthly.currency)} / ${billingCycleLabel(monthly.billingCycle)}`
                    : getPlanPriceSummary(plan).monthly ?? '—';

                  return (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} — {priceLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedPlan && (
              <p className="text-xs text-muted-foreground">
                {selectedPlan.planFeatures
                  .filter((item) => item.enabled)
                  .map((item) => item.feature.code)
                  .join(', ') || 'No features configured on this plan.'}
              </p>
            )}
          </div>
        )}

        {mode === 'pending' && (
          <div className="space-y-2">
            <Label htmlFor="sub-payment-ref">Payment reference (optional)</Label>
            <Input
              id="sub-payment-ref"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Invoice or receipt number"
            />
          </div>
        )}

        <FormSubmit pending={pending}>
          {mode === 'assign' && 'Assign Plan'}
          {mode === 'pending' && 'Activate Subscription'}
          {mode === 'active' && 'Change Plan'}
        </FormSubmit>
      </SimpleForm>
    </SimpleFormDialog>
  );
}
