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
import {
  getErrorMessage,
  OpsError,
  OpsLoading,
} from './salon-ops-ui';
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
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(month: number) {
  return MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

function PayrollStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'DRAFT'
      ? 'emp-badge emp-badge-inactive'
      : status === 'FINALIZED'
        ? 'emp-badge emp-badge-active'
        : status === 'PAID'
          ? 'emp-badge emp-badge-active'
          : 'emp-badge';
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
  const [actionError, setActionError] = useState<string | null>(null);

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

  const createRunMutation = useMutation({
    mutationFn: () => tenantApi.payroll.createRun({ year, month }),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      setSelectedRunId(run.id);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
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
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const finalizeMutation = useMutation({
    mutationFn: (id: string) => tenantApi.payroll.finalize(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-run', selectedRunId] });
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => tenantApi.payroll.markPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-run', selectedRunId] });
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
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

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const isDraft = selectedRun?.status === 'DRAFT';
  const items = selectedRun?.items ?? [];

  if (runsLoading) return <OpsLoading />;
  if (runsError) {
    return <OpsError message={getErrorMessage(runsErr)} onRetry={() => void refetchRuns()} />;
  }

  return (
    <div className="emp-page settings-shell payroll-page">
      <header className="settings-hero">
        <div className="settings-hero-logo">
          <span>💼</span>
        </div>
        <div className="settings-hero-text">
          <h1>Payroll</h1>
          <p>Generate monthly payroll, adjust commissions and deductions, then finalize</p>
        </div>
        <div className="settings-hero-meta">
          <span className="settings-hero-pill">{runs.length} runs</span>
          {selectedRun && (
            <span className="settings-hero-pill">
              Net LKR {formatMoney(selectedRun.totalNet)}
            </span>
          )}
        </div>
      </header>

      {actionError && (
        <div className="settings-alert settings-alert-error">{actionError}</div>
      )}

      <div className="emp-stats">
            <div className="emp-stat">
              <div className="emp-stat-value">{runs.length}</div>
              <div className="emp-stat-label">Payroll runs</div>
            </div>
            {selectedRun && (
              <>
                <div className="emp-stat">
                  <div className="emp-stat-value">LKR {formatMoney(selectedRun.totalNet)}</div>
                  <div className="emp-stat-label">Total net</div>
                </div>
                <div className="emp-stat">
                  <div className="emp-stat-value">{items.length}</div>
                  <div className="emp-stat-label">Employees</div>
                </div>
              </>
            )}
          </div>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <h2>Generate Payroll</h2>
              <p>
                Create a draft run for a month. Commission is filled from employee sales. EPF / ETF
                rates are configured in Settings → Payroll.
              </p>
            </div>
            <div className="settings-form-grid payroll-generate-grid">
              <div className="settings-field">
                <Label>Year</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="settings-input">
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
              <div className="settings-field">
                <Label>Month</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="settings-input">
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
              <div className="settings-field payroll-generate-actions">
                <Label className="payroll-generate-label-spacer">&nbsp;</Label>
                <button
                  type="button"
                  className="emp-btn emp-btn-primary"
                  disabled={createRunMutation.isPending}
                  onClick={() => createRunMutation.mutate()}
                >
                  {createRunMutation.isPending ? 'Generating…' : 'Generate Payroll'}
                </button>
              </div>
            </div>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <h2>Payroll runs</h2>
              <p>Select a run to view or edit employee payroll</p>
            </div>

            {runs.length === 0 ? (
              <div className="emp-empty">No payroll runs yet. Generate one for a month above.</div>
            ) : (
              <>
                <div className="emp-cards">
                  {runs.map((run) => (
                    <article
                      key={run.id}
                      className={`emp-card${selectedRunId === run.id ? ' emp-card-selected' : ''}`}
                      style={
                        selectedRunId === run.id
                          ? { borderColor: 'var(--emp-primary, #0f766e)' }
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className="emp-card-top"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        onClick={() => setSelectedRunId(run.id)}
                      >
                        <div>
                          <div className="emp-name-cell">
                            {monthLabel(run.month)} {run.year}
                          </div>
                          <div className="emp-code">Net: LKR {formatMoney(run.totalNet)}</div>
                        </div>
                        <PayrollStatusBadge status={run.status} />
                      </button>
                    </article>
                  ))}
                </div>

                <div className="emp-table-wrap">
                  <table className="emp-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Status</th>
                        <th className="num">Gross</th>
                        <th className="num">Deductions</th>
                        <th className="num">Net</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => (
                        <tr
                          key={run.id}
                          style={
                            selectedRunId === run.id ? { background: '#f1f5f9' } : undefined
                          }
                        >
                          <td className="emp-name-cell">
                            {monthLabel(run.month)} {run.year}
                          </td>
                          <td>
                            <PayrollStatusBadge status={run.status} />
                          </td>
                          <td className="num">LKR {formatMoney(run.totalGross)}</td>
                          <td className="num">LKR {formatMoney(run.totalDeductions)}</td>
                          <td className="num" style={{ fontWeight: 700 }}>
                            LKR {formatMoney(run.totalNet)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="emp-link-btn"
                              onClick={() => setSelectedRunId(run.id)}
                            >
                              {selectedRunId === run.id ? 'Selected' : 'Open'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {selectedRunId && (
            <section className="settings-panel payroll-run-detail">
              <div className="settings-panel-header settings-panel-header-row">
                <div>
                  <h2>
                    {selectedRun
                      ? `${monthLabel(selectedRun.month)} ${selectedRun.year}`
                      : 'Run detail'}
                  </h2>
                  {selectedRun && (
                    <p>
                      Status: <PayrollStatusBadge status={selectedRun.status} />
                    </p>
                  )}
                </div>
                {selectedRun && (
                  <div className="payroll-run-actions">
                    {isDraft && (
                      <>
                        <button
                          type="button"
                          className="emp-btn emp-btn-secondary"
                          disabled={updateItemMutation.isPending}
                          onClick={saveAllDraft}
                        >
                          Save Draft
                        </button>
                        <button
                          type="button"
                          className="emp-btn emp-btn-primary"
                          disabled={finalizeMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Finalize this payroll run? Edits will be locked and payslips will be generated.',
                              )
                            ) {
                              finalizeMutation.mutate(selectedRun.id);
                            }
                          }}
                        >
                          Finalize
                        </button>
                      </>
                    )}
                    {selectedRun.status === 'FINALIZED' && (
                      <button
                        type="button"
                        className="emp-btn emp-btn-primary"
                        disabled={markPaidMutation.isPending}
                        onClick={() => markPaidMutation.mutate(selectedRun.id)}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                )}
              </div>

              {runLoading && <div className="emp-skeleton" style={{ height: 120 }} />}

              {!runLoading && selectedRun && items.length === 0 && (
                <div className="emp-empty">No employees in this payroll run.</div>
              )}

              {!runLoading && items.length > 0 && (
                <>
                  <div className="emp-cards">
                    {items.map((item) => (
                      <article key={item.id} className="emp-card">
                        <div className="emp-card-top">
                          <div>
                            <div className="emp-name-cell">{item.employeeName}</div>
                            <div className="emp-code">{item.employeeCode}</div>
                          </div>
                          <span style={{ fontWeight: 700 }}>
                            LKR {formatMoney(item.netSalary)}
                          </span>
                        </div>
                        <div className="emp-card-meta">
                          <span>
                            <strong>Basic:</strong> LKR {formatMoney(item.basicSalary)}
                          </span>
                          <span>
                            <strong>Commission:</strong> LKR {formatMoney(item.commissionAmount)}
                            {item.commissionPercentage != null && (
                              <>
                                {' '}
                                ({item.commissionPercentage}% of LKR{' '}
                                {formatMoney(item.commissionBase)})
                              </>
                            )}
                          </span>
                          {(item.commissionInvoiceCount ?? 0) > 0 && (
                            <span>
                              <strong>Sales invoices:</strong> {item.commissionInvoiceCount}
                              {item.commissionPeriodFrom && item.commissionPeriodTo
                                ? ` (${item.commissionPeriodFrom} → ${item.commissionPeriodTo})`
                                : ''}{' '}
                              <a
                                className="emp-link-btn"
                                href={`/salon/sales-analytics?employeeId=${item.employeeId}&from=${item.commissionPeriodFrom}&to=${item.commissionPeriodTo}`}
                              >
                                View contributing invoices
                              </a>
                            </span>
                          )}
                          <span>
                            <strong>Gross:</strong> LKR {formatMoney(item.grossSalary)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="emp-table-wrap payroll-items-table">
                    <table className="emp-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th className="num">Basic</th>
                          <th className="num">Comm. Base</th>
                          <th className="num">Comm. %</th>
                          <th className="num">Commission</th>
                          <th className="num">Bonus</th>
                          <th className="num">Loan Ded.</th>
                          <th className="num">Other Ded.</th>
                          <th className="num">EPF (Emp)</th>
                          <th className="num">EPF (Er)</th>
                          <th className="num">ETF</th>
                          <th className="num">Gross</th>
                          <th className="num">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const draft = itemDrafts[item.id] ?? itemToDraft(item);
                          const liveCommission = previewCommission(draft);
                          return (
                            <tr key={item.id}>
                              <td>
                                <div className="emp-name-cell">{item.employeeName}</div>
                                <div className="emp-code">
                                  {item.designation || item.employeeCode}
                                </div>
                              </td>
                              <td className="num">{formatMoney(item.basicSalary)}</td>
                              <td className="num">
                                {isDraft ? (
                                  <input
                                    className="emp-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.commissionBase}
                                    onChange={(e) =>
                                      updateDraft(item.id, { commissionBase: e.target.value })
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
                                    className="emp-input"
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
                                {formatMoney(isDraft ? liveCommission : item.commissionAmount)}
                                {isDraft && (
                                  <div className="payroll-commission-preview">
                                    Preview (backend recalculates)
                                  </div>
                                )}
                              </td>
                              <td className="num">
                                {isDraft ? (
                                  <input
                                    className="emp-input"
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
                              <td className="num">{formatMoney(item.loanDeduction)}</td>
                              <td className="num">
                                {isDraft ? (
                                  <input
                                    className="emp-input"
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
                              <td className="num">{formatMoney(item.employerEpf)}</td>
                              <td className="num">{formatMoney(item.employerEtf)}</td>
                              <td className="num">{formatMoney(item.grossSalary)}</td>
                              <td className="num" style={{ fontWeight: 700 }}>
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
            </section>
          )}
    </div>
  );
}
