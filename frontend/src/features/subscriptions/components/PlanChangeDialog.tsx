import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { billingCycleLabel, formatPrice } from '@/features/plans/lib/plan-utils';
import type { BillingCycle, PublicPlan } from '@/features/plans/types/plan.types';

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  plans: PublicPlan[];
  currentPlanCode: string;
  currentBillingCycle?: BillingCycle;
  mode: 'upgrade' | 'downgrade';
  isPending: boolean;
  onConfirm: (options: {
    planId: string;
    planPriceId?: string;
    billingCycle?: BillingCycle;
  }) => void;
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  title,
  description,
  plans,
  currentPlanCode,
  currentBillingCycle = 'MONTHLY',
  mode,
  isPending,
  onConfirm,
}: PlanChangeDialogProps) {
  const currentOrder = plans.find((p) => p.code === currentPlanCode)?.displayOrder ?? 0;
  const eligiblePlans = plans.filter((plan) => {
    const order = plan.displayOrder ?? 0;
    return mode === 'upgrade' ? order > currentOrder : order < currentOrder;
  });

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(currentBillingCycle);

  useEffect(() => {
    if (open) {
      setSelectedCycle(currentBillingCycle);
    }
  }, [open, currentBillingCycle]);

  const selectedPlan = eligiblePlans.find((p) => p.id === selectedPlanId);
  const activePrice = selectedPlan?.prices.find((p) => p.billingCycle === selectedCycle);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedPlanId('');
    }
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!selectedPlanId) return;
    onConfirm({
      planId: selectedPlanId,
      planPriceId: activePrice?.id,
      billingCycle: selectedCycle,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {eligiblePlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {mode === 'upgrade' ? 'higher' : 'lower'} plans are available.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePlans.map((plan) => {
                    const priceForCycle = plan.prices.find((p) => p.billingCycle === selectedCycle);
                    return (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} —{' '}
                        {priceForCycle
                          ? formatPrice(priceForCycle.price, priceForCycle.currency)
                          : formatPrice(plan.price, plan.currency)}{' '}
                        / {selectedCycle === 'MONTHLY' ? 'mo' : 'yr'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedCycle === 'MONTHLY' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCycle('MONTHLY')}
                  >
                    Monthly
                  </Button>
                  <Button
                    type="button"
                    variant={selectedCycle === 'YEARLY' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCycle('YEARLY')}
                  >
                    Yearly
                  </Button>
                </div>
              </div>
            )}

            {selectedPlan && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground">
                  Selected Price:{' '}
                  {activePrice
                    ? `${formatPrice(activePrice.price, activePrice.currency)} / ${billingCycleLabel(selectedCycle)}`
                    : `${formatPrice(selectedPlan.price, selectedPlan.currency)} / ${billingCycleLabel(selectedCycle)}`}
                </div>
                <p>
                  {mode === 'downgrade'
                    ? 'Downgrade takes effect at the end of your current billing period. You will pay the new plan price when you renew.'
                    : 'You will be redirected to PayHere to pay the prorated upgrade amount. Features update after payment succeeds.'}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedPlanId || isPending || eligiblePlans.length === 0}
            onClick={handleConfirm}
          >
            {isPending ? 'Processing…' : mode === 'upgrade' ? 'Pay & Upgrade' : 'Schedule Downgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

