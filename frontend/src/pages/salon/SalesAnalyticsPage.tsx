import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  tenantApi,
  type SalesAnalyticsBranchRow,
  type SalesAnalyticsDayRow,
  type SalesAnalyticsEmployeeRow,
  type SalesAnalyticsInvoice,
  type SalesAnalyticsPreset,
} from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getErrorMessage, OpsError, OpsLoading } from './salon-ops-ui';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import {
  formatSriLankaDate,
  formatSriLankaDateTime,
  sriLankaTodayIso,
} from '@/lib/sri-lanka-time';
import './employees-page.css';
import './settings-page.css';
import './report-shell.css';
import './sales-analytics-page.css';

type TabKey = 'overview' | 'invoices' | 'employees' | 'branches' | 'daily';

const PAGE_LIMIT = 20;

const PRESETS: Array<{ value: SalesAnalyticsPreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom' },
];

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'employees', label: 'Employees' },
  { key: 'branches', label: 'Branches' },
  { key: 'daily', label: 'Daily' },
];

function formatDate(value: string | Date) {
  return formatSriLankaDate(value);
}

function formatDateTime(value: string) {
  return formatSriLankaDateTime(value);
}

function toIsoDate(d: Date) {
  return sriLankaTodayIso(d);
}

function defaultCustomRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: toIsoDate(first),
    to: toIsoDate(now),
  };
}

function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="sa-pagination">
      <div className="sa-pagination-info">
        Page {page} of {totalPages} · {total} total
      </div>
      <div className="sa-pagination-actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function employeeNames(invoice: SalesAnalyticsInvoice) {
  if (!invoice.employees?.length) return '—';
  return invoice.employees.map((e) => e.employeeName).join(', ');
}

