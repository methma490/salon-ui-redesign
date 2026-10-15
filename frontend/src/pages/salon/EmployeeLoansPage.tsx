import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { tenantApi, type EmployeeLoan, type PaginatedResponse } from '@/api/tenant.api';
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
  OpsPageHeader,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import './employees-page.css';
import './payroll-page.css';

const LOAN_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

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

function LoanStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'emp-badge emp-badge-active'
      : status === 'COMPLETED'
        ? 'emp-badge emp-badge-inactive'
        : 'emp-badge emp-badge-resigned';
  return <span className={cls}>{status}</span>;
}

type LoanForm = {
  employeeId: string;
  originalAmount: string;
  monthlyInstallment: string;
  startDate: string;
  notes: string;
};

type EditLoanForm = {
  monthlyInstallment: string;
  status: string;
  notes: string;
};

const emptyLoanForm = (): LoanForm => ({
  employeeId: '',
  originalAmount: '',
  monthlyInstallment: '',
  startDate: todayIso(),
  notes: '',
});

export default function EmployeeLoansPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<EmployeeLoan | null>(null);
  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);
  const [form, setForm] = useState<LoanForm>(emptyLoanForm());
  const [editForm, setEditForm] = useState<EditLoanForm>({
    monthlyInstallment: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const listParams: Record<string, string> = { limit: '100' };
  if (search.trim()) listParams.search = search.trim();
  if (statusFilter !== 'all') listParams.status = statusFilter;

  const {
    data: loansPayload,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['payroll-loans', listParams],
    queryFn: () => tenantApi.payroll.listLoans(listParams),
  });

  const loans = unwrapList(loansPayload ?? []);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => tenantApi.employees.list({ status: 'ACTIVE' }),
  });

  const { data: loanDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['payroll-loan', detailLoanId],
    queryFn: () => tenantApi.payroll.getLoan(detailLoanId!),
    enabled: !!detailLoanId,
  });

  const createMutation = useMutation({
    mutationFn: tenantApi.payroll.createLoan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-loans'] });
      setForm(emptyLoanForm());
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.payroll.updateLoan(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-loans'] });
      qc.invalidateQueries({ queryKey: ['payroll-loan', detailLoanId] });
      setEditLoan(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const openCreate = () => {
    setFormError(null);
    setForm({
      ...emptyLoanForm(),
      employeeId: employees[0]?.id ?? '',
    });
    setCreateOpen(true);
  };

  const openEdit = (loan: EmployeeLoan) => {
    setFormError(null);
    setEditLoan(loan);
    setEditForm({
      monthlyInstallment: String(loan.monthlyInstallment),
      status: loan.status,
      notes: loan.notes || '',
    });
  };

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page payroll-page">
      {/* Back button to Payroll Hub */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/salon/payroll"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Payroll</span>
        </Link>
      </div>

      <OpsPageHeader
        title="Employee Loans"
        subtitle="Track employee loans with monthly repayments"
        action={
          <button type="button" className="emp-btn emp-btn-primary" onClick={openCreate}>
            + Create Loan
          </button>
        }
      />

      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{loans.length}</div>
          <div className="emp-stat-label">Loans</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{activeLoans.length}</div>
          <div className="emp-stat-label">Active</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{formatMoneyLkr(totalOutstanding, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                  {LOAN_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">Loan records</h2>
            <p className="emp-panel-desc">
              {loans.length} loan{loans.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="emp-empty">No loans found for the selected filters.</div>
        ) : (
          <>
            <div className="emp-cards">
              {loans.map((loan) => (
                <article key={loan.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{loan.employeeName}</div>
                      <div className="emp-code">{loan.employeeCode}</div>
                    </div>
                    <LoanStatusBadge status={loan.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Original:</strong> {formatMoney(loan.originalAmount)}
                    </span>
                    <span>
                      <strong>Remaining:</strong> {formatMoney(loan.remainingBalance)}
                    </span>
                    <span>
                      <strong>Installment:</strong> {formatMoney(loan.monthlyInstallment)}/mo
                    </span>
                    <span>
                      <strong>Start:</strong> {loan.startDate.slice(0, 10)}
                    </span>
                  </div>
                  <div className="emp-card-actions">
                    <button
                      type="button"
                      className="emp-btn emp-btn-secondary"
                      onClick={() => setDetailLoanId(loan.id)}
                    >
                      View
                    </button>
                    {loan.status === 'ACTIVE' && <OpsEditButton onClick={() => openEdit(loan)} />}
                  </div>
                </article>
              ))}
            </div>

            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th className="num">Original (LKR)</th>
                    <th className="num">Remaining (LKR)</th>
                    <th className="num">Installment (LKR)</th>
                    <th>Start</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id}>
                      <td>
                        <div className="emp-name-cell">{loan.employeeName}</div>
                        <div className="emp-code">{loan.employeeCode}</div>
                      </td>
                      <td className="num">{formatMoney(loan.originalAmount)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {formatMoney(loan.remainingBalance)}
                      </td>
                      <td className="num">{formatMoney(loan.monthlyInstallment)}</td>
                      <td>{loan.startDate.slice(0, 10)}</td>
                      <td>
                        <LoanStatusBadge status={loan.status} />
                      </td>
                      <td>
                        <div className="emp-actions">
                          <button
                            type="button"
                            className="emp-link-btn"
                            onClick={() => setDetailLoanId(loan.id)}
                          >
                            View
                          </button>
                          {loan.status === 'ACTIVE' && (
                            <OpsEditButton onClick={() => openEdit(loan)} />
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

      <SimpleFormDialog open={createOpen} onOpenChange={setCreateOpen} title="Create Loan">
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.employeeId) {
              setFormError('Select an employee.');
              return;
            }
            if (!form.originalAmount || Number(form.originalAmount) <= 0) {
              setFormError('Enter a valid original amount.');
              return;
            }
            if (!form.monthlyInstallment || Number(form.monthlyInstallment) <= 0) {
              setFormError('Enter a valid monthly installment.');
              return;
            }
            setFormError(null);
            createMutation.mutate({
              employeeId: form.employeeId,
              originalAmount: Number(form.originalAmount),
              monthlyInstallment: Number(form.monthlyInstallment),
              startDate: form.startDate,
              notes: form.notes.trim() || undefined,
            });
          }}
        >
          <FormError message={formError} />
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={form.employeeId || undefined}
              onValueChange={(v) => setForm({ ...form, employeeId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Original amount (LKR)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.originalAmount}
                onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly installment (LKR)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.monthlyInstallment}
                onChange={(e) => setForm({ ...form, monthlyInstallment: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
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
          <FormSubmit pending={createMutation.isPending}>Create Loan</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <SimpleFormDialog
        open={!!editLoan}
        onOpenChange={(open) => !open && setEditLoan(null)}
        title="Edit Loan"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editLoan) return;
            setFormError(null);
            updateMutation.mutate({
              id: editLoan.id,
              data: {
                monthlyInstallment: Number(editForm.monthlyInstallment),
                status: editForm.status,
                notes: editForm.notes.trim() || undefined,
              },
            });
          }}
        >
          <FormError message={formError} />
          <div className="space-y-2">
            <Label>Monthly installment (LKR)</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={editForm.monthlyInstallment}
              onChange={(e) => setEditForm({ ...editForm, monthlyInstallment: e.target.value })}
              required
            />
          </div>
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
                {LOAN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
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
      </SimpleFormDialog>

      <Dialog open={!!detailLoanId} onOpenChange={(open) => !open && setDetailLoanId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Loan Detail</DialogTitle>
          </DialogHeader>
          {detailLoading && <div className="emp-skeleton" style={{ height: 80 }} />}
          {loanDetail && (
            <>
              <div className="payslip-meta">
                <div>
                  <strong>{loanDetail.employeeName}</strong> ({loanDetail.employeeCode})
                </div>
                <div>
                  Status: <LoanStatusBadge status={loanDetail.status} />
                </div>
                <div>Original: {formatMoneyLkr(loanDetail.originalAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div>Remaining: {formatMoneyLkr(loanDetail.remainingBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div>Installment: {formatMoneyLkr(loanDetail.monthlyInstallment, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month</div>
                <div>Start: {loanDetail.startDate.slice(0, 10)}</div>
                {loanDetail.notes && <div>Notes: {loanDetail.notes}</div>}
              </div>

              <h3 className="payslip-section-title">Repayment History</h3>
              {loanDetail.repayments.length === 0 ? (
                <div className="emp-empty" style={{ padding: '1rem 0' }}>
                  No repayments recorded yet.
                </div>
              ) : (
                <div className="emp-table-wrap">
                  <table className="emp-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Payroll</th>
                        <th className="num">Amount (LKR)</th>
                        <th className="num">Balance After (LKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanDetail.repayments.map((r) => (
                        <tr key={r.id}>
                          <td>{r.paidAt.slice(0, 10)}</td>
                          <td>
                            {r.payrollYear && r.payrollMonth
                              ? `${r.payrollMonth}/${r.payrollYear}`
                              : '—'}
                          </td>
                          <td className="num">{formatMoney(r.amount)}</td>
                          <td className="num">{formatMoney(r.balanceAfter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
