import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
import {
  FormError,
  FormSubmit,
  FormTextarea,
  getErrorMessage,
  OpsEditButton,
  OpsError,
  OpsLoading,
  OpsPageHeader,
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
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const activeAdvances = advances.filter((a) => a.status === 'ACTIVE');
  const totalOutstanding = activeAdvances.reduce((sum, a) => sum + a.remainingBalance, 0);

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page payroll-page">
      <OpsPageHeader
        title="Advance Payments"
        subtitle="Record salary advances. Full amount is deducted from the same month’s payroll."
        action={
          <button type="button" className="emp-btn emp-btn-primary" onClick={() => openCreate()}>
            + Give Advance
          </button>
        }
      />

      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{advances.length}</div>
          <div className="emp-stat-label">Advances</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{activeAdvances.length}</div>
          <div className="emp-stat-label">Active</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">LKR {formatMoney(totalOutstanding)}</div>
          <div className="emp-stat-label">Outstanding</div>
        </div>
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
                      <strong>Advance:</strong> LKR {formatMoney(advance.originalAmount)}
                    </span>
                    <span>
                      <strong>Remaining:</strong> LKR {formatMoney(advance.remainingBalance)}
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
                    <th className="num">Advance</th>
                    <th className="num">Remaining</th>
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
                      <td className="num">LKR {formatMoney(advance.originalAmount)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        LKR {formatMoney(advance.remainingBalance)}
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
              {editAdvance.employeeName} · Remaining LKR {formatMoney(editAdvance.remainingBalance)}
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
                {detail.employeeName} · Remaining LKR {formatMoney(detail.remainingBalance)}
              </p>
              {(detail.repayments?.length ?? 0) === 0 ? (
                <div className="emp-empty">No payroll deductions yet.</div>
              ) : (
                <div className="emp-table-wrap">
                  <table className="emp-table">
                    <thead>
                      <tr>
                        <th>Payroll</th>
                        <th className="num">Amount</th>
                        <th className="num">Balance after</th>
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
                          <td className="num">LKR {formatMoney(r.amount)}</td>
                          <td className="num">LKR {formatMoney(r.balanceAfter)}</td>
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
