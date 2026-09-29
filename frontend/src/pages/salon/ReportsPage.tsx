import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { tenantApi } from '@/api/tenant.api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import {
  getErrorMessage,
  OpsError,
  OpsLoading,
} from './salon-ops-ui';
import { formatMoneyAmount } from '@/lib/money';
import './employees-page.css';
import './settings-page.css';
import './report-shell.css';
import './reports-page.css';
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
type ReportSection =
  | 'daily-sales'
  | 'branch-sales'
  | 'service-sales'
  | 'product-sales'
  | 'employee-performance'
  | 'low-stock';
const REPORTS: { id: ReportSection; label: string; icon: string }[] = [
  { id: 'daily-sales', label: 'Daily Sales', icon: '📅' },
  { id: 'branch-sales', label: 'Branch Sales', icon: '🏢' },
  { id: 'service-sales', label: 'Service Sales', icon: '✂️' },
  { id: 'product-sales', label: 'Product Sales', icon: '📦' },
  { id: 'employee-performance', label: 'Employee Performance', icon: '👤' },
  { id: 'low-stock', label: 'Low Stock', icon: '⚠️' },
];
export default function ReportsPage() {
  const { branchId, setBranchId, branches } = useSalonBranch();
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [activeReport, setActiveReport] = useState<ReportSection>('daily-sales');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const dateParams = {
    startDate,
    endDate,
    ...(branchId !== 'all' ? { branchId } : {}),
  };
  const {
    data: dailySales = [],
    isLoading: dailyLoading,
    isError: dailyError,
    error: dailyQueryError,
    refetch: refetchDaily,
  } = useQuery({
    queryKey: ['report-daily-sales', startDate, endDate, branchId],
    queryFn: () => tenantApi.reports.dailySales(dateParams),
    enabled: activeReport === 'daily-sales',
  });
  const {
    data: branchSales = [],
    isLoading: branchLoading,
    isError: branchError,
    error: branchQueryError,
    refetch: refetchBranch,
  } = useQuery({
    queryKey: ['report-branch-sales', startDate, endDate],
    queryFn: () => tenantApi.reports.branchSales({ startDate, endDate }),
    enabled: activeReport === 'branch-sales',
  });
  const {
    data: serviceSales = [],
    isLoading: serviceLoading,
    isError: serviceError,
    error: serviceQueryError,
    refetch: refetchService,
  } = useQuery({
    queryKey: ['report-service-sales', startDate, endDate, branchId],
    queryFn: () => tenantApi.reports.serviceSales(dateParams),
    enabled: activeReport === 'service-sales',
  });
  const {
    data: productSales = [],
    isLoading: productLoading,
    isError: productError,
    error: productQueryError,
    refetch: refetchProduct,
  } = useQuery({
    queryKey: ['report-product-sales', startDate, endDate, branchId],
    queryFn: () => tenantApi.reports.productSales(dateParams),
    enabled: activeReport === 'product-sales',
  });
  const {
    data: employeePerformance = [],
    isLoading: employeeLoading,
    isError: employeeError,
    error: employeeQueryError,
    refetch: refetchEmployee,
  } = useQuery({
    queryKey: ['report-employee-performance', startDate, endDate, branchId],
    queryFn: () => tenantApi.reports.employeePerformance(dateParams),
    enabled: activeReport === 'employee-performance',
  });
  const {
    data: lowStock = [],
    isLoading: lowStockLoading,
    isError: lowStockError,
    error: lowStockQueryError,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: ['report-low-stock', branchId, lowStockThreshold],
    queryFn: () =>
      tenantApi.reports.lowStock({
        threshold: lowStockThreshold,
        ...(branchId !== 'all' ? { branchId } : {}),
      }),
    enabled: activeReport === 'low-stock',
  });
  const needsDateRange = activeReport !== 'low-stock';
  const activeMeta = REPORTS.find((r) => r.id === activeReport)!;
  const isLoading =
    dailyLoading ||
    branchLoading ||
    serviceLoading ||
    productLoading ||
    employeeLoading ||
    lowStockLoading;
  const isError =
    dailyError || branchError || serviceError || productError || employeeError || lowStockError;
  const queryError =
    dailyQueryError ||
    branchQueryError ||
    serviceQueryError ||
    productQueryError ||
    employeeQueryError ||
    lowStockQueryError;
  const refetchActive = () => {
    if (activeReport === 'daily-sales') void refetchDaily();
    else if (activeReport === 'branch-sales') void refetchBranch();
    else if (activeReport === 'service-sales') void refetchService();
    else if (activeReport === 'product-sales') void refetchProduct();
    else if (activeReport === 'employee-performance') void refetchEmployee();
    else void refetchLowStock();
  };
  const summary = useMemo(() => {
    if (activeReport === 'daily-sales') {
      const rows = dailySales as Array<{ saleCount: number; total: string }>;
      return {
        primary: rows.reduce((s, r) => s + Number(r.saleCount), 0),
        primaryLabel: 'Total sales',
        secondary: formatMoneyAmount(rows.reduce((s, r) => s + Number(r.total), 0)),
        secondaryLabel: 'Revenue (LKR)',
      };
    }
    if (activeReport === 'branch-sales') {
      const rows = branchSales as Array<{ saleCount: number; total: string }>;
      return {
        primary: rows.length,
        primaryLabel: 'Branches',
        secondary: formatMoneyAmount(rows.reduce((s, r) => s + Number(r.total), 0)),
        secondaryLabel: 'Revenue (LKR)',
      };
    }
    if (activeReport === 'low-stock') {
      return {
        primary: (lowStock as unknown[]).length,
        primaryLabel: 'Low items',
        secondary: lowStockThreshold,
        secondaryLabel: 'Threshold',
      };
    }
    return null;
  }, [activeReport, dailySales, branchSales, lowStock, lowStockThreshold]);
  if (isLoading) return <OpsLoading />;
  if (isError)
    return <OpsError message={getErrorMessage(queryError)} onRetry={refetchActive} />;
  const renderReportBody = () => {
    if (activeReport === 'daily-sales') {
      const rows = dailySales as Array<{ date: string; saleCount: number; total: string }>;
      if (rows.length === 0) return <div className="emp-empty">No daily sales in this period.</div>;
      return (
        <>
          <div className="emp-cards">
            {rows.map((row) => (
              <article key={row.date} className="emp-card">
                <div className="emp-card-top">
                  <div className="emp-name-cell">{new Date(row.date).toLocaleDateString()}</div>
                  <span className="emp-qty-badge emp-qty-badge-ok">{Number(row.saleCount)} sales</span>
                </div>
                <div className="emp-card-meta">
                  <span>
                    <strong>Total (LKR):</strong>{' '}
                    <span className="emp-price">{formatMoneyAmount(row.total)}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales Count</th>
                  <th>Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date}>
                    <td>{new Date(row.date).toLocaleDateString()}</td>
                    <td>{Number(row.saleCount)}</td>
                    <td className="emp-price">{formatMoneyAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    if (activeReport === 'branch-sales') {
      const rows = branchSales as Array<{
        branchId: string;
        branchName: string;
        saleCount: number;
        total: string;
      }>;
      if (rows.length === 0) return <div className="emp-empty">No branch sales in this period.</div>;
      return (
        <>
          <div className="emp-cards">
            {rows.map((row) => (
              <article key={row.branchId} className="emp-card">
                <div className="emp-card-top">
                  <div className="emp-name-cell">{row.branchName}</div>
                  <span className="emp-qty-badge emp-qty-badge-ok">{Number(row.saleCount)}</span>
                </div>
                <div className="emp-card-meta">
                  <span>
                    <strong>Total (LKR):</strong>{' '}
                    <span className="emp-price">{formatMoneyAmount(row.total)}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Sales Count</th>
                  <th>Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.branchId}>
                    <td className="emp-name-cell">{row.branchName}</td>
                    <td>{Number(row.saleCount)}</td>
                    <td className="emp-price">{formatMoneyAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    if (activeReport === 'service-sales') {
      const rows = serviceSales as Array<{ id: string; name: string; saleCount: number; total: string }>;
      if (rows.length === 0) return <div className="emp-empty">No service sales in this period.</div>;
      return (
        <>
          <div className="emp-cards">
            {rows.map((row) => (
              <article key={row.id} className="emp-card">
                <div className="emp-card-top">
                  <div className="emp-name-cell">{row.name}</div>
                  <span className="emp-qty-badge emp-qty-badge-ok">{Number(row.saleCount)}</span>
                </div>
                <div className="emp-card-meta">
                  <span>
                    <strong>Total (LKR):</strong>{' '}
                    <span className="emp-price">{formatMoneyAmount(row.total)}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Sales Count</th>
                  <th>Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="emp-name-cell">{row.name}</td>
                    <td>{Number(row.saleCount)}</td>
                    <td className="emp-price">{formatMoneyAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    if (activeReport === 'product-sales') {
      const rows = productSales as Array<{ id: string; name: string; quantity: string; total: string }>;
      if (rows.length === 0) return <div className="emp-empty">No product sales in this period.</div>;
      return (
        <>
          <div className="emp-cards">
            {rows.map((row) => (
              <article key={row.id} className="emp-card">
                <div className="emp-card-top">
                  <div className="emp-name-cell">{row.name}</div>
                  <span className="emp-qty-badge emp-qty-badge-ok">{Number(row.quantity)}</span>
                </div>
                <div className="emp-card-meta">
                  <span>
                    <strong>Total (LKR):</strong>{' '}
                    <span className="emp-price">{formatMoneyAmount(row.total)}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="emp-name-cell">{row.name}</td>
                    <td>{Number(row.quantity)}</td>
                    <td className="emp-price">{formatMoneyAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    if (activeReport === 'employee-performance') {
      const rows = employeePerformance as Array<{
        employeeId: string;
        employeeName: string;
        designation: string;
        serviceCount: number;
        total: string;
      }>;
      if (rows.length === 0)
        return <div className="emp-empty">No employee performance data in this period.</div>;
      return (
        <>
          <div className="emp-cards">
            {rows.map((row) => (
              <article key={row.employeeId} className="emp-card">
                <div className="emp-card-top">
                  <div>
                    <div className="emp-name-cell">{row.employeeName}</div>
                    <div className="emp-code">{row.designation || 'Staff'}</div>
                  </div>
                  <span className="emp-qty-badge emp-qty-badge-ok">{Number(row.serviceCount)}</span>
                </div>
                <div className="emp-card-meta">
                  <span>
                    <strong>Revenue (LKR):</strong>{' '}
                    <span className="emp-price">{formatMoneyAmount(row.total)}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Services</th>
                  <th>Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.employeeId}>
                    <td className="emp-name-cell">{row.employeeName}</td>
                    <td>{row.designation || '—'}</td>
                    <td>{Number(row.serviceCount)}</td>
                    <td className="emp-price">{formatMoneyAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    const rows = lowStock as Array<{ branchName: string; productName: string; quantity: number }>;
    if (rows.length === 0)
      return <div className="emp-empty">No products below the threshold. Stock looks healthy.</div>;
    return (
      <>
        <div className="emp-cards">
          {rows.map((row, i) => (
            <article key={`${row.branchName}-${row.productName}-${i}`} className="emp-card">
              <div className="emp-card-top">
                <div className="emp-name-cell">{row.productName}</div>
                <span className="emp-qty-badge emp-qty-badge-low">{row.quantity}</span>
              </div>
              <div className="emp-card-meta">
                <span>
                  <strong>Branch:</strong> {row.branchName}
                </span>
              </div>
            </article>
          ))}
        </div>
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Product</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.branchName}-${row.productName}-${i}`}>
                  <td>{row.branchName}</td>
                  <td className="emp-name-cell">{row.productName}</td>
                  <td>
                    <span className="emp-qty-badge emp-qty-badge-low">{row.quantity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };
  return (
    <div className="emp-page settings-shell report-shell reports-page">
      <header className="settings-hero">
        <div className="settings-hero-logo">
          <span>📊</span>
        </div>
        <div className="settings-hero-text">
          <h1>Business Reports</h1>
          <p>Analyze sales, staff performance, and inventory alerts</p>
        </div>
        <div className="settings-hero-meta">
          <span className="settings-hero-pill">{activeMeta.label}</span>
          {summary && (
            <span className="settings-hero-pill report-shell-pill-secondary">
              {summary.secondaryLabel}: {summary.secondary}
            </span>
          )}
        </div>
      </header>

      <nav className="settings-tabs report-shell-tabs" aria-label="Report types">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`settings-tab ${activeReport === r.id ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveReport(r.id)}
          >
            <span className="report-shell-tab-icon" aria-hidden>
              {r.icon}
            </span>
            <span className="report-shell-tab-label">{r.label}</span>
          </button>
        ))}
      </nav>

      <section className="settings-panel">
        <div className="settings-panel-header">
          <h2>Filters</h2>
          <p>Narrow the report by date range and branch</p>
        </div>
        <div className={`settings-form-grid reports-filter-grid${needsDateRange ? ' reports-filter-grid-3' : ''}`}>
          {needsDateRange && (
            <>
              <div className="settings-field">
                <Label htmlFor="report-start">Start date</Label>
                <Input
                  id="report-start"
                  className="settings-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setStartDate(newStart);
                    if (endDate && newStart && endDate < newStart) {
                      setEndDate(newStart);
                    }
                  }}
                />
              </div>
              <div className="settings-field">
                <Label htmlFor="report-end">End date</Label>
                <Input
                  id="report-end"
                  className="settings-input"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
          {activeReport === 'low-stock' && (
            <div className="settings-field">
              <Label htmlFor="report-threshold">Low stock threshold</Label>
              <Input
                id="report-threshold"
                className="settings-input"
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
            </div>
          )}
          {activeReport !== 'branch-sales' && (
            <div className="settings-field">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="settings-input">
                  <SelectValue placeholder="All branches" />
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
          )}
        </div>
      </section>

      {summary && (
        <div className="emp-stats">
          <div className="emp-stat">
            <div className="emp-stat-value">{summary.primary}</div>
            <div className="emp-stat-label">{summary.primaryLabel}</div>
          </div>
          <div className="emp-stat">
            <div className="emp-stat-value">{summary.secondary}</div>
            <div className="emp-stat-label">{summary.secondaryLabel}</div>
          </div>
        </div>
      )}

      <section className="settings-panel">
        <div className="settings-panel-header">
          <h2>
            {activeMeta.icon} {activeMeta.label}
          </h2>
          <p>Results for your selected filters</p>
        </div>
        {renderReportBody()}
      </section>
    </div>
  );
}
