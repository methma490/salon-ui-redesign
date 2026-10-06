import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  subscriptionsApi,
  type FeatureWithAddonPricing,
  type BulkSalonsListItem,
  type BulkPreviewResponse,
  type BulkConfirmResponse,
} from '../api/subscriptions.api';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface BulkAddonAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'SELECT_FEATURE' | 'SELECT_SALONS' | 'CONFIGURE_PRICING' | 'PREVIEW' | 'CONFIRM' | 'RESULTS';

interface CustomPricingState {
  [subscriptionId: string]: {
    mode: 'DEFAULT' | 'CUSTOM';
    customPrice: string;
    customReason: string;
  };
}

export function BulkAddonAssignDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkAddonAssignDialogProps) {
  const [step, setStep] = useState<Step>('SELECT_FEATURE');

  // Step 1: Features
  const [features, setFeatures] = useState<FeatureWithAddonPricing[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('');
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);

  // Step 2: Salons
  const [salonsList, setSalonsList] = useState<BulkSalonsListItem[]>([]);
  const [isLoadingSalons, setIsLoadingSalons] = useState(false);
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<Set<string>>(new Set());

  // Salon Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [billingCycleFilter, setBillingCycleFilter] = useState('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState<'ELIGIBLE_ONLY' | 'ALL'>('ELIGIBLE_ONLY');
  const [featurePriceFilter, setFeaturePriceFilter] = useState<'PRICED_ONLY' | 'ALL'>('ALL');

  // Step 3: Custom Pricing
  const [customPricing, setCustomPricing] = useState<CustomPricingState>({});

  // Step 4: Preview
  const [previewData, setPreviewData] = useState<BulkPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Step 5 & 6: Confirmation & Results
  const [isConfirming, setIsConfirming] = useState(false);
  const [resultsData, setResultsData] = useState<BulkConfirmResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load features on open
  useEffect(() => {
    if (open) {
      setStep('SELECT_FEATURE');
      setSelectedFeatureId('');
      setSelectedSubscriptionIds(new Set());
      setCustomPricing({});
      setPreviewData(null);
      setResultsData(null);
      setErrorMessage(null);
      setEligibilityFilter('ELIGIBLE_ONLY');
      loadFeatures();
    }
  }, [open]);

  const loadFeatures = async () => {
    try {
      setIsLoadingFeatures(true);
      const data = await subscriptionsApi.getAddonFeatures();
      // Sort features so features with configured prices are first
      const sorted = [...(data || [])].sort(
        (a, b) => b.addonPrices.length - a.addonPrices.length || a.name.localeCompare(b.name),
      );
      setFeatures(sorted);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load add-on features.');
    } finally {
      setIsLoadingFeatures(false);
    }
  };

  // Load salons when a feature is selected and moving to Step 2
  const loadSalonsForFeature = async (featureId: string) => {
    try {
      setIsLoadingSalons(true);
      setErrorMessage(null);
      const res = await subscriptionsApi.getBulkAddonSalons({
        featureId,
      });
      setSalonsList(res.salons || []);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load salons for bulk selection.');
    } finally {
      setIsLoadingSalons(false);
    }
  };

  const displayedFeatures = useMemo(() => {
    if (featurePriceFilter === 'PRICED_ONLY') {
      return features.filter((f) => f.addonPrices.length > 0);
    }
    return features;
  }, [features, featurePriceFilter]);

  const selectedFeature = useMemo(
    () => features.find((f) => f.id === selectedFeatureId),
    [features, selectedFeatureId],
  );

  // Filter salons
  const filteredSalons = useMemo(() => {
    return salonsList.filter((s) => {
      const matchSearch =
        !search.trim() ||
        s.salonName.toLowerCase().includes(search.toLowerCase()) ||
        s.tenantCode.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || s.subscriptionStatus === statusFilter;
      const matchCycle = billingCycleFilter === 'ALL' || s.billingCycle === billingCycleFilter;
      const matchEligibility = eligibilityFilter === 'ALL' || s.isEligible;
      return matchSearch && matchStatus && matchCycle && matchEligibility;
    });
  }, [salonsList, search, statusFilter, billingCycleFilter, eligibilityFilter]);

  // Salon selection helpers
  const handleToggleSelectAllEligible = () => {
    const eligibleVisible = filteredSalons.filter((s) => s.isEligible).map((s) => s.subscriptionId);
    const allSelected = eligibleVisible.every((id) => selectedSubscriptionIds.has(id));

    const next = new Set(selectedSubscriptionIds);
    if (allSelected) {
      eligibleVisible.forEach((id) => next.delete(id));
    } else {
      eligibleVisible.forEach((id) => next.add(id));
    }
    setSelectedSubscriptionIds(next);
  };

  const handleToggleSalon = (id: string, eligible: boolean) => {
    if (!eligible) return;
    const next = new Set(selectedSubscriptionIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSubscriptionIds(next);
  };

  // Step 4: Generate Preview
  const handleGeneratePreview = async () => {
    if (!selectedFeatureId || selectedSubscriptionIds.size === 0) return;
    try {
      setIsLoadingPreview(true);
      setErrorMessage(null);

      const salonsPayload = Array.from(selectedSubscriptionIds).map((subId) => {
        const custom = customPricing[subId];
        if (custom && custom.mode === 'CUSTOM') {
          return {
            subscriptionId: subId,
            pricingMode: 'CUSTOM' as const,
            customPrice: parseFloat(custom.customPrice) || 0,
            customReason: custom.customReason || undefined,
          };
        }
        return {
          subscriptionId: subId,
          pricingMode: 'DEFAULT' as const,
        };
      });

      const res = await subscriptionsApi.previewBulkAddons({
        featureId: selectedFeatureId,
        salons: salonsPayload,
      });

      setPreviewData(res);
      setStep('PREVIEW');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to generate billing preview.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Step 5: Confirm Bulk Add-on Creation
  const handleConfirmBulk = async () => {
    if (!selectedFeatureId || !previewData) return;
    try {
      setIsConfirming(true);
      setErrorMessage(null);

      const salonsPayload = Array.from(selectedSubscriptionIds).map((subId) => {
        const custom = customPricing[subId];
        if (custom && custom.mode === 'CUSTOM') {
          return {
            subscriptionId: subId,
            pricingMode: 'CUSTOM' as const,
            customPrice: parseFloat(custom.customPrice) || 0,
            customReason: custom.customReason || undefined,
          };
        }
        return {
          subscriptionId: subId,
          pricingMode: 'DEFAULT' as const,
        };
      });

      const res = await subscriptionsApi.confirmBulkAddons({
        featureId: selectedFeatureId,
        salons: salonsPayload,
      });

      setResultsData(res);
      setStep('RESULTS');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to confirm bulk add-on assignment.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getStatusBadge = (status: BulkSalonsListItem['featureStatus']) => {
    switch (status) {
      case 'ELIGIBLE':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Eligible</Badge>;
      case 'INCLUDED_IN_PLAN':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Base Plan</Badge>;
      case 'ACTIVE_ADDON':
        return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Already Active</Badge>;
      case 'CANCELLATION_SCHEDULED':
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Cancels at Period End</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Payment Pending</Badge>;
      case 'NO_PRICE':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">No Price Set</Badge>;
      case 'SUBSCRIPTION_NOT_ELIGIBLE':
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Suspended / Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/40 bg-muted/20">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sparkles size={18} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Bulk Assign Feature Add-on</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Assign a paid feature to multiple salons with individual prorated invoices & payment links.
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
                Step {step === 'SELECT_FEATURE' ? '1' : step === 'SELECT_SALONS' ? '2' : step === 'CONFIGURE_PRICING' ? '3' : step === 'PREVIEW' ? '4' : step === 'CONFIRM' ? '5' : '6'} of 6
              </Badge>
            </div>
          </DialogHeader>

          {/* Stepper progress indicator */}
          <div className="flex items-center gap-1.5 mt-4 text-[11px] font-medium text-muted-foreground">
            <span className={step === 'SELECT_FEATURE' ? 'text-primary font-semibold' : ''}>1. Feature</span>
            <ChevronRight size={12} />
            <span className={step === 'SELECT_SALONS' ? 'text-primary font-semibold' : ''}>2. Salons</span>
            <ChevronRight size={12} />
            <span className={step === 'CONFIGURE_PRICING' ? 'text-primary font-semibold' : ''}>3. Pricing</span>
            <ChevronRight size={12} />
            <span className={step === 'PREVIEW' ? 'text-primary font-semibold' : ''}>4. Preview</span>
            <ChevronRight size={12} />
            <span className={step === 'CONFIRM' ? 'text-primary font-semibold' : ''}>5. Confirm</span>
            <ChevronRight size={12} />
            <span className={step === 'RESULTS' ? 'text-primary font-semibold' : ''}>6. Results</span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* STEP 1: SELECT FEATURE */}
          {step === 'SELECT_FEATURE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-muted-foreground">
                  Select an active platform feature with add-on pricing to assign to salons.
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFeaturePriceFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      featurePriceFilter === 'ALL'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Features ({features.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeaturePriceFilter('PRICED_ONLY')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      featurePriceFilter === 'PRICED_ONLY'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    With Pricing ({features.filter((f) => f.addonPrices.length > 0).length})
                  </button>
                </div>
              </div>

              {isLoadingFeatures ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                  <Loader2 size={18} className="animate-spin" /> Loading available add-on features...
                </div>
              ) : displayedFeatures.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No active features matching filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayedFeatures.map((feat) => {
                    const isSelected = selectedFeatureId === feat.id;
                    const monthly = feat.addonPrices.find((p) => p.billingCycle === 'MONTHLY')?.price;
                    const yearly = feat.addonPrices.find((p) => p.billingCycle === 'YEARLY')?.price;

                    return (
                      <div
                        key={feat.id}
                        onClick={() => setSelectedFeatureId(feat.id)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                            : 'border-border/60 hover:border-primary/40 bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-sm text-foreground">{feat.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{feat.code}</div>
                          </div>
                          <Badge variant={feat.addonPrices.length > 0 ? "default" : "secondary"} className="text-[10px]">
                            {feat.addonPrices.length} price{feat.addonPrices.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {feat.description && (
                          <div className="text-xs text-muted-foreground mt-2 line-clamp-2">{feat.description}</div>
                        )}
                        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/40 text-[11px]">
                          <div>
                            <span className="text-muted-foreground">Monthly: </span>
                            <span className="font-medium text-foreground">
                              {monthly !== undefined ? `LKR ${Number(monthly).toLocaleString()}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Yearly: </span>
                            <span className="font-medium text-foreground">
                              {yearly !== undefined ? `LKR ${Number(yearly).toLocaleString()}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELECT SALONS */}
          {step === 'SELECT_SALONS' && (
            <div className="space-y-4">
              {/* Feature summary card */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Target Feature:</span>
                  <span className="font-semibold text-foreground">{selectedFeature?.name}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{selectedFeature?.code}</Badge>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>Selected: <strong className="text-primary">{selectedSubscriptionIds.size}</strong></span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={handleToggleSelectAllEligible}
                  >
                    Select All Eligible ({filteredSalons.filter((s) => s.isEligible).length})
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search salon or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
                <Select value={eligibilityFilter} onValueChange={(val: any) => setEligibilityFilter(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Eligibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ELIGIBLE_ONLY">Eligible Only (Not in Plan)</SelectItem>
                    <SelectItem value="ALL">All Salons</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Status: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="TRIAL">TRIAL</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={billingCycleFilter} onValueChange={setBillingCycleFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Cycle: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Cycles</SelectItem>
                    <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                    <SelectItem value="YEARLY">YEARLY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Salons Table */}
              {isLoadingSalons ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                  <Loader2 size={18} className="animate-spin" /> Evaluating salon eligibility...
                </div>
              ) : filteredSalons.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No salons match the selected filters.
                </div>
              ) : (
                <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b border-border/60 text-muted-foreground font-medium">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <Checkbox
                              checked={
                                filteredSalons.filter((s) => s.isEligible).length > 0 &&
                                filteredSalons
                                  .filter((s) => s.isEligible)
                                  .every((s) => selectedSubscriptionIds.has(s.subscriptionId))
                              }
                              onCheckedChange={handleToggleSelectAllEligible}
                            />
                          </th>
                          <th className="p-3">Salon</th>
                          <th className="p-3">Plan & Cycle</th>
                          <th className="p-3">Current Total</th>
                          <th className="p-3">Default Add-on</th>
                          <th className="p-3">Eligibility</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredSalons.map((salon) => {
                          const isSelected = selectedSubscriptionIds.has(salon.subscriptionId);
                          return (
                            <tr
                              key={salon.subscriptionId}
                              onClick={() => handleToggleSalon(salon.subscriptionId, salon.isEligible)}
                              className={`transition-colors cursor-pointer ${
                                isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                              } ${!salon.isEligible ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  disabled={!salon.isEligible}
                                  onCheckedChange={() => handleToggleSalon(salon.subscriptionId, salon.isEligible)}
                                />
                              </td>
                              <td className="p-3 font-medium">
                                <div className="text-foreground font-semibold">{salon.salonName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{salon.tenantCode}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-medium text-foreground">{salon.planName}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {salon.billingCycle} • {salon.subscriptionStatus}
                                </div>
                              </td>
                              <td className="p-3 font-mono font-medium text-foreground">
                                LKR {salon.currentRecurringTotal.toLocaleString()}
                              </td>
                              <td className="p-3 font-mono">
                                {salon.defaultRecurringPrice !== null ? (
                                  <span className="text-foreground font-medium">
                                    LKR {salon.defaultRecurringPrice.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[10px]">No Price</span>
                                )}
                              </td>
                              <td className="p-3">
                                <div>{getStatusBadge(salon.featureStatus)}</div>
                                {salon.featureStatusReason && !salon.isEligible && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate" title={salon.featureStatusReason}>
                                    {salon.featureStatusReason}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CONFIGURE PRICING */}
          {step === 'CONFIGURE_PRICING' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Customize recurring add-on amounts per salon or use the standard default price for each billing cycle.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCustomPricing({})}
                >
                  Reset all to Default
                </Button>
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/80 border-b border-border/60 text-muted-foreground font-medium">
                    <tr>
                      <th className="p-3">Salon</th>
                      <th className="p-3">Cycle</th>
                      <th className="p-3">Pricing Mode</th>
                      <th className="p-3">Recurring Price (LKR)</th>
                      <th className="p-3">Custom Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {Array.from(selectedSubscriptionIds).map((subId) => {
                      const salon = salonsList.find((s) => s.subscriptionId === subId);
                      if (!salon) return null;

                      const custom = customPricing[subId] || {
                        mode: 'DEFAULT',
                        customPrice: salon.defaultRecurringPrice?.toString() || '0',
                        customReason: '',
                      };

                      return (
                        <tr key={subId} className="hover:bg-muted/20">
                          <td className="p-3 font-medium">
                            <div className="text-foreground">{salon.salonName}</div>
                            <div className="text-[10px] text-muted-foreground">{salon.planName}</div>
                          </td>
                          <td className="p-3 font-mono">{salon.billingCycle}</td>
                          <td className="p-3">
                            <Select
                              value={custom.mode}
                              onValueChange={(val: 'DEFAULT' | 'CUSTOM') => {
                                setCustomPricing((prev) => ({
                                  ...prev,
                                  [subId]: {
                                    ...custom,
                                    mode: val,
                                    customPrice:
                                      val === 'CUSTOM'
                                        ? custom.customPrice || salon.defaultRecurringPrice?.toString() || '0'
                                        : salon.defaultRecurringPrice?.toString() || '0',
                                  },
                                }));
                              }}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DEFAULT">Default</SelectItem>
                                <SelectItem value="CUSTOM">Custom Price</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            {custom.mode === 'CUSTOM' ? (
                              <Input
                                type="number"
                                min="0"
                                step="100"
                                value={custom.customPrice}
                                onChange={(e) =>
                                  setCustomPricing((prev) => ({
                                    ...prev,
                                    [subId]: { ...custom, customPrice: e.target.value },
                                  }))
                                }
                                className="h-8 text-xs font-mono w-28"
                              />
                            ) : (
                              <span className="font-mono text-muted-foreground">
                                LKR {salon.defaultRecurringPrice?.toLocaleString() || '0'}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {custom.mode === 'CUSTOM' ? (
                              <Input
                                placeholder="Reason (e.g. VIP discount)"
                                value={custom.customReason}
                                onChange={(e) =>
                                  setCustomPricing((prev) => ({
                                    ...prev,
                                    [subId]: { ...custom, customReason: e.target.value },
                                  }))
                                }
                                className="h-8 text-xs max-w-xs"
                              />
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW */}
          {step === 'PREVIEW' && previewData && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/60 bg-card">
                  <div className="text-[11px] text-muted-foreground">Selected</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">{previewData.summary.totalSelected}</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="text-[11px] text-emerald-600 font-medium">Eligible</div>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">{previewData.summary.eligibleCount}</div>
                </div>
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <div className="text-[11px] text-amber-600 font-medium">Skipped</div>
                  <div className="text-lg font-bold text-amber-600 mt-0.5">{previewData.summary.skippedCount}</div>
                </div>
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="text-[11px] text-primary font-medium">Total Immediate Billing</div>
                  <div className="text-lg font-bold text-primary mt-0.5">
                    LKR {previewData.summary.estimatedTotalImmediateBilling.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="max-h-[340px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b border-border/60 text-muted-foreground font-medium">
                      <tr>
                        <th className="p-3">Salon</th>
                        <th className="p-3">Plan / Cycle</th>
                        <th className="p-3">Price Mode</th>
                        <th className="p-3">Recurring</th>
                        <th className="p-3">Prorated Charge</th>
                        <th className="p-3">Next Renewal</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {previewData.items.map((item) => (
                        <tr key={item.subscriptionId} className="hover:bg-muted/20">
                          <td className="p-3 font-medium">
                            <div className="text-foreground">{item.salonName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{item.tenantCode}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-foreground">{item.planName}</div>
                            <div className="text-[10px] text-muted-foreground">{item.billingCycle}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant={item.pricingMode === 'CUSTOM' ? 'default' : 'outline'} className="text-[10px]">
                              {item.pricingMode}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono font-medium">
                            LKR {item.recurringAmount.toLocaleString()}
                          </td>
                          <td className="p-3 font-mono font-bold text-primary">
                            {item.eligible ? `LKR ${item.proratedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">
                            {item.eligible ? `LKR ${item.projectedRecurringTotal.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3">
                            {item.eligible ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ready</Badge>
                            ) : (
                              <div>
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Skipped</Badge>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{item.reason}</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRM */}
          {step === 'CONFIRM' && previewData && (
            <div className="space-y-4 max-w-xl mx-auto py-4">
              <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">Confirm Bulk Add-on Assignment</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    You are about to issue individual prorated invoices and secure PayHere payment links for the selected salons.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left pt-2">
                  <div className="p-3 rounded-lg bg-card border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Target Feature</div>
                    <div className="font-semibold text-sm text-foreground">{previewData.feature.name}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Eligible Salons</div>
                    <div className="font-semibold text-sm text-emerald-600">{previewData.summary.eligibleCount} of {previewData.summary.totalSelected}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Total Invoiced Amount</div>
                    <div className="font-bold text-sm text-primary">
                      LKR {previewData.summary.estimatedTotalImmediateBilling.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Cycle Breakdown</div>
                    <div className="font-medium text-xs text-foreground">
                      {previewData.summary.monthlyCount} Monthly • {previewData.summary.yearlyCount} Yearly
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-amber-600 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-left flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>
                    Features remain <strong>PENDING PAYMENT</strong> and will not be activated until each salon pays their individual invoice or Super Admin confirms manual payment.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: RESULTS */}
          {step === 'RESULTS' && resultsData && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-600" />
                  <div>
                    <h3 className="font-semibold text-sm text-emerald-900 dark:text-emerald-300">
                      Bulk Add-on Assignment Complete
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {resultsData.summary.pendingPaymentsCount} payment requests created & awaiting salon payment.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">Total Billed</div>
                  <div className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                    LKR {resultsData.summary.totalImmediateBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Results Table */}
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="max-h-[340px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b border-border/60 text-muted-foreground font-medium">
                      <tr>
                        <th className="p-3">Salon</th>
                        <th className="p-3">Invoice</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Payment Link</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {resultsData.results.map((res) => (
                        <tr key={res.subscriptionId} className="hover:bg-muted/20">
                          <td className="p-3 font-medium">
                            <div className="text-foreground">{res.salonName}</div>
                            {res.reason && (
                              <div className="text-[10px] text-muted-foreground">{res.reason}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono font-medium">
                            {res.invoiceNumber || '—'}
                          </td>
                          <td className="p-3 font-mono font-bold text-primary">
                            {res.amount ? `LKR ${res.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="p-3">
                            {res.success ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                PENDING PAYMENT
                              </Badge>
                            ) : res.skipped ? (
                              <Badge className="bg-muted text-muted-foreground">SKIPPED</Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">FAILED</Badge>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-muted-foreground max-w-[200px] truncate">
                            {res.paymentUrl || '—'}
                          </td>
                          <td className="p-3 text-right">
                            {res.paymentUrl && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-2 gap-1"
                                  onClick={() => handleCopyLink(res.paymentUrl!, res.subscriptionId)}
                                >
                                  {copiedId === res.subscriptionId ? (
                                    <>
                                      <CheckCircle2 size={12} className="text-emerald-600" /> Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} /> Copy
                                    </>
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => window.open(res.paymentUrl!, '_blank')}
                                  title="Open payment link"
                                >
                                  <ExternalLink size={13} />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between">
          <div>
            {step !== 'RESULTS' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (step === 'SELECT_FEATURE') onOpenChange(false);
                  else if (step === 'SELECT_SALONS') setStep('SELECT_FEATURE');
                  else if (step === 'CONFIGURE_PRICING') setStep('SELECT_SALONS');
                  else if (step === 'PREVIEW') setStep('CONFIGURE_PRICING');
                  else if (step === 'CONFIRM') setStep('PREVIEW');
                }}
                className="gap-1.5 text-xs"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 'SELECT_FEATURE' && (
              <Button
                type="button"
                size="sm"
                disabled={!selectedFeatureId}
                onClick={() => {
                  loadSalonsForFeature(selectedFeatureId);
                  setStep('SELECT_SALONS');
                }}
                className="gap-1.5 text-xs font-medium"
              >
                Next: Select Salons <ChevronRight size={14} />
              </Button>
            )}

            {step === 'SELECT_SALONS' && (
              <Button
                type="button"
                size="sm"
                disabled={selectedSubscriptionIds.size === 0}
                onClick={() => setStep('CONFIGURE_PRICING')}
                className="gap-1.5 text-xs font-medium"
              >
                Next: Configure Pricing ({selectedSubscriptionIds.size}) <ChevronRight size={14} />
              </Button>
            )}

            {step === 'CONFIGURE_PRICING' && (
              <Button
                type="button"
                size="sm"
                disabled={isLoadingPreview}
                onClick={handleGeneratePreview}
                className="gap-1.5 text-xs font-medium"
              >
                {isLoadingPreview ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Calculating...
                  </>
                ) : (
                  <>
                    Next: Preview Billing <ChevronRight size={14} />
                  </>
                )}
              </Button>
            )}

            {step === 'PREVIEW' && (
              <Button
                type="button"
                size="sm"
                disabled={!previewData || previewData.summary.eligibleCount === 0}
                onClick={() => setStep('CONFIRM')}
                className="gap-1.5 text-xs font-medium"
              >
                Proceed to Confirm <ChevronRight size={14} />
              </Button>
            )}

            {step === 'CONFIRM' && (
              <Button
                type="button"
                size="sm"
                disabled={isConfirming}
                onClick={handleConfirmBulk}
                className="gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isConfirming ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Processing Salons...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Confirm & Generate Invoices
                  </>
                )}
              </Button>
            )}

            {step === 'RESULTS' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs font-medium"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
