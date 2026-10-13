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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdatePlanPricing } from '@/features/plans/hooks/usePlans';
import { getPlanPriceSummary } from '@/features/plans/lib/plan-utils';
import type { AdminPlan } from '@/features/plans/types/plan.types';

interface ManagePlanPricingDialogProps {
  plan: AdminPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagePlanPricingDialog({
  plan,
  open,
  onOpenChange,
}: ManagePlanPricingDialogProps) {
  const updatePricing = useUpdatePlanPricing(plan?.id ?? '');
  const [currency, setCurrency] = useState('LKR');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [monthlyCompareAtPrice, setMonthlyCompareAtPrice] = useState('');
  const [yearlyPrice, setYearlyPrice] = useState('');
  const [yearlyCompareAtPrice, setYearlyCompareAtPrice] = useState('');
  const [trialDays, setTrialDays] = useState('14');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!plan) return;

    const monthly = plan.planPrices?.find((p) => p.billingCycle === 'MONTHLY');
    const yearly = plan.planPrices?.find((p) => p.billingCycle === 'YEARLY');

    const summary = getPlanPriceSummary(plan);
    setCurrency(summary.currency);
    setMonthlyPrice(
      summary.monthlyAmount != null ? String(summary.monthlyAmount) : '',
    );
    setMonthlyCompareAtPrice(
      summary.monthlyCompareAtAmount != null ? String(summary.monthlyCompareAtAmount) : '',
    );
    setYearlyPrice(summary.yearlyAmount != null ? String(summary.yearlyAmount) : '');
    setYearlyCompareAtPrice(
      summary.yearlyCompareAtAmount != null ? String(summary.yearlyCompareAtAmount) : '',
    );
    setTrialDays(String(monthly?.trialDays ?? yearly?.trialDays ?? 14));
    setError('');
  }, [plan]);

  const handleSave = async () => {
    if (!plan) return;
    setError('');

    try {
      await updatePricing.mutateAsync({
        currency,
        monthlyPrice: monthlyPrice ? Number(monthlyPrice) : undefined,
        monthlyCompareAtPrice: monthlyCompareAtPrice ? Number(monthlyCompareAtPrice) : null,
        yearlyPrice: yearlyPrice ? Number(yearlyPrice) : undefined,
        yearlyCompareAtPrice: yearlyCompareAtPrice ? Number(yearlyCompareAtPrice) : null,
        trialDays: Number(trialDays),
      });
      onOpenChange(false);
    } catch {
      setError('Failed to update pricing.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pricing — {plan?.code}</DialogTitle>
          <DialogDescription>
            Set real monthly and yearly selling prices, marketing compare-at prices, and trial period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pricing-currency">Currency</Label>
            <Input
              id="pricing-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pricing-monthly">Actual Monthly Price</Label>
              <Input
                id="pricing-monthly"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 4800"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing-monthly-compare">Compare Monthly Price</Label>
              <Input
                id="pricing-monthly-compare"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 6000"
                value={monthlyCompareAtPrice}
                onChange={(e) => setMonthlyCompareAtPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pricing-yearly">Actual Yearly Price</Label>
              <Input
                id="pricing-yearly"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 48000"
                value={yearlyPrice}
                onChange={(e) => setYearlyPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing-yearly-compare">Compare Yearly Price</Label>
              <Input
                id="pricing-yearly-compare"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 54000"
                value={yearlyCompareAtPrice}
                onChange={(e) => setYearlyCompareAtPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricing-trial">Trial Days</Label>
            <Input
              id="pricing-trial"
              type="number"
              min="0"
              max="365"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={updatePricing.isPending}>
            {updatePricing.isPending ? 'Saving...' : 'Save Pricing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
