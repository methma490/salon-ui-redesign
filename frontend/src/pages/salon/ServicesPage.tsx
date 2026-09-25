import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { tenantApi, type Service, type ServiceCategory } from '@/api/tenant.api';
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
  OpsToggleStatusButton,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';

type ServiceForm = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
};

const emptyForm: ServiceForm = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  durationMinutes: '',
};

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toServicePayload(form: ServiceForm) {
  const payload: Record<string, unknown> = {
    categoryId: form.categoryId,
    name: form.name.trim(),
    price: Number(form.price),
  };
  const desc = form.description.trim();
  if (desc) payload.description = desc;
  if (form.durationMinutes.trim()) payload.durationMinutes = Number(form.durationMinutes);
  return payload;
}

function ServiceFormFields({
  form,
  setForm,
  categories,
}: {
  form: ServiceForm;
  setForm: (f: ServiceForm) => void;
  categories: ServiceCategory[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id} disabled={c.status === 'INACTIVE'}>
                {c.name} {c.status === 'INACTIVE' ? '(Inactive)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="svc-name">Service name</Label>
        <Input
          id="svc-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Service display name"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="svc-price">Price (LKR)</Label>
          <Input
            id="svc-price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc-duration">Duration (min)</Label>
          <Input
            id="svc-duration"
            type="number"
            min="1"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="svc-desc">Description</Label>
        <FormTextarea
          id="svc-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional"
          rows={3}
        />
      </div>
    </>
  );
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editForm, setEditForm] = useState<ServiceForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['service-categories'],
    queryFn: tenantApi.serviceCategories.list,
  });

  const {
    data: services = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['services', categoryFilter],
    queryFn: () => tenantApi.services.list(categoryFilter === 'all' ? undefined : categoryFilter),
  });

  const stats = useMemo(
    () => ({
      total: services.length,
      active: services.filter((s) => s.status === 'ACTIVE').length,
      inactive: services.filter((s) => s.status !== 'ACTIVE').length,
    }),
    [services],
  );

  const defaultCategoryId =
    categories.find((c) => c.status === 'ACTIVE')?.id ?? categories[0]?.id ?? '';

  const createMutation = useMutation({
    mutationFn: tenantApi.services.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.services.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      setEditService(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.services.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });

  const openEdit = (svc: Service) => {
    setFormError(null);
    setEditService(svc);
    setEditForm({
      categoryId: svc.categoryId || '',
      name: svc.name,
      description: svc.description || '',
      price: String(svc.price),
      durationMinutes: svc.durationMinutes ? String(svc.durationMinutes) : '',
    });
  };

  const validateServiceForm = (payload: ServiceForm) => {
    if (!payload.categoryId) return 'Please select a category.';
    if (!payload.name.trim()) return 'Service name is required.';
    if (!payload.price.trim() || Number(payload.price) < 0) return 'Enter a valid price.';
    return null;
  };

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Services"
        subtitle="Manage salon services, pricing, and duration"
        action={
          <button
            type="button"
            className="emp-btn emp-btn-primary"
            disabled={!categories.length}
            onClick={() => {
              setFormError(null);
              setForm({ ...emptyForm, categoryId: defaultCategoryId });
              setCreateOpen(true);
            }}
          >
            + Add Service
          </button>
        }
      />

      {!categories.length && (
        <div className="emp-error-box" style={{ marginBottom: '1rem' }}>
          Create at least one service category before adding services.
        </div>
      )}

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
          <select
            className="emp-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--emp-muted)' }}>
          {services.length} service{services.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="emp-panel">
        {services.length === 0 ? (
          <div className="emp-empty">No services found. Add your first service to get started.</div>
        ) : (
          <>
            <div className="emp-cards">
              {services.map((svc) => (
                <article key={svc.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{svc.name}</div>
                      <div className="emp-code">{svc.code}</div>
                    </div>
                    <OpsStatusBadge status={svc.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Category:</strong> {svc.categoryName || '—'}
                    </span>
                    <span>
                      <strong>Price (LKR):</strong>{' '}
                      <span className="emp-price">{formatMoney(svc.price)}</span>
                    </span>
                    <span>
                      <strong>Duration:</strong>{' '}
                      {svc.durationMinutes ? `${svc.durationMinutes} min` : '—'}
                    </span>
                  </div>
                  <div className="emp-card-actions">
                    <OpsEditButton onClick={() => openEdit(svc)} />
                    <OpsToggleStatusButton
                      isActive={svc.status === 'ACTIVE'}
                      onClick={() =>
                        statusMutation.mutate({
                          id: svc.id,
                          status: svc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                        })
                      }
                    />
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
                    <th>Category</th>
                    <th>Price (LKR)</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc) => (
                    <tr key={svc.id}>
                      <td className="emp-code">{svc.code}</td>
                      <td className="emp-name-cell">{svc.name}</td>
                      <td>{svc.categoryName || '—'}</td>
                      <td className="emp-price">{formatMoney(svc.price)}</td>
                      <td>{svc.durationMinutes ? `${svc.durationMinutes} min` : '—'}</td>
                      <td>
                        <OpsStatusBadge status={svc.status} />
                      </td>
                      <td>
                        <div className="emp-actions">
                          <OpsEditButton onClick={() => openEdit(svc)} />
                          <OpsToggleStatusButton
                            isActive={svc.status === 'ACTIVE'}
                            onClick={() =>
                              statusMutation.mutate({
                                id: svc.id,
                                status: svc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                              })
                            }
                          />
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
        title="Create Service"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            const validationError = validateServiceForm(form);
            if (validationError) {
              setFormError(validationError);
              return;
            }
            createMutation.mutate(toServicePayload(form));
          }}
        >
          <FormError message={formError} />
          <ServiceFormFields form={form} setForm={setForm} categories={categories} />
          <FormSubmit pending={createMutation.isPending} disabled={!form.categoryId}>
            Create Service
          </FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <SimpleFormDialog
        open={editService !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditService(null);
            setFormError(null);
          }
        }}
        title="Edit Service"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editService) return;
            setFormError(null);
            const validationError = validateServiceForm(editForm);
            if (validationError) {
              setFormError(validationError);
              return;
            }
            updateMutation.mutate({ id: editService.id, data: toServicePayload(editForm) });
          }}
        >
          <FormError message={formError} />
          <ServiceFormFields form={editForm} setForm={setEditForm} categories={categories} />
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>
    </div>
  );
}
