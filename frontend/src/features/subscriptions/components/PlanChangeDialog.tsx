import { useState } from 'react';
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
import { formatPrice } from '@/features/plans/lib/plan-utils';
import type { PublicPlan } from '@/features/plans/types/plan.types';

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  plans: PublicPlan[];
  currentPlanCode: string;
  mode: 'upgrade' | 'downgrade';
  isPending: boolean;
  onConfirm: (planId: string) => void;
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  title,
  description,
  plans,
  currentPlanCode,
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
  const selectedPlan = eligiblePlans.find((p) => p.id === selectedPlanId);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedPlanId('');
    onOpenChange(next);
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
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Select plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePlans.map((plan) => {
                    const monthly = plan.prices.find((p) => p.billingCycle === 'MONTHLY');
                    return (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} —{' '}
                        {monthly
                          ? formatPrice(monthly.price, monthly.currency)
                          : formatPrice(plan.price, plan.currency)}
                        /mo
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                {mode === 'downgrade'
                  ? 'Downgrade takes effect at the end of your current billing period. You will pay the new plan price when you renew.'
                  : 'You will be redirected to PayHere to pay the prorated upgrade amount. Features update after payment succeeds.'}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedPlanId || isPending || eligiblePlans.length === 0}
            onClick={() => onConfirm(selectedPlanId)}
          >
            {isPending ? 'Processing…' : mode === 'upgrade' ? 'Pay & Upgrade' : 'Schedule Downgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
