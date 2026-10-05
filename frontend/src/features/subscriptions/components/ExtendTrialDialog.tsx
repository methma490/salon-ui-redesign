import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FormError,
  FormSubmit,
  getErrorMessage,
  SimpleForm,
  SimpleFormDialog,
} from '@/pages/salon/salon-ops-ui';
import { formatDate } from '@/features/billing/lib/billing-utils';
import { subscriptionsApi } from '../api/subscriptions.api';

type Props = {
  subscriptionId: string;
  tenantId: string;
  salonName: string;
  currentTrialEnd: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function ExtendTrialDialog({
  subscriptionId,
  tenantId,
  salonName,
  currentTrialEnd,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'days' | 'date'>('days');
  const [extraDays, setExtraDays] = useState(7);
  const [customDate, setCustomDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode('days');
    setExtraDays(7);
    setCustomDate('');
    setReason('');
    setFormError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!reason.trim()) {
        throw new Error('Please provide a reason for the trial extension.');
      }
      return subscriptionsApi.extendTrial(subscriptionId, {
        tenantId,
        extraDays: mode === 'days' ? Number(extraDays) : undefined,
        newTrialEnd: mode === 'date' && customDate ? new Date(customDate).toISOString() : undefined,
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['salons'] });
      qc.invalidateQueries({ queryKey: ['salon', tenantId] });
      setFormError(null);
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (mode === 'days' && (!extraDays || extraDays <= 0)) {
      setFormError('Extra days must be greater than 0.');
      return;
    }
    if (mode === 'date' && !customDate) {
      setFormError('Please select a custom trial end date.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please enter a valid reason for extending the trial.');
      return;
    }

    mutation.mutate();
  };

  return (
    <SimpleFormDialog open={open} onOpenChange={onOpenChange} title="Extend Salon Free Trial">
      <SimpleForm onSubmit={handleSubmit}>
        <FormError message={formError} />

        <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-sm">
          <div className="font-semibold text-foreground">{salonName}</div>
          <div className="text-muted-foreground">
            Current Trial End: <span className="font-medium text-foreground">{formatDate(currentTrialEnd)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Extension Mode</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'days' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => setMode('days')}
            >
              <Clock className="h-4 w-4" /> Extra Days
            </Button>
            <Button
              type="button"
              variant={mode === 'date' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => setMode('date')}
            >
              <Calendar className="h-4 w-4" /> Custom Date
            </Button>
          </div>
        </div>

        {mode === 'days' ? (
          <div className="space-y-2">
            <Label htmlFor="extra-days">Number of Extra Days</Label>
            <Input
              id="extra-days"
              type="number"
              min={1}
              max={365}
              value={extraDays}
              onChange={(e) => setExtraDays(parseInt(e.target.value, 10) || 0)}
              required
            />
            <div className="flex gap-1.5 pt-1">
              {[7, 14, 21, 30].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2.5"
                  onClick={() => setExtraDays(d)}
                >
                  +{d} days
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="custom-trial-date">New Trial End Date</Label>
            <Input
              id="custom-trial-date"
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="extend-reason">
            Reason for Extension <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="extend-reason"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g., Requested additional demo period to evaluate POS feature"
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            rows={3}
            required
          />
          <p className="text-xs text-muted-foreground">
            This reason will be logged in the audit history for this salon.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <FormSubmit pending={mutation.isPending}>Extend Trial</FormSubmit>
        </div>
      </SimpleForm>
    </SimpleFormDialog>
  );
}
