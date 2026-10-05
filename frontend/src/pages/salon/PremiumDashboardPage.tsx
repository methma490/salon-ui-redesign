import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  tenantApi,
  type SalonDashboardPeriod,
  type DashboardData,
} from '@/api/tenant.api';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { OpsLoading, OpsError } from './salon-ops-ui';
import { DashboardHeader, type QuickFilterType } from './dashboard/DashboardHeader';
import { SummaryKpiCards } from './dashboard/SummaryKpiCards';
import { PaymentMethodBreakdownCard } from './dashboard/PaymentMethodBreakdownCard';
import { FinancialOverviewChart } from './dashboard/FinancialOverviewChart';
import { AppointmentOverviewCard } from './dashboard/AppointmentOverviewCard';
import { InventoryOverviewCard } from './dashboard/InventoryOverviewCard';
import { EmployeeLoansCard } from './dashboard/EmployeeLoansCard';
import { RecentAppointmentsCard } from './dashboard/RecentAppointmentsCard';
import { RecentTransactionsCard } from './dashboard/RecentTransactionsCard';
import './dashboard/salon-admin-dashboard.css';

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

export default function PremiumDashboardPage() {
  const { branchId } = useSalonBranch();

  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('this_month');
  const [startDate, setStartDate] = useState(getMonthStartStr());
  const [endDate, setEndDate] = useState(getTodayStr());

  // Map quickFilter to backend period parameter
  const period: SalonDashboardPeriod = useMemo(() => {
    if (quickFilter === 'today') return 'today';
    if (quickFilter === 'this_week') return 'week';
    if (quickFilter === 'this_month') return 'month';
    return 'month';
  }, [quickFilter]);

  const handleQuickFilterChange = (filter: QuickFilterType) => {
    setQuickFilter(filter);
    if (filter === 'today') {
      const today = getTodayStr();
      setStartDate(today);
      setEndDate(today);
    } else if (filter === 'this_week') {
      setStartDate(getWeekStartStr());
      setEndDate(getTodayStr());
    } else if (filter === 'this_month') {
      setStartDate(getMonthStartStr());
      setEndDate(getTodayStr());
    }
  };

  const handleStartDateChange = (nextStartDate: string) => {
    setStartDate(nextStartDate);
    if (endDate < nextStartDate) setEndDate(nextStartDate);
  };

  // Fetch tenant enabled features to check if LOANS / PAYROLL is enabled
  const { data: enabledFeatures = [] } = useQuery({
    queryKey: ['tenant-features-list'],
    queryFn: tenantApi.features.listEnabled,
    staleTime: 60_000,
  });

  const isLoansFeatureEnabled = useMemo(() => {
    if (!enabledFeatures || enabledFeatures.length === 0) return true; // Default fallback to visible
    const normalized = enabledFeatures.map((f) => (typeof f === 'string' ? f.toUpperCase() : ''));
    return (
      normalized.includes('PAYROLL') ||
      normalized.includes('LOANS') ||
      normalized.includes('EMPLOYEES') ||
      normalized.includes('ALL')
    );
  }, [enabledFeatures]);

  // Main Dashboard Query
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: [
      'dashboard-comprehensive',
      branchId,
      period,
      ...(quickFilter === 'custom' ? [startDate, endDate] : []),
    ],
    queryFn: () =>
      tenantApi.dashboard.get(
        branchId === 'all' ? undefined : branchId,
        period,
        quickFilter === 'custom' ? startDate : undefined,
        quickFilter === 'custom' ? endDate : undefined,
      ),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <OpsLoading />;
  }

  if (isError) {
    return (
      <OpsError
        message="Failed to load dashboard data. Please try again."
        onRetry={() => void refetch()}
      />
    );
  }

  const dashboardData = data;
  const kpis = dashboardData?.kpis;
  const financials = dashboardData?.financials;
  const appointmentOverview = dashboardData?.appointmentOverview;
  const inventoryOverview = dashboardData?.inventoryOverview;
  const employeeLoans = dashboardData?.employeeLoans;
  const recentTransactions = dashboardData?.recentTransactions;

  // Extract KPI values with 0 fallback
  const revenue = financials?.revenue ?? kpis?.periodRevenue ?? 0;
  const revenueGrowth = financials?.revenueGrowth ?? kpis?.revenueGrowth ?? 0;
  const expenses = financials?.expenses ?? kpis?.expenses ?? 0;
  const expensesGrowth = financials?.expensesGrowth ?? kpis?.expensesGrowth ?? 0;
  const salaries = financials?.salaries ?? kpis?.salaries ?? 0;
  const salariesGrowth = financials?.salariesGrowth ?? kpis?.salariesGrowth ?? 0;
  const netProfit = financials?.netProfit ?? kpis?.netProfit ?? 0;
  const openingBankBalance = financials?.openingBankBalance ?? null;
  const liveBankBalance =
    openingBankBalance === null || branchId !== 'all' ? null : openingBankBalance + netProfit;

  return (
    <div className="dash-container">
      {/* Top Header with Greeting, Branch, and Quick Filters */}
      <DashboardHeader
        quickFilter={quickFilter}
        onQuickFilterChange={handleQuickFilterChange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={setEndDate}
      />

      {/* Row 1: Summary KPI cards */}
      <SummaryKpiCards
        revenue={revenue}
        revenueGrowth={revenueGrowth}
        expenses={expenses}
        expensesGrowth={expensesGrowth}
        salaries={salaries}
        salariesGrowth={salariesGrowth}
        netProfit={netProfit}
        openingBankBalance={openingBankBalance}
        liveBankBalance={liveBankBalance}
      />

      {/* Row 2: Revenue/Expenses/Salaries (60%) & Appointment Overview (40%) */}
      <div className="dash-row-2">
        <FinancialOverviewChart data={financials?.weeklyComparison} />
        <AppointmentOverviewCard data={appointmentOverview} />
      </div>

      <PaymentMethodBreakdownCard
        sales={dashboardData?.paymentMethodBreakdown?.sales}
        expenses={dashboardData?.paymentMethodBreakdown?.expenses}
      />

      {/* Row 3: Inventory and employee loans */}
      <div className="dash-row-3">
        <InventoryOverviewCard data={inventoryOverview} />
        {isLoansFeatureEnabled && <EmployeeLoansCard data={employeeLoans} />}
      </div>

      {/* Row 4: Recent appointments and transactions */}
      <div className="dash-row-4">
        <RecentAppointmentsCard appointments={dashboardData?.upcomingAppointments} />
        <RecentTransactionsCard transactions={recentTransactions} />
      </div>
    </div>
  );
}
