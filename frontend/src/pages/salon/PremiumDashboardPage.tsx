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
import { FinancialOverviewChart } from './dashboard/FinancialOverviewChart';
import { AppointmentOverviewCard } from './dashboard/AppointmentOverviewCard';
import { InventoryOverviewCard } from './dashboard/InventoryOverviewCard';
import { EmployeeLoansCard } from './dashboard/EmployeeLoansCard';
import { RecentAppointmentsCard } from './dashboard/RecentAppointmentsCard';
import { RecentTransactionsCard } from './dashboard/RecentTransactionsCard';
import { PerformanceHighlightsSection } from './dashboard/PerformanceHighlightsSection';
import {
  Top5EmployeesCard,
  Top5CustomersCard,
  Top5ServicesCard,
} from './dashboard/Top5SummaryWidgets';
import './dashboard/salon-admin-dashboard.css';

function getTodayStr() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getMonthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getWeekStartStr() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function PremiumDashboardPage() {
  const { branchId } = useSalonBranch();

  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('this_month');
  const [dashboardPreset, setDashboardPreset] = useState('month');
  const [startDate, setStartDate] = useState(getMonthStartStr());
  const [endDate, setEndDate] = useState(getTodayStr());

  // Map quickFilter to backend period parameter
  const period: SalonDashboardPeriod = useMemo(() => {
    if (quickFilter === 'today') return 'today';
    if (quickFilter === 'this_week') return 'week';
    if (quickFilter === 'this_month') return 'month';
    const rangeDays =
      (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) /
      (24 * 60 * 60 * 1000);
    return rangeDays > 100 ? 'year' : 'month';
  }, [quickFilter, startDate, endDate]);

  const handleQuickFilterChange = (filter: QuickFilterType) => {
    setQuickFilter(filter);
    if (filter !== 'custom') {
      setDashboardPreset(filter === 'this_month' ? 'month' : filter);
    }
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

  const handleEndDateChange = (nextEndDate: string) => {
    setEndDate(nextEndDate);
  };

  const handleDashboardTimeframeChange = (timeframe: string) => {
    setDashboardPreset(timeframe);
    if (timeframe === 'custom') {
      setQuickFilter('custom');
      return;
    }
    const today = new Date();
    let start: Date;
    let end = today;

    if (timeframe === 'today') {
      start = today;
    } else if (timeframe === 'this_week') {
      start = new Date(today);
      start.setDate(start.getDate() - 6);
    } else if (timeframe === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (timeframe === 'quarter') {
      start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    } else if (timeframe === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
    } else {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    setStartDate(formatDateInput(start));
    setEndDate(formatDateInput(end));
    setQuickFilter(timeframe === 'month' ? 'this_month' : timeframe as QuickFilterType);
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

  // Query top customer highlights: GET /tenant/customers/top
  const { data: topCustomersSummary } = useQuery({
    queryKey: ['dashboard-customers-top-summary', period],
    queryFn: () => {
      const presetMap: Record<SalonDashboardPeriod, string> = {
        today: 'today',
        week: 'last_30_days',
        month: 'this_month',
        year: 'all_time',
      };
      return tenantApi.customers.top({ preset: presetMap[period] || 'all_time' });
    },
    staleTime: 60_000,
    retry: 1,
  });

  // Query top 5 customers: GET /tenant/customers/analytics?limit=5&sortBy=totalSpend
  const { data: topCustomersListResponse } = useQuery({
    queryKey: ['dashboard-top5-customers-list', period],
    queryFn: () => {
      const presetMap: Record<SalonDashboardPeriod, string> = {
        today: 'today',
        week: 'last_30_days',
        month: 'this_month',
        year: 'all_time',
      };
      return tenantApi.customers.analytics({
        preset: (presetMap[period] || 'all_time') as any,
        sortBy: 'totalSpend',
        sortOrder: 'desc',
        page: 1,
        limit: 5,
      });
    },
    staleTime: 60_000,
    retry: 1,
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
  const netProfit = financials?.currentNetProfit ?? financials?.netProfit ?? kpis?.netProfit ?? 0;
  const openingBankBalance = financials?.openingBankBalance ?? null;
  const liveBankBalance =
    financials?.currentBankBalance ??
    (openingBankBalance === null
      ? null
      : openingBankBalance + (financials?.currentNetProfit ?? 0));

  // Compute highlights
  const topEmployeesList = dashboardData?.topEmployees ?? [];
  const topEmployeeRevenue = topEmployeesList[0] || null;
  const topEmployeeServices = topEmployeesList.length
    ? [...topEmployeesList].sort((a, b) => b.servicesDone - a.servicesDone)[0]
    : null;

  const topCustomerSpending = topCustomersSummary?.topBySpending?.customer
    ? {
      name: topCustomersSummary.topBySpending.customer.name,
      totalSpend: topCustomersSummary.topBySpending.metric ?? topCustomersSummary.topBySpending.customer.totalSpend ?? 0,
    }
    : null;

  const topCustomerActive = topCustomersSummary?.topByVisits?.customer
    ? {
      name: topCustomersSummary.topByVisits.customer.name,
      visits: topCustomersSummary.topByVisits.metric ?? topCustomersSummary.topByVisits.customer.visitCount ?? 0,
    }
    : topCustomersSummary?.topByServices?.customer
      ? {
        name: topCustomersSummary.topByServices.customer.name,
        servicesTaken: topCustomersSummary.topByServices.metric ?? topCustomersSummary.topByServices.customer.servicesTaken ?? 0,
      }
      : null;

  const top5Customers = topCustomersListResponse?.data ?? [];
  const top5Services = dashboardData?.topServices ?? [];

  return (
    <div className="dash-container">
      {/* Top Header with Greeting, Branch, and Quick Filters */}
      <DashboardHeader
        quickFilter={quickFilter}
        onQuickFilterChange={handleQuickFilterChange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
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
        salesByPaymentMethod={dashboardData?.paymentMethodBreakdown?.sales}
        expensesByPaymentMethod={dashboardData?.paymentMethodBreakdown?.expenses}
      />

      {/* Row 4: Financial overview and inventory */}
      <div className="dash-row-2">
        <FinancialOverviewChart
          data={financials?.weeklyComparison}
          timeframe={dashboardPreset === 'today' || dashboardPreset === 'this_week' ? dashboardPreset : 'month'}
          onTimeframeChange={handleDashboardTimeframeChange}
        />
        <InventoryOverviewCard data={inventoryOverview} />
      </div>

      {/* Appointment overview and employee loans */}
      <div className="dash-row-4">
        <AppointmentOverviewCard
          data={appointmentOverview}
          timeframe={dashboardPreset === 'today' || dashboardPreset === 'this_week' ? dashboardPreset : 'month'}
          onTimeframeChange={handleDashboardTimeframeChange}
        />
        {isLoansFeatureEnabled && <EmployeeLoansCard data={employeeLoans} />}
      </div>

      <PerformanceHighlightsSection
        topEmployeeRevenue={topEmployeeRevenue}
        topEmployeeServices={topEmployeeServices}
        topCustomerSpending={topCustomerSpending}
        topCustomerActive={topCustomerActive}
      />

      <div className="dash-leaders">
        <div className="dash-top5-grid">
          <Top5EmployeesCard employees={topEmployeesList} />
          <Top5CustomersCard customers={top5Customers} />
          <Top5ServicesCard services={top5Services} />
        </div>
      </div>

      {/* Recent appointments and recent transactions */}
      <div className="dash-row-3">
        <RecentAppointmentsCard appointments={dashboardData?.upcomingAppointments} />
        <RecentTransactionsCard transactions={recentTransactions} />
      </div>
    </div>
  );
}
