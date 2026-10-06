import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Edit2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FormError,
  FormSubmit,
  getErrorMessage,
  OpsLoading,
  SimpleForm,
  SimpleFormDialog,
} from '@/pages/salon/salon-ops-ui';
import {
  type FeatureWithAddonPricing,
  subscriptionsApi,
} from '@/features/subscriptions/api/subscriptions.api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageAddonPricingDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [yearlyPrice, setYearlyPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('LKR');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['admin-addon-features'],
    queryFn: subscriptionsApi.getAddonFeatures,
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingFeatureId) return;
      if (monthlyPrice < 0 || yearlyPrice < 0) {
        throw new Error('Prices cannot be negative.');
      }

      await subscriptionsApi.setFeatureAddonPrice(editingFeatureId, {
        billingCycle: 'MONTHLY',
        price: Number(monthlyPrice),
        currency,
        isActive: isAvailable,
      });

      await subscriptionsApi.setFeatureAddonPrice(editingFeatureId, {
        billingCycle: 'YEARLY',
        price: Number(yearlyPrice),
        currency,
        isActive: isAvailable,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-addon-features'] });
      setEditingFeatureId(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const startEdit = (feat: FeatureWithAddonPricing) => {
    setEditingFeatureId(feat.id);
    const m = feat.addonPrices.find((p) => p.billingCycle === 'MONTHLY');
    const y = feat.addonPrices.find((p) => p.billingCycle === 'YEARLY');
    setMonthlyPrice(m ? Number(m.price) : 0);
    setYearlyPrice(y ? Number(y.price) : 0);
    setCurrency(m?.currency || y?.currency || 'LKR');
    setIsAvailable(m ? m.isActive : true);
    setFormError(null);
  };

  return (
    <SimpleFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Feature Add-on Default Pricing"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Configure default monthly and yearly recurring prices for individual modules that can be purchased as add-ons.
        </p>

        {isLoading ? (
          <OpsLoading />
        ) : (
          <div className="divide-y divide-border border rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
            {features.map((feat) => {
              const m = feat.addonPrices.find((p) => p.billingCycle === 'MONTHLY');
              const y = feat.addonPrices.find((p) => p.billingCycle === 'YEARLY');
              const isConfigured = !!(m || y);
              const isEditing = editingFeatureId === feat.id;

              return (
                <div key={feat.id} className="p-3 bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        {feat.name}
                        <span className="text-xs font-mono text-muted-foreground font-normal">
                          ({feat.code})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {feat.description || 'Module available for salon subscriptions'}
                      </div>
                    </div>

                    {!isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        onClick={() => startEdit(feat)}
                      >
                        {isConfigured ? (
                          <>
                            <Edit2 size={12} /> Edit Price
                          </>
                        ) : (
                          <>
                            <Plus size={12} /> Set Price
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="mt-2 flex gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Monthly: </span>
                        <strong className="text-foreground">
                          {m ? `${m.currency} ${Number(m.price).toLocaleString()}` : 'Not set'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Yearly: </span>
                        <strong className="text-foreground">
                          {y ? `${y.currency} ${Number(y.price).toLocaleString()}` : 'Not set'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        <span
                          className={
                            m?.isActive !== false
                              ? 'text-emerald-600 font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {m?.isActive !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <SimpleForm
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveMutation.mutate();
                      }}
                      className="mt-3 pt-3 border-t space-y-3"
                    >
                      <FormError message={formError} />

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="edit-monthly-price" className="text-xs">
                            Monthly Price (LKR)
                          </Label>
                          <Input
                            id="edit-monthly-price"
                            type="number"
                            min={0}
                            value={monthlyPrice}
                            onChange={(e) => setMonthlyPrice(parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-yearly-price" className="text-xs">
                            Yearly Price (LKR)
                          </Label>
                          <Input
                            id="edit-yearly-price"
                            type="number"
                            min={0}
                            value={yearlyPrice}
                            onChange={(e) => setYearlyPrice(parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id="is-available-check"
                          type="checkbox"
                          checked={isAvailable}
                          onChange={(e) => setIsAvailable(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="is-available-check" className="text-xs font-normal">
                          Available as standalone add-on
                        </Label>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingFeatureId(null)}
                          disabled={saveMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <FormSubmit pending={saveMutation.isPending}>Save Pricing</FormSubmit>
                      </div>
                    </SimpleForm>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </SimpleFormDialog>
  );
}
