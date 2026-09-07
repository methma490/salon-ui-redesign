import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useFeatures, useUpdateSalonFeatures } from '@/features/salons/hooks/useSalons';

interface ManageFeaturesDialogProps {
  salon: {
    id: string;
    name: string;
    enabledFeatures: Array<{ code: string } | string>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageFeaturesDialog({ salon, open, onOpenChange }: ManageFeaturesDialogProps) {
  const { data: features, isLoading } = useFeatures();
  const updateFeatures = useUpdateSalonFeatures(salon.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelected(
      salon.enabledFeatures.map((feature) =>
        typeof feature === 'string' ? feature : feature.code,
      ),
    );
  }, [salon]);

  const toggleFeature = (code: string, checked: boolean) => {
    setSelected((current) =>
      checked ? [...new Set([...current, code])] : current.filter((item) => item !== code),
    );
  };

  const handleSave = async () => {
    setError('');
    if (!selected.length) {
      setError('At least one feature must be selected.');
      return;
    }

    try {
      await updateFeatures.mutateAsync(selected);
      onOpenChange(false);
    } catch {
      setError('Failed to update features.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Features</DialogTitle>
          <DialogDescription>Select enabled features for {salon.name}.</DialogDescription>
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
                  id={feature.code}
                  checked={selected.includes(feature.code)}
                  onCheckedChange={(checked) => toggleFeature(feature.code, checked === true)}
                />
                <div>
                  <Label htmlFor={feature.code}>{feature.name}</Label>
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
          <Button onClick={() => void handleSave()} disabled={updateFeatures.isPending}>
            {updateFeatures.isPending ? 'Saving...' : 'Save Features'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
