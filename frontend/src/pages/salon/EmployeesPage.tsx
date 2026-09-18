import { Lock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tenantApi, type AssignableEmployeeRole, type Employee } from '@/api/tenant.api';
import { formatMoneyAmount } from '@/lib/money';
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
  OpsToggleStatusButton,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import './employees-page.css';

type EmployeeForm = {
  name: string;
  phone: string;
  email: string;
  designation: string;
  branchId: string;
  roleCode: string;
  password: string;
  basicSalary: string;
  commissionRate: string;
  epfEnabled: boolean;
  etfEnabled: boolean;
};

type AdvanceForm = {
  amount: string;
  startDate: string;
  notes: string;
};

const emptyAdvanceForm = (): AdvanceForm => ({
  amount: '',
  startDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

const emptyForm: EmployeeForm = {
  name: '',
  phone: '',
  email: '',
  designation: '',
  branchId: '',
  roleCode: '',
  password: '',
  basicSalary: '0',
  commissionRate: '0',
  epfEnabled: true,
  etfEnabled: true,
};

const ROLE_ICONS: Record<string, string> = {
  CASHIER: '💳',
  STOCK_KEEPER: '📦',
};

function formatSystemRole(code: string) {
  return code
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function toCreatePayload(form: EmployeeForm) {
  const payload: Record<string, string | number | boolean> = {
    name: form.name.trim(),
    designation: form.designation.trim(),
    branchId: form.branchId,
    basicSalary: Number(form.basicSalary) || 0,
    commissionRate: Number(form.commissionRate) || 0,
    epfEnabled: form.epfEnabled,
    etfEnabled: form.etfEnabled,
  };
  const phone = form.phone.trim();
  const email = form.email.trim();
  if (phone) payload.phone = phone;
  if (form.roleCode) {
    payload.roleCode = form.roleCode;
    payload.email = email;
    payload.password = form.password;
  } else if (email) payload.email = email;
  return payload;
}

function toEditPayload(form: EmployeeForm, hasLogin: boolean) {
  const payload: Record<string, string | number | boolean> = {
    name: form.name.trim(),
    designation: form.designation.trim(),
    branchId: form.branchId,
    basicSalary: Number(form.basicSalary) || 0,
    commissionRate: Number(form.commissionRate) || 0,
    epfEnabled: form.epfEnabled,
    etfEnabled: form.etfEnabled,
  };
  const phone = form.phone.trim();
  const email = form.email.trim();
  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (form.roleCode) {
    payload.roleCode = form.roleCode;
    if (!hasLogin && form.password) payload.password = form.password;
  }
  return payload;
}

function formatSalary(value: number | undefined) {
  return formatMoneyAmount(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'emp-badge emp-badge-active'
      : status === 'RESIGNED'
        ? 'emp-badge emp-badge-resigned'
        : 'emp-badge emp-badge-inactive';
  return <span className={cls}>{status}</span>;
}

function RoleBadge({ code }: { code: string }) {
  return (
    <span className="emp-role-pill">
      {ROLE_ICONS[code] ?? '🔐'} {formatSystemRole(code)}
    </span>
  );
}

function EmployeeFormFields({
  form,
  setForm,
  branches,
  assignableRoles,
  showRoleFields,
  showPayrollFields,
  requirePassword = true,
  hasLogin = false,
}: {
  form: EmployeeForm;
  setForm: (f: EmployeeForm) => void;
  branches: Array<{ id: string; name: string }>;
  assignableRoles?: AssignableEmployeeRole[];
  showRoleFields?: boolean;
  showPayrollFields?: boolean;
  requirePassword?: boolean;
  hasLogin?: boolean;
}) {
  const showLoginFields = showRoleFields && !!form.roleCode;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="emp-name">Full name</Label>
        <Input
          id="emp-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Employee name"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="emp-designation">Designation</Label>
          <Input
            id="emp-designation"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
            placeholder="e.g. Stylist"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Branch</Label>
          <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-phone">Phone</Label>
        <Input
          id="emp-phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Optional"
        />
      </div>

      {showPayrollFields && (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium">Payroll</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emp-basic-salary">Basic Salary</Label>
              <Input
                id="emp-basic-salary"
                type="number"
                min="0"
                step="0.01"
                value={form.basicSalary}
                onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-commission-rate">Commission Rate (%)</Label>
              <Input
                id="emp-commission-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.commissionRate}
                onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-epf">EPF Enabled</Label>
              <Select
                value={form.epfEnabled ? 'yes' : 'no'}
                onValueChange={(v) => setForm({ ...form, epfEnabled: v === 'yes' })}
              >
                <SelectTrigger id="emp-epf">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-etf">ETF Enabled</Label>
              <Select
                value={form.etfEnabled ? 'yes' : 'no'}
                onValueChange={(v) => setForm({ ...form, etfEnabled: v === 'yes' })}
              >
                <SelectTrigger id="emp-etf">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {showRoleFields ? (
        <>
          {assignableRoles && assignableRoles.length > 0 && (
            <div className="space-y-2">
              <Label>System role (Staff Management)</Label>
              <Select
                value={form.roleCode || '__none__'}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    roleCode: v === '__none__' ? '' : v,
                    password: v === '__none__' ? '' : form.password,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Staff only (no login)</SelectItem>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.code}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showLoginFields && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp-email">Login email</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={hasLogin ? 'Optional' : 'name@example.com'}
                  required={!hasLogin}
                />
              </div>
              {requirePassword && (
                <div className="space-y-2">
                  <Label htmlFor="emp-password">Password</Label>
                  <Input
                    id="emp-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Lock className="h-4 w-4 text-amber-500" />
            <span>Staff User Logins (Staff Management Feature)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Granting role-based user logins (Cashier, Stock Keeper, Manager) to employees requires the{' '}
            <strong className="text-foreground">Staff Management</strong> feature upgrade.
          </p>
          <Link
            to="/salon/subscription"
            className="inline-block text-xs font-semibold text-sky-600 hover:underline"
          >
            Upgrade Plan on Subscription Page &rarr;
          </Link>
        </div>
      )}
    </>
  );
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [branchFilter, setBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [advanceEmployee, setAdvanceEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editForm, setEditForm] = useState<EmployeeForm>(emptyForm);
  const [advanceForm, setAdvanceForm] = useState<AdvanceForm>(emptyAdvanceForm());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: tenantFeatures = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  const roleManagementEnabled =
    tenantFeatures.includes('STAFF_MANAGEMENT') ||
    tenantFeatures.includes('ROLE_MANAGEMENT');
  const payrollEnabled = tenantFeatures.includes('PAYROLL');

  const { data: assignableRoles = [] } = useQuery({
    queryKey: ['employee-assignable-roles'],
    queryFn: tenantApi.employees.assignableRoles,
    enabled: roleManagementEnabled,
  });

  const listParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (branchFilter !== 'all') params.branchId = branchFilter;
    if (search.trim()) params.search = search.trim();
    return Object.keys(params).length ? params : undefined;
  }, [branchFilter, search]);

  const {
    data: employees = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['employees', branchFilter, search],
    queryFn: () => tenantApi.employees.list(listParams),
  });

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === 'ACTIVE').length;
    const inactive = employees.filter((e) => e.status === 'INACTIVE').length;
    return { total: employees.length, active, inactive };
  }, [employees]);

  const createMutation = useMutation({
    mutationFn: tenantApi.employees.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.employees.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setEditEmployee(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.employees.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  const advanceMutation = useMutation({
    mutationFn: tenantApi.payroll.createAdvance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-advances'] });
      setAdvanceEmployee(null);
      setAdvanceForm(emptyAdvanceForm());
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const openEdit = (emp: Employee) => {
    setFormError(null);
    setEditEmployee(emp);
    setEditForm({
      name: emp.name,
      phone: emp.phone || '',
      email: emp.email || '',
      designation: emp.designation || '',
      branchId: emp.branchId,
      roleCode: emp.systemRoles?.[0] ?? '',
      password: '',
      basicSalary: String(emp.basicSalary ?? 0),
      commissionRate: String(emp.commissionRate ?? 0),
      epfEnabled: emp.epfEnabled ?? true,
      etfEnabled: emp.etfEnabled ?? true,
    });
  };

  const defaultBranchId = branches[0]?.id ?? '';

  if (isLoading || branchesLoading) {
    return (
      <div className="emp-page">
        <div className="emp-skeleton" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="emp-page">
        <div className="emp-error-box">
          <strong>Could not load employees</strong>
          <p style={{ margin: '0.5rem 0 0' }}>{getErrorMessage(error)}</p>
        </div>
        <button type="button" className="emp-btn emp-btn-primary" onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="emp-page">
      <header className="emp-header">
        <div>
          <div className="emp-title-row">
            <h1>Employees</h1>
          </div>
          <p className="emp-subtitle">
            {payrollEnabled
              ? 'Manage staff profiles, basic salary, and EPF/ETF settings'
              : 'Manage staff profiles and assign system roles'}
          </p>
        </div>
        <button
          type="button"
          className="emp-btn emp-btn-primary"
          onClick={() => {
            setFormError(null);
            setForm({ ...emptyForm, branchId: defaultBranchId });
            setCreateOpen(true);
          }}
          disabled={!branches.length}
        >
          + Add Employee
        </button>
      </header>

      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{stats.total}</div>
          <div className="emp-stat-label">Total</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{stats.active}</div>
          <div className="emp-stat-label">Active</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{stats.inactive}</div>
          <div className="emp-stat-label">Inactive</div>
        </div>
      </div>

      <div className="emp-toolbar">
        <div className="emp-toolbar-filters">
          <input
            type="search"
            className="emp-input search"
            placeholder="Search name, phone, designation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="emp-select"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--emp-muted)' }}>
          {employees.length} result{employees.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="emp-panel">
        {employees.length === 0 ? (
          <div className="emp-empty">
            No employees found. Add your first team member to get started.
          </div>
        ) : (
          <>
            <div className="emp-cards">
              {employees.map((emp) => (
                <article key={emp.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{emp.name}</div>
                      <div className="emp-code">{emp.code}</div>
                    </div>
                    <StatusBadge status={emp.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Designation:</strong> {emp.designation || '—'}
                    </span>
                    <span className="emp-card-role-row">
                      <strong>Role:</strong>{' '}
                      {emp.systemRoles?.length ? (
                        emp.systemRoles.map((code) => <RoleBadge key={code} code={code} />)
                      ) : (
                        '—'
                      )}
                    </span>
                    <span>
                      <strong>Branch:</strong> {emp.branchName}
                    </span>
                    {payrollEnabled && (
                      <>
                        <span>
                          <strong>Basic salary:</strong> {formatSalary(emp.basicSalary)}
                        </span>
                        <span>
                          <strong>EPF:</strong> {emp.epfEnabled === false ? 'No' : 'Yes'}
                          {' · '}
                          <strong>ETF:</strong> {emp.etfEnabled === false ? 'No' : 'Yes'}
                        </span>
                      </>
                    )}
                    {emp.email && (
                      <span>
                        <strong>Email:</strong> {emp.email}
                      </span>
                    )}
                  </div>
                  <div className="emp-card-actions">
                    <OpsEditButton onClick={() => openEdit(emp)} />
                    {payrollEnabled && emp.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="emp-btn emp-btn-secondary"
                        onClick={() => {
                          setFormError(null);
                          setAdvanceForm(emptyAdvanceForm());
                          setAdvanceEmployee(emp);
                        }}
                      >
                        Advance
                      </button>
                    )}
                    {emp.status !== 'RESIGNED' && (
                      <OpsToggleStatusButton
                        isActive={emp.status === 'ACTIVE'}
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            id: emp.id,
                            status: emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                          })
                        }
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>System role</th>
                    <th>Branch</th>
                    {payrollEnabled && <th>Basic salary (LKR)</th>}
                    {payrollEnabled && <th>EPF / ETF</th>}
                    <th>Contact</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td className="emp-code">{emp.code}</td>
                      <td className="emp-name-cell">{emp.name}</td>
                      <td>{emp.designation || '—'}</td>
                      <td>
                        {emp.systemRoles?.length ? (
                          <div className="emp-table-roles">
                            {emp.systemRoles.map((code) => (
                              <RoleBadge key={code} code={code} />
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{emp.branchName}</td>
                      {payrollEnabled && (
                        <td>{formatSalary(emp.basicSalary)}</td>
                      )}
                      {payrollEnabled && (
                        <td>
                          {emp.epfEnabled === false ? 'EPF off' : 'EPF on'}
                          {' / '}
                          {emp.etfEnabled === false ? 'ETF off' : 'ETF on'}
                        </td>
                      )}
                      <td>
                        <div className="emp-contact-cell">
                          {emp.phone && <span>{emp.phone}</span>}
                          {emp.email && <span className="emp-contact-email">{emp.email}</span>}
                          {!emp.phone && !emp.email && '—'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={emp.status} />
                      </td>
                      <td>
                        <div className="emp-actions">
                          <OpsEditButton onClick={() => openEdit(emp)} />
                          <Link
                            className="emp-btn emp-btn-secondary"
                            to={`/salon/sales-analytics?employeeId=${emp.id}&preset=this_month`}
                          >
                            Sales
                          </Link>
                          {payrollEnabled && emp.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="emp-btn emp-btn-secondary"
                              onClick={() => {
                                setFormError(null);
                                setAdvanceForm(emptyAdvanceForm());
                                setAdvanceEmployee(emp);
                              }}
                            >
                              Advance
                            </button>
                          )}
                          {emp.status !== 'RESIGNED' && (
                            <OpsToggleStatusButton
                              isActive={emp.status === 'ACTIVE'}
                              disabled={statusMutation.isPending}
                              onClick={() =>
                                statusMutation.mutate({
                                  id: emp.id,
                                  status: emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                })
                              }
                            />
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
        title="Create Employee"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            if (!form.branchId) {
              setFormError('Please select a branch.');
              return;
            }
            if (form.roleCode && !form.email.trim()) {
              setFormError('Email is required when assigning a system role.');
              return;
            }
            if (form.roleCode && form.password.length < 8) {
              setFormError('Password must be at least 8 characters.');
              return;
            }
            createMutation.mutate(toCreatePayload(form));
          }}
        >
          <FormError message={formError} />
          <EmployeeFormFields
            form={form}
            setForm={setForm}
            branches={branches}
            assignableRoles={assignableRoles}
            showRoleFields={roleManagementEnabled}
            showPayrollFields={payrollEnabled}
          />
          <FormSubmit pending={createMutation.isPending} disabled={!form.branchId}>
            Create Employee
          </FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <SimpleFormDialog
        open={editEmployee !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditEmployee(null);
            setFormError(null);
          }
        }}
        title="Edit Employee"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editEmployee) return;
            setFormError(null);
            const hasLogin = !!editEmployee.userId;
            if (editForm.roleCode && !hasLogin && !editForm.email.trim()) {
              setFormError('Email is required when assigning a system role.');
              return;
            }
            if (editForm.roleCode && !hasLogin && editForm.password.length < 8) {
              setFormError('Password must be at least 8 characters to create login access.');
              return;
            }
            updateMutation.mutate({
              id: editEmployee.id,
              data: toEditPayload(editForm, hasLogin),
            });
          }}
        >
          <FormError message={formError} />
          <EmployeeFormFields
            form={editForm}
            setForm={setEditForm}
            branches={branches}
            assignableRoles={assignableRoles}
            showRoleFields={roleManagementEnabled}
            showPayrollFields={payrollEnabled}
            requirePassword={!editEmployee?.userId}
            hasLogin={!!editEmployee?.userId}
          />
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <SimpleFormDialog
        open={advanceEmployee !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAdvanceEmployee(null);
            setFormError(null);
          }
        }}
        title={advanceEmployee ? `Advance — ${advanceEmployee.name}` : 'Give Advance'}
      >
        {advanceEmployee && (
          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              const amount = Number(advanceForm.amount);
              if (!(amount > 0)) {
                setFormError('Advance amount must be greater than 0.');
                return;
              }
              advanceMutation.mutate({
                employeeId: advanceEmployee.id,
                originalAmount: amount,
                startDate: advanceForm.startDate,
                notes: advanceForm.notes.trim() || undefined,
              });
            }}
          >
            <FormError message={formError} />
            <div className="space-y-2">
              <Label>Advance amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Full amount is deducted from the same month’s payroll.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={advanceForm.startDate}
                onChange={(e) => setAdvanceForm({ ...advanceForm, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <FormTextarea
                value={advanceForm.notes}
                onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                placeholder="Optional"
                rows={3}
              />
            </div>
            <FormSubmit pending={advanceMutation.isPending}>Save Advance</FormSubmit>
          </SimpleForm>
        )}
      </SimpleFormDialog>
    </div>
  );
}
