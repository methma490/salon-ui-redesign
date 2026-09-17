import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  tenantApi,
  type PaginatedResponse,
  type PayslipDetail,
  type PayslipListItem,
} from '@/api/tenant.api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getErrorMessage, OpsError, OpsLoading, OpsPageHeader } from './salon-ops-ui';
import './employees-page.css';
import './payroll-page.css';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function unwrapList<T>(payload: PaginatedResponse<T> | T[]): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(month: number) {
  return MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

function PayslipStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'PAID'
      ? 'emp-badge emp-badge-active'
      : status === 'FINALIZED'
        ? 'emp-badge emp-badge-inactive'
        : 'emp-badge';
  return <span className={cls}>{status}</span>;
}

function moneyRow(label: string, amount: number, extra = '') {
  return `<tr${extra}><td style="padding:6px 0;border-bottom:1px solid #f1f5f9">${label}</td><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-variant-numeric:tabular-nums">LKR ${formatMoney(amount)}</td></tr>`;
}

function buildPayslipHtml(detail: PayslipDetail, salonName: string) {
  const period = `${monthLabel(detail.month)} ${detail.year}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Payslip - ${detail.employeeName} - ${period}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; }
    h1 { text-align: center; margin: 0 0 0.25rem; font-size: 1.25rem; }
    .meta { text-align: center; color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .employee { margin-bottom: 1rem; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .net td { font-weight: 700; border-top: 2px solid #1e293b; padding-top: 0.75rem; }
    h3 { font-size: 0.75rem; text-transform: uppercase; color: #64748b; margin: 1rem 0 0.5rem; }
  </style>
</head>
<body>
  <h1>${salonName}</h1>
  <p class="meta">Payslip — ${period}</p>
  <div class="employee">
    <div><strong>${detail.employeeName}</strong> (${detail.employeeCode})</div>
    <div>Designation: ${detail.designation || '—'}</div>
    <div>Status: ${detail.status}</div>
  </div>
  <h3>Earnings</h3>
  <table>
    ${moneyRow('Basic Salary', detail.basicSalary)}
    ${moneyRow('Commission', detail.commissionAmount)}
    ${moneyRow('Bonus', detail.bonus)}
    ${moneyRow('Gross Salary', detail.grossSalary)}
  </table>
  <h3>Deductions</h3>
  <table>
    ${moneyRow('Employee EPF', detail.employeeEpf)}
    ${moneyRow('Loan Deduction', detail.loanDeduction)}
    ${moneyRow('Other Deduction', detail.otherDeduction)}
    ${moneyRow('Total Deductions', detail.totalDeductions)}
    ${moneyRow('Net Salary', detail.netSalary, ' class="net"')}
  </table>
  <h3>Employer Contributions</h3>
  <table>
    ${moneyRow('Employer EPF', detail.employerEpf)}
    ${moneyRow('Employer ETF', detail.employerEtf)}
  </table>
</body>
</html>`;
}

