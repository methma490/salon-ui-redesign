import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  tenantApi,
  type PaginatedResponse,
  type PayrollItem,
} from '@/api/tenant.api';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import {
  getErrorMessage,
  OpsError,
  OpsLoading,
} from './salon-ops-ui';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { printReportDocument } from '@/lib/print-report';
import './employees-page.css';
import './settings-page.css';
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
  return formatMoneyAmount(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(month: number) {
  return MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

function PayrollStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'DRAFT'
      ? 'pr-badge pr-badge-draft'
      : status === 'FINALIZED'
        ? 'pr-badge pr-badge-done'
        : status === 'PAID'
          ? 'pr-badge pr-badge-paid'
          : 'pr-badge';
  return <span className={cls}>{status}</span>;
}

type ItemDraft = {
  commissionBase: string;
  commissionPercentage: string;
  bonus: string;
  otherDeduction: string;
};

function itemToDraft(item: PayrollItem): ItemDraft {
  return {
    commissionBase: String(item.commissionBase ?? 0),
    commissionPercentage: String(item.commissionPercentage ?? 0),
    bonus: String(item.bonus ?? 0),
    otherDeduction: String(item.otherDeduction ?? 0),
  };
}

function draftPayload(draft: ItemDraft) {
  return {
    commissionBase: Number(draft.commissionBase) || 0,
    commissionPercentage: Number(draft.commissionPercentage) || 0,
    bonus: Number(draft.bonus) || 0,
    otherDeduction: Number(draft.otherDeduction) || 0,
  };
}

function previewCommission(draft: ItemDraft) {
  const base = Number(draft.commissionBase) || 0;
  const pct = Number(draft.commissionPercentage) || 0;
  return (base * pct) / 100;
}

export default function PayrollRunsPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});

  const {
    data: runsPayload,
    isLoading: runsLoading,
    isError: runsError,
    error: runsErr,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () => tenantApi.payroll.listRuns({ limit: '50' }),
  });

  const runs = unwrapList(runsPayload ?? []);

  const { data: selectedRun, isLoading: runLoading } = useQuery({
    queryKey: ['payroll-run', selectedRunId],
    queryFn: () => tenantApi.payroll.getRun(selectedRunId!),
    enabled: !!selectedRunId,
  });

  useEffect(() => {
    if (selectedRun?.items) {
      const drafts: Record<string, ItemDraft> = {};
      for (const item of selectedRun.items) {
        drafts[item.id] = itemToDraft(item);
      }
      setItemDrafts(drafts);
    } else {
      setItemDrafts({});
    }
  }, [selectedRun]);

  useEffect(() => {
    if (!selectedRunId && runs.length > 0) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const createRunMutation = useMutation({
    mutationFn: () => tenantApi.payroll.createRun({ year, month }),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      setSelectedRunId(run.id);
      toast.success('Payroll run created successfully.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      runId,
      itemId,
      data,
    }: {
      runId: string;
      itemId: string;
      data: Record<string, unknown>;
    }) => tenantApi.payroll.updateItem(runId, itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-run', selectedRunId] });
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll item updated.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = useState(false);

  const finalizeMutation = useMutation({
    mutationFn: (id: string) => tenantApi.payroll.finalize(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-run', selectedRunId] });
      setFinalizeConfirmOpen(false);
      toast.success('Payroll run finalized successfully! Payslips generated.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => tenantApi.payroll.markPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-run', selectedRunId] });
      toast.success('Payroll marked as paid.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const saveItem = (itemId: string) => {
    if (!selectedRunId || !selectedRun || selectedRun.status !== 'DRAFT') return;
    const draft = itemDrafts[itemId];
    if (!draft) return;
    updateItemMutation.mutate({
      runId: selectedRunId,
      itemId,
      data: draftPayload(draft),
    });
  };

  const saveAllDraft = () => {
    if (!selectedRun?.items || selectedRun.status !== 'DRAFT') return;
    for (const item of selectedRun.items) {
      saveItem(item.id);
    }
  };

  const updateDraft = (itemId: string, patch: Partial<ItemDraft>) => {
    setItemDrafts((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  };

  const confirmFinalize = () => {
    if (!selectedRun) return;
    setFinalizeConfirmOpen(true);
  };

  const { user } = useAuth();

  const handleExportExcel = () => {
    if (!selectedRun) return;

    const runItems = selectedRun.items || [];
    const periodLabel = `${monthLabel(selectedRun.month)} ${selectedRun.year}`;
    const salonName = user?.tenant?.name || 'Salon Management System';

    const headers = [
      '#',
      'Employee Code',
      'Employee Name',
      'Designation',
      'Basic Salary (Rs.)',
      'Commission Base (Rs.)',
      'Commission %',
      'Commission Amount (Rs.)',
      'Bonus / Allowance (Rs.)',
      'Gross Salary (Rs.)',
      'Advance Deduction (Rs.)',
      'Loan Deduction (Rs.)',
      'Employee EPF 8% (Rs.)',
      'Other Deduction (Rs.)',
      'Total Deductions (Rs.)',
      'Net Salary (Rs.)',
      'Employer EPF 12% (Rs.)',
      'Employer ETF 3% (Rs.)',
    ];

    const isDraftRun = selectedRun.status === 'DRAFT';

    const rows = runItems.map((item, idx) => {
      const draft = itemDrafts[item.id] ?? itemToDraft(item);
      const liveCommission = previewCommission(draft);
      const commAmount = isDraftRun ? liveCommission : Number(item.commissionAmount) || 0;
      const bonusAmount = isDraftRun ? Number(draft.bonus) || 0 : Number(item.bonus) || 0;
      const otherDed = isDraftRun ? Number(draft.otherDeduction) || 0 : Number(item.otherDeduction) || 0;

      return [
        idx + 1,
        `"${(item.employeeCode || '').replace(/"/g, '""')}"`,
        `"${(item.employeeName || '').replace(/"/g, '""')}"`,
        `"${(item.designation || 'Staff').replace(/"/g, '""')}"`,
        (Number(item.basicSalary) || 0).toFixed(2),
        (Number(item.commissionBase) || 0).toFixed(2),
        (Number(item.commissionPercentage) || 0).toFixed(2),
        commAmount.toFixed(2),
        bonusAmount.toFixed(2),
        (Number(item.grossSalary) || 0).toFixed(2),
        (Number(item.advanceDeduction) || 0).toFixed(2),
        (Number(item.loanDeduction) || 0).toFixed(2),
        (Number(item.employeeEpf) || 0).toFixed(2),
        otherDed.toFixed(2),
        (Number(item.totalDeductions) || 0).toFixed(2),
        (Number(item.netSalary) || 0).toFixed(2),
        (Number(item.employerEpf) || 0).toFixed(2),
        (Number(item.employerEtf) || 0).toFixed(2),
      ];
    });

    const totalBasic = runItems.reduce((s, it) => s + (Number(it.basicSalary) || 0), 0);
    const totalComm = runItems.reduce((s, it) => s + (Number(it.commissionAmount) || 0), 0);
    const totalBonus = runItems.reduce((s, it) => s + (Number(it.bonus) || 0), 0);
    const totalGross = Number(selectedRun.totalGross) || 0;
    const totalAdvance = runItems.reduce((s, it) => s + (Number(it.advanceDeduction) || 0), 0);
    const totalLoan = runItems.reduce((s, it) => s + (Number(it.loanDeduction) || 0), 0);
    const totalEmpEpf = runItems.reduce((s, it) => s + (Number(it.employeeEpf) || 0), 0);
    const totalOtherDed = runItems.reduce((s, it) => s + (Number(it.otherDeduction) || 0), 0);
    const totalDeductions = Number(selectedRun.totalDeductions) || 0;
    const totalNet = Number(selectedRun.totalNet) || 0;
    const totalEmployerEpf = runItems.reduce((s, it) => s + (Number(it.employerEpf) || 0), 0);
    const totalEmployerEtf = runItems.reduce((s, it) => s + (Number(it.employerEtf) || 0), 0);

    const totalsRow = [
      'TOTAL',
      '',
      `"${runItems.length} Staff"`,
      '',
      totalBasic.toFixed(2),
      '',
      '',
      totalComm.toFixed(2),
      totalBonus.toFixed(2),
      totalGross.toFixed(2),
      totalAdvance.toFixed(2),
      totalLoan.toFixed(2),
      totalEmpEpf.toFixed(2),
      totalOtherDed.toFixed(2),
      totalDeductions.toFixed(2),
      totalNet.toFixed(2),
      totalEmployerEpf.toFixed(2),
      totalEmployerEtf.toFixed(2),
    ];

    const metaRows = [
      [`"${salonName} - PAYROLL SUMMARY STATEMENT"`],
      [`"Period: ${periodLabel}"`],
      [`"Status: ${selectedRun.status}"`],
      [`"Generated on: ${new Date().toLocaleString()}"`],
      [
        `"Total Gross: LKR ${totalGross.toFixed(2)}"`,
        `"Total Deductions: LKR ${totalDeductions.toFixed(2)}"`,
        `"Net Payable: LKR ${totalNet.toFixed(2)}"`,
      ],
      [],
    ];

    const csvContent =
      '\uFEFF' +
      metaRows.map((r) => r.join(',')).join('\r\n') +
      '\r\n' +
      headers.join(',') +
      '\r\n' +
      rows.map((r) => r.join(',')).join('\r\n') +
      '\r\n' +
      totalsRow.join(',');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Payroll_Report_${monthLabel(selectedRun.month)}_${selectedRun.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Payroll report downloaded as Excel (CSV).');
  };

  const handleExportPdf = () => {
    if (!selectedRun) return;
    const docTitle = `Payroll_Report_${monthLabel(selectedRun.month)}_${selectedRun.year}`;
    printReportDocument('payroll-report-print-target', docTitle);
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const isDraft = selectedRun?.status === 'DRAFT';
  const items = selectedRun?.items ?? [];
  const showStickyActions = !!selectedRun;

  if (runsLoading) return <OpsLoading />;
  if (runsError) {
    return <OpsError message={getErrorMessage(runsErr)} onRetry={() => void refetchRuns()} />;
  }

  return (
    <div
      className={`emp-page settings-shell payroll-page${showStickyActions ? ' has-sticky-actions' : ''}`}
    >
      {/* Quick summary pills */}
      <div className="flex items-center justify-end gap-2 mb-2">
        <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200/80 text-slate-700 shadow-2xs">
          {runs.length} runs
        </span>
        {selectedRun && (
          <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 shadow-2xs font-mono">
            Net {formatMoney(selectedRun.totalNet)}
          </span>
        )}
      </div>

      <section className="pr-card">
        <div className="pr-card-head">
          <h2>Generate</h2>
          <p>Commission from service sales · EPF/ETF in Settings</p>
        </div>

        <div className="pr-generate">
          <div className="pr-field">
            <Label htmlFor="pr-year">Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger id="pr-year" className="pr-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pr-field">
            <Label htmlFor="pr-month">Month</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger id="pr-month" className="pr-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            className="pr-btn pr-btn-primary pr-generate-btn"
            disabled={createRunMutation.isPending}
            onClick={() => createRunMutation.mutate()}
          >
            {createRunMutation.isPending ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {runs.length === 0 ? (
          <div className="pr-empty">No runs yet. Pick a month and generate.</div>
        ) : (
          <div className="pr-runs" role="list">
            {runs.map((run) => {
              const active = selectedRunId === run.id;
              return (
                <button
                  key={run.id}
                  type="button"
                  role="listitem"
                  className={`pr-run${active ? ' is-active' : ''}`}
                  onClick={() => setSelectedRunId(run.id)}
                  aria-pressed={active}
                >
                  <div className="pr-run-top">
                    <span className="pr-run-period">
                      {monthLabel(run.month)} {run.year}
                    </span>
                    <PayrollStatusBadge status={run.status} />
                  </div>
                  <div className="pr-run-net">{formatMoney(run.totalNet)}</div>
                  <div className="pr-run-meta">
                    Gross {formatMoney(run.totalGross)} · Ded. {formatMoney(run.totalDeductions)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedRunId && (
        <section className="pr-card pr-detail">
          {runLoading && <div className="emp-skeleton" style={{ height: 100 }} />}

          {!runLoading && selectedRun && (
            <>
              <div className="pr-detail-head">
                <div>
                  <div className="pr-detail-title">
                    <h2>
                      {monthLabel(selectedRun.month)} {selectedRun.year}
                    </h2>
                    <PayrollStatusBadge status={selectedRun.status} />
                  </div>
                  <p className="pr-detail-sub">
                    {items.length} employee{items.length === 1 ? '' : 's'}
                  </p>
                  {/* Quick Export toolbar for mobile */}
                  <div className="flex sm:hidden items-center gap-2 mt-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportPdf}
                      className="h-7 px-2.5 text-xs font-semibold text-rose-700 border-rose-200 bg-rose-50/70 hover:bg-rose-100 flex items-center gap-1 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF Report
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                      className="h-7 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 flex items-center gap-1 shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (CSV)
                    </Button>
                  </div>
                </div>
                <div className="pr-actions pr-actions-desktop">
                  <div className="flex items-center gap-1.5 mr-1.5 pr-2 border-r border-slate-200">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportPdf}
                      className="h-9 px-3 text-xs font-semibold text-rose-700 border-rose-200/90 bg-rose-50/50 hover:bg-rose-100/70 hover:text-rose-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                      title="Download or Print PDF Payroll Statement"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      PDF Report
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                      className="h-9 px-3 text-xs font-semibold text-emerald-700 border-emerald-200/90 bg-emerald-50/50 hover:bg-emerald-100/70 hover:text-emerald-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                      title="Export full payroll breakdown to Excel (CSV)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Excel (CSV)
                    </Button>
                  </div>
                  {isDraft && (
                    <>
                      <button
                        type="button"
                        className="pr-btn pr-btn-secondary"
                        disabled={updateItemMutation.isPending}
                        onClick={saveAllDraft}
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        className="pr-btn pr-btn-primary"
                        disabled={finalizeMutation.isPending}
                        onClick={confirmFinalize}
                      >
                        Finalize
                      </button>
                    </>
                  )}
                  {selectedRun.status === 'FINALIZED' && (
                    <button
                      type="button"
                      className="pr-btn pr-btn-primary"
                      disabled={markPaidMutation.isPending}
                      onClick={() => markPaidMutation.mutate(selectedRun.id)}
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>

              <div className="pr-summary-grid">
                <div className="pr-summary-cell">
                  <span>Gross</span>
                  <strong>{formatMoneyLkr(selectedRun.totalGross, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div className="pr-summary-cell">
                  <span>Deductions</span>
                  <strong>{formatMoneyLkr(selectedRun.totalDeductions, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div className="pr-summary-cell pr-summary-net">
                  <span>Net</span>
                  <strong>{formatMoneyLkr(selectedRun.totalNet, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div className="pr-summary-cell">
                  <span>Staff</span>
                  <strong>{items.length}</strong>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="pr-empty">No employees in this run.</div>
              ) : (
                <>
                  <div className="pr-employee-cards">
                    {items.map((item) => {
                      const draft = itemDrafts[item.id] ?? itemToDraft(item);
                      const liveCommission = previewCommission(draft);
                      return (
                        <article key={item.id} className="pr-emp-card">
                          <div className="pr-emp-card-top">
                            <div>
                              <div className="pr-emp-name">{item.employeeName}</div>
                              <div className="pr-emp-code">
                                {item.designation || item.employeeCode}
                              </div>
                            </div>
                            <div className="pr-emp-net">
                              <span>Net</span>
                              <strong>{formatMoney(item.netSalary)}</strong>
                            </div>
                          </div>

                          <div className="pr-emp-stats">
                            <div>
                              <span>Basic</span>
                              <strong>{formatMoney(item.basicSalary)}</strong>
                            </div>
                            <div>
                              <span>Commission</span>
                              <strong>
                                {formatMoney(isDraft ? liveCommission : item.commissionAmount)}
                              </strong>
                            </div>
                            <div>
                              <span>Advance</span>
                              <strong>{formatMoney(item.advanceDeduction ?? 0)}</strong>
                            </div>
                            <div>
                              <span>Loan</span>
                              <strong>{formatMoney(item.loanDeduction)}</strong>
                            </div>
                          </div>

                          {isDraft ? (
                            <div className="pr-emp-fields">
                              <label className="pr-field">
                                <span>Comm. base</span>
                                <input
                                  className="pr-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={draft.commissionBase}
                                  onChange={(e) =>
                                    updateDraft(item.id, { commissionBase: e.target.value })
                                  }
                                  onBlur={() => saveItem(item.id)}
                                />
                              </label>
                              <label className="pr-field">
                                <span>Comm. %</span>
                                <input
                                  className="pr-input"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={draft.commissionPercentage}
                                  onChange={(e) =>
                                    updateDraft(item.id, {
                                      commissionPercentage: e.target.value,
                                    })
                                  }
                                  onBlur={() => saveItem(item.id)}
                                />
                              </label>
                              <label className="pr-field">
                                <span>Bonus</span>
                                <input
                                  className="pr-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={draft.bonus}
                                  onChange={(e) =>
                                    updateDraft(item.id, { bonus: e.target.value })
                                  }
                                  onBlur={() => saveItem(item.id)}
                                />
                              </label>
                              <label className="pr-field">
                                <span>Other ded.</span>
                                <input
                                  className="pr-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={draft.otherDeduction}
                                  onChange={(e) =>
                                    updateDraft(item.id, {
                                      otherDeduction: e.target.value,
                                    })
                                  }
                                  onBlur={() => saveItem(item.id)}
                                />
                              </label>
                            </div>
                          ) : null}

                          <div className="pr-emp-foot">
                            <span>Gross {formatMoney(item.grossSalary)}</span>
                            <span>EPF {formatMoney(item.employeeEpf)}</span>
                            {(item.commissionInvoiceCount ?? 0) > 0 && (
                              <a
                                className="pr-link"
                                href={`/salon/sales-analytics?employeeId=${item.employeeId}&from=${item.commissionPeriodFrom}&to=${item.commissionPeriodTo}`}
                              >
                                Sales ({item.commissionInvoiceCount})
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="pr-table-wrap">
                    <table className="pr-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th className="num">Basic (LKR)</th>
                          <th className="num">Comm. Base (LKR)</th>
                          <th className="num">Comm. %</th>
                          <th className="num">Commission (LKR)</th>
                          <th className="num">Bonus (LKR)</th>
                          <th className="num">Advance (LKR)</th>
                          <th className="num">Loan (LKR)</th>
                          <th className="num">Other (LKR)</th>
                          <th className="num">EPF (LKR)</th>
                          <th className="num">Gross (LKR)</th>
                          <th className="num">Net (LKR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const draft = itemDrafts[item.id] ?? itemToDraft(item);
                          const liveCommission = previewCommission(draft);
                          return (
                            <tr key={item.id}>
                              <td>
                                <div className="pr-emp-name">{item.employeeName}</div>
                                <div className="pr-emp-code">
                                  {item.designation || item.employeeCode}
                                </div>
                              </td>
                              <td className="num">{formatMoney(item.basicSalary)}</td>
                              <td className="num">
                                {isDraft ? (
                                  <input
                                    className="pr-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.commissionBase}
                                    onChange={(e) =>
                                      updateDraft(item.id, {
                                        commissionBase: e.target.value,
                                      })
                                    }
                                    onBlur={() => saveItem(item.id)}
                                  />
                                ) : (
                                  formatMoney(item.commissionBase)
                                )}
                              </td>
                              <td className="num">
                                {isDraft ? (
                                  <input
                                    className="pr-input"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={draft.commissionPercentage}
                                    onChange={(e) =>
                                      updateDraft(item.id, {
                                        commissionPercentage: e.target.value,
                                      })
                                    }
                                    onBlur={() => saveItem(item.id)}
                                  />
                                ) : (
                                  `${item.commissionPercentage}%`
                                )}
                              </td>
                              <td className="num">
                                {formatMoney(
                                  isDraft ? liveCommission : item.commissionAmount,
                                )}
                              </td>
                              <td className="num">
                                {isDraft ? (
                                  <input
                                    className="pr-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.bonus}
                                    onChange={(e) =>
                                      updateDraft(item.id, { bonus: e.target.value })
                                    }
                                    onBlur={() => saveItem(item.id)}
                                  />
                                ) : (
                                  formatMoney(item.bonus)
                                )}
                              </td>
                              <td className="num">
                                {formatMoney(item.advanceDeduction ?? 0)}
                              </td>
                              <td className="num">{formatMoney(item.loanDeduction)}</td>
                              <td className="num">
                                {isDraft ? (
                                  <input
                                    className="pr-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.otherDeduction}
                                    onChange={(e) =>
                                      updateDraft(item.id, {
                                        otherDeduction: e.target.value,
                                      })
                                    }
                                    onBlur={() => saveItem(item.id)}
                                  />
                                ) : (
                                  formatMoney(item.otherDeduction)
                                )}
                              </td>
                              <td className="num">{formatMoney(item.employeeEpf)}</td>
                              <td className="num">{formatMoney(item.grossSalary)}</td>
                              <td className="num pr-net-cell">
                                {formatMoney(item.netSalary)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      {showStickyActions && selectedRun && (
        <div className="pr-sticky-actions">
          <button
            type="button"
            className="pr-btn pr-btn-secondary"
            onClick={handleExportPdf}
            title="Download or Print PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600 mr-1" /> PDF
          </button>
          <button
            type="button"
            className="pr-btn pr-btn-secondary"
            onClick={handleExportExcel}
            title="Export to Excel CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 mr-1" /> Excel
          </button>
          {isDraft && (
            <>
              <button
                type="button"
                className="pr-btn pr-btn-secondary"
                disabled={updateItemMutation.isPending}
                onClick={saveAllDraft}
              >
                Save
              </button>
              <button
                type="button"
                className="pr-btn pr-btn-primary"
                disabled={finalizeMutation.isPending}
                onClick={confirmFinalize}
              >
                Finalize
              </button>
            </>
          )}
          {selectedRun.status === 'FINALIZED' && (
            <button
              type="button"
              className="pr-btn pr-btn-primary"
              disabled={markPaidMutation.isPending}
              onClick={() => markPaidMutation.mutate(selectedRun.id)}
            >
              Mark Paid
            </button>
          )}
        </div>
      )}

      <Dialog open={finalizeConfirmOpen} onOpenChange={setFinalizeConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalize Payroll Run</DialogTitle>
          </DialogHeader>
          <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.5, margin: '8px 0 16px' }}>
            {selectedRun && (
              <>
                Are you sure you want to finalize the payroll run for{' '}
                <strong>
                  {monthLabel(selectedRun.month)} {selectedRun.year}
                </strong>
                ?
                <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                  Edits will be locked and official payslips will be generated for{' '}
                  <strong>{items.length}</strong> employees.
                </p>
              </>
            )}
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFinalizeConfirmOpen(false)}
              disabled={finalizeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={finalizeMutation.isPending}
              onClick={() => {
                if (selectedRun) {
                  finalizeMutation.mutate(selectedRun.id);
                }
              }}
            >
              {finalizeMutation.isPending ? 'Finalizing…' : 'Confirm & Finalize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Isolated Print Target for Landscape PDF generation */}
      {selectedRun && (
        <div
          id="payroll-report-print-target"
          className="reports-print-document"
          style={{ display: 'none' }}
        >
          <div className="reports-print-header">
            <div>
              <div className="reports-print-eyebrow">
                {user?.tenant?.name || 'Salon Management System'} · Official Payroll
              </div>
              <h1>
                Monthly Payroll Statement — {monthLabel(selectedRun.month)} {selectedRun.year}
              </h1>
              <p>
                Comprehensive breakdown of employee earnings, commissions, statutory deductions,
                and net payable salaries.
              </p>
              <div className="reports-print-meta">
                <span>
                  Period: <strong>{monthLabel(selectedRun.month)} {selectedRun.year}</strong>
                </span>
                <span>
                  Status: <strong>{selectedRun.status}</strong>
                </span>
                <span>
                  Total Staff: <strong>{items.length} Employees</strong>
                </span>
              </div>
            </div>
            <div className="reports-print-generated">
              Report Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="reports-print-summary">
            <div>
              <span>Total Gross Salary</span>
              <strong>{formatMoneyLkr(selectedRun.totalGross)}</strong>
            </div>
            <div>
              <span>Total Deductions</span>
              <strong style={{ color: '#b91c1c' }}>{formatMoneyLkr(selectedRun.totalDeductions)}</strong>
            </div>
            <div>
              <span>Net Salary Payable</span>
              <strong style={{ color: '#0d5c3d' }}>{formatMoneyLkr(selectedRun.totalNet)}</strong>
            </div>
            <div>
              <span>Staff EPF (8%)</span>
              <strong>{formatMoneyLkr(items.reduce((s, it) => s + (Number(it.employeeEpf) || 0), 0))}</strong>
            </div>
            <div>
              <span>Employer EPF (12%)</span>
              <strong>{formatMoneyLkr(items.reduce((s, it) => s + (Number(it.employerEpf) || 0), 0))}</strong>
            </div>
            <div>
              <span>Employer ETF (3%)</span>
              <strong>{formatMoneyLkr(items.reduce((s, it) => s + (Number(it.employerEtf) || 0), 0))}</strong>
            </div>
          </div>

          <div className="reports-print-section-title">Itemized Staff Payroll Register</div>
          <table className="reports-print-table">
            <thead>
              <tr>
                <th style={{ width: '24px' }}>#</th>
                <th>Emp Code</th>
                <th>Employee Name</th>
                <th>Designation</th>
                <th style={{ textAlign: 'right' }}>Basic Salary</th>
                <th style={{ textAlign: 'right' }}>Commission</th>
                <th style={{ textAlign: 'right' }}>Bonus</th>
                <th style={{ textAlign: 'right' }}>Gross Pay</th>
                <th style={{ textAlign: 'right' }}>Advance</th>
                <th style={{ textAlign: 'right' }}>Loan</th>
                <th style={{ textAlign: 'right' }}>EPF 8%</th>
                <th style={{ textAlign: 'right' }}>Other Ded.</th>
                <th style={{ textAlign: 'right' }}>Total Ded.</th>
                <th style={{ textAlign: 'right' }}>Net Salary</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontFamily: 'monospace' }}>{it.employeeCode}</td>
                  <td style={{ fontWeight: 600 }}>{it.employeeName}</td>
                  <td>{it.designation || 'Staff'}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(it.basicSalary)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(it.commissionAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(it.bonus)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(it.grossSalary)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(it.advanceDeduction || 0)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(it.loanDeduction || 0)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(it.employeeEpf || 0)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(it.otherDeduction || 0)}</td>
                  <td style={{ textAlign: 'right', color: '#b91c1c' }}>{formatMoney(it.totalDeductions)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                    {formatMoney(it.netSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4} style={{ textAlign: 'right' }}>
                  GRAND TOTALS ({items.length} Staff):
                </th>
                <th style={{ textAlign: 'right' }}>
                  {formatMoney(items.reduce((s, it) => s + (Number(it.basicSalary) || 0), 0))}
                </th>
                <th style={{ textAlign: 'right' }}>
                  {formatMoney(items.reduce((s, it) => s + (Number(it.commissionAmount) || 0), 0))}
                </th>
                <th style={{ textAlign: 'right' }}>
                  {formatMoney(items.reduce((s, it) => s + (Number(it.bonus) || 0), 0))}
                </th>
                <th style={{ textAlign: 'right' }}>{formatMoney(selectedRun.totalGross)}</th>
                <th style={{ textAlign: 'right' }}>
                  {formatMoney(items.reduce((s, it) => s + (Number(it.advanceDeduction) || 0), 0))}
                </th>
                <th style={{ textAlign: 'right' }}>
                  {formatMoney(items.reduce((s, it) => s + (Number(it.loanDeduction) || 0), 0))}
                </th>
                <th style={{ textAlign: 'right' }}>
                  {formatMoney(items.reduce((s, it) => s + (Number(it.employeeEpf) || 0), 0))}
                </th>
                <th style={{ textAlign: 'right' }}>
                  {formatMoney(items.reduce((s, it) => s + (Number(it.otherDeduction) || 0), 0))}
                </th>
                <th style={{ textAlign: 'right' }}>{formatMoney(selectedRun.totalDeductions)}</th>
                <th style={{ textAlign: 'right', color: '#0f766e', fontSize: '11px' }}>
                  {formatMoney(selectedRun.totalNet)}
                </th>
              </tr>
            </tfoot>
          </table>

          {/* Statutory Contributions Summary */}
          <div style={{ marginTop: '18px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 12px',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '10px', color: '#1e293b', marginBottom: '4px' }}>
                STATUTORY CONTRIBUTIONS SUMMARY
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569' }}>
                <span>Total Employee EPF (8%):</span>
                <strong>{formatMoneyLkr(items.reduce((s, it) => s + (Number(it.employeeEpf) || 0), 0))}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                <span>Total Employer EPF (12%):</span>
                <strong>{formatMoneyLkr(items.reduce((s, it) => s + (Number(it.employerEpf) || 0), 0))}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                <span>Total Employer ETF (3%):</span>
                <strong>{formatMoneyLkr(items.reduce((s, it) => s + (Number(it.employerEtf) || 0), 0))}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '4px', marginTop: '4px' }}>
                <span>Combined Statutory Remittance (23%):</span>
                <strong>
                  {formatMoneyLkr(
                    items.reduce(
                      (s, it) =>
                        s +
                        (Number(it.employeeEpf) || 0) +
                        (Number(it.employerEpf) || 0) +
                        (Number(it.employerEtf) || 0),
                      0,
                    ),
                  )}
                </strong>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 12px',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '10px', color: '#1e293b', marginBottom: '4px' }}>
                NET DISBURSEMENT SUMMARY
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569' }}>
                <span>Total Gross Salaries:</span>
                <strong>{formatMoneyLkr(selectedRun.totalGross)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#b91c1c', marginTop: '2px' }}>
                <span>Less Total Deductions:</span>
                <strong>- {formatMoneyLkr(selectedRun.totalDeductions)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: '#0d5c3d', borderTop: '1px solid #cbd5e1', paddingTop: '4px', marginTop: '4px' }}>
                <span>Net Bank / Cash Payout:</span>
                <strong>{formatMoneyLkr(selectedRun.totalNet)}</strong>
              </div>
            </div>
          </div>

          {/* Signatures block */}
          <div
            style={{
              marginTop: '32px',
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '20px',
              borderTop: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ textAlign: 'center', width: '28%' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', height: '36px', marginBottom: '6px' }}></div>
              <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600 }}>Prepared By (HR / Accountant)</div>
            </div>
            <div style={{ textAlign: 'center', width: '28%' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', height: '36px', marginBottom: '6px' }}></div>
              <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600 }}>Checked &amp; Verified By</div>
            </div>
            <div style={{ textAlign: 'center', width: '28%' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', height: '36px', marginBottom: '6px' }}></div>
              <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600 }}>Authorized Signatory / Owner</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
