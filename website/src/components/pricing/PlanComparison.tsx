'use client';

import { Fragment, useId, useMemo, useState } from 'react';
import {
  Check,
  Minus,
  Plus,
  X,
  Sparkles,
  SlidersHorizontal,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { PublicPlan } from '@/types/plans';
import {
  billingCycleLabel,
  doesFeatureDiffer,
  featureLabel,
  formatPrice,
  getPlanPriceForCycle,
  groupFeaturesByCategory,
  isFeatureIncluded,
} from '@/lib/plans';

type PlanComparisonProps = {
  plans: PublicPlan[];
  billingCycle: 'MONTHLY' | 'YEARLY';
};

export function PlanComparison({ plans, billingCycle }: PlanComparisonProps) {
  const toggleId = useId();

  // Pick default plans when available
  const defaultSelectedIds = useMemo(() => {
    if (plans.length >= 2) {
      return [plans[0].id, plans[1].id];
    }
    if (plans.length === 1) {
      return [plans[0].id];
    }
    return [];
  }, [plans]);

  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>(defaultSelectedIds);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState<boolean>(false);

  // Synchronize if plans change and selected plans are no longer valid
  const validSelectedPlans = useMemo(() => {
    const map = new Map<string, PublicPlan>(plans.map((p) => [p.id, p]));
    const current = selectedPlanIds.map((id) => map.get(id)).filter(Boolean) as PublicPlan[];

    if (current.length >= Math.min(2, plans.length)) {
      return current;
    }
    // Fallback if current selections became invalid
    const fallback = plans.slice(0, Math.min(2, plans.length));
    return fallback;
  }, [plans, selectedPlanIds]);

  // All distinct features across active plans in the catalogue
  const allFeatures = useMemo(() => {
    const featureMap = new Map<string, string>();
    for (const plan of plans) {
      for (const feat of plan.features ?? []) {
        if (!featureMap.has(feat.code)) {
          featureMap.set(feat.code, featureLabel(feat.code, feat.name));
        }
      }
    }
    return Array.from(featureMap.entries()).map(([code, name]) => ({ code, name }));
  }, [plans]);

  // Features to display, respecting "Show Differences Only"
  const displayedFeatures = useMemo(() => {
    if (!showDifferencesOnly || validSelectedPlans.length < 2) {
      return allFeatures;
    }
    return allFeatures.filter((f) => doesFeatureDiffer(validSelectedPlans, f.code));
  }, [allFeatures, showDifferencesOnly, validSelectedPlans]);

  // Group features by category
  const categorizedGroups = useMemo(() => {
    return groupFeaturesByCategory(displayedFeatures);
  }, [displayedFeatures]);

  // Count total differences between selected plans
  const totalDifferencesCount = useMemo(() => {
    if (validSelectedPlans.length < 2) return 0;
    return allFeatures.filter((f) => doesFeatureDiffer(validSelectedPlans, f.code)).length;
  }, [allFeatures, validSelectedPlans]);

  // Slot handlers
  const handleSelectPlan = (index: number, newId: string) => {
    setSelectedPlanIds((prev) => {
      const next = [...validSelectedPlans.map((p) => p.id)];
      next[index] = newId;
      return next;
    });
  };

  const handleAddThirdPlan = () => {
    if (validSelectedPlans.length >= 3 || plans.length < 3) return;
    const selectedSet = new Set(validSelectedPlans.map((p) => p.id));
    const firstUnselected = plans.find((p) => !selectedSet.has(p.id));
    if (firstUnselected) {
      setSelectedPlanIds([...validSelectedPlans.map((p) => p.id), firstUnselected.id]);
    }
  };

  const handleRemoveThirdPlan = () => {
    if (validSelectedPlans.length > 2) {
      setSelectedPlanIds(validSelectedPlans.slice(0, 2).map((p) => p.id));
    }
  };

  if (plans.length === 0) {
    return (
      <div className="rounded-2xl border border-violet-200 dark:border-[#362453] bg-white dark:bg-[#171026] p-8 text-center text-slate-500 dark:text-[#a694be]">
        No plans available right now.
      </div>
    );
  }

  return (
    <div
      id="plan-comparison"
      className="scroll-mt-24 mt-16 sm:mt-20 mx-auto w-full max-w-6xl"
      aria-label="Compare Your Plans"
    >
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 dark:bg-[#24193d] border border-violet-200 dark:border-[#362453] px-3.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 mb-3">
          <SlidersHorizontal className="size-3.5 text-violet-700 dark:text-violet-300" />
          <span>Plan Comparison</span>
        </div>

        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-[#f8f6ff] tracking-tight">
          Compare Plans
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-[#d8cde8]">
          See what each plan includes.
        </p>
      </div>

      {/* Main Comparison Container */}
      <div className="rounded-2xl border border-violet-200 dark:border-[#362453] bg-white dark:bg-[#171026] shadow-sm overflow-hidden">
        {/* Interactive Controls Bar: Plan Selectors & Diff Toggle */}
        <div className="p-4 sm:p-6 border-b border-violet-100 dark:border-[#26183d] bg-violet-50/50 dark:bg-[#1a122c]/90">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Plan Selectors */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <span className="text-xs font-bold text-slate-600 dark:text-[#d8cde8] uppercase tracking-wider hidden sm:inline">
                Compare:
              </span>

              {/* Plan 1 Selector */}
              <div className="relative min-w-[160px] sm:min-w-[190px] flex-1 sm:flex-initial">
                <label htmlFor="compare-plan-1" className="sr-only">
                  Select First Plan
                </label>
                <select
                  id="compare-plan-1"
                  value={validSelectedPlans[0]?.id || ''}
                  onChange={(e) => handleSelectPlan(0, e.target.value)}
                  className="w-full appearance-none rounded-xl border border-violet-200 dark:border-[#422c66] bg-white dark:bg-[#201538] px-3.5 py-2 pr-8 text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#f8f6ff] shadow-2xs hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  {plans.map((p) => {
                    const isSelectedElsewhere =
                      p.id === validSelectedPlans[1]?.id || p.id === validSelectedPlans[2]?.id;
                    return (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={isSelectedElsewhere}
                        className="bg-white dark:bg-[#171026] text-slate-900 dark:text-[#f8f6ff]"
                      >
                        {p.name} {isSelectedElsewhere ? '(Selected)' : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-violet-600 dark:text-violet-400">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* VS Divider */}
              <span className="inline-flex items-center justify-center size-6 rounded-full bg-violet-100 dark:bg-violet-950/70 border border-violet-200 dark:border-violet-800 text-[10px] font-extrabold text-violet-700 dark:text-violet-300 shrink-0">
                vs
              </span>

              {/* Plan 2 Selector */}
              {validSelectedPlans.length >= 2 ? (
                <div className="relative min-w-[160px] sm:min-w-[190px] flex-1 sm:flex-initial">
                  <label htmlFor="compare-plan-2" className="sr-only">
                    Select Second Plan
                  </label>
                  <select
                    id="compare-plan-2"
                    value={validSelectedPlans[1]?.id || ''}
                    onChange={(e) => handleSelectPlan(1, e.target.value)}
                    className="w-full appearance-none rounded-xl border border-violet-200 dark:border-[#422c66] bg-white dark:bg-[#201538] px-3.5 py-2 pr-8 text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#f8f6ff] shadow-2xs hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    {plans.map((p) => {
                      const isSelectedElsewhere =
                        p.id === validSelectedPlans[0]?.id || p.id === validSelectedPlans[2]?.id;
                      return (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={isSelectedElsewhere}
                          className="bg-white dark:bg-[#171026] text-slate-900 dark:text-[#f8f6ff]"
                        >
                          {p.name} {isSelectedElsewhere ? '(Selected)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-violet-600 dark:text-violet-400">
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No secondary plan configured</span>
              )}

              {/* Optional Plan 3 Selector */}
              {validSelectedPlans.length === 3 ? (
                <>
                  <span className="inline-flex items-center justify-center size-6 rounded-full bg-violet-100 dark:bg-violet-950/70 border border-violet-200 dark:border-violet-800 text-[10px] font-extrabold text-violet-700 dark:text-violet-300 shrink-0">
                    vs
                  </span>
                  <div className="relative min-w-[160px] sm:min-w-[190px] flex-1 sm:flex-initial flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <label htmlFor="compare-plan-3" className="sr-only">
                        Select Third Plan
                      </label>
                      <select
                        id="compare-plan-3"
                        value={validSelectedPlans[2]?.id || ''}
                        onChange={(e) => handleSelectPlan(2, e.target.value)}
                        className="w-full appearance-none rounded-xl border border-violet-200 dark:border-[#422c66] bg-white dark:bg-[#201538] px-3.5 py-2 pr-8 text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#f8f6ff] shadow-2xs hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                      >
                        {plans.map((p) => {
                          const isSelectedElsewhere =
                            p.id === validSelectedPlans[0]?.id || p.id === validSelectedPlans[1]?.id;
                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={isSelectedElsewhere}
                              className="bg-white dark:bg-[#171026] text-slate-900 dark:text-[#f8f6ff]"
                            >
                              {p.name} {isSelectedElsewhere ? '(Selected)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-violet-600 dark:text-violet-400">
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveThirdPlan}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#201538] text-slate-500 hover:text-red-600 hover:border-red-300 dark:hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove third plan"
                      aria-label="Remove third plan from comparison"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </>
              ) : (
                plans.length >= 3 && (
                  <button
                    type="button"
                    onClick={handleAddThirdPlan}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/70 dark:bg-violet-950/40 px-3.5 py-2 text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Plan</span>
                  </button>
                )
              )}
            </div>

            {/* Differences Toggle Control */}
            <div className="flex items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-violet-100 dark:border-[#26183d]">
              <label
                htmlFor={toggleId}
                className="inline-flex items-center gap-2.5 cursor-pointer select-none text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#d8cde8]"
              >
                <div className="relative">
                  <input
                    id={toggleId}
                    type="checkbox"
                    checked={showDifferencesOnly}
                    onChange={(e) => setShowDifferencesOnly(e.target.checked)}
                    className="sr-only peer"
                    role="switch"
                    aria-checked={showDifferencesOnly}
                  />
                  <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-700" />
                </div>
                <span>Differences only</span>
                {validSelectedPlans.length >= 2 && (
                  <span className="rounded-full bg-violet-100 dark:bg-[#2b1c47] px-2 py-0.5 text-[10px] font-bold text-violet-800 dark:text-violet-300">
                    {totalDifferencesCount}
                  </span>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Swipe hint for small screens */}
        <p className="sm:hidden text-center text-[11px] text-slate-400 dark:text-[#a694be] font-medium py-2 bg-slate-50 dark:bg-[#120b1f] border-b border-violet-100 dark:border-[#26183d]">
          Swipe to compare plans →
        </p>

        {/* Feature Comparison Table */}
        <div className="overflow-x-auto w-full">
          <table
            className="w-full text-left border-collapse"
            style={{ minWidth: `${Math.max(540, 240 + validSelectedPlans.length * 200)}px` }}
          >
            {/* Table Header: Plan Name, Price, and CTA Button */}
            <thead>
              <tr className="border-b border-violet-200 dark:border-[#362453] bg-violet-50/70 dark:bg-[#1f1633]">
                <th className="py-4 px-4 sm:px-6 text-xs font-bold text-slate-700 dark:text-[#d8cde8] uppercase tracking-wider w-[36%] sm:w-[32%] sticky left-0 bg-violet-50/90 dark:bg-[#1f1633] z-10 shadow-r">
                  Features &amp; Modules
                </th>

                {validSelectedPlans.map((plan) => {
                  const pricing = getPlanPriceForCycle(plan, billingCycle);
                  const amount = pricing?.amount ?? plan.price;
                  const currency = pricing?.currency ?? plan.currency;

                  return (
                    <th
                      key={plan.id}
                      className="py-4 px-4 text-center bg-violet-100/40 dark:bg-[#24193d]/80 border-l border-violet-100 dark:border-[#26183d] min-w-[180px]"
                    >
                      <div className="flex flex-col items-center">
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#f8f6ff]">
                          {plan.name}
                        </h4>

                        {/* Live Price for Billing Cycle */}
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#f8f6ff]">
                            {formatPrice(amount, currency)}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-[#a694be]">
                            /{billingCycleLabel(billingCycle)}
                          </span>
                        </div>

                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body: Grouped by Category */}
            <tbody className="divide-y divide-violet-100 dark:divide-[#26183d] text-xs sm:text-sm">
              {categorizedGroups.map((group) => (
                <Fragment key={`group-${group.id}`}>
                  {/* Category Header Row */}
                  <tr className="bg-slate-100/70 dark:bg-[#1a122c] border-y border-violet-100 dark:border-[#26183d]">
                    <td
                      colSpan={validSelectedPlans.length + 1}
                      className="py-2.5 px-4 sm:px-6 text-[11px] font-extrabold uppercase tracking-wider text-violet-800 dark:text-violet-300"
                    >
                      {group.name}
                    </td>
                  </tr>

                  {/* Feature Rows */}
                  {group.features.map((feat) => {
                    const isDiff = doesFeatureDiffer(validSelectedPlans, feat.code);

                    return (
                      <tr
                        key={feat.code}
                        className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-[#1f1633]/60 ${
                          isDiff
                            ? 'bg-violet-50/30 dark:bg-violet-950/20'
                            : ''
                        }`}
                      >
                        {/* Feature Label (Sticky on horizontal scroll) */}
                        <td className="py-3 px-4 sm:px-6 font-medium text-slate-900 dark:text-[#f8f6ff] sticky left-0 bg-white dark:bg-[#171026] z-10 shadow-r">
                          <div className="flex items-center gap-2">
                            <span>{feat.name}</span>
                            {isDiff && (
                              <span
                                className="hidden sm:inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.2 text-[9px] font-bold"
                                title="Feature availability differs between selected plans"
                              >
                                Difference
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Included / Not Included indicators per selected plan */}
                        {validSelectedPlans.map((plan) => {
                          const included = isFeatureIncluded(plan, feat.code);

                          return (
                            <td
                              key={`${plan.id}-${feat.code}`}
                              className="py-3 px-3 sm:px-4 text-center border-l border-violet-100 dark:border-[#26183d]"
                            >
                              {included ? (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-full text-xs">
                                  <Check className="size-3.5 stroke-[2.5]" aria-hidden />
                                  <span>Included</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-400 dark:text-slate-500 text-xs">
                                  <Minus className="size-3.5" aria-hidden />
                                  <span>Not included</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}

              {/* Empty state when differences only yields zero rows */}
              {displayedFeatures.length === 0 && (
                <tr>
                  <td
                    colSpan={validSelectedPlans.length + 1}
                    className="py-12 px-6 text-center text-slate-600 dark:text-[#d8cde8]"
                  >
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <div className="size-12 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-300 mb-3">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <h5 className="font-bold text-slate-900 dark:text-[#f8f6ff] text-base">
                        No Differences Between Selected Plans
                      </h5>
                      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-[#a694be]">
                        All features are identical across your currently chosen plans. Toggle off
                        Turn off “Differences only” to see all features.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowDifferencesOnly(false)}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/50 px-4 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 cursor-pointer transition-colors"
                      >
                        <Sparkles className="size-3.5" />
                        <span>View all features</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
