import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Banknote,
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
    <div className="w-full space-y-4">
      {/* Top Action & Metrics Bar */}
      <div className="flex items-center justify-end gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active:
            </span>
            <span className="text-xs font-extrabold text-slate-900">
              {advances.filter((a) => a.status === 'ACTIVE').length} Records
            </span>
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="hidden sm:inline-flex py-2 px-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs sm:text-sm font-bold rounded-xl shadow-[0_2px_8px_rgba(124,58,237,0.25)] items-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Advance</span>
          </button>
        </div>

      {/* Controls: Filter Pills & Search matching Reference Image 3 */}
      <div className="space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === pill.value
                  ? 'bg-[#7c3aed] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input with Filter Icon */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded cursor-pointer"
            >
              ×
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear status filter"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile-only full-width Add Advance button */}
        <button
          type="button"
          onClick={() => openCreate()}
          className="sm:hidden w-full py-2.5 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-bold rounded-xl shadow-[0_2px_8px_rgba(124,58,237,0.25)] flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Advance</span>
        </button>
      </div>

      {/* Advances Cards List */}
      <div className="space-y-2.5">
        {advances.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Banknote className="w-6 h-6 stroke-[1.8]" />
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              No advance payments found for selected criteria.
            </p>
            {search || statusFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="text-xs font-semibold text-[#7c3aed] hover:underline cursor-pointer"
              >
                Clear search & filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Give Advance</span>
              </button>
            )}
          </div>
        ) : (
          advances.map((advance) => {
            const initials = advance.employeeName
              ? advance.employeeName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'EM';
            return (
              <div
                key={advance.id}
                onClick={() => setDetailId(advance.id)}
                className="group flex items-center justify-between p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-purple-200 hover:shadow-[0_4px_12px_rgba(124,58,237,0.06)] transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 text-[#7c3aed] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate group-hover:text-[#7c3aed] transition-colors">
                      {advance.employeeName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 truncate">
                        {advance.employeeCode || 'Stylist'}
                      </span>
                      {Number(advance.remainingBalance) > 0 && (
                        <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400">
                          · Remaining: {formatMoneyLkr(Number(advance.remainingBalance))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {formatMoneyLkr(Number(advance.originalAmount))}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(advance.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <div className="mt-1">
                      {advance.status === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Approved
                        </span>
                      )}
                      {advance.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Paid
                        </span>
                      )}
                      {advance.status !== 'ACTIVE' && advance.status !== 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#7c3aed] transition-colors">
                    {advance.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(advance);
                        }}
                        className="hidden sm:inline-flex p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                        title="Edit status or notes"
                      >
                        Edit
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })
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