function downloadPayslipHtml(detail: PayslipDetail, salonName: string) {
  const html = buildPayslipHtml(detail, salonName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = detail.employeeCode || detail.employeeName.replace(/\s+/g, '-');
  anchor.href = url;
  anchor.download = `payslip-${safeName}-${detail.year}-${detail.month}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function PayslipPrintView({ detail, salonName }: { detail: PayslipDetail; salonName: string }) {
  return (
    <div className="payslip-print-area" id="payslip-print-area">
      <div className="payslip-header">
        <h2>{salonName}</h2>
        <p>Payslip</p>
        <p>
          {monthLabel(detail.month)} {detail.year}
        </p>
      </div>

      <div className="payslip-meta">
        <div>
          <strong>Employee:</strong> {detail.employeeName} ({detail.employeeCode})
        </div>
        <div>
          <strong>Designation:</strong> {detail.designation || '—'}
        </div>
        <div>
          <strong>Status:</strong> {detail.status}
        </div>
      </div>

      <div className="payslip-section">
        <div className="payslip-section-title">Earnings</div>
        <div className="payslip-row">
          <span className="label">Basic Salary</span>
          <span className="value">LKR {formatMoney(detail.basicSalary)}</span>
        </div>
        <div className="payslip-row">
          <span className="label">Commission</span>
          <span className="value">LKR {formatMoney(detail.commissionAmount)}</span>
        </div>
        <div className="payslip-row">
          <span className="label">Bonus</span>
          <span className="value">LKR {formatMoney(detail.bonus)}</span>
        </div>
        <div className="payslip-row">
          <span className="label">Gross Salary</span>
          <span className="value">LKR {formatMoney(detail.grossSalary)}</span>
        </div>
      </div>

      <div className="payslip-section">
        <div className="payslip-section-title">Deductions</div>
        <div className="payslip-row">
          <span className="label">Employee EPF</span>
          <span className="value">LKR {formatMoney(detail.employeeEpf)}</span>
        </div>
        <div className="payslip-row">
          <span className="label">Loan Deduction</span>
          <span className="value">LKR {formatMoney(detail.loanDeduction)}</span>
        </div>
        <div className="payslip-row">
          <span className="label">Other Deduction</span>
          <span className="value">LKR {formatMoney(detail.otherDeduction)}</span>
        </div>
        <div className="payslip-row">
          <span className="label">Total Deductions</span>
          <span className="value">LKR {formatMoney(detail.totalDeductions)}</span>
        </div>
      </div>

      <div className="payslip-row total">
        <span className="label">Net Salary</span>
        <span className="value">LKR {formatMoney(detail.netSalary)}</span>
      </div>

      <div className="payslip-section" style={{ marginTop: '1.5rem' }}>
        <div className="payslip-section-title">Employer Contributions</div>
        <div className="payslip-row">
          <span className="label">Employer EPF</span>
          <span className="value">LKR {formatMoney(detail.employerEpf)}</span>
        </div>
        <div className="payslip-row">
          <span className="label">Employer ETF</span>
          <span className="value">LKR {formatMoney(detail.employerEtf)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PayslipsPage() {
  const now = new Date();
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [viewId, setViewId] = useState<string | null>(null);

  const listParams: Record<string, string> = { limit: '100' };
  if (yearFilter !== 'all') listParams.year = yearFilter;
  if (monthFilter !== 'all') listParams.month = monthFilter;

  const {
    data: payslipsPayload,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['payroll-payslips', listParams],
    queryFn: () => tenantApi.payroll.listPayslips(listParams),
  });

  const allPayslips = unwrapList(payslipsPayload ?? []);
  const searchLower = search.trim().toLowerCase();
  const payslips = searchLower
    ? allPayslips.filter(
        (p) =>
          p.employeeName.toLowerCase().includes(searchLower) ||
          p.employeeCode.toLowerCase().includes(searchLower),
      )
    : allPayslips;

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantApi.settings.get,
    staleTime: 60_000,
  });

  const { data: payslipDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['payroll-payslip', viewId],
    queryFn: () => tenantApi.payroll.getPayslip(viewId!),
    enabled: !!viewId,
  });

  const salonName = settings?.salon.name ?? 'Salon';
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const totalNet = payslips.reduce((sum, p) => sum + p.netSalary, 0);

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page payroll-page">
      <OpsPageHeader title="Payslips" subtitle="View and print finalized employee payslips" />

      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{payslips.length}</div>
          <div className="emp-stat-label">Payslips</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">LKR {formatMoney(totalNet)}</div>
          <div className="emp-stat-label">Total net</div>
        </div>
      </div>

      <div className="emp-panel">
        <div className="payroll-toolbar">
          <div className="payroll-toolbar-title">Filters</div>
          <div className="emp-filter-grid cols-3">
            <div className="emp-filter-field">
              <Label>Search</Label>
              <Input
                placeholder="Employee name, code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="emp-filter-field">
              <Label>Year</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="emp-filter-field">
              <Label>Month</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">Payslip records</h2>
            <p className="emp-panel-desc">
              {payslips.length} payslip{payslips.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {payslips.length === 0 ? (
          <div className="emp-empty">
            No payslips yet. Finalize a payroll run to generate payslips.
          </div>
        ) : (
          <>
            <div className="emp-cards">
              {payslips.map((p: PayslipListItem) => (
                <article key={p.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{p.employeeName}</div>
                      <div className="emp-code">
                        {monthLabel(p.month)} {p.year}
                      </div>
                    </div>
                    <PayslipStatusBadge status={p.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Gross:</strong> LKR {formatMoney(p.grossSalary)}
                    </span>
                    <span>
                      <strong>Net:</strong> LKR {formatMoney(p.netSalary)}
                    </span>
                  </div>
                  <div className="emp-card-actions">
                    <button
                      type="button"
                      className="emp-btn emp-btn-primary"
                      onClick={() => setViewId(p.id)}
                    >
                      View
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Designation</th>
                    <th className="num">Gross</th>
                    <th className="num">Deductions</th>
                    <th className="num">Net</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p: PayslipListItem) => (
                    <tr key={p.id}>
                      <td>
                        <div className="emp-name-cell">{p.employeeName}</div>
                        <div className="emp-code">{p.employeeCode}</div>
                      </td>
                      <td>
                        {monthLabel(p.month)} {p.year}
                      </td>
                      <td>{p.designation || '—'}</td>
                      <td className="num">LKR {formatMoney(p.grossSalary)}</td>
                      <td className="num">LKR {formatMoney(p.totalDeductions)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        LKR {formatMoney(p.netSalary)}
                      </td>
                      <td>
                        <PayslipStatusBadge status={p.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="emp-link-btn"
                          onClick={() => setViewId(p.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!viewId} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="payslip-no-print">
            <DialogTitle>Payslip</DialogTitle>
          </DialogHeader>

          {detailLoading && <div className="emp-skeleton" style={{ height: 200 }} />}

          {payslipDetail && (
            <>
              <div className="payslip-modal-actions payslip-no-print">
                <button
                  type="button"
                  className="emp-btn emp-btn-primary"
                  onClick={() => window.print()}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => downloadPayslipHtml(payslipDetail, salonName)}
                >
                  Download HTML
                </button>
              </div>
              <PayslipPrintView detail={payslipDetail} salonName={salonName} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
