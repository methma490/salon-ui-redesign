import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { tenantApi, type Customer } from '@/api/tenant.api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FormError,
  FormSubmit,
  FormTextarea,
  getErrorMessage,
  OpsError,
  OpsLoading,
  OpsEditButton,
  OpsPageHeader,
  OpsStatusBadge,
  OpsToggleStatusButton,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  notes: string;
};

const emptyForm: CustomerForm = { name: '', phone: '', email: '', birthday: '', notes: '' };

function toCustomerPayload(form: CustomerForm) {
  const payload: Record<string, string> = {
    name: form.name.trim(),
    phone: form.phone.trim(),
  };
  const email = form.email.trim();
  const birthday = form.birthday.trim();
  const notes = form.notes.trim();
  if (email) payload.email = email;
  if (birthday) payload.birthday = birthday;
  if (notes) payload.notes = notes;
  return payload;
}

function CustomerFormFields({
  form,
  setForm,
}: {
  form: CustomerForm;
  setForm: (f: CustomerForm) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="cust-name">Full name</Label>
        <Input
          id="cust-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Customer name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cust-phone">Phone</Label>
        <Input
          id="cust-phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="0771234567"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cust-email">Email</Label>
          <Input
            id="cust-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cust-birthday">Birthday</Label>
          <Input
            id="cust-birthday"
            type="date"
            value={form.birthday}
            onChange={(e) => setForm({ ...form, birthday: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cust-notes">Notes</Label>
        <FormTextarea
          id="cust-notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional"
          rows={3}
        />
      </div>
    </>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [phoneSearch, setPhoneSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editForm, setEditForm] = useState<CustomerForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: customers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customers', phoneSearch],
    queryFn: () => tenantApi.customers.list(phoneSearch ? { phone: phoneSearch } : undefined),
  });

  const stats = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((c) => c.status === 'ACTIVE').length,
      inactive: customers.filter((c) => c.status !== 'ACTIVE').length,
    }),
    [customers],
  );

  const createMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.customers.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditCustomer(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.customers.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const openEdit = (cust: Customer) => {
    setFormError(null);
    setEditCustomer(cust);
    setEditForm({
      name: cust.name,
      phone: cust.phone || '',
      email: cust.email || '',
      birthday: cust.birthday?.slice(0, 10) || '',
      notes: cust.notes || '',
    });
  };

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Customers"
        subtitle="Manage customer records, contact info, and visit notes"
        action={
          <button
            type="button"
            className="emp-btn emp-btn-primary"
            onClick={() => {
              setFormError(null);
              setForm(emptyForm);
              setCreateOpen(true);
            }}
          >
            + Add Customer
          </button>
        }
      />

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
            placeholder="Search by phone…"
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
          />
          {phoneSearch && (
            <button type="button" className="emp-btn emp-btn-secondary" onClick={() => setPhoneSearch('')}>
              Clear
            </button>
          )}
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--emp-muted)' }}>
          {customers.length} customer{customers.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="emp-panel">
        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">All Customers</h2>
            <p className="emp-panel-desc">Tap a card on mobile or use the table on desktop</p>
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="emp-empty">No customers found. Add your first customer to get started.</div>
        ) : (
          <>
            <div className="emp-cards">
              {customers.map((cust) => (
                <article key={cust.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{cust.name}</div>
                      <div className="emp-code">{cust.code}</div>
                    </div>
                    <OpsStatusBadge status={cust.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Phone:</strong> {cust.phone || '—'}
                    </span>
                    <span>
                      <strong>Email:</strong> {cust.email || '—'}
                    </span>
                    {cust.birthday && (
                      <span>
                        <strong>Birthday:</strong> {cust.birthday.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <div className="emp-card-actions">
                    <OpsEditButton onClick={() => openEdit(cust)} />
                    {cust.status !== 'BLOCKED' && (
                      <OpsToggleStatusButton
                        isActive={cust.status === 'ACTIVE'}
                        onClick={() =>
                          statusMutation.mutate({
                            id: cust.id,
                            status: cust.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
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
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((cust) => (
                    <tr key={cust.id}>
                      <td className="emp-code">{cust.code}</td>
                      <td className="emp-name-cell">{cust.name}</td>
                      <td>{cust.phone || '—'}</td>
                      <td>{cust.email || '—'}</td>
                      <td>
                        <OpsStatusBadge status={cust.status} />
                      </td>
                      <td>
                        <div className="emp-actions">
                          <OpsEditButton onClick={() => openEdit(cust)} />
                          {cust.status !== 'BLOCKED' && (
                            <OpsToggleStatusButton
                              isActive={cust.status === 'ACTIVE'}
                              onClick={() =>
                                statusMutation.mutate({
                                  id: cust.id,
                                  status: cust.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
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
        title="Create Customer"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            createMutation.mutate(toCustomerPayload(form));
          }}
        >
          <FormError message={formError} />
          <CustomerFormFields form={form} setForm={setForm} />
          <FormSubmit pending={createMutation.isPending}>Create Customer</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <SimpleFormDialog
        open={editCustomer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditCustomer(null);
            setFormError(null);
          }
        }}
        title="Edit Customer"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editCustomer) return;
            setFormError(null);
            updateMutation.mutate({ id: editCustomer.id, data: toCustomerPayload(editForm) });
          }}
        >
          <FormError message={formError} />
          <CustomerFormFields form={editForm} setForm={setEditForm} />
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>
    </div>
  );
}
