import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, TrendingUp } from 'lucide-react';
import { salonsApi } from '@/api/axios';
import type { SalonListItem } from '@/features/salons/types/salon.types';
import { salonAnalyticsApi } from '@/features/super-admin/api/salon-analytics.api';
import {
  ProfitLossReportView,
  type PnLQuickFilter,
  type BranchOption,
} from '@/pages/salon/ProfitLossReportView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OpsLoading, OpsError } from '@/pages/salon/salon-ops-ui';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function getWeekStartStr() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

export default function SuperAdminSalonPnLPage() {
  // 1. Fetch Salons for Picker
  const {
    data: salonsData,
    isLoading: salonsLoading,
    isError: salonsError,
  } = useQuery({
    queryKey: ['super-admin-salons-list'],
    queryFn: () => salonsApi.list({ page: 1, limit: 100 }),
    staleTime: 60_000,
  });

  const salons: SalonListItem[] = salonsData?.data ?? [];
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');

  // Auto-select first salon when loaded
  useEffect(() => {
    if (!selectedSalonId && salons.length > 0) {
      setSelectedSalonId(salons[0].id);
    }
  }, [salons, selectedSalonId]);

  // 2. Fetch Branches for selected Salon
  const { data: branches = [] } = useQuery<BranchOption[]>({
    queryKey: ['super-admin-salon-branches', selectedSalonId],
    queryFn: () =>
      selectedSalonId
        ? salonAnalyticsApi.getBranches(selectedSalonId)
        : Promise.resolve([]),
    enabled: Boolean(selectedSalonId),
    staleTime: 30_000,
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  // Reset branch selection when salon changes
  useEffect(() => {
    setSelectedBranchId('all');
  }, [selectedSalonId]);

  // 3. Filter State
  const [quickFilter, setQuickFilter] = useState<PnLQuickFilter>('this_month');
  const [startDate, setStartDate] = useState(getMonthStartStr());
  const [endDate, setEndDate] = useState(getTodayStr());

  const handleQuickFilter = (type: PnLQuickFilter) => {
    setQuickFilter(type);
    const today = getTodayStr();
    if (type === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (type === 'this_week') {
      setStartDate(getWeekStartStr());
      setEndDate(today);
    } else if (type === 'this_month') {
      setStartDate(getMonthStartStr());
      setEndDate(today);
    }
  };

  // 4. Fetch P&L data for Selected Salon
  const {
    data: pnlData,
    isLoading: pnlLoading,
    isError: pnlError,
    error: pnlQueryError,
    refetch: refetchPnl,
  } = useQuery({
    queryKey: [
      'super-admin-salon-pnl',
      selectedSalonId,
      startDate,
      endDate,
      selectedBranchId,
    ],
    queryFn: () =>
      selectedSalonId
        ? salonAnalyticsApi.getSalonProfitLoss(selectedSalonId, {
            from: startDate,
            to: endDate,
            branchId: selectedBranchId === 'all' ? undefined : selectedBranchId,
          })
        : Promise.reject(new Error('No salon selected')),
    enabled: Boolean(selectedSalonId),
    staleTime: 30_000,
  });

  const currentSalon = salons.find((s) => s.id === selectedSalonId);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* HEADER WITH SALON PICKER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700">
            <TrendingUp className="h-4 w-4" />
            <span>Platform Financial Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Salon Profit & Loss Statements
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View isolated, audited financial statements and operating margins per tenant salon.
          </p>
        </div>

        {/* SALON SELECTOR */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm min-w-[280px]">
          <Store className="h-5 w-5 text-purple-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Tenant Salon
            </label>
            <Select
              value={selectedSalonId}
              onValueChange={setSelectedSalonId}
              disabled={salonsLoading || salons.length === 0}
            >
              <SelectTrigger className="h-8 border-none p-0 focus:ring-0 text-xs font-semibold text-slate-900 shadow-none">
                <SelectValue placeholder={salonsLoading ? 'Loading salons...' : 'Select Salon'} />
              </SelectTrigger>
              <SelectContent>
                {salons.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    <span className="font-semibold">{s.name}</span> ({s.code}) &bull;{' '}
                    <span className="text-slate-400">{s.subscription?.planName || s.status}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* SALONS ERROR OR EMPTY */}
      {salonsError && (
        <OpsError message="Failed to load registered salons list" onRetry={() => {}} />
      )}

      {salonsLoading && <OpsLoading />}

      {/* P&L PRESENTATION VIEW */}
      {!salonsLoading && !salonsError && selectedSalonId && (
        <ProfitLossReportView
          data={pnlData}
          isLoading={pnlLoading}
          isError={pnlError}
          error={pnlQueryError}
          refetch={refetchPnl}
          quickFilter={quickFilter}
          onQuickFilterChange={handleQuickFilter}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          branchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          branches={branches}
          salonTitle={currentSalon?.name}
          showPrintButton
        />
      )}
    </div>
  );
}
