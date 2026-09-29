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

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const isDraft = selectedRun?.status === 'DRAFT';
  const items = selectedRun?.items ?? [];
  const showStickyActions =
    !!selectedRun &&
    (isDraft || selectedRun.status === 'FINALIZED');

  if (runsLoading) return <OpsLoading />;
  if (runsError) {
    return <OpsError message={getErrorMessage(runsErr)} onRetry={() => void refetchRuns()} />;
  }

  return (
    <div
      className={`emp-page settings-shell payroll-page${showStickyActions ? ' has-sticky-actions' : ''}`}
    >
      <header className="pr-hero">
        <div className="pr-hero-main">
          <div className="pr-hero-icon" aria-hidden>
            💼
          </div>
          <div>
            <h1>Payroll</h1>
            <p>Generate, adjust, finalize monthly pay</p>
          </div>
        </div>
        <div className="pr-hero-pills">
          <span className="pr-pill">{runs.length} runs</span>
          {selectedRun && (
            <span className="pr-pill pr-pill-net">
              Net {formatMoney(selectedRun.totalNet)}
            </span>
          )}
        </div>
      </header>

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
                </div>
                <div className="pr-actions pr-actions-desktop">
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
    </div>
  );
}
