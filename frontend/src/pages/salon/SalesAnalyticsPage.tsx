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
import { getErrorMessage, OpsError, OpsLoading, OpsPageHeader } from './salon-ops-ui';
import './employees-page.css';
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

function formatMoney(value: number) {
  return `LKR ${Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultCustomRange() {
  const now = new Date();
  return {
    from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
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
  const [tab, setTab] = useState<TabKey>('overview');
  const [preset, setPreset] = useState<SalesAnalyticsPreset>('this_month');
  const [customFrom, setCustomFrom] = useState(defaultCustomRange().from);
  const [customTo, setCustomTo] = useState(defaultCustomRange().to);
  const [branchId, setBranchId] = useState('all');
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

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

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
    <div className="emp-page">
      <OpsPageHeader
        title="Sales"
        subtitle="Analyze invoices, employee commissionables, branch performance, and daily trends"
      />

      <div className="emp-panel emp-form-panel">
        <div className="emp-form-panel-title">Filters</div>
        <div className="emp-filter-grid cols-3">
          <div className="emp-filter-field">
            <Label>Date range</Label>
            <Select
              value={preset}
              onValueChange={(v) => setPreset(v as SalesAnalyticsPreset)}
            >
              <SelectTrigger>
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
          <div className="emp-filter-field">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
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
          <div className="emp-filter-field">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
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
            <div className="emp-filter-field">
              <Label>Search</Label>
              <Input
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
              <div className="emp-filter-field">
                <Label>From</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="emp-filter-field">
                <Label>To</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
        {range && (
          <p className="emp-panel-desc" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            Showing {formatDate(range.from)} – {formatDate(range.to)}
          </p>
        )}
      </div>

      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{formatMoney(summary?.netSales ?? 0)}</div>
          <div className="emp-stat-label">Net sales</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{summary?.invoiceCount ?? 0}</div>
          <div className="emp-stat-label">Invoices</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">
            {formatMoney(summary?.averageInvoiceValue ?? 0)}
          </div>
          <div className="emp-stat-label">Avg invoice</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{summary?.employeesGeneratedSales ?? 0}</div>
          <div className="emp-stat-label">Employees with sales</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{formatMoney(summary?.todaySales ?? 0)}</div>
          <div className="emp-stat-label">Today</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{formatMoney(summary?.monthSales ?? 0)}</div>
          <div className="emp-stat-label">This month</div>
        </div>
      </div>

      <div className="emp-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`emp-tab${tab === t.key ? ' emp-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeQuery.isLoading && tab !== 'overview' ? (
        <div className="emp-panel">
          <div className="emp-skeleton" />
        </div>
      ) : activeQuery.isError && tab !== 'overview' ? (
        <OpsError
          message={getErrorMessage(activeQuery.error)}
          onRetry={() => void activeQuery.refetch()}
        />
      ) : (
        <>
          {tab === 'overview' && (
            <div className="emp-panel">
              <div className="emp-panel-header">
                <div>
                  <h2 className="emp-panel-title">Period summary</h2>
                  <p className="emp-panel-desc">
                    Gross {formatMoney(summary?.grossSales ?? 0)} · Refunds{' '}
                    {formatMoney(summary?.refundAmount ?? 0)} · Net{' '}
                    {formatMoney(summary?.netSales ?? 0)}
                  </p>
                </div>
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
                          <th className="num">Net</th>
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
                            <td className="num">{formatMoney(inv.netAmount)}</td>
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
            </div>
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
                    {formatMoney(employeeDetailQuery.data.summary.allocatedSales)}
                  </div>
                  <div className="sa-dialog-stat-label">Allocated sales</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {employeeDetailQuery.data.summary.commissionRate}%
                  </div>
                  <div className="sa-dialog-stat-label">Commission rate</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {formatMoney(employeeDetailQuery.data.summary.commissionAmount)}
                  </div>
                  <div className="sa-dialog-stat-label">Commission</div>
                </div>
                <div className="sa-dialog-stat">
                  <div className="sa-dialog-stat-value">
                    {employeeDetailQuery.data.summary.invoiceCount}
                  </div>
                  <div className="sa-dialog-stat-label">Invoices</div>
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
              <h3 className="sa-dialog-section-title">Invoices</h3>
              {(employeeDetailQuery.data.data?.length ?? 0) === 0 ? (
                <div className="emp-empty">No invoices for this employee in the period.</div>
              ) : (
                <>
                  <div className="emp-table-wrap">
                    <table className="emp-table">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Date</th>
                          <th>Customer</th>
                          <th className="num">Employee sales</th>
                          <th className="num">Alloc %</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeDetailQuery.data.data.map((inv) => (
                          <tr key={`${inv.id}-${inv.assignmentType}`}>
                            <td>
                              <Link to={`/salon/sales/${inv.id}`}>{inv.saleNumber}</Link>
                            </td>
                            <td>{formatDateTime(inv.createdAt)}</td>
                            <td>{inv.customerName || 'Walk-in'}</td>
                            <td className="num">{formatMoney(inv.employeeSales)}</td>
                            <td className="num">{inv.allocationPercentage}%</td>
                            <td>{inv.assignmentType}</td>
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
                    {formatMoney(branchDetailQuery.data.summary.netSales)}
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
                    {formatMoney(branchDetailQuery.data.summary.averageInvoiceValue)}
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
                        <th className="num">Allocated</th>
                        <th className="num">Commission</th>
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
                          <td className="num">{formatMoney(row.allocatedSales)}</td>
                          <td className="num">{formatMoney(row.commissionAmount)}</td>
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
                      <th className="num">Net</th>
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
                        <td className="num">{formatMoney(inv.netAmount)}</td>
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
      <div className="emp-panel">
        <div className="emp-empty">No invoices found for the selected filters.</div>
      </div>
    );
  }

  return (
    <div className="emp-panel">
      <div className="emp-panel-header">
        <div>
          <h2 className="emp-panel-title">Invoices</h2>
          <p className="emp-panel-desc">{total} invoice{total === 1 ? '' : 's'}</p>
        </div>
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
              <th className="num">Gross</th>
              <th className="num">Refund</th>
              <th className="num">Net</th>
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
                <td className="num">{formatMoney(inv.invoiceTotal)}</td>
                <td className="num">{formatMoney(inv.refundedAmount)}</td>
                <td className="num">{formatMoney(inv.netAmount)}</td>
                <td>{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
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
      <div className="emp-panel">
        <div className="emp-empty">No employee sales for the selected filters.</div>
      </div>
    );
  }

  return (
    <div className="emp-panel">
      <div className="emp-panel-header">
        <div>
          <h2 className="emp-panel-title">By employee</h2>
          <p className="emp-panel-desc">
            {total} employee{total === 1 ? '' : 's'} · click a row for detail
          </p>
        </div>
      </div>
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Branch</th>
              <th className="num">Invoices</th>
              <th className="num">Allocated</th>
              <th className="num">Rate</th>
              <th className="num">Commission</th>
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
                <td className="num">{formatMoney(row.allocatedSales)}</td>
                <td className="num">{row.commissionRate}%</td>
                <td className="num">{formatMoney(row.commissionAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
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
      <div className="emp-panel">
        <div className="emp-empty">No branch sales for the selected filters.</div>
      </div>
    );
  }

  return (
    <div className="emp-panel">
      <div className="emp-panel-header">
        <div>
          <h2 className="emp-panel-title">By branch</h2>
          <p className="emp-panel-desc">
            {total} branch{total === 1 ? '' : 'es'} · click a row for detail
          </p>
        </div>
      </div>
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th className="num">Invoices</th>
              <th className="num">Gross</th>
              <th className="num">Refunds</th>
              <th className="num">Net</th>
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
                <td className="num">{formatMoney(row.grossSales)}</td>
                <td className="num">{formatMoney(row.refunds)}</td>
                <td className="num">{formatMoney(row.netSales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
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
      <div className="emp-panel">
        <div className="emp-empty">No daily sales for the selected filters.</div>
      </div>
    );
  }

  return (
    <div className="emp-panel">
      <div className="emp-panel-header">
        <div>
          <h2 className="emp-panel-title">By day</h2>
          <p className="emp-panel-desc">
            {total} day{total === 1 ? '' : 's'} · click a row to view invoices
          </p>
        </div>
      </div>
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th className="num">Invoices</th>
              <th className="num">Gross</th>
              <th className="num">Refunds</th>
              <th className="num">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const day = String(row.date).slice(0, 10);
              return (
                <tr key={day} className="sa-row-click" onClick={() => onSelect(day)}>
                  <td>{formatDate(day)}</td>
                  <td className="num">{row.invoiceCount}</td>
                  <td className="num">{formatMoney(row.grossSales)}</td>
                  <td className="num">{formatMoney(row.refunds)}</td>
                  <td className="num">{formatMoney(row.netSales)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
  );
}
