import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { featureLabel } from '@/features/plans/lib/plan-utils';
import { useAssignPlanFeatures } from '@/features/plans/hooks/usePlans';
import { useFeatures } from '@/features/salons/hooks/useSalons';
import type { AdminPlan } from '@/features/plans/types/plan.types';

interface ManagePlanFeaturesDialogProps {
  plan: AdminPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagePlanFeaturesDialog({
  plan,
  open,
  onOpenChange,
}: ManagePlanFeaturesDialogProps) {
  const { data: features, isLoading } = useFeatures();
  const assignFeatures = useAssignPlanFeatures(plan?.id ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!plan) return;
    setSelected(plan.planFeatures.filter((pf) => pf.enabled).map((pf) => pf.feature.code));
    setError('');
  }, [plan]);

  const toggleFeature = (code: string, checked: boolean) => {
    setSelected((current) =>
      checked ? [...new Set([...current, code])] : current.filter((item) => item !== code),
    );
  };

  const handleSave = async () => {
    if (!plan) return;
    setError('');

    if (!selected.length) {
      setError('At least one feature must be selected.');
      return;
    }

    try {
      await assignFeatures.mutateAsync(selected);
      onOpenChange(false);
    } catch {
      setError('Failed to update plan features.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan Features — {plan?.name}</DialogTitle>
          <DialogDescription>
            This updates the plan template only. Existing salon subscriptions keep their original
            feature snapshot.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading features...</p>
        ) : (
          <div className="space-y-3">
            {features?.map((feature) => (
              <div
                key={feature.code}
                className="flex items-start gap-3 rounded-md border border-border p-3"
              >
                <Checkbox
                  id={`plan-feature-${feature.code}`}
                  checked={selected.includes(feature.code)}
                  onCheckedChange={(checked) => toggleFeature(feature.code, checked === true)}
                />
                <div>
                  <Label htmlFor={`plan-feature-${feature.code}`}>
                    {featureLabel(feature.code, feature.name)}
                  </Label>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={assignFeatures.isPending}>
            {assignFeatures.isPending ? 'Saving...' : 'Save Template Features'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
