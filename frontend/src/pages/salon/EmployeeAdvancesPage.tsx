import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { tenantApi, type Employee, type EmployeeAdvance, type PaginatedResponse } from '@/api/tenant.api';
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
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import {
  FormError,
  FormSubmit,
  FormTextarea,
  getErrorMessage,
  OpsEditButton,
  OpsError,
  OpsLoading,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import './employees-page.css';
import './payroll-page.css';

function unwrapList<T>(payload: PaginatedResponse<T> | T[]): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function formatMoney(value: number) {
  return formatMoneyAmount(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'emp-badge emp-badge-active'
      : status === 'COMPLETED'
        ? 'emp-badge emp-badge-inactive'
        : 'emp-badge emp-badge-resigned';
  return <span className={cls}>{status}</span>;
}

type AdvanceForm = {
  employeeId: string;
  amount: string;
  startDate: string;
  notes: string;
};

type EditForm = {
  status: string;
  notes: string;
};

const emptyForm = (employeeId = ''): AdvanceForm => ({
  employeeId,
  amount: '',
  startDate: todayIso(),
  notes: '',
});

export default function EmployeeAdvancesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const [editAdvance, setEditAdvance] = useState<EmployeeAdvance | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<AdvanceForm>(emptyForm());
  const [editForm, setEditForm] = useState<EditForm>({
    status: 'ACTIVE',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const listParams: Record<string, string> = { limit: '100' };
  if (statusFilter !== 'all') listParams.status = statusFilter;

  const {
    data: advancesPayload,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['payroll-advances', listParams],
    queryFn: () => tenantApi.payroll.listAdvances(listParams),
  });

  const allAdvances = unwrapList(advancesPayload ?? []);
  const advances = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allAdvances;
    return allAdvances.filter(
      (advance) =>
        advance.employeeName.toLowerCase().includes(q) ||
        advance.employeeCode.toLowerCase().includes(q) ||
        (advance.notes ?? '').toLowerCase().includes(q),
    );
  }, [allAdvances, search]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => tenantApi.employees.list({ status: 'ACTIVE' }),
  });

  const activeEmployees = (employees as Employee[]).filter((e) => e.status === 'ACTIVE');

  const { data: payrollSettings } = useQuery({
    queryKey: ['payroll-settings'],
    queryFn: tenantApi.payroll.getSettings,
    staleTime: 60_000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['payroll-advance', detailId],
    queryFn: () => tenantApi.payroll.getAdvance(detailId!),
    enabled: !!detailId,
  });

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['payroll-advances'] }),
      qc.invalidateQueries({ queryKey: ['payroll-advance', detailId] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: tenantApi.payroll.createAdvance,
    onSuccess: async () => {
      await invalidate();
      setForm(emptyForm());
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.payroll.updateAdvance(id, data),
    onSuccess: async () => {
      await invalidate();
      setEditAdvance(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const openCreate = (employeeId?: string) => {
    setFormError(null);
    setForm(emptyForm(employeeId || activeEmployees[0]?.id || ''));
    setCreateOpen(true);
  };

  const openEdit = (advance: EmployeeAdvance) => {
    setFormError(null);
    setEditAdvance(advance);
    setEditForm({
      status: advance.status,
      notes: advance.notes || '',
    });
  };

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  const systemDefaultPct = Number(payrollSettings?.maxSalaryAdvancePercentage ?? 50);

  return (
    <div className="emp-page payroll-page max-w-4xl mx-auto py-2 sm:py-4 px-2 sm:px-4">
      {/* Back button to Payroll Hub */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => navigate('/salon/payroll')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Payroll</span>
        </button>
      </div>

      {/* Screen 4 Hero Banner */}
      <div className="flex items-center gap-3.5 p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#fff1f2] border border-[#ffe4e6] flex items-center justify-center shrink-0">
          <Banknote className="w-6 h-6 text-[#f43f5e]" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
            Salary Advances
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage employee salary advances
          </p>
        </div>
      </div>

      {/* Screen 4 Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3">
        {[
          { label: 'All', value: 'all' },
          { label: 'Pending', value: 'CANCELLED' },
          { label: 'Approved', value: 'ACTIVE' },
          { label: 'Paid', value: 'COMPLETED' },
        ].map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => setStatusFilter(pill.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === pill.value
                ? 'bg-[#7c3aed] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Screen 4 Search + Add Advance Action */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
          />
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => openCreate()}
          className="w-full py-2.5 sm:py-3 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-bold rounded-xl shadow-[0_2px_8px_rgba(124,58,237,0.25)] flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Advance</span>
        </button>
      </div>

      {/* Screen 4 Advances List Cards */}
      <div className="space-y-2.5 mb-6">
        {advances.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-xs text-slate-400">
            No advance payments found for selected criteria.
          </div>
        ) : (
          advances.map((advance) => {
            const initials = advance.employeeName
              ? advance.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              : 'EM';
            return (
              <div
                key={advance.id}
                onClick={() => setDetailId(advance.id)}
                className="flex items-center justify-between p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-purple-200 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 text-[#7c3aed] font-bold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {advance.employeeName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {advance.employeeCode || 'Stylist'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 ml-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">
                      {formatMoneyLkr(Number(advance.originalAmount))}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(advance.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <div className="mt-1">
                    {advance.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Approved
                      </span>
                    )}
                    {advance.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Paid
                      </span>
                    )}
                    {advance.status !== 'ACTIVE' && advance.status !== 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="emp-panel">
        <div className="payroll-toolbar">
          <div className="payroll-toolbar-title">Filters</div>
          <div className="emp-filter-grid">
            <div className="emp-filter-field">
              <Label>Search</Label>
              <Input
                placeholder="Employee name, code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="emp-filter-field">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">Advance records</h2>
            <p className="emp-panel-desc">
              {advances.length} advance{advances.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {advances.length === 0 ? (
          <div className="emp-empty">No advance payments found. Give an advance to get started.</div>
        ) : (
          <>
            <div className="emp-cards">
              {advances.map((advance) => (
                <article key={advance.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{advance.employeeName}</div>
                      <div className="emp-code">{advance.employeeCode}</div>
                    </div>
                    <StatusBadge status={advance.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Advance:</strong> {formatMoney(advance.originalAmount)}
                    </span>
                    <span>
                      <strong>Remaining:</strong> {formatMoney(advance.remainingBalance)}
                    </span>
                    <span>
                      <strong>Deduct on payroll:</strong> Full amount (same month)
                    </span>
                    <span>
                      <strong>Date:</strong> {advance.startDate.slice(0, 10)}
                    </span>
                  </div>
                  <div className="emp-card-actions">
                    <button
                      type="button"
                      className="emp-btn emp-btn-secondary"
                      onClick={() => setDetailId(advance.id)}
                    >
                      History
                    </button>
                    {advance.status === 'ACTIVE' && (
                      <OpsEditButton onClick={() => openEdit(advance)} />
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th className="num">Advance (LKR)</th>
                    <th className="num">Remaining (LKR)</th>
                    <th>Deduction</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((advance) => (
                    <tr key={advance.id}>
                      <td>
                        <div className="emp-name-cell">{advance.employeeName}</div>
                        <div className="emp-code">{advance.employeeCode}</div>
                      </td>
                      <td className="num">{formatMoney(advance.originalAmount)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {formatMoney(advance.remainingBalance)}
                      </td>
                      <td>Full amount (same month)</td>
                      <td>{advance.startDate.slice(0, 10)}</td>
                      <td>
                        <StatusBadge status={advance.status} />
                      </td>
                      <td>
                        <div className="emp-actions">
                          <button
                            type="button"
                            className="emp-btn emp-btn-secondary"
                            onClick={() => setDetailId(advance.id)}
                          >
                            History
                          </button>
                          {advance.status === 'ACTIVE' && (
                            <OpsEditButton onClick={() => openEdit(advance)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <SimpleFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setFormError(null);
          setCreateOpen(open);
        }}
        title="Give Advance Payment"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            const amount = Number(form.amount);
            if (!form.employeeId) {
              setFormError('Select an employee.');
              return;
            }
            if (!(amount > 0)) {
              setFormError('Advance amount must be greater than 0.');
              return;
            }

            const emp = activeEmployees.find((e) => e.id === form.employeeId);
            const basicSalary = Number(emp?.basicSalary || 0);
            const maxPct = systemDefaultPct;
            const maxAllowed = Math.round(((basicSalary * maxPct) / 100) * 100) / 100;

            if (basicSalary <= 0) {
              setFormError(`Employee "${emp?.name || ''}" does not have a basic salary set. Cannot issue advance.`);
              return;
            }
            if (amount > basicSalary) {
              setFormError(`Advance amount cannot exceed basic salary of LKR ${formatMoney(basicSalary)}.`);
              return;
            }
            if (amount > maxAllowed) {
              setFormError(`Advance amount cannot exceed maximum allowed limit of LKR ${formatMoney(maxAllowed)} (${maxPct}% of basic salary).`);
              return;
            }

            createMutation.mutate({
              employeeId: form.employeeId,
              originalAmount: amount,
              startDate: form.startDate,
              notes: form.notes.trim() || undefined,
            });
          }}
        >
          <FormError message={formError} />
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={form.employeeId}
              onValueChange={(v) => setForm({ ...form, employeeId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const emp = activeEmployees.find((e) => e.id === form.employeeId);
            if (!emp) return null;
            const basicSalary = Number(emp.basicSalary || 0);
            const maxPct = systemDefaultPct;
            const maxAllowed = Math.round(((basicSalary * maxPct) / 100) * 100) / 100;

            return (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <span>Basic Salary: <strong>LKR {formatMoney(basicSalary)}</strong></span>
                  <span>Max Allowed ({maxPct}%): <strong style={{ color: 'var(--brand-primary, #0d5c3d)' }}>LKR {formatMoney(maxAllowed)}</strong></span>
                </div>
              </div>
            );
          })()}

          <div className="space-y-2">
            <Label>Advance amount</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Full amount is deducted from the same month’s payroll.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Advance date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <FormTextarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
              rows={3}
            />
          </div>
          <FormSubmit pending={createMutation.isPending}>Save Advance</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <SimpleFormDialog
        open={editAdvance !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditAdvance(null);
            setFormError(null);
          }
        }}
        title="Edit Advance"
      >
        {editAdvance && (
          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              updateMutation.mutate({
                id: editAdvance.id,
                data: {
                  status: editForm.status,
                  notes: editForm.notes.trim() || null,
                },
              });
            }}
          >
            <FormError message={formError} />
            <p className="text-sm text-muted-foreground">
              {editAdvance.employeeName} · Remaining{' '}
              {formatMoneyLkr(editAdvance.remainingBalance, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <br />
              Full remaining balance is deducted on the next payroll.
            </p>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <FormTextarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
          </SimpleForm>
        )}
      </SimpleFormDialog>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Advance repayment history</DialogTitle>
          </DialogHeader>
          {detailLoading && <div className="emp-skeleton" style={{ height: 80 }} />}
          {!detailLoading && detail && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {detail.employeeName} · Remaining{' '}
                {formatMoneyLkr(detail.remainingBalance, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {(detail.repayments?.length ?? 0) === 0 ? (
                <div className="emp-empty">No payroll deductions yet.</div>
              ) : (
                <div className="emp-table-wrap">
                  <table className="emp-table">
                    <thead>
                      <tr>
                        <th>Payroll</th>
                        <th className="num">Amount (LKR)</th>
                        <th className="num">Balance after (LKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.repayments?.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.payrollYear && r.payrollMonth
                              ? `${r.payrollYear}-${String(r.payrollMonth).padStart(2, '0')}`
                              : r.paidAt.slice(0, 10)}
                          </td>
                          <td className="num">{formatMoney(r.amount)}</td>
                          <td className="num">{formatMoney(r.balanceAfter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
