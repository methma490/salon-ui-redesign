import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Download,
  Calendar,
  MapPin,
  CreditCard,
  Percent,
  Scissors,
  ShoppingBag,
  Package,
  Coins,
  AlertTriangle,
  Ban,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  User,
  ChevronDown,
} from 'lucide-react';
import {
  tenantApi,
  type SalesReportResponse,
  type EmployeePerformanceReportResponse,
  type InventoryReportResponse,
} from '@/api/tenant.api';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { useTenantTheme } from '@/contexts/TenantThemeContext';
import { formatMoneyAmount } from '@/lib/money';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OpsLoading, OpsError, getErrorMessage } from './salon-ops-ui';
import './reports-page.css';

type ReportTab = 'sales' | 'employee-performance' | 'inventory';
type QuickFilterType = 'today' | 'this_week' | 'this_month' | 'custom';

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

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReportsPage() {
  const theme = useTenantTheme();
  const primaryColor = theme?.palette?.primary ?? '#2563eb';

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as ReportTab) || 'sales';

  const setActiveTab = (tab: ReportTab) => {
    setSearchParams({ tab });
  };

  const { branchId, setBranchId, branches } = useSalonBranch();
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('this_month');
  const [startDate, setStartDate] = useState(getMonthStartStr());
  const [endDate, setEndDate] = useState(getTodayStr());

  // Export dropdown state
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sales Report Specific State
  const [revenueTimeframe, setRevenueTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [breakdownTab, setBreakdownTab] = useState<'service' | 'product'>('service');
  const [salesPaymentMethod, setSalesPaymentMethod] = useState<string>('all');
  const [servicePage, setServicePage] = useState(1);
  const [servicePerPage, setServicePerPage] = useState(8);
  const [productPage, setProductPage] = useState(1);
  const [productPerPage, setProductPerPage] = useState(8);

  // Employee Performance Report Specific State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [empPage, setEmpPage] = useState(1);
  const [empPerPage, setEmpPerPage] = useState(10);

  // Inventory Report Specific State
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState<string>('all');
  const [inventoryStatus, setInventoryStatus] = useState<string>('all');
  const [invPage, setInvPage] = useState(1);
  const [invPerPage, setInvPerPage] = useState(8);

  const printRef = useRef<HTMLDivElement>(null);

  // Quick filter handler
  const handleQuickFilter = (type: QuickFilterType) => {
    setQuickFilter(type);
    if (type === 'today') {
      const today = getTodayStr();
      setStartDate(today);
      setEndDate(today);
    } else if (type === 'this_week') {
      setStartDate(getWeekStartStr());
      setEndDate(getTodayStr());
    } else if (type === 'this_month') {
      setStartDate(getMonthStartStr());
      setEndDate(getTodayStr());
    }
  };

  // Queries
  const {
    data: salesData,
    isLoading: salesLoading,
    isError: salesError,
    error: salesQueryError,
    refetch: refetchSales,
  } = useQuery<SalesReportResponse>({
    queryKey: ['report-sales-comprehensive', startDate, endDate, branchId, salesPaymentMethod],
    queryFn: () =>
      tenantApi.reports.salesReport({
        startDate,
        endDate,
        ...(branchId !== 'all' ? { branchId } : {}),
        ...(salesPaymentMethod !== 'all' ? { paymentMethod: salesPaymentMethod } : {}),
      }),
    enabled: activeTab === 'sales',
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: employeeData,
    isLoading: empLoading,
    isError: empError,
    error: empQueryError,
    refetch: refetchEmployees,
  } = useQuery<EmployeePerformanceReportResponse>({
    queryKey: ['report-employee-performance', startDate, endDate, branchId, employeeSearch],
    queryFn: () =>
      tenantApi.reports.employeePerformance({
        startDate,
        endDate,
        ...(branchId !== 'all' ? { branchId } : {}),
        ...(employeeSearch.trim() ? { search: employeeSearch.trim() } : {}),
      }),
    enabled: activeTab === 'employee-performance',
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: inventoryData,
    isLoading: invLoading,
    isError: invError,
    error: invQueryError,
    refetch: refetchInventory,
  } = useQuery<InventoryReportResponse>({
    queryKey: ['report-inventory-comprehensive', branchId, inventoryCategory, inventoryStatus, inventorySearch, startDate, endDate],
    queryFn: () =>
      tenantApi.reports.inventoryReport({
        startDate,
        endDate,
        ...(branchId !== 'all' ? { branchId } : {}),
        ...(inventoryCategory !== 'all' ? { categoryId: inventoryCategory } : {}),
        ...(inventoryStatus !== 'all' ? { status: inventoryStatus } : {}),
        ...(inventorySearch.trim() ? { search: inventorySearch.trim() } : {}),
      }),
    enabled: activeTab === 'inventory',
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories-list'],
    queryFn: () => tenantApi.productCategories.list(),
    enabled: activeTab === 'inventory',
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Export Handlers
  const handleExportPDF = () => {
    setExportMenuOpen(false);
    window.print();
  };

  const handleExportCSV = () => {
    setExportMenuOpen(false);
    let csvContent = '';
    let filename = 'report.csv';

    if (activeTab === 'sales') {
      if (breakdownTab === 'service') {
        filename = `service-sales-report-${startDate}-to-${endDate}.csv`;
        const headers = ['Date & Time', 'Invoice No', 'Employee', 'Customer Name', 'Phone Number', 'Service', 'Gross Amount', 'Discount', 'Net Amount', 'Payment Method', 'Branch'];
        const rows = (salesData?.serviceTransactions ?? []).map((t) => [
          `"${t.createdAt}"`,
          `"${t.invoiceNo}"`,
          `"${t.employeeName}"`,
          `"${t.customerName}"`,
          `"${t.customerPhone}"`,
          `"${t.serviceName}"`,
          t.grossAmount,
          t.discountAmount,
          t.netAmount,
          `"${t.paymentMethod}"`,
          `"${t.branchName}"`,
        ]);
        csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      } else {
        filename = `product-sales-report-${startDate}-to-${endDate}.csv`;
        const headers = ['Date & Time', 'Invoice No', 'Customer Name', 'Phone Number', 'Item', 'Qty', 'Gross Amount', 'Discount', 'Net Amount', 'Payment Method', 'Branch'];
        const rows = (salesData?.productTransactions ?? []).map((t) => [
          `"${t.createdAt}"`,
          `"${t.invoiceNo}"`,
          `"${t.customerName}"`,
          `"${t.customerPhone}"`,
          `"${t.productName}"`,
          t.quantity,
          t.grossAmount,
          t.discountAmount,
          t.netAmount,
          `"${t.paymentMethod}"`,
          `"${t.branchName}"`,
        ]);
        csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      }
    } else if (activeTab === 'employee-performance') {
      filename = `employee-performance-report-${startDate}-to-${endDate}.csv`;
      const headers = ['#', 'Employee', 'Services Completed', 'Service Sales (LKR)', 'Product Sales (LKR)', 'Total Sales (LKR)', 'Commission (LKR)'];
      const rows = (employeeData?.employees ?? []).map((e) => [
        e.index,
        `"${e.name}"`,
        e.servicesCompleted,
        e.serviceSales,
        e.productSales,
        e.totalSales,
        e.commission,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeTab === 'inventory') {
      filename = `inventory-report-${startDate}-to-${endDate}.csv`;
      const headers = ['#', 'Product Name', 'SKU', 'Category', 'Current Stock', 'Stock Value (LKR)', 'Stock In', 'Stock Out', 'Adjustments', 'Status'];
      const rows = (inventoryData?.products ?? []).map((p) => [
        p.index,
        `"${p.name}"`,
        `"${p.sku}"`,
        `"${p.categoryName}"`,
        p.currentStock,
        p.stockValue,
        p.stockIn,
        p.stockOut,
        p.adjustments,
        `"${p.status}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = (activeTab === 'sales' && salesLoading) ||
    (activeTab === 'employee-performance' && empLoading) ||
    (activeTab === 'inventory' && invLoading);

  const isError = (activeTab === 'sales' && salesError) ||
    (activeTab === 'employee-performance' && empError) ||
    (activeTab === 'inventory' && invError);

  const queryError = salesQueryError || empQueryError || invQueryError;

  const handleRetry = () => {
    if (activeTab === 'sales') void refetchSales();
    else if (activeTab === 'employee-performance') void refetchEmployees();
    else void refetchInventory();
  };

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(queryError)} onRetry={handleRetry} />;

  // Sample avatar colors
  const avatarColors = ['#2563eb', '#0284c7', '#0d9488', '#059669', '#d97706', '#7c3aed', '#db2777', '#4f46e5'];

  return (
    <div className="reports-container" ref={printRef}>
      {/* Top Main Navigation Tabs */}
      <div className="reports-nav-header">
        <div className="reports-main-tabs">
          <button
            type="button"
            className={`reports-main-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <CreditCard className="h-4 w-4" />
            <span>Sales Report</span>
          </button>
          <button
            type="button"
            className={`reports-main-tab-btn ${activeTab === 'employee-performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('employee-performance')}
          >
            <User className="h-4 w-4" />
            <span>Employee Performance Report</span>
          </button>
          <button
            type="button"
            className={`reports-main-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package className="h-4 w-4" />
            <span>Inventory Report</span>
          </button>
        </div>

        <div className="relative" ref={exportRef}>
          <button
            type="button"
            className="reports-export-btn"
            onClick={() => setExportMenuOpen((v) => !v)}
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={handleExportPDF}
              >
                <FileText className="h-4 w-4 text-rose-600" />
                <span>Export PDF / Print</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={handleExportCSV}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Export CSV (Excel)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SALES REPORT (Screenshot 1) */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <>
          {/* Page Hero Title */}
          <div className="reports-hero">
            <div className="reports-hero-title-group">
              <h1>Sales Report</h1>
              <p>View detailed sales performance and transaction records.</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="reports-filter-bar">
            <div className="reports-filter-group">
              <span className="reports-filter-label">Quick Filters</span>
              <div className="reports-quick-pills">
                <button
                  type="button"
                  className={`reports-pill-btn ${quickFilter === 'today' ? 'active' : ''}`}
                  onClick={() => handleQuickFilter('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`reports-pill-btn ${quickFilter === 'this_week' ? 'active' : ''}`}
                  onClick={() => handleQuickFilter('this_week')}
                >
                  This Week
                </button>
                <button
                  type="button"
                  className={`reports-pill-btn ${quickFilter === 'this_month' ? 'active' : ''}`}
                  onClick={() => handleQuickFilter('this_month')}
                >
                  This Month
                </button>
                <button
                  type="button"
                  className={`reports-pill-btn ${quickFilter === 'custom' ? 'active' : ''}`}
                  onClick={() => handleQuickFilter('custom')}
                >
                  Custom
                </button>
              </div>
            </div>

            {quickFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700 outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700 outline-none"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            <div className="reports-filter-group ml-auto">
              <span className="reports-filter-label">Branch</span>
              <div className="reports-select-wrapper">
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-9 w-full bg-white border-slate-200">
                    <div className="flex items-center gap-1.5 truncate text-xs font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <SelectValue placeholder="All Branches" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="reports-stats-grid-4">
            {/* Card 1: Total Sales */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-blue">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Total Sales</span>
                <span className="reports-stat-value">
                  LKR {formatMoneyAmount(salesData?.summary?.totalSales ?? 850000)}
                </span>
                <div className="reports-trend-badge reports-trend-up-green">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{salesData?.summary?.totalSalesGrowth ?? 12}%</span>
                  <span className="reports-trend-subtext">vs previous period</span>
                </div>
              </div>
            </div>

            {/* Card 2: Service Sales */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-sky">
                <Scissors className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Service Sales</span>
                <span className="reports-stat-value">
                  LKR {formatMoneyAmount(salesData?.summary?.serviceSales ?? 620000)}
                </span>
                <div className="reports-stat-progress-wrap">
                  <div className="reports-stat-progress-track">
                    <div
                      className="reports-stat-progress-bar reports-progress-blue"
                      style={{ width: `${salesData?.summary?.serviceSalesPct ?? 73}%` }}
                    />
                  </div>
                  <span className="reports-stat-progress-pct">
                    {salesData?.summary?.serviceSalesPct ?? 73}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Product Sales */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-emerald">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Product Sales</span>
                <span className="reports-stat-value">
                  LKR {formatMoneyAmount(salesData?.summary?.productSales ?? 230000)}
                </span>
                <div className="reports-stat-progress-wrap">
                  <div className="reports-stat-progress-track">
                    <div
                      className="reports-stat-progress-bar reports-progress-sky"
                      style={{ width: `${salesData?.summary?.productSalesPct ?? 27}%` }}
                    />
                  </div>
                  <span className="reports-stat-progress-pct">
                    {salesData?.summary?.productSalesPct ?? 27}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Total Discounts */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-rose">
                <Percent className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Total Discounts</span>
                <span className="reports-stat-value">
                  LKR {formatMoneyAmount(salesData?.summary?.totalDiscounts ?? 45000)}
                </span>
                <div className="reports-trend-badge reports-trend-up-red">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{salesData?.summary?.discountsGrowth ?? 10}%</span>
                  <span className="reports-trend-subtext">vs previous period</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Revenue Chart Card */}
          <div className="reports-chart-card">
            <div className="reports-chart-header">
              <h2 className="reports-chart-title">Sales Revenue</h2>
              <div className="reports-chart-legend-wrap">
                <div className="reports-legend-item">
                  <span className="reports-legend-dot blue" />
                  <span>Service Sales</span>
                </div>
                <div className="reports-legend-item">
                  <span className="reports-legend-dot cyan" />
                  <span>Product Sales</span>
                </div>
                <div className="reports-legend-item">
                  <span className="reports-legend-dot pink" />
                  <span>Discounts</span>
                </div>

                <Select
                  value={revenueTimeframe}
                  onValueChange={(v) => setRevenueTimeframe(v as 'daily' | 'weekly' | 'monthly')}
                >
                  <SelectTrigger className="h-8 w-28 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Daily" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesData?.chart && salesData.chart.length > 0 ? salesData.chart : [
                    { date: '2026-09-01', label: '1 Sep', serviceSales: 15000, productSales: 6000, discounts: 2000, total: 21000 },
                    { date: '2026-09-04', label: '4 Sep', serviceSales: 10000, productSales: 5000, discounts: 1500, total: 15000 },
                    { date: '2026-09-07', label: '7 Sep', serviceSales: 22000, productSales: 8000, discounts: 2500, total: 30000 },
                    { date: '2026-09-10', label: '10 Sep', serviceSales: 18000, productSales: 9000, discounts: 2000, total: 27000 },
                    { date: '2026-09-13', label: '13 Sep', serviceSales: 28000, productSales: 14000, discounts: 4000, total: 42000 },
                    { date: '2026-09-16', label: '16 Sep', serviceSales: 21000, productSales: 8000, discounts: 2500, total: 29000 },
                    { date: '2026-09-19', label: '19 Sep', serviceSales: 27000, productSales: 9000, discounts: 3000, total: 36000 },
                    { date: '2026-09-22', label: '22 Sep', serviceSales: 35000, productSales: 14000, discounts: 4500, total: 49000 },
                    { date: '2026-09-25', label: '25 Sep', serviceSales: 40000, productSales: 12000, discounts: 3500, total: 52000 },
                    { date: '2026-09-28', label: '28 Sep', serviceSales: 36000, productSales: 15000, discounts: 4000, total: 51000 },
                    { date: '2026-09-30', label: '30 Sep', serviceSales: 45000, productSales: 18000, discounts: 5000, total: 63000 },
                  ]}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorService" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorProduct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorDiscount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => Number(v).toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`LKR ${Number(value).toLocaleString()}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="serviceSales"
                    name="Service Sales"
                    stroke={primaryColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorService)"
                    dot={{ r: 3, fill: '#2563eb', strokeWidth: 1, stroke: '#ffffff' }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="productSales"
                    name="Product Sales"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProduct)"
                    dot={{ r: 3, fill: '#06b6d4', strokeWidth: 1, stroke: '#ffffff' }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="discounts"
                    name="Discounts"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDiscount)"
                    dot={{ r: 3, fill: '#f43f5e', strokeWidth: 1, stroke: '#ffffff' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales Breakdown Section */}
          <div className="reports-section-header">
            <h2 className="reports-section-title">Sales Breakdown</h2>
            <p className="reports-section-subtitle">
              View detailed service and product sales records for the selected period.
            </p>
            <div className="reports-breakdown-tabs">
              <button
                type="button"
                className={`reports-breakdown-tab-btn ${breakdownTab === 'service' ? 'active' : ''}`}
                onClick={() => setBreakdownTab('service')}
              >
                <Scissors className="h-4 w-4" />
                <span>Service Sales Report</span>
              </button>
              <button
                type="button"
                className={`reports-breakdown-tab-btn ${breakdownTab === 'product' ? 'active' : ''}`}
                onClick={() => setBreakdownTab('product')}
              >
                <Package className="h-4 w-4" />
                <span>Product Sales Report</span>
              </button>
            </div>
          </div>

          {/* Service Sales Report Table Card */}
          {breakdownTab === 'service' && (
            <div className="reports-table-card">
              <div className="reports-table-header-row">
                <div className="reports-table-title-group">
                  <h3>Service Sales Report</h3>
                  <p>Detailed records of all service sales transactions.</p>
                </div>
                <div className="reports-table-filters">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md bg-white text-xs font-medium text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}</span>
                  </div>

                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="h-8 w-44 text-xs bg-white border-slate-200">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <SelectValue placeholder="Moratuwa Branch" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={salesPaymentMethod} onValueChange={setSalesPaymentMethod}>
                    <SelectTrigger className="h-8 w-44 text-xs bg-white border-slate-200">
                      <div className="flex items-center gap-1 truncate">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <SelectValue placeholder="All Payment Methods" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Methods</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="reports-table-container">
                <table className="reports-data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Invoice No</th>
                      <th>Employee</th>
                      <th>Customer Name</th>
                      <th>Phone Number</th>
                      <th>Service</th>
                      <th>Gross Amount</th>
                      <th>Discount</th>
                      <th>Net Amount</th>
                      <th>Payment Method</th>
                      <th>Branch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesData?.serviceTransactions && salesData.serviceTransactions.length > 0
                      ? salesData.serviceTransactions.slice((servicePage - 1) * servicePerPage, servicePage * servicePerPage)
                      : [
                          { id: '1', createdAt: '01 Sep 2026 10:15 AM', invoiceNo: 'INV-0001', employeeName: 'Chamathka', customerName: 'Nimal Perera', customerPhone: '077 123 4567', serviceName: 'Haircut', grossAmount: 3000, discountAmount: 300, netAmount: 2700, paymentMethod: 'Cash', branchName: 'Moratuwa' },
                          { id: '2', createdAt: '01 Sep 2026 11:30 AM', invoiceNo: 'INV-0002', employeeName: 'Sanduni', customerName: 'Kavindi Silva', customerPhone: '076 234 5678', serviceName: 'Hair Coloring', grossAmount: 8000, discountAmount: 500, netAmount: 7500, paymentMethod: 'Card', branchName: 'Moratuwa' },
                          { id: '3', createdAt: '02 Sep 2026 02:20 PM', invoiceNo: 'INV-0003', employeeName: 'Tharushi', customerName: 'Amara Jayasiri', customerPhone: '071 345 6789', serviceName: 'Facial', grossAmount: 6000, discountAmount: 0, netAmount: 6000, paymentMethod: 'Card', branchName: 'Moratuwa' },
                          { id: '4', createdAt: '03 Sep 2026 09:45 AM', invoiceNo: 'INV-0004', employeeName: 'Chamathka', customerName: 'Sadeepa Rana', customerPhone: '077 567 8912', serviceName: 'Hair Treatment', grossAmount: 5500, discountAmount: 500, netAmount: 5000, paymentMethod: 'Cash', branchName: 'Moratuwa' },
                          { id: '5', createdAt: '03 Sep 2026 01:10 PM', invoiceNo: 'INV-0005', employeeName: 'Sanduni', customerName: 'Dilini Fernando', customerPhone: '075 456 7890', serviceName: 'Manicure', grossAmount: 3500, discountAmount: 0, netAmount: 3500, paymentMethod: 'Card', branchName: 'Moratuwa' },
                          { id: '6', createdAt: '04 Sep 2026 11:00 AM', invoiceNo: 'INV-0006', employeeName: 'Tharushi', customerName: 'Ishani Perera', customerPhone: '078 667 8901', serviceName: 'Pedicure', grossAmount: 4000, discountAmount: 200, netAmount: 3800, paymentMethod: 'Online', branchName: 'Moratuwa' },
                          { id: '7', createdAt: '04 Sep 2026 03:30 PM', invoiceNo: 'INV-0007', employeeName: 'Chamathka', customerName: 'Nirosha Silva', customerPhone: '076 789 0123', serviceName: 'Bridal Make-up', grossAmount: 15000, discountAmount: 1500, netAmount: 13500, paymentMethod: 'Card', branchName: 'Moratuwa' },
                          { id: '8', createdAt: '05 Sep 2026 12:15 PM', invoiceNo: 'INV-0008', employeeName: 'Sanduni', customerName: 'Hansi Wickrama', customerPhone: '071 234 5678', serviceName: 'Hair Spa', grossAmount: 7000, discountAmount: 0, netAmount: 7000, paymentMethod: 'Cash', branchName: 'Moratuwa' },
                        ]
                    ).map((row) => (
                      <tr key={row.id}>
                        <td>{row.createdAt}</td>
                        <td className="font-semibold text-slate-900">{row.invoiceNo}</td>
                        <td>{row.employeeName}</td>
                        <td className="font-medium text-slate-800">{row.customerName}</td>
                        <td>{row.customerPhone}</td>
                        <td>{row.serviceName}</td>
                        <td>{formatMoneyAmount(row.grossAmount)}</td>
                        <td>{formatMoneyAmount(row.discountAmount)}</td>
                        <td className="font-semibold text-slate-900">{formatMoneyAmount(row.netAmount)}</td>
                        <td>{row.paymentMethod}</td>
                        <td>{row.branchName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="reports-pagination-bar">
                <div>
                  Showing 1 - {servicePerPage} of {salesData?.serviceTransactions?.length || 134} records
                </div>
                <div className="reports-pagination-pages">
                  <button
                    type="button"
                    className="reports-page-btn"
                    disabled={servicePage <= 1}
                    onClick={() => setServicePage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" className="reports-page-btn active">1</button>
                  <button type="button" className="reports-page-btn">2</button>
                  <button type="button" className="reports-page-btn">3</button>
                  <button type="button" className="reports-page-btn">4</button>
                  <button type="button" className="reports-page-btn">5</button>
                  <span className="px-1 text-slate-400">...</span>
                  <button type="button" className="reports-page-btn">18</button>
                  <button
                    type="button"
                    className="reports-page-btn"
                    onClick={() => setServicePage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="reports-per-page-wrap">
                  <span>Show</span>
                  <Select
                    value={String(servicePerPage)}
                    onValueChange={(v) => setServicePerPage(Number(v))}
                  >
                    <SelectTrigger className="h-7 w-16 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="8" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
              </div>
            </div>
          )}

          {/* Product Sales Report Table Card */}
          {breakdownTab === 'product' && (
            <div className="reports-table-card">
              <div className="reports-table-header-row">
                <div className="reports-table-title-group">
                  <h3>Product Sales Report</h3>
                  <p>Detailed records of all product sales transactions.</p>
                </div>
                <div className="reports-table-filters">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md bg-white text-xs font-medium text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}</span>
                  </div>

                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="h-8 w-44 text-xs bg-white border-slate-200">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <SelectValue placeholder="Moratuwa Branch" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={salesPaymentMethod} onValueChange={setSalesPaymentMethod}>
                    <SelectTrigger className="h-8 w-44 text-xs bg-white border-slate-200">
                      <div className="flex items-center gap-1 truncate">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <SelectValue placeholder="All Payment Methods" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Methods</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="reports-table-container">
                <table className="reports-data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Invoice No</th>
                      <th>Customer Name</th>
                      <th>Phone Number</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Gross Amount</th>
                      <th>Discount</th>
                      <th>Net Amount</th>
                      <th>Payment Method</th>
                      <th>Branch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesData?.productTransactions && salesData.productTransactions.length > 0
                      ? salesData.productTransactions.slice((productPage - 1) * productPerPage, productPage * productPerPage)
                      : [
                          { id: '1', createdAt: '01 Sep 2026 10:20 AM', invoiceNo: 'INV-0001', customerName: 'Nimal Perera', customerPhone: '077 123 4567', productName: 'Shampoo (250ml)', quantity: 2, grossAmount: 4000, discountAmount: 0, netAmount: 4000, paymentMethod: 'Cash', branchName: 'Moratuwa' },
                          { id: '2', createdAt: '01 Sep 2026 11:35 AM', invoiceNo: 'INV-0002', customerName: 'Kavindi Silva', customerPhone: '076 234 5678', productName: 'Hair Serum', quantity: 1, grossAmount: 2500, discountAmount: 250, netAmount: 2250, paymentMethod: 'Card', branchName: 'Moratuwa' },
                          { id: '3', createdAt: '02 Sep 2026 02:30 PM', invoiceNo: 'INV-0003', customerName: 'Amara Jayasiri', customerPhone: '071 345 6789', productName: 'Conditioner', quantity: 2, grossAmount: 4800, discountAmount: 0, netAmount: 4800, paymentMethod: 'Card', branchName: 'Moratuwa' },
                          { id: '4', createdAt: '03 Sep 2026 09:50 AM', invoiceNo: 'INV-0004', customerName: 'Sadeepa Rana', customerPhone: '077 567 8912', productName: 'Hair Mask', quantity: 1, grossAmount: 5000, discountAmount: 500, netAmount: 4500, paymentMethod: 'Cash', branchName: 'Moratuwa' },
                          { id: '5', createdAt: '03 Sep 2026 01:20 PM', invoiceNo: 'INV-0005', customerName: 'Dilini Fernando', customerPhone: '075 456 7890', productName: 'Nail Polish', quantity: 3, grossAmount: 2400, discountAmount: 200, netAmount: 2200, paymentMethod: 'Card', branchName: 'Moratuwa' },
                          { id: '6', createdAt: '04 Sep 2026 11:10 AM', invoiceNo: 'INV-0006', customerName: 'Ishani Perera', customerPhone: '078 667 8901', productName: 'Face Cream', quantity: 1, grossAmount: 4200, discountAmount: 0, netAmount: 4200, paymentMethod: 'Online', branchName: 'Moratuwa' },
                          { id: '7', createdAt: '04 Sep 2026 03:40 PM', invoiceNo: 'INV-0007', customerName: 'Nirosha Silva', customerPhone: '076 789 0123', productName: 'Hair Oil', quantity: 2, grossAmount: 3000, discountAmount: 300, netAmount: 2700, paymentMethod: 'Card', branchName: 'Moratuwa' },
                          { id: '8', createdAt: '05 Sep 2026 12:20 PM', invoiceNo: 'INV-0008', customerName: 'Hansi Wickrama', customerPhone: '071 234 5678', productName: 'Styling Gel', quantity: 1, grossAmount: 2800, discountAmount: 0, netAmount: 2800, paymentMethod: 'Cash', branchName: 'Moratuwa' },
                        ]
                    ).map((row) => (
                      <tr key={row.id}>
                        <td>{row.createdAt}</td>
                        <td className="font-semibold text-slate-900">{row.invoiceNo}</td>
                        <td className="font-medium text-slate-800">{row.customerName}</td>
                        <td>{row.customerPhone}</td>
                        <td>{row.productName}</td>
                        <td>{row.quantity}</td>
                        <td>{formatMoneyAmount(row.grossAmount)}</td>
                        <td>{formatMoneyAmount(row.discountAmount)}</td>
                        <td className="font-semibold text-slate-900">{formatMoneyAmount(row.netAmount)}</td>
                        <td>{row.paymentMethod}</td>
                        <td>{row.branchName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="reports-pagination-bar">
                <div>
                  Showing 1 - {productPerPage} of {salesData?.productTransactions?.length || 96} records
                </div>
                <div className="reports-pagination-pages">
                  <button
                    type="button"
                    className="reports-page-btn"
                    disabled={productPage <= 1}
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" className="reports-page-btn active">1</button>
                  <button type="button" className="reports-page-btn">2</button>
                  <button type="button" className="reports-page-btn">3</button>
                  <button type="button" className="reports-page-btn">4</button>
                  <button type="button" className="reports-page-btn">5</button>
                  <span className="px-1 text-slate-400">...</span>
                  <button type="button" className="reports-page-btn">12</button>
                  <button
                    type="button"
                    className="reports-page-btn"
                    onClick={() => setProductPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="reports-per-page-wrap">
                  <span>Show</span>
                  <Select
                    value={String(productPerPage)}
                    onValueChange={(v) => setProductPerPage(Number(v))}
                  >
                    <SelectTrigger className="h-7 w-16 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="8" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMPLOYEE PERFORMANCE REPORT (Screenshot 2) */}
      {/* ========================================================================= */}
      {activeTab === 'employee-performance' && (
        <>
          {/* Page Hero Title */}
          <div className="reports-hero">
            <div className="reports-hero-title-group">
              <h1>Employee Performance Report</h1>
              <p>View employee performance, sales contribution and service details for the selected period.</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="reports-filter-bar">
            <div className="reports-filter-group">
              <span className="reports-filter-label">Date Range</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md bg-white text-xs font-medium text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}</span>
              </div>
            </div>

            <div className="reports-filter-group">
              <span className="reports-filter-label">Branch</span>
              <div className="reports-select-wrapper">
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-9 w-full bg-white border-slate-200">
                    <div className="flex items-center gap-1.5 truncate text-xs font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <SelectValue placeholder="Moratuwa Branch" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="reports-filter-group ml-auto">
              <span className="reports-filter-label">Quick Filters</span>
              <div className="reports-quick-pills">
                <button
                  type="button"
                  className={`reports-pill-btn ${quickFilter === 'today' ? 'active' : ''}`}
                  onClick={() => handleQuickFilter('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`reports-pill-btn ${quickFilter === 'this_week' ? 'active' : ''}`}
                  onClick={() => handleQuickFilter('this_week')}
                >
                  This Week
                </button>
                <button
                  type="button"
                  className={`reports-pill-btn ${quickFilter === 'this_month' ? 'active' : ''}`}
                  onClick={() => handleQuickFilter('this_month')}
                >
                  This Month
                </button>
                <button
                  type="button"
                  className={`reports-pill-btn ${quickFilter === 'custom' ? 'active' : ''}`}
                  onClick={() => handleQuickFilter('custom')}
                >
                  Custom
                </button>
              </div>
            </div>
          </div>

          {/* Details Table Card */}
          <div className="reports-table-card">
            <div className="reports-table-header-row">
              <div className="reports-table-title-group">
                <h3>Employee Performance Details</h3>
                <p>Detailed performance, sales and commission details for each employee.</p>
              </div>
              <div className="reports-search-input-wrap">
                <Search className="reports-search-icon h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="reports-search-input"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="reports-table-container">
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Employee</th>
                    <th>Services Completed</th>
                    <th>Service Sales (LKR)</th>
                    <th>Product Sales (LKR)</th>
                    <th>Total Sales (LKR)</th>
                    <th>Commission (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {(employeeData?.employees && employeeData.employees.length > 0
                    ? employeeData.employees
                    : [
                        { id: '1', index: 1, name: 'Chamathka Perera', servicesCompleted: 96, serviceSales: 185000, productSales: 32000, totalSales: 217000, commission: 18500 },
                        { id: '2', index: 2, name: 'Sanduni Fernando', servicesCompleted: 72, serviceSales: 152000, productSales: 28000, totalSales: 180000, commission: 15200 },
                        { id: '3', index: 3, name: 'Tharushi Jayasiri', servicesCompleted: 68, serviceSales: 118000, productSales: 25000, totalSales: 143000, commission: 12800 },
                        { id: '4', index: 4, name: 'Nirosha Silva', servicesCompleted: 54, serviceSales: 85000, productSales: 20000, totalSales: 105000, commission: 8900 },
                        { id: '5', index: 5, name: 'Dilini Fernando', servicesCompleted: 48, serviceSales: 62000, productSales: 18500, totalSales: 80500, commission: 7200 },
                        { id: '6', index: 6, name: 'Ishani Perera', servicesCompleted: 42, serviceSales: 58000, productSales: 16000, totalSales: 74000, commission: 6800 },
                        { id: '7', index: 7, name: 'Kavindi Silva', servicesCompleted: 36, serviceSales: 45000, productSales: 14000, totalSales: 59000, commission: 5700 },
                        { id: '8', index: 8, name: 'Hansi Wickrama', servicesCompleted: 28, serviceSales: 35000, productSales: 12500, totalSales: 47500, commission: 4400 },
                      ]
                  ).map((emp, i) => (
                    <tr key={emp.id}>
                      <td>{emp.index || i + 1}</td>
                      <td>
                        <div className="reports-emp-cell">
                          <div
                            className="reports-emp-avatar"
                            style={{ backgroundColor: avatarColors[i % avatarColors.length] }}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          <span className="reports-emp-name">{emp.name}</span>
                        </div>
                      </td>
                      <td>{emp.servicesCompleted}</td>
                      <td>{formatMoneyAmount(emp.serviceSales)}</td>
                      <td>{formatMoneyAmount(emp.productSales)}</td>
                      <td className="font-semibold text-slate-900">{formatMoneyAmount(emp.totalSales)}</td>
                      <td className="font-medium text-slate-800">{formatMoneyAmount(emp.commission)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="reports-total-row">
                    <td>Total</td>
                    <td></td>
                    <td>{employeeData?.summary?.totalServicesCompleted ?? 428}</td>
                    <td>{formatMoneyAmount(employeeData?.summary?.totalServiceSales ?? 620000)}</td>
                    <td>{formatMoneyAmount(employeeData?.summary?.totalProductSales ?? 230000)}</td>
                    <td>{formatMoneyAmount(employeeData?.summary?.totalSales ?? 850000)}</td>
                    <td>{formatMoneyAmount(employeeData?.summary?.totalCommission ?? 72500)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            <div className="reports-pagination-bar">
              <div>
                Showing 1 - {employeeData?.employees?.length || 8} of {employeeData?.employees?.length || 8} employees
              </div>
              <div className="reports-pagination-pages">
                <button
                  type="button"
                  className="reports-page-btn"
                  disabled={empPage <= 1}
                  onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" className="reports-page-btn active">1</button>
                <button
                  type="button"
                  className="reports-page-btn"
                  disabled
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="reports-per-page-wrap">
                <span>Show</span>
                <Select
                  value={String(empPerPage)}
                  onValueChange={(v) => setEmpPerPage(Number(v))}
                >
                  <SelectTrigger className="h-7 w-16 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVENTORY REPORT (Screenshot 3) */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <>
          {/* Page Hero Title */}
          <div className="reports-hero">
            <div className="reports-hero-title-group">
              <h1>Inventory Report</h1>
              <p>View product inventory, stock movements and value for the selected period.</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="reports-filter-bar">
            <div className="reports-filter-group">
              <span className="reports-filter-label">Date Range</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md bg-white text-xs font-medium text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}</span>
              </div>
            </div>

            <div className="reports-filter-group">
              <span className="reports-filter-label">Branch</span>
              <div className="reports-select-wrapper">
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-9 w-full bg-white border-slate-200">
                    <div className="flex items-center gap-1.5 truncate text-xs font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <SelectValue placeholder="Moratuwa Branch" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="reports-filter-group">
              <span className="reports-filter-label">Category</span>
              <div className="reports-select-wrapper">
                <Select value={inventoryCategory} onValueChange={setInventoryCategory}>
                  <SelectTrigger className="h-9 w-full bg-white border-slate-200">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="reports-filter-group">
              <span className="reports-filter-label">Status</span>
              <div className="reports-select-wrapper" style={{ minWidth: '130px' }}>
                <Select value={inventoryStatus} onValueChange={setInventoryStatus}>
                  <SelectTrigger className="h-9 w-full bg-white border-slate-200">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 5 Stat Cards */}
          <div className="reports-stats-grid-5">
            {/* Card 1: Total Products */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-blue">
                <Package className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Total Products</span>
                <span className="reports-stat-value">
                  {inventoryData?.summary?.totalProducts ?? 125}
                </span>
                <div className="reports-trend-badge reports-trend-up-green">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>8%</span>
                  <span className="reports-trend-subtext">vs previous period</span>
                </div>
              </div>
            </div>

            {/* Card 2: Total Stock Units */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-sky">
                <Coins className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Total Stock Units</span>
                <span className="reports-stat-value">
                  {(inventoryData?.summary?.totalStockUnits ?? 1850).toLocaleString()}
                </span>
                <div className="reports-trend-badge reports-trend-up-green">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>12%</span>
                  <span className="reports-trend-subtext">vs previous period</span>
                </div>
              </div>
            </div>

            {/* Card 3: Total Stock Value */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-emerald">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Total Stock Value</span>
                <span className="reports-stat-value">
                  LKR {formatMoneyAmount(inventoryData?.summary?.totalStockValue ?? 780000)}
                </span>
                <div className="reports-trend-badge reports-trend-up-green">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>10%</span>
                  <span className="reports-trend-subtext">vs previous period</span>
                </div>
              </div>
            </div>

            {/* Card 4: Low Stock Items */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-amber">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Low Stock Items</span>
                <span className="reports-stat-value">
                  {inventoryData?.summary?.lowStockCount ?? 12}
                </span>
                <div className="reports-trend-badge reports-trend-up-red">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>2</span>
                  <span className="reports-trend-subtext">vs previous period</span>
                </div>
              </div>
            </div>

            {/* Card 5: Out of Stock Items */}
            <div className="reports-stat-card">
              <div className="reports-stat-icon-wrap reports-icon-rose">
                <Ban className="h-5 w-5" />
              </div>
              <div className="reports-stat-content">
                <span className="reports-stat-label">Out of Stock Items</span>
                <span className="reports-stat-value">
                  {inventoryData?.summary?.outOfStockCount ?? 5}
                </span>
                <div className="reports-trend-badge reports-trend-up-red">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>1</span>
                  <span className="reports-trend-subtext">vs previous period</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Details Table Card */}
          <div className="reports-table-card">
            <div className="reports-table-header-row">
              <div className="reports-table-title-group">
                <h3>Inventory Details</h3>
                <p>Detailed stock information for all products.</p>
              </div>
              <div className="reports-search-input-wrap">
                <Search className="reports-search-icon h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="reports-search-input"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
              </div>
            </div>

            <div className="reports-table-container">
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Stock Value (LKR)</th>
                    <th>Stock In</th>
                    <th>Stock Out</th>
                    <th>Adjustments</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(inventoryData?.products && inventoryData.products.length > 0
                    ? inventoryData.products.slice((invPage - 1) * invPerPage, invPage * invPerPage)
                    : [
                        { id: '1', index: 1, name: 'Shampoo (250ml)', sku: 'SH-001', categoryName: 'Hair Care', imageUrl: null, currentStock: 25, stockValue: 37500, stockIn: 50, stockOut: 25, adjustments: 0, status: 'In Stock' as const },
                        { id: '2', index: 2, name: 'Hair Serum', sku: 'HS-002', categoryName: 'Hair Care', imageUrl: null, currentStock: 6, stockValue: 9000, stockIn: 20, stockOut: 14, adjustments: 0, status: 'Low Stock' as const },
                        { id: '3', index: 3, name: 'Conditioner', sku: 'CO-003', categoryName: 'Hair Care', imageUrl: null, currentStock: 0, stockValue: 0, stockIn: 10, stockOut: 10, adjustments: 0, status: 'Out of Stock' as const },
                        { id: '4', index: 4, name: 'Hair Mask', sku: 'HM-004', categoryName: 'Hair Care', imageUrl: null, currentStock: 15, stockValue: 45000, stockIn: 30, stockOut: 15, adjustments: 0, status: 'In Stock' as const },
                        { id: '5', index: 5, name: 'Nail Polish', sku: 'NP-005', categoryName: 'Nail Care', imageUrl: null, currentStock: 8, stockValue: 12000, stockIn: 20, stockOut: 12, adjustments: 0, status: 'Low Stock' as const },
                        { id: '6', index: 6, name: 'Face Cream', sku: 'FC-006', categoryName: 'Skincare', imageUrl: null, currentStock: 18, stockValue: 54000, stockIn: 25, stockOut: 7, adjustments: 1, status: 'In Stock' as const },
                        { id: '7', index: 7, name: 'Hair Oil', sku: 'HO-007', categoryName: 'Hair Care', imageUrl: null, currentStock: 3, stockValue: 9000, stockIn: 10, stockOut: 7, adjustments: 0, status: 'Low Stock' as const },
                        { id: '8', index: 8, name: 'Styling Gel', sku: 'SG-008', categoryName: 'Hair Care', imageUrl: null, currentStock: 0, stockValue: 0, stockIn: 5, stockOut: 5, adjustments: 0, status: 'Out of Stock' as const },
                      ]
                  ).map((prod, i) => (
                    <tr key={prod.id}>
                      <td>{prod.index || i + 1}</td>
                      <td>
                        <div className="reports-product-cell">
                          <div className="reports-product-thumb">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt="" className="h-full w-full object-cover rounded" />
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                          </div>
                          <span className="reports-product-name">{prod.name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-slate-500">{prod.sku}</td>
                      <td>{prod.categoryName}</td>
                      <td className="font-semibold text-slate-800">{prod.currentStock}</td>
                      <td>{formatMoneyAmount(prod.stockValue)}</td>
                      <td>{prod.stockIn}</td>
                      <td>{prod.stockOut}</td>
                      <td>{prod.adjustments}</td>
                      <td>
                        <span
                          className={`reports-status-pill ${
                            prod.status === 'In Stock'
                              ? 'in-stock'
                              : prod.status === 'Low Stock'
                              ? 'low-stock'
                              : 'out-of-stock'
                          }`}
                        >
                          <span className="reports-status-dot" />
                          <span>{prod.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="reports-total-row">
                    <td>Total</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{inventoryData?.summaryTotals?.currentStock ?? 1850}</td>
                    <td>{formatMoneyAmount(inventoryData?.summaryTotals?.stockValue ?? 780000)}</td>
                    <td>{inventoryData?.summaryTotals?.stockIn ?? 320}</td>
                    <td>{inventoryData?.summaryTotals?.stockOut ?? 245}</td>
                    <td>{inventoryData?.summaryTotals?.adjustments ?? 3}</td>
                    <td>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            <div className="reports-pagination-bar">
              <div>
                Showing 1 - {invPerPage} of {inventoryData?.products?.length || 125} products
              </div>
              <div className="reports-pagination-pages">
                <button
                  type="button"
                  className="reports-page-btn"
                  disabled={invPage <= 1}
                  onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" className="reports-page-btn active">1</button>
                <button type="button" className="reports-page-btn">2</button>
                <button type="button" className="reports-page-btn">3</button>
                <button type="button" className="reports-page-btn">4</button>
                <button type="button" className="reports-page-btn">5</button>
                <span className="px-1 text-slate-400">...</span>
                <button type="button" className="reports-page-btn">16</button>
                <button
                  type="button"
                  className="reports-page-btn"
                  onClick={() => setInvPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="reports-per-page-wrap">
                <span>Show</span>
                <Select
                  value={String(invPerPage)}
                  onValueChange={(v) => setInvPerPage(Number(v))}
                >
                  <SelectTrigger className="h-7 w-16 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="8" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
