import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { tenantApi, type ServiceCategory } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type CategoryForm = { name: string; description: string };
const emptyForm: CategoryForm = { name: '', description: '' };

function toCategoryPayload(form: CategoryForm) {
  const payload: Record<string, string> = { name: form.name.trim() };
  const desc = form.description.trim();
  if (desc) payload.description = desc;
  return payload;
}

function CategoryFormFields({
  form,
  setForm,
  mode,
}: {
  form: CategoryForm;
  setForm: (f: CategoryForm) => void;
  mode: 'create' | 'edit';
}) {
  return (
    <>
      {mode === 'create' && (
        <p className="text-sm text-muted-foreground">
          Category code is generated automatically when you save.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="cat-name">Category name</Label>
        <Input
          id="cat-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Category display name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-desc">Description</Label>
        <FormTextarea
          id="cat-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional"
          rows={3}
        />
      </div>
    </>
  );
}

export default function ServiceCategoriesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<ServiceCategory | null>(null);
  const [deactivateCategory, setDeactivateCategory] = useState<ServiceCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editForm, setEditForm] = useState<CategoryForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['service-categories'],
    queryFn: tenantApi.serviceCategories.list,
  });

  const stats = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((c) => c.status === 'ACTIVE').length,
      inactive: categories.filter((c) => c.status !== 'ACTIVE').length,
    }),
    [categories],
  );

  const createMutation = useMutation({
    mutationFn: tenantApi.serviceCategories.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-categories'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.serviceCategories.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-categories'] });
      setEditCategory(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.serviceCategories.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-categories'] });
      qc.invalidateQueries({ queryKey: ['services'] });
      setDeactivateCategory(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const openEdit = (cat: ServiceCategory) => {
    setFormError(null);
    setEditCategory(cat);
    setEditForm({
      name: cat.name,
      description: cat.description || '',
    });
  };

  const handleToggleStatus = (cat: ServiceCategory) => {
    setFormError(null);
    if (cat.status === 'ACTIVE') {
      setDeactivateCategory(cat);
    } else {
      statusMutation.mutate({ id: cat.id, status: 'ACTIVE' });
    }
  };

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Service Categories"
        subtitle="Group your salon services into clear categories"
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
            + Add Category
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

      <div className="emp-panel">
        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">All Categories</h2>
            <p className="emp-panel-desc">
              {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
        </div>

        {formError && (
          <div style={{ padding: '0 1.5rem 1rem' }}>
            <FormError message={formError} />
          </div>
        )}

        {categories.length === 0 ? (
          <div className="emp-empty">No categories yet. Create one before adding services.</div>
        ) : (
          <>
            <div className="emp-cards">
              {categories.map((cat) => (
                <article key={cat.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{cat.name}</div>
                      <div className="emp-code">{cat.code}</div>
                    </div>
                    <OpsStatusBadge status={cat.status || 'ACTIVE'} />
                  </div>
                  <div className="emp-card-meta">
                    <span>{cat.description || 'No description'}</span>
                  </div>
                  <div className="emp-card-actions">
                    <OpsEditButton onClick={() => openEdit(cat)} />
                    <OpsToggleStatusButton
                      isActive={cat.status === 'ACTIVE'}
                      disabled={statusMutation.isPending}
                      onClick={() => handleToggleStatus(cat)}
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
                    <th>Description</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="emp-code">{cat.code}</td>
                      <td className="emp-name-cell">{cat.name}</td>
                      <td>{cat.description || '—'}</td>
                      <td>
                        <OpsStatusBadge status={cat.status || 'ACTIVE'} />
                      </td>
                      <td>
                        <div className="emp-actions">
                          <OpsEditButton onClick={() => openEdit(cat)} />
                          <OpsToggleStatusButton
                            isActive={cat.status === 'ACTIVE'}
                            disabled={statusMutation.isPending}
                            onClick={() => handleToggleStatus(cat)}
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

      {/* Create Dialog */}
      <SimpleFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setFormError(null);
          setCreateOpen(open);
        }}
        title="Create Service Category"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            createMutation.mutate(toCategoryPayload(form));
          }}
        >
          <FormError message={formError} />
          <CategoryFormFields form={form} setForm={setForm} mode="create" />
          <FormSubmit pending={createMutation.isPending}>Create Category</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      {/* Edit Dialog */}
      <SimpleFormDialog
        open={editCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditCategory(null);
            setFormError(null);
          }
        }}
        title="Edit Category"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editCategory) return;
            setFormError(null);
            updateMutation.mutate({ id: editCategory.id, data: toCategoryPayload(editForm) });
          }}
        >
          <FormError message={formError} />
          <CategoryFormFields form={editForm} setForm={setEditForm} mode="edit" />
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      {/* Deactivation Confirmation Warning Dialog */}
      <Dialog
        open={deactivateCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateCategory(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Deactivate Category</DialogTitle>
                <DialogDescription className="mt-1">
                  Category: <span className="font-semibold text-foreground">{deactivateCategory?.name}</span> ({deactivateCategory?.code})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm font-medium">
                if deactivated all the services assigned to the this category will be deactivated
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateCategory(null)}
              disabled={statusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (deactivateCategory) {
                  statusMutation.mutate({ id: deactivateCategory.id, status: 'INACTIVE' });
                }
              }}
            >
              {statusMutation.isPending ? 'Deactivating...' : 'Deactivate Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
