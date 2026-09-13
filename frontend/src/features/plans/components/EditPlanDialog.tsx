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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdatePlan } from '@/features/plans/hooks/usePlans';
import type { AdminPlan } from '@/features/plans/types/plan.types';

interface EditPlanDialogProps {
  plan: AdminPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPlanDialog({ plan, open, onOpenChange }: EditPlanDialogProps) {
  const updatePlan = useUpdatePlan(plan?.id ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!plan) return;
    setName(plan.name);
    setDescription(plan.description ?? '');
    setActive(plan.status === 'ACTIVE');
    setError('');
  }, [plan]);

  const handleSave = async () => {
    if (!plan) return;
    setError('');

    try {
      await updatePlan.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        status: active ? 'ACTIVE' : 'INACTIVE',
      });
      onOpenChange(false);
    } catch {
      setError('Failed to update plan.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Plan — {plan?.code}</DialogTitle>
          <DialogDescription>
            Update plan details and visibility. Use Manage Pricing for monthly/yearly prices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-plan-name">Name</Label>
            <Input id="edit-plan-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-plan-description">Description</Label>
            <Input
              id="edit-plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border p-3">
            <Checkbox
              id="edit-plan-active"
              checked={active}
              onCheckedChange={(checked) => setActive(checked === true)}
            />
            <Label htmlFor="edit-plan-active">
              Plan is active and visible on the public website
            </Label>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={updatePlan.isPending}>
            {updatePlan.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
