import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { tenantApi, type Expense, type ExpenseCategory } from '@/api/tenant.api';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormError,
  FormSubmit,
  FormTextarea,
  getErrorMessage,
  OpsEditButton,
  OpsError,
  OpsLoading,
  OpsPageHeader,
  OpsStatusBadge,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import './employees-page.css';

type ExpenseForm = {
  branchId: string;
  categoryId: string;
  title: string;
  amount: string;
  expenseDate: string;
  paymentMethod: string;
  notes: string;
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'OTHER', label: 'Other' },
] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return formatMoneyAmount(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPaymentMethod(method: string) {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
}

function emptyForm(branchId: string): ExpenseForm {
  return {
    branchId: branchId === 'all' ? '' : branchId,
    categoryId: '',
    title: '',
    amount: '',
    expenseDate: todayIso(),
    paymentMethod: 'CASH',
    notes: '',
  };
}

function toPayload(form: ExpenseForm) {
  return {
    branchId: form.branchId,
    categoryId: form.categoryId || undefined,
    title: form.title.trim(),
    amount: Number(form.amount),
    expenseDate: form.expenseDate,
    paymentMethod: form.paymentMethod,
    notes: form.notes.trim() || undefined,
  };
}

function ExpenseFormFields({
  form,
  setForm,
  branches,
  categories,
}: {
  form: ExpenseForm;
  setForm: (form: ExpenseForm) => void;
  branches: Array<{ id: string; name: string }>;
  categories: ExpenseCategory[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="exp-title">Title</Label>
        <Input
          id="exp-title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Monthly rent"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Amount (LKR)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-date">Date</Label>
          <Input
            id="exp-date"
            type="date"
            value={form.expenseDate}
            onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Branch</Label>
          <Select
            value={form.branchId || undefined}
            onValueChange={(value) => setForm({ ...form, branchId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={form.categoryId || 'none'}
            onValueChange={(value) =>
              setForm({ ...form, categoryId: value === 'none' ? '' : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payment method</Label>
        <Select
          value={form.paymentMethod}
          onValueChange={(value) => setForm({ ...form, paymentMethod: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exp-notes">Notes</Label>
        <FormTextarea
          id="exp-notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional"
          rows={3}
        />
      </div>
    </>
  );
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const { branchId } = useSalonBranch();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState('ACTIVE');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm(branchId));
  const [editForm, setEditForm] = useState<ExpenseForm>(emptyForm(branchId));
  const [formError, setFormError] = useState<string | null>(null);

  const listParams = useMemo(() => {
    const params: Record<string, string> = { limit: '100' };
    if (search.trim()) params.search = search.trim();
    if (branchId !== 'all') params.branchId = branchId;
    if (categoryId !== 'all') params.categoryId = categoryId;
    if (status !== 'all') params.status = status;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [search, branchId, categoryId, status, dateFrom, dateTo]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['expenses', listParams],
    queryFn: () => tenantApi.expenses.list(listParams),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: tenantApi.expenseCategories.list,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const expenses = data?.data ?? [];
  const totalAmount = data?.summary.totalAmount ?? 0;

  const createMutation = useMutation({
    mutationFn: tenantApi.expenses.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setForm(emptyForm(branchId));
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      tenantApi.expenses.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setEditExpense(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      tenantApi.expenses.updateStatus(id, nextStatus),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const openCreate = () => {
    setFormError(null);
    const defaultBranch =
      branchId !== 'all' ? branchId : branches.find((b) => b.isMain)?.id || branches[0]?.id || '';
    setForm({ ...emptyForm(branchId), branchId: defaultBranch });
    setCreateOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setFormError(null);
    setEditExpense(expense);
    setEditForm({
      branchId: expense.branchId,
      categoryId: expense.categoryId || '',
      title: expense.title,
      amount: String(expense.amount),
      expenseDate: expense.expenseDate.slice(0, 10),
      paymentMethod: expense.paymentMethod,
      notes: expense.notes || '',
    });
  };

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Expenses"
        subtitle="Track rent, utilities, supplies, and other salon costs"
        action={
          <button type="button" className="emp-btn emp-btn-primary" onClick={openCreate}>
            + Add Expense
          </button>
        }
      />

      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{expenses.length}</div>
          <div className="emp-stat-label">Records</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{formatMoneyLkr(totalAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="emp-stat-label">Active total</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{categories.length}</div>
          <div className="emp-stat-label">Categories</div>
        </div>
      </div>

      <div className="emp-panel emp-form-panel">
        <div className="emp-form-panel-title">Filters</div>
        <div className="emp-filter-grid">
          <div className="emp-filter-field">
            <Label>Search</Label>
            <Input
              placeholder="Title, code, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="emp-filter-field">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="emp-filter-field">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="emp-filter-field">
            <Label>From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                const newFrom = e.target.value;
                setDateFrom(newFrom);
                if (dateTo && newFrom && dateTo < newFrom) {
                  setDateTo(newFrom);
                }
              }}
            />
          </div>
          <div className="emp-filter-field">
            <Label>To</Label>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="emp-panel">
        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">Expense records</h2>
            <p className="emp-panel-desc">
              {expenses.length} expense{expenses.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="emp-empty">No expenses found for the selected filters.</div>
        ) : (
          <>
            <div className="emp-cards">
              {expenses.map((expense) => (
                <article key={expense.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{expense.title}</div>
                      <div className="emp-code">{expense.code}</div>
                    </div>
                    <OpsStatusBadge status={expense.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Amount:</strong> {formatMoney(expense.amount)}
                    </span>
                    <span>
                      <strong>Date:</strong> {expense.expenseDate.slice(0, 10)}
                    </span>
                    <span>
                      <strong>Category:</strong> {expense.categoryName || '—'}
                    </span>
                    <span>
                      <strong>Branch:</strong> {expense.branchName}
                    </span>
                  </div>
                  <div className="emp-card-actions">
                    {expense.status === 'ACTIVE' && (
                      <OpsEditButton onClick={() => openEdit(expense)} />
                    )}
                    <button
                      type="button"
                      className="emp-btn emp-btn-secondary"
                      onClick={() =>
                        statusMutation.mutate({
                          id: expense.id,
                          nextStatus: expense.status === 'ACTIVE' ? 'VOID' : 'ACTIVE',
                        })
                      }
                    >
                      {expense.status === 'ACTIVE' ? 'Void' : 'Restore'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Branch</th>
                    <th>Date</th>
                    <th>Payment</th>
                    <th className="num">Amount (LKR)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="emp-code">{expense.code}</td>
                      <td>
                        <div className="emp-name-cell">{expense.title}</div>
                        {expense.notes && <div className="emp-code">{expense.notes}</div>}
                      </td>
                      <td>{expense.categoryName || '—'}</td>
                      <td>{expense.branchName}</td>
                      <td>{expense.expenseDate.slice(0, 10)}</td>
                      <td>{formatPaymentMethod(expense.paymentMethod)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {formatMoney(expense.amount)}
                      </td>
                      <td>
                        <OpsStatusBadge status={expense.status} />
                      </td>
                      <td>
                        <div className="emp-actions">
                          {expense.status === 'ACTIVE' && (
                            <OpsEditButton onClick={() => openEdit(expense)} />
                          )}
                          <button
                            type="button"
                            className="emp-link-btn"
                            onClick={() =>
                              statusMutation.mutate({
                                id: expense.id,
                                nextStatus: expense.status === 'ACTIVE' ? 'VOID' : 'ACTIVE',
                              })
                            }
                          >
                            {expense.status === 'ACTIVE' ? 'Void' : 'Restore'}
                          </button>
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
        onOpenChange={setCreateOpen}
        title="Add Expense"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.branchId) {
              setFormError('Branch is required.');
              return;
            }
            if (!form.amount || Number(form.amount) < 0) {
              setFormError('Enter a valid amount.');
              return;
            }
            setFormError(null);
            createMutation.mutate(toPayload(form));
          }}
        >
          <FormError message={formError} />
          <ExpenseFormFields
            form={form}
            setForm={setForm}
            branches={branches}
            categories={categories}
          />
          <FormSubmit pending={createMutation.isPending}>Create Expense</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <SimpleFormDialog
        open={!!editExpense}
        onOpenChange={(open) => !open && setEditExpense(null)}
        title="Edit Expense"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editExpense) return;
            if (!editForm.branchId) {
              setFormError('Branch is required.');
              return;
            }
            setFormError(null);
            updateMutation.mutate({
              id: editExpense.id,
              payload: {
                ...toPayload(editForm),
                categoryId: editForm.categoryId || null,
              },
            });
          }}
        >
          <FormError message={formError} />
          <ExpenseFormFields
            form={editForm}
            setForm={setEditForm}
            branches={branches}
            categories={categories}
          />
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>
    </div>
  );
}
