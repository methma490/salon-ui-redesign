import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { tenantApi, type ServiceCategory } from '@/api/tenant.api';
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

  const openEdit = (cat: ServiceCategory) => {
    setFormError(null);
    setEditCategory(cat);
    setEditForm({
      name: cat.name,
      description: cat.description || '',
    });
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
          <div className="emp-stat-value">{categories.length}</div>
          <div className="emp-stat-label">Categories</div>
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
                  </div>
                  <div className="emp-card-meta">
                    <span>{cat.description || 'No description'}</span>
                  </div>
                  <div className="emp-card-actions">
                    <OpsEditButton onClick={() => openEdit(cat)} />
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
                        <div className="emp-actions">
                          <OpsEditButton onClick={() => openEdit(cat)} />
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
    </div>
  );
}
