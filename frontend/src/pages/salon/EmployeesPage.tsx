import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { tenantApi, type AssignableEmployeeRole, type Employee } from '@/api/tenant.api';
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
};

const emptyForm: EmployeeForm = {
  name: '',
  phone: '',
  email: '',
  designation: '',
  branchId: '',
  roleCode: '',
  password: '',
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
  const payload: Record<string, string> = {
    name: form.name.trim(),
    designation: form.designation.trim(),
    branchId: form.branchId,
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
  const payload: Record<string, string> = {
    name: form.name.trim(),
    designation: form.designation.trim(),
    branchId: form.branchId,
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
  requirePassword = true,
  hasLogin = false,
}: {
  form: EmployeeForm;
  setForm: (f: EmployeeForm) => void;
  branches: Array<{ id: string; name: string }>;
  assignableRoles?: AssignableEmployeeRole[];
  showRoleFields?: boolean;
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

      {showRoleFields && assignableRoles && assignableRoles.length > 0 && (
        <div className="space-y-2">
          <Label>System role</Label>
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
  );
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [branchFilter, setBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editForm, setEditForm] = useState<EmployeeForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: tenantFeatures = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  const roleManagementEnabled = tenantFeatures.includes('STAFF_MANAGEMENT');

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

  const openEdit = (emp: Employee) => {
    setFormError(null);
    setEditEmployee(emp);
    setEditForm({
      name: emp.name,
      phone: emp.phone || '',
      email: emp.email || '',
      designation: emp.designation || '',
      branchId: emp.branchId,
      roleCode: emp.systemRoles?.[0] ?? assignableRoles[0]?.code ?? '',
      password: '',
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
          <p className="emp-subtitle">Manage staff profiles and assign system roles</p>
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
                    {emp.email && (
                      <span>
                        <strong>Email:</strong> {emp.email}
                      </span>
                    )}
                  </div>
                  <div className="emp-card-actions">
                    <OpsEditButton onClick={() => openEdit(emp)} />
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
            requirePassword={!editEmployee?.userId}
            hasLogin={!!editEmployee?.userId}
          />
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>
    </div>
  );
}
