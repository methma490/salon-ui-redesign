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
import { useDebounce } from '@/hooks/useDebounce';
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

function ReportPagination({
  page, pageSize, total, itemLabel, options, onPageChange, onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
  options: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const visiblePages = Array.from(
    { length: Math.max(0, Math.min(totalPages, 5)) },
    (_, index) => startPage + index,
  );

  return (
    <div className="reports-pagination-bar">
      <div>Showing {first}–{last} of {total} {itemLabel}</div>
      <div className="reports-pagination-pages">
        <button
          type="button"
          className="reports-page-btn"
          aria-label="Previous page"
          disabled={page <= 1 || totalPages === 0}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visiblePages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`reports-page-btn ${pageNumber === page ? 'active' : ''}`}
            aria-current={pageNumber === page ? 'page' : undefined}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          className="reports-page-btn"
          aria-label="Next page"
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="reports-per-page-wrap">
        <span>Show</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            onPageSizeChange(Number(value));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="h-7 w-16 text-xs bg-white border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
        <span>per page</span>
      </div>
    </div>
  );
}

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
  const { data: enabledFeatures = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
    staleTime: 60_000,
  });
  const reportTabs: Array<{ id: ReportTab; feature: string }> = [
    { id: 'sales', feature: 'SALES_REPORTS' },
    { id: 'employee-performance', feature: 'EMPLOYEE_REPORTS' },
    { id: 'inventory', feature: 'INVENTORY_REPORTS' },
  ];
  const availableReportTabs = reportTabs.filter((tab) => enabledFeatures.includes(tab.feature));

  useEffect(() => {
    if (availableReportTabs.length > 0 && !availableReportTabs.some((tab) => tab.id === activeTab)) {
      setSearchParams({ tab: availableReportTabs[0].id }, { replace: true });
    }
  }, [activeTab, availableReportTabs, setSearchParams]);

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
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 400);
  const [empPage, setEmpPage] = useState(1);
  const [empPerPage, setEmpPerPage] = useState(10);

  // Inventory Report Specific State
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState<string>('all');
  const [inventoryStatus, setInventoryStatus] = useState<string>('all');
  const [invPage, setInvPage] = useState(1);
  const [invPerPage, setInvPerPage] = useState(8);

  useEffect(() => {
    setServicePage(1);
    setProductPage(1);
  }, [startDate, endDate, branchId, salesPaymentMethod]);

  useEffect(() => {
    setEmpPage(1);
  }, [startDate, endDate, branchId, debouncedEmployeeSearch]);

  useEffect(() => {
    setInvPage(1);
  }, [startDate, endDate, branchId, inventorySearch, inventoryCategory, inventoryStatus]);

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
    queryKey: ['report-employee-performance', startDate, endDate, branchId, debouncedEmployeeSearch],
    queryFn: () =>
      tenantApi.reports.employeePerformance({
        startDate,
        endDate,
        ...(branchId !== 'all' ? { branchId } : {}),
        ...(debouncedEmployeeSearch.trim() ? { search: debouncedEmployeeSearch.trim() } : {}),
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
    if (activeTab === 'employee-performance') {
      document.body.classList.add('employee-performance-print');
      window.addEventListener(
        'afterprint',
        () => document.body.classList.remove('employee-performance-print'),
        { once: true },
      );
    }
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
      const headers = ['#', 'Employee', 'Branch', 'Services Completed', 'Service Sales (LKR)', 'Product Sales (LKR)', 'Total Sales (LKR)', 'Commission (LKR)'];
      const rows = (employeeData?.employees ?? []).map((e) => [
        e.index,
        `"${e.name}"`,
        `"${e.branchName}"`,
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
      {activeTab === 'employee-performance' && (
        <section className="reports-print-document" aria-label="Employee performance printable report">
          <header className="reports-print-header">
            <div>
              <p className="reports-print-eyebrow">Dart Smart Salon</p>
              <h1>Employee Performance Report</h1>
              <p>
                {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
                {' · '}
                {branchId === 'all'
                  ? 'All Branches'
                  : branches.find((branch) => branch.id === branchId)?.name ?? 'Selected Branch'}
              </p>
            </div>
            <span className="reports-print-generated">Generated {formatDateDisplay(getTodayStr())}</span>
          </header>

          <div className="reports-print-summary">
            <div><span>Employees</span><strong>{employeeData?.employees.length ?? 0}</strong></div>
            <div><span>Services completed</span><strong>{employeeData?.summary.totalServicesCompleted ?? 0}</strong></div>
            <div><span>Service sales</span><strong>{formatMoneyAmount(employeeData?.summary.totalServiceSales ?? 0)}</strong></div>
            <div><span>Product sales</span><strong>{formatMoneyAmount(employeeData?.summary.totalProductSales ?? 0)}</strong></div>
            <div><span>Total sales</span><strong>{formatMoneyAmount(employeeData?.summary.totalSales ?? 0)}</strong></div>
            <div><span>Commission</span><strong>{formatMoneyAmount(employeeData?.summary.totalCommission ?? 0)}</strong></div>
          </div>

          <table className="reports-print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Branch</th>
                <th>Services Completed</th>
                <th>Service Sales (LKR)</th>
                <th>Product Sales (LKR)</th>
                <th>Total Sales (LKR)</th>
                <th>Commission (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {employeeData?.employees.length ? employeeData.employees.map((employee, index) => (
                <tr key={employee.id}>
                  <td>{index + 1}</td>
                  <td>{employee.name}</td>
                  <td>{employee.branchName}</td>
                  <td>{employee.servicesCompleted}</td>
                  <td>{formatMoneyAmount(employee.serviceSales)}</td>
                  <td>{formatMoneyAmount(employee.productSales)}</td>
                  <td>{formatMoneyAmount(employee.totalSales)}</td>
                  <td>{formatMoneyAmount(employee.commission)}</td>
                </tr>
              )) : (
                <tr><td colSpan={8}>No employee performance records found for this period.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3}>Total</th>
                <th>{employeeData?.summary.totalServicesCompleted ?? 0}</th>
                <th>{formatMoneyAmount(employeeData?.summary.totalServiceSales ?? 0)}</th>
                <th>{formatMoneyAmount(employeeData?.summary.totalProductSales ?? 0)}</th>
                <th>{formatMoneyAmount(employeeData?.summary.totalSales ?? 0)}</th>
                <th>{formatMoneyAmount(employeeData?.summary.totalCommission ?? 0)}</th>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* Top Main Navigation Tabs */}
      <div className="reports-nav-header">
        <div className="reports-main-tabs">
          {enabledFeatures.includes('SALES_REPORTS') && <button
            type="button"
            className={`reports-main-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <CreditCard className="h-4 w-4" />
            <span>Sales Report</span>
          </button>}
          {enabledFeatures.includes('EMPLOYEE_REPORTS') && <button
            type="button"
            className={`reports-main-tab-btn ${activeTab === 'employee-performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('employee-performance')}
          >
            <User className="h-4 w-4" />
            <span>Employee Performance Report</span>
          </button>}
          {enabledFeatures.includes('INVENTORY_REPORTS') && <button
            type="button"
            className={`reports-main-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package className="h-4 w-4" />
            <span>Inventory Report</span>
          </button>}
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
                  LKR {formatMoneyAmount(salesData?.summary?.totalSales ?? 0)}
                </span>
                <div className="reports-trend-badge reports-trend-up-green">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{salesData?.summary?.totalSalesGrowth ?? 0}%</span>
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
                  LKR {formatMoneyAmount(salesData?.summary?.serviceSales ?? 0)}
                </span>
                <div className="reports-stat-progress-wrap">
                  <div className="reports-stat-progress-track">
                    <div
                      className="reports-stat-progress-bar reports-progress-blue"
                      style={{ width: `${salesData?.summary?.serviceSalesPct ?? 0}%` }}
                    />
                  </div>
                  <span className="reports-stat-progress-pct">
                    {salesData?.summary?.serviceSalesPct ?? 0}%
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
                  LKR {formatMoneyAmount(salesData?.summary?.productSales ?? 0)}
                </span>
                <div className="reports-stat-progress-wrap">
                  <div className="reports-stat-progress-track">
                    <div
                      className="reports-stat-progress-bar reports-progress-sky"
                      style={{ width: `${salesData?.summary?.productSalesPct ?? 0}%` }}
                    />
                  </div>
                  <span className="reports-stat-progress-pct">
                    {salesData?.summary?.productSalesPct ?? 0}%
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
                  LKR {formatMoneyAmount(salesData?.summary?.totalDiscounts ?? 0)}
                </span>
                <div className="reports-trend-badge reports-trend-up-red">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{salesData?.summary?.discountsGrowth ?? 0}%</span>
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
                  data={salesData?.chart && salesData.chart.length > 0 ? salesData.chart : []}
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
                    {salesData?.serviceTransactions && salesData.serviceTransactions.length > 0 ? (
                      salesData.serviceTransactions
                        .slice((servicePage - 1) * servicePerPage, servicePage * servicePerPage)
                        .map((row) => (
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
                        ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="text-center py-6 text-xs text-slate-400">
                          No service sales transactions recorded for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <ReportPagination
                page={servicePage}
                pageSize={servicePerPage}
                total={salesData?.serviceTransactions?.length ?? 0}
                itemLabel="service transactions"
                options={[8, 15, 25]}
                onPageChange={setServicePage}
                onPageSizeChange={setServicePerPage}
              />
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
                    {salesData?.productTransactions && salesData.productTransactions.length > 0 ? (
                      salesData.productTransactions
                        .slice((productPage - 1) * productPerPage, productPage * productPerPage)
                        .map((row) => (
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
                        ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="text-center py-6 text-xs text-slate-400">
                          No product sales transactions recorded for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <ReportPagination
                page={productPage}
                pageSize={productPerPage}
                total={salesData?.productTransactions?.length ?? 0}
                itemLabel="product transactions"
                options={[8, 15, 25]}
                onPageChange={setProductPage}
                onPageSizeChange={setProductPerPage}
              />
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
            {quickFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="Start date"
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700 outline-none"
                  value={startDate}
                  onChange={(e) => {
                    const nextStartDate = e.target.value;
                    setStartDate(nextStartDate);
                    if (endDate < nextStartDate) setEndDate(nextStartDate);
                  }}
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  aria-label="End date"
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700 outline-none"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
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
                    <th>Branch</th>
                    <th>Services Completed</th>
                    <th>Service Sales (LKR)</th>
                    <th>Product Sales (LKR)</th>
                    <th>Total Sales (LKR)</th>
                    <th>Commission (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeData?.employees && employeeData.employees.length > 0 ? (
                    employeeData.employees
                      .slice((empPage - 1) * empPerPage, empPage * empPerPage)
                      .map((emp, i) => (
                      <tr key={emp.id}>
                        <td>{emp.index || (empPage - 1) * empPerPage + i + 1}</td>
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
                        <td>{emp.branchName}</td>
                        <td>{emp.servicesCompleted}</td>
                        <td>{formatMoneyAmount(emp.serviceSales)}</td>
                        <td>{formatMoneyAmount(emp.productSales)}</td>
                        <td className="font-semibold text-slate-900">{formatMoneyAmount(emp.totalSales)}</td>
                        <td className="font-medium text-slate-800">{formatMoneyAmount(emp.commission)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-xs text-slate-400">
                        No employee performance records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="reports-total-row">
                    <td colSpan={2}>Total</td>
                    <td></td>
                    <td>{employeeData?.summary?.totalServicesCompleted ?? 0}</td>
                    <td>{formatMoneyAmount(employeeData?.summary?.totalServiceSales ?? 0)}</td>
                    <td>{formatMoneyAmount(employeeData?.summary?.totalProductSales ?? 0)}</td>
                    <td>{formatMoneyAmount(employeeData?.summary?.totalSales ?? 0)}</td>
                    <td>{formatMoneyAmount(employeeData?.summary?.totalCommission ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <ReportPagination
              page={empPage}
              pageSize={empPerPage}
              total={employeeData?.employees?.length ?? 0}
              itemLabel="employees"
              options={[10, 25, 50]}
              onPageChange={setEmpPage}
              onPageSizeChange={setEmpPerPage}
            />
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
                  {inventoryData?.summary?.totalProducts ?? 0}
                </span>
                <div className="text-xs text-slate-400 mt-1">Catalog items</div>
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
                  {(inventoryData?.summary?.totalStockUnits ?? 0).toLocaleString()}
                </span>
                <div className="text-xs text-slate-400 mt-1">Available units</div>
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
                  LKR {formatMoneyAmount(inventoryData?.summary?.totalStockValue ?? 0)}
                </span>
                <div className="text-xs text-slate-400 mt-1">Asset valuation</div>
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
                  {inventoryData?.summary?.lowStockCount ?? 0}
                </span>
                <div className="text-xs text-amber-600 mt-1 font-medium">Needs reorder</div>
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
                  {inventoryData?.summary?.outOfStockCount ?? 0}
                </span>
                <div className="text-xs text-rose-600 mt-1 font-medium">Unavailable</div>
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
                  {inventoryData?.products && inventoryData.products.length > 0 ? (
                    inventoryData.products.slice((invPage - 1) * invPerPage, invPage * invPerPage).map((prod, i) => (
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center py-6 text-xs text-slate-400">
                        No product inventory records found.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="reports-total-row">
                    <td>Total</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{inventoryData?.summaryTotals?.currentStock ?? 0}</td>
                    <td>{formatMoneyAmount(inventoryData?.summaryTotals?.stockValue ?? 0)}</td>
                    <td>{inventoryData?.summaryTotals?.stockIn ?? 0}</td>
                    <td>{inventoryData?.summaryTotals?.stockOut ?? 0}</td>
                    <td>{inventoryData?.summaryTotals?.adjustments ?? 0}</td>
                    <td>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <ReportPagination
              page={invPage}
              pageSize={invPerPage}
              total={inventoryData?.products?.length ?? 0}
              itemLabel="products"
              options={[8, 15, 25]}
              onPageChange={setInvPage}
              onPageSizeChange={setInvPerPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
