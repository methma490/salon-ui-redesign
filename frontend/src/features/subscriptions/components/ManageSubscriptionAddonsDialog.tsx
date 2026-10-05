import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormError,
  getErrorMessage,
  OpsLoading,
  SimpleForm,
  SimpleFormDialog,
} from '@/pages/salon/salon-ops-ui';
import { formatAmount } from '@/features/billing/lib/billing-utils';
import {
  subscriptionsApi,
  type SubscriptionAddonItem,
} from '../api/subscriptions.api';

type Props = {
  subscriptionId: string;
  salonName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function ManageSubscriptionAddonsDialog({
  subscriptionId,
  salonName,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('');
  const [priceInput, setPriceInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Addon to remove confirmation
  const [addonToRemove, setAddonToRemove] = useState<SubscriptionAddonItem | null>(null);
  const [removeReason, setRemoveReason] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-addons', subscriptionId],
    queryFn: () => subscriptionsApi.getSubscriptionAddOns(subscriptionId),
    enabled: open,
  });

  const { data: eligible = [], isLoading: eligibleLoading } = useQuery({
    queryKey: ['eligible-addons', subscriptionId],
    queryFn: () => subscriptionsApi.getEligibleAddons(subscriptionId),
    enabled: open && isAdding,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['subscription-addons', subscriptionId] });
    qc.invalidateQueries({ queryKey: ['eligible-addons', subscriptionId] });
    qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    qc.invalidateQueries({ queryKey: ['salons'] });
    qc.invalidateQueries({ queryKey: ['tenant-subscription'] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFeatureId) {
        throw new Error('Please select an eligible feature.');
      }
      const numPrice = parseFloat(priceInput);
      if (isNaN(numPrice) || numPrice < 0) {
        throw new Error('Please enter a valid recurring price (>= 0).');
      }

      return subscriptionsApi.createAddOn(subscriptionId, {
        featureId: selectedFeatureId,
        price: numPrice,
        customPrice: numPrice,
        reason: reasonInput.trim() || undefined,
        customReason: reasonInput.trim() || undefined,
      });
    },
    onSuccess: (newAddon) => {
      invalidateAll();
      setIsAdding(false);
      setSelectedFeatureId('');
      setPriceInput('');
      setReasonInput('');
      setFormError(null);
      toast.success(
        `Add-on "${newAddon.feature?.name ?? 'Feature'}" activated immediately! It will be billed on next renewal.`,
      );
      onSuccess?.();
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: async (addOnId: string) => {
      return subscriptionsApi.removeAddOn(
        subscriptionId,
        addOnId,
        removeReason.trim() || undefined,
      );
    },
    onSuccess: () => {
      invalidateAll();
      setAddonToRemove(null);
      setRemoveReason('');
      toast.success('Add-on removed successfully. Entitlement disabled and excluded from next renewal.');
      onSuccess?.();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSelectFeature = (featId: string) => {
    setSelectedFeatureId(featId);
    const feat = eligible.find((f) => f.id === featId);
    if (feat) {
      setPriceInput(feat.defaultPrice !== null ? String(feat.defaultPrice) : '');
    }
  };

  const activeAddons = (data?.addOns ?? []).filter(
    (a) => a.status === 'ACTIVE' || a.status === 'CANCEL_AT_PERIOD_END',
  );

  const cycleLabel =
    data?.billingCycle === 'YEARLY' ? 'year' : 'month';

  return (
    <>
      <SimpleFormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Subscription Add-ons — ${salonName}`}
        className="sm:max-w-xl"
      >
        {isLoading ? (
          <OpsLoading />
        ) : (
          <div className="space-y-6">
            {/* 1. CURRENT ADD-ONS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  Active Add-ons ({activeAddons.length})
                </h3>
                {!isAdding && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setIsAdding(true);
                      setFormError(null);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Feature / Add-on
                  </Button>
                )}
              </div>

              {activeAddons.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground bg-muted/20">
                  No active add-ons assigned to this salon.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeAddons.map((addon) => (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card/60 hover:bg-card transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {addon.feature?.name ?? 'Feature'}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {addon.feature?.code}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            ACTIVE
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Recurring Price:{' '}
                          <strong className="text-foreground font-semibold">
                            {formatAmount(addon.recurringAmount, addon.currency ?? data?.basePlan?.currency ?? 'LKR')}
                          </strong>{' '}
                          / {cycleLabel}
                          {addon.customReason && (
                            <span className="ml-2 italic text-muted-foreground/80">
                              (Note: {addon.customReason})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1"
                          onClick={() => {
                            setAddonToRemove(addon);
                            setRemoveReason('');
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. ADD ADD-ON FORM */}
            {isAdding && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-primary" />
                    Assign New Add-on
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setIsAdding(false);
                      setSelectedFeatureId('');
                      setPriceInput('');
                      setReasonInput('');
                      setFormError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                {formError && <FormError message={formError} />}

                <SimpleForm
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="addon-feature" className="text-xs font-medium">
                      Select Feature <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedFeatureId}
                      onValueChange={handleSelectFeature}
                      disabled={eligibleLoading}
                    >
                      <SelectTrigger id="addon-feature" className="w-full h-9 text-sm">
                        <SelectValue
                          placeholder={
                            eligibleLoading
                              ? 'Loading available features…'
                              : eligible.length === 0
                                ? 'No eligible features available'
                                : 'Choose a feature to add…'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {eligible.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <div className="flex items-center justify-between gap-3 w-full">
                              <span>
                                {f.name} ({f.code})
                              </span>
                              {f.defaultPrice !== null && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  Default: {formatAmount(f.defaultPrice, f.currency)}/{cycleLabel}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="addon-price" className="text-xs font-medium">
                        Recurring Price ({data?.basePlan?.currency ?? 'LKR'} / {cycleLabel}) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-semibold text-muted-foreground select-none">
                          {data?.basePlan?.currency ?? 'LKR'}
                        </span>
                        <Input
                          id="addon-price"
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 3000"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          className="pl-12 h-9 text-sm font-medium"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Charged starting from the next renewal.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="addon-reason" className="text-xs font-medium">
                        Notes / Reason (Optional)
                      </Label>
                      <Input
                        id="addon-reason"
                        type="text"
                        placeholder="e.g. Special promo or direct addon"
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-primary/10">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-primary shrink-0" />
                      <span>Add-on becomes <strong className="text-foreground">ACTIVE immediately</strong>.</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => {
                          setIsAdding(false);
                          setSelectedFeatureId('');
                          setPriceInput('');
                          setReasonInput('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={createMutation.isPending}
                        className="h-8 text-xs px-4"
                      >
                        {createMutation.isPending ? 'Activating…' : 'Add & Activate Add-on'}
                      </Button>
                    </div>
                  </div>
                </SimpleForm>
              </div>
            )}

            {/* 3. NEXT RENEWAL BREAKDOWN */}
            {data?.totals && (
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Next Subscription Renewal Breakdown
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Billing Cycle: <strong className="text-foreground">{data.billingCycle}</strong>
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Base Plan ({data.basePlan?.name ?? 'Plan'})</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatAmount(data.totals.basePlanPrice ?? 0, data.totals.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Active Add-ons Total ({activeAddons.length})</span>
                    <span className="font-mono font-medium text-foreground">
                      + {formatAmount(data.totals.activeAddonsTotal ?? 0, data.totals.currency)}
                    </span>
                  </div>

                  <div className="border-t border-border pt-2.5 flex items-center justify-between text-base font-bold text-foreground">
                    <span>Next Renewal Amount</span>
                    <span className="text-primary font-mono text-lg font-bold">
                      {formatAmount(data.totals.nextRenewalTotal ?? 0, data.totals.currency)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1.5 border-t border-border/50">
                  <Info className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span>
                    No upfront payment or prorated invoice is created. Active add-ons grant full feature access immediately and are billed on renewal.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </SimpleFormDialog>

      {/* REMOVE ADDON CONFIRMATION MODAL */}
      {addonToRemove && (
        <SimpleFormDialog
          open={Boolean(addonToRemove)}
          onOpenChange={(op) => !op && setAddonToRemove(null)}
          title={`Remove Add-on — ${addonToRemove.feature?.name}`}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3.5 text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Immediate effect:
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Feature entitlement will be disabled immediately.</li>
                <li>
                  Recurring price of {formatAmount(addonToRemove.recurringAmount ?? 0, addonToRemove.currency ?? 'LKR')} will be excluded from the next renewal.
                </li>
                <li>No automatic refund will be created.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remove-reason" className="text-xs font-medium">
                Reason for Removal (Optional)
              </Label>
              <Input
                id="remove-reason"
                type="text"
                placeholder="e.g. Salon requested removal or switched tier"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddonToRemove(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(addonToRemove.id)}
              >
                {removeMutation.isPending ? 'Removing…' : 'Confirm & Remove'}
              </Button>
            </div>
          </div>
        </SimpleFormDialog>
      )}
    </>
  );
}