export default function SalesAnalyticsPage() {
  const [searchParams] = useSearchParams();
  const { branchId, setBranchId, branches } = useSalonBranch();
  const [tab, setTab] = useState<TabKey>('overview');
  const [preset, setPreset] = useState<SalesAnalyticsPreset>('this_month');
  const [customFrom, setCustomFrom] = useState(defaultCustomRange().from);
  const [customTo, setCustomTo] = useState(defaultCustomRange().to);
  const [employeeId, setEmployeeId] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeDetailPage, setEmployeeDetailPage] = useState(1);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayInvoicesPage, setDayInvoicesPage] = useState(1);

  useEffect(() => {
    const qEmployee = searchParams.get('employeeId');
    const qFrom = searchParams.get('from');
    const qTo = searchParams.get('to');
    if (qFrom && qTo) {
      setPreset('custom');
      setCustomFrom(qFrom.slice(0, 10));
      setCustomTo(qTo.slice(0, 10));
    }
    if (qEmployee) {
      setEmployeeId(qEmployee);
      setSelectedEmployeeId(qEmployee);
      setTab('employees');
    }
  }, [searchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, preset, customFrom, customTo, branchId, employeeId, debouncedSearch]);

  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (preset === 'custom') {
      params.from = customFrom;
      params.to = customTo;
    } else {
      params.preset = preset;
    }
    if (branchId !== 'all') params.branchId = branchId;
    if (employeeId !== 'all') params.employeeId = employeeId;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [preset, customFrom, customTo, branchId, employeeId, debouncedSearch]);

  const listParams = useMemo(
    () => ({
      ...filterParams,
      page: String(page),
      limit: String(PAGE_LIMIT),
    }),
    [filterParams, page],
  );

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'sales-analytics-filter'],
    queryFn: () => tenantApi.employees.list({ limit: '200', status: 'ACTIVE' }),
  });

  const overviewQuery = useQuery({
    queryKey: ['sales-analytics', 'overview', filterParams],
    queryFn: () => tenantApi.salesAnalytics.overview(filterParams),
  });

  const invoicesQuery = useQuery({
    queryKey: ['sales-analytics', 'invoices', listParams],
    queryFn: () => tenantApi.salesAnalytics.invoices(listParams),
    enabled: tab === 'invoices' || tab === 'overview',
  });

  const employeesQuery = useQuery({
    queryKey: ['sales-analytics', 'by-employee', listParams],
    queryFn: () => tenantApi.salesAnalytics.byEmployee(listParams),
    enabled: tab === 'employees',
  });

  const branchesQuery = useQuery({
    queryKey: ['sales-analytics', 'by-branch', listParams],
    queryFn: () => tenantApi.salesAnalytics.byBranch(listParams),
    enabled: tab === 'branches',
  });

  const daysQuery = useQuery({
    queryKey: ['sales-analytics', 'by-day', listParams],
    queryFn: () => tenantApi.salesAnalytics.byDay(listParams),
    enabled: tab === 'daily',
  });

  const employeeDetailQuery = useQuery({
    queryKey: [
      'sales-analytics',
      'employee-detail',
      selectedEmployeeId,
      filterParams,
      employeeDetailPage,
    ],
    queryFn: () =>
      tenantApi.salesAnalytics.employeeDetail(selectedEmployeeId!, {
        ...filterParams,
        page: String(employeeDetailPage),
        limit: String(PAGE_LIMIT),
      }),
    enabled: !!selectedEmployeeId,
  });

  const branchDetailQuery = useQuery({
    queryKey: ['sales-analytics', 'branch-detail', selectedBranchId, filterParams],
    queryFn: () =>
      tenantApi.salesAnalytics.branchDetail(selectedBranchId!, {
        ...filterParams,
        limit: '100',
      }),
    enabled: !!selectedBranchId,
  });

  const dayInvoicesQuery = useQuery({
    queryKey: [
      'sales-analytics',
      'day-invoices',
      selectedDay,
      filterParams,
      dayInvoicesPage,
    ],
    queryFn: () =>
      tenantApi.salesAnalytics.invoices({
        ...filterParams,
        from: selectedDay!,
        to: selectedDay!,
        page: String(dayInvoicesPage),
        limit: String(PAGE_LIMIT),
      }),
    enabled: !!selectedDay,
  });

  const summary = overviewQuery.data?.summary;
  const range = overviewQuery.data?.range;

  const activeQuery =
    tab === 'invoices'
      ? invoicesQuery
      : tab === 'employees'
        ? employeesQuery
        : tab === 'branches'
          ? branchesQuery
          : tab === 'daily'
            ? daysQuery
            : overviewQuery;

  if (overviewQuery.isLoading && !overviewQuery.data) return <OpsLoading />;
  if (overviewQuery.isError) {
    return (
      <OpsError
        message={getErrorMessage(overviewQuery.error)}
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  const openEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setEmployeeDetailPage(1);
  };

  const openBranch = (id: string) => {
    setSelectedBranchId(id);
  };

  const openDay = (dateValue: string) => {
    const day = String(dateValue).slice(0, 10);
    setSelectedDay(day);
    setDayInvoicesPage(1);
  };

  return (
    <div className="emp-page settings-shell report-shell sa-page">
      <header className="settings-hero">
        <div className="settings-hero-logo">
          <span>📈</span>
        </div>
        <div className="settings-hero-text">
          <h1>Sales Analytics</h1>
          <p>Invoices, employee commissionables, branch performance, and daily trends</p>
        </div>
        <div className="settings-hero-meta">
          <span className="settings-hero-pill">{formatMoneyLkr(summary?.netSales ?? 0)}</span>
          <span className="settings-hero-pill report-shell-pill-secondary">
            {summary?.invoiceCount ?? 0} invoices
          </span>
          {range && (
            <span className="settings-hero-pill report-shell-pill-secondary">
              {formatDate(range.from)} – {formatDate(range.to)}
            </span>
          )}
        </div>
      </header>

      <nav className="settings-tabs report-shell-tabs" aria-label="Sales analytics sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`settings-tab${tab === t.key ? ' settings-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="settings-panel">
        <div className="settings-panel-header">
          <h2>Filters</h2>
          <p>
            {range
              ? `Showing ${formatDate(range.from)} – ${formatDate(range.to)}`
              : 'Choose a date range, branch, and employee'}
          </p>
        </div>
        <div className="settings-form-grid sa-filter-grid">
          <div className="settings-field">
            <Label>Date range</Label>
            <Select
              value={preset}
              onValueChange={(v) => setPreset(v as SalesAnalyticsPreset)}
            >
              <SelectTrigger className="settings-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="settings-field">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="settings-input">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="settings-field">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="settings-input">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(tab === 'invoices' || tab === 'employees') && (
            <div className="settings-field">
              <Label>Search</Label>
              <Input
                className="settings-input"
                placeholder={
                  tab === 'employees' ? 'Employee name or code…' : 'Invoice, customer…'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {preset === 'custom' && (
            <>
              <div className="settings-field">
                <Label>From</Label>
                <Input
                  className="settings-input"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="settings-field">
                <Label>To</Label>
                <Input
                  className="settings-input"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </section>

      <div className="emp-stats sa-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{formatMoneyLkr(summary?.netSales ?? 0)}</div>
          <div className="emp-stat-label">Net sales</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{summary?.invoiceCount ?? 0}</div>
          <div className="emp-stat-label">Invoices</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">
            {formatMoneyLkr(summary?.averageInvoiceValue ?? 0)}
          </div>
          <div className="emp-stat-label">Avg invoice</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{summary?.employeesGeneratedSales ?? 0}</div>
          <div className="emp-stat-label">Employees with sales</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{formatMoneyLkr(summary?.todaySales ?? 0)}</div>
          <div className="emp-stat-label">Today</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{formatMoneyLkr(summary?.monthSales ?? 0)}</div>
          <div className="emp-stat-label">This month</div>
        </div>
      </div>

      {activeQuery.isLoading && tab !== 'overview' ? (
        <section className="settings-panel">
          <div className="emp-skeleton" />
        </section>
      ) : activeQuery.isError && tab !== 'overview' ? (
        <OpsError
          message={getErrorMessage(activeQuery.error)}
          onRetry={() => void activeQuery.refetch()}
        />
      ) : (
        <>
          {tab === 'overview' && (
            <section className="settings-panel">
              <div className="settings-panel-header">
                <h2>Period summary</h2>
                <p>
                  Gross {formatMoneyLkr(summary?.grossSales ?? 0)} · Refunds{' '}
                  {formatMoneyLkr(summary?.refundAmount ?? 0)} · Net{' '}
                  {formatMoneyLkr(summary?.netSales ?? 0)}
                </p>
              </div>
              {(invoicesQuery.data?.data?.length ?? 0) === 0 ? (
                <div className="emp-empty">No invoices in this period.</div>
              ) : (
                <>
                  <div className="emp-table-wrap">
                    <table className="emp-table">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Date</th>
                          <th>Branch</th>
                          <th>Customer</th>
                          <th>Employees</th>
                          <th className="num">Net (LKR)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(invoicesQuery.data?.data ?? []).slice(0, 10).map((inv) => (
                          <tr key={inv.id}>
                            <td>
                              <Link to={`/salon/sales/${inv.id}`}>{inv.saleNumber}</Link>
                            </td>
                            <td>{formatDateTime(inv.createdAt)}</td>
                            <td>{inv.branchName}</td>
                            <td>{inv.customerName || 'Walk-in'}</td>
                            <td className="sa-employees-cell" title={employeeNames(inv)}>
                              {employeeNames(inv)}
                            </td>
                            <td className="num">{formatMoneyAmount(inv.netAmount)}</td>
                            <td>{inv.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="sa-pagination">
                    <div className="sa-pagination-info">Showing latest invoices</div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setTab('invoices')}>
                      View all invoices
                    </Button>
                  </div>
                </>
              )}
            </section>
          )}

          {tab === 'invoices' && (
            <InvoicesTable
              rows={invoicesQuery.data?.data ?? []}
              page={invoicesQuery.data?.meta.page ?? page}
              totalPages={invoicesQuery.data?.meta.totalPages ?? 1}
              total={invoicesQuery.data?.meta.total ?? 0}
              onPageChange={setPage}
            />
          )}

          {tab === 'employees' && (
            <EmployeesTable
              rows={employeesQuery.data?.data ?? []}
              page={employeesQuery.data?.meta.page ?? page}
              totalPages={employeesQuery.data?.meta.totalPages ?? 1}
              total={employeesQuery.data?.meta.total ?? 0}
              onPageChange={setPage}
              onSelect={openEmployee}
            />
          )}

          {tab === 'branches' && (
            <BranchesTable
              rows={branchesQuery.data?.data ?? []}
              page={branchesQuery.data?.meta.page ?? page}
              totalPages={branchesQuery.data?.meta.totalPages ?? 1}
              total={branchesQuery.data?.meta.total ?? 0}
              onPageChange={setPage}
              onSelect={openBranch}
            />
          )}

          {tab === 'daily' && (
            <DailyTable
              rows={daysQuery.data?.data ?? []}
              page={daysQuery.data?.meta.page ?? page}
              totalPages={daysQuery.data?.meta.totalPages ?? 1}
              total={daysQuery.data?.meta.total ?? 0}
              onPageChange={setPage}
              onSelect={openDay}
            />
          )}
        </>
      )}

      <Dialog
        open={!!selectedEmployeeId}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployeeId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {employeeDetailQuery.data?.summary.employeeName ?? 'Employee sales'}
            </DialogTitle>
          </DialogHeader>
          {employeeDetailQuery.isLoading ? (
            <div className="emp-skeleton" />
          ) : employeeDetailQuery.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(employeeDetailQuery.error)}
            </p>
          ) : employeeDetailQuery.data ? (
            <>
              <div className="sa-dialog-stats">
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {formatMoneyLkr(employeeDetailQuery.data.summary.allocatedSales)}
                  </div>
                  <div className="sa-dialog-stat-label">Service sales</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {employeeDetailQuery.data.summary.commissionRate}%
                  </div>
                  <div className="sa-dialog-stat-label">Commission rate</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {formatMoneyLkr(employeeDetailQuery.data.summary.commissionAmount)}
                  </div>
                  <div className="sa-dialog-stat-label">Estimated commission</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {employeeDetailQuery.data.summary.invoiceCount}
                  </div>
                  <div className="sa-dialog-stat-label">Eligible invoices</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {employeeDetailQuery.data.summary.employeeCode}
                  </div>
                  <div className="sa-dialog-stat-label">Code</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {employeeDetailQuery.data.summary.branchName}
                  </div>
                  <div className="sa-dialog-stat-label">Branch</div>
                </div>
              </div>
              <h3 className="sa-dialog-section-title">Contributing service lines</h3>
              {(employeeDetailQuery.data.data?.length ?? 0) === 0 ? (
                <div className="emp-empty">No service lines for this employee in the period.</div>
              ) : (
                <>
                  <div className="emp-table-wrap">
                    <table className="emp-table">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Date</th>
                          <th>Branch</th>
                          <th>Service</th>
                          <th className="num">Service value (LKR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeDetailQuery.data.data.map((inv, index) => (
                          <tr key={`${inv.id}-${inv.serviceName ?? 'line'}-${index}`}>
                            <td>
                              <Link to={`/salon/sales/${inv.id}`}>{inv.saleNumber}</Link>
                            </td>
                            <td>{formatDateTime(inv.createdAt)}</td>
                            <td>{inv.branchName}</td>
                            <td>{inv.serviceName || '—'}</td>
                            <td className="num">{formatMoneyAmount(inv.employeeSales)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    page={employeeDetailQuery.data.meta.page}
                    totalPages={employeeDetailQuery.data.meta.totalPages}
                    total={employeeDetailQuery.data.meta.total}
                    onPageChange={setEmployeeDetailPage}
                  />
                </>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedBranchId}
        onOpenChange={(open) => {
          if (!open) setSelectedBranchId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {branchDetailQuery.data?.branch.name ?? 'Branch sales'}
            </DialogTitle>
          </DialogHeader>
          {branchDetailQuery.isLoading ? (
            <div className="emp-skeleton" />
          ) : branchDetailQuery.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(branchDetailQuery.error)}
            </p>
          ) : branchDetailQuery.data ? (
            <>
              <div className="sa-dialog-stats">
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {formatMoneyLkr(branchDetailQuery.data.summary.netSales)}
                  </div>
                  <div className="sa-dialog-stat-label">Net sales</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {branchDetailQuery.data.summary.invoiceCount}
                  </div>
                  <div className="sa-dialog-stat-label">Invoices</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {formatMoneyLkr(branchDetailQuery.data.summary.averageInvoiceValue)}
                  </div>
                  <div className="sa-dialog-stat-label">Avg invoice</div>
                </div>
              </div>
              <h3 className="sa-dialog-section-title">Employees</h3>
              {(branchDetailQuery.data.employees?.length ?? 0) === 0 ? (
                <div className="emp-empty">No employee sales for this branch.</div>
              ) : (
                <div className="emp-table-wrap">
                  <table className="emp-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th className="num">Invoices</th>
                        <th className="num">Service sales (LKR)</th>
                        <th className="num">Commission (LKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchDetailQuery.data.employees.map((row) => (
                        <tr
                          key={row.employeeId}
                          className="sa-row-click"
                          onClick={() => openEmployee(row.employeeId)}
                        >
                          <td>
                            <div>{row.employeeName}</div>
                            <div className="emp-panel-desc">{row.employeeCode}</div>
                          </td>
                          <td className="num">{row.attendedInvoiceCount}</td>
                          <td className="num">{formatMoneyAmount(row.allocatedSales)}</td>
                          <td className="num">{formatMoneyAmount(row.commissionAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Invoices · {selectedDay ? formatDate(selectedDay) : ''}
            </DialogTitle>
          </DialogHeader>
          {dayInvoicesQuery.isLoading ? (
            <div className="emp-skeleton" />
          ) : dayInvoicesQuery.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(dayInvoicesQuery.error)}</p>
          ) : (dayInvoicesQuery.data?.data?.length ?? 0) === 0 ? (
            <div className="emp-empty">No invoices on this day.</div>
          ) : (
            <>
              <div className="emp-table-wrap">
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Time</th>
                      <th>Branch</th>
                      <th>Customer</th>
                      <th className="num">Net (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dayInvoicesQuery.data?.data ?? []).map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <Link to={`/salon/sales/${inv.id}`}>{inv.saleNumber}</Link>
                        </td>
                        <td>{formatDateTime(inv.createdAt)}</td>
                        <td>{inv.branchName}</td>
                        <td>{inv.customerName || 'Walk-in'}</td>
                        <td className="num">{formatMoneyAmount(inv.netAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={dayInvoicesQuery.data?.meta.page ?? 1}
                totalPages={dayInvoicesQuery.data?.meta.totalPages ?? 1}
                total={dayInvoicesQuery.data?.meta.total ?? 0}
                onPageChange={setDayInvoicesPage}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoicesTable({
  rows,
  page,
  totalPages,
  total,
  onPageChange,
}: {
  rows: SalesAnalyticsInvoice[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (rows.length === 0) {
    return (
      <section className="settings-panel">
        <div className="emp-empty">No invoices found for the selected filters.</div>
      </section>
    );
  }

  return (
    <section className="settings-panel">
      <div className="settings-panel-header">
        <h2>Invoices</h2>
        <p>{total} invoice{total === 1 ? '' : 's'}</p>
      </div>
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Branch</th>
              <th>Customer</th>
              <th>Employees</th>
              <th className="num">Gross (LKR)</th>
              <th className="num">Refund (LKR)</th>
              <th className="num">Net (LKR)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <Link to={`/salon/sales/${inv.id}`}>{inv.saleNumber}</Link>
                </td>
                <td>{formatDateTime(inv.createdAt)}</td>
                <td>{inv.branchName}</td>
                <td>{inv.customerName || 'Walk-in'}</td>
                <td className="sa-employees-cell" title={employeeNames(inv)}>
                  {employeeNames(inv)}
                </td>
                <td className="num">{formatMoneyAmount(inv.invoiceTotal)}</td>
                <td className="num">{formatMoneyAmount(inv.refundedAmount)}</td>
                <td className="num">{formatMoneyAmount(inv.netAmount)}</td>
                <td>{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </section>
  );
}

function EmployeesTable({
  rows,
  page,
  totalPages,
  total,
  onPageChange,
  onSelect,
}: {
  rows: SalesAnalyticsEmployeeRow[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onSelect: (employeeId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <section className="settings-panel">
        <div className="emp-empty">No employee sales for the selected filters.</div>
      </section>
    );
  }

  return (
    <section className="settings-panel">
      <div className="settings-panel-header">
        <h2>By employee</h2>
        <p>
            {total} employee{total === 1 ? '' : 's'} · click a row for detail
          </p>
      </div>
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Branch</th>
              <th className="num">Invoices</th>
              <th className="num">Service sales (LKR)</th>
              <th className="num">Rate</th>
              <th className="num">Commission (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.employeeId}
                className="sa-row-click"
                onClick={() => onSelect(row.employeeId)}
              >
                <td>
                  <div>{row.employeeName}</div>
                  <div className="emp-panel-desc">
                    {row.employeeCode}
                    {row.designation ? ` · ${row.designation}` : ''}
                  </div>
                </td>
                <td>{row.branchName}</td>
                <td className="num">{row.attendedInvoiceCount}</td>
                <td className="num">{formatMoneyAmount(row.allocatedSales)}</td>
                <td className="num">{row.commissionRate}%</td>
                <td className="num">{formatMoneyAmount(row.commissionAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </section>
  );
}

function BranchesTable({
  rows,
  page,
  totalPages,
  total,
  onPageChange,
  onSelect,
}: {
  rows: SalesAnalyticsBranchRow[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onSelect: (branchId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <section className="settings-panel">
        <div className="emp-empty">No branch sales for the selected filters.</div>
      </section>
    );
  }

  return (
    <section className="settings-panel">
      <div className="settings-panel-header">
        <h2>By branch</h2>
        <p>
            {total} branch{total === 1 ? '' : 'es'} · click a row for detail
          </p>
      </div>
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th className="num">Invoices</th>
              <th className="num">Gross (LKR)</th>
              <th className="num">Refunds (LKR)</th>
              <th className="num">Net (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.branchId}
                className="sa-row-click"
                onClick={() => onSelect(row.branchId)}
              >
                <td>{row.branchName}</td>
                <td className="num">{row.invoiceCount}</td>
                <td className="num">{formatMoneyAmount(row.grossSales)}</td>
                <td className="num">{formatMoneyAmount(row.refunds)}</td>
                <td className="num">{formatMoneyAmount(row.netSales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </section>
  );
}

function DailyTable({
  rows,
  page,
  totalPages,
  total,
  onPageChange,
  onSelect,
}: {
  rows: SalesAnalyticsDayRow[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onSelect: (date: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <section className="settings-panel">
        <div className="emp-empty">No daily sales for the selected filters.</div>
      </section>
    );
  }

  return (
    <section className="settings-panel">
      <div className="settings-panel-header">
        <h2>By day</h2>
        <p>
            {total} day{total === 1 ? '' : 's'} · click a row to view invoices
          </p>
      </div>
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th className="num">Invoices</th>
              <th className="num">Gross (LKR)</th>
              <th className="num">Refunds (LKR)</th>
              <th className="num">Net (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const day = String(row.date).slice(0, 10);
              return (
                <tr key={day} className="sa-row-click" onClick={() => onSelect(day)}>
                  <td>{formatDate(day)}</td>
                  <td className="num">{row.invoiceCount}</td>
                  <td className="num">{formatMoneyAmount(row.grossSales)}</td>
                  <td className="num">{formatMoneyAmount(row.refunds)}</td>
                  <td className="num">{formatMoneyAmount(row.netSales)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </section>
  );
}
