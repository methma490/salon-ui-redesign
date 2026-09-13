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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePlan } from '@/features/plans/hooks/usePlans';
import type { BillingCycle } from '@/features/plans/types/plan.types';

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePlanDialog({ open, onOpenChange }: CreatePlanDialogProps) {
  const createPlan = useCreatePlan();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [yearlyPrice, setYearlyPrice] = useState('');
  const [trialDays, setTrialDays] = useState('14');
  const [error, setError] = useState('');

  const reset = () => {
    setCode('');
    setName('');
    setDescription('');
    setPrice('');
    setCurrency('LKR');
    setBillingCycle('MONTHLY');
    setMonthlyPrice('');
    setYearlyPrice('');
    setTrialDays('14');
    setError('');
  };

  const handleSubmit = async () => {
    setError('');

    if (!code.trim() || !name.trim() || !price) {
      setError('Code, name, and price are required.');
      return;
    }

    try {
      await createPlan.mutateAsync({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(monthlyPrice || price),
        currency,
        billingCycle,
        active: true,
        monthlyPrice: monthlyPrice ? Number(monthlyPrice) : Number(price),
        yearlyPrice: yearlyPrice ? Number(yearlyPrice) : undefined,
        trialDays: Number(trialDays),
      });
      reset();
      onOpenChange(false);
    } catch {
      setError('Failed to create plan. Code may already exist.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Subscription Plan</DialogTitle>
          <DialogDescription>
            Add a new plan template. Features are assigned separately after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-code">Code</Label>
              <Input
                id="plan-code"
                placeholder="GOLD"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                placeholder="Gold Plan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Description</Label>
            <Input
              id="plan-description"
              placeholder="Standard salon management package"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-monthly">Monthly Price</Label>
              <Input
                id="plan-monthly"
                type="number"
                min="0"
                step="0.01"
                value={monthlyPrice || price}
                onChange={(e) => {
                  setMonthlyPrice(e.target.value);
                  setPrice(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-yearly">Yearly Price</Label>
              <Input
                id="plan-yearly"
                type="number"
                min="0"
                step="0.01"
                value={yearlyPrice}
                onChange={(e) => setYearlyPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-trial">Trial Days</Label>
              <Input
                id="plan-trial"
                type="number"
                min="0"
                max="365"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Billing</Label>
              <Select
                value={billingCycle}
                onValueChange={(v) => setBillingCycle(v as BillingCycle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={createPlan.isPending}>
            {createPlan.isPending ? 'Creating...' : 'Create Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
