import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { tenantApi } from '@/api/tenant.api';
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
import './employees-page.css';

export default function ProductCategoriesPage() {
  const qc = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['product-categories'],
    queryFn: tenantApi.productCategories.list,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: tenantApi.productCategories.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      setForm({ code: '', name: '', description: '' });
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.productCategories.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      setEditId(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Product Categories"
        subtitle="Organize your retail products into categories"
        action={
          <button
            type="button"
            className="emp-btn emp-btn-primary"
            onClick={() => {
              setFormError(null);
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
          <div className="emp-empty">No categories yet. Add your first product category.</div>
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
                    <OpsEditButton onClick={() => {
                      setFormError(null);
                      setEditId(cat.id);
                      setEditForm({
                        name: cat.name,
                        description: cat.description || '',
                      });
                    }} />
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
                          <OpsEditButton
                            onClick={() => {
                              setFormError(null);
                              setEditId(cat.id);
                              setEditForm({
                                name: cat.name,
                                description: cat.description || '',
                              });
                            }}
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
        title="Create Product Category"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            createMutation.mutate({
              ...form,
              code: form.code.trim().toUpperCase(),
              description: form.description.trim() || undefined,
            });
          }}
        >
          <FormError message={formError} />
          <div className="space-y-2">
            <Label htmlFor="pcat-code">Category code</Label>
            <Input
              id="pcat-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. RETAIL"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pcat-name">Category name</Label>
            <Input
              id="pcat-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Category display name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pcat-desc">Description</Label>
            <FormTextarea
              id="pcat-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional"
              rows={3}
            />
          </div>
          <FormSubmit pending={createMutation.isPending}>Create Category</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <SimpleFormDialog
        open={editId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditId(null);
            setFormError(null);
          }
        }}
        title="Edit Category"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editId) return;
            setFormError(null);
            updateMutation.mutate({ id: editId, data: editForm });
          }}
        >
          <FormError message={formError} />
          <div className="space-y-2">
            <Label htmlFor="pcat-edit-name">Category name</Label>
            <Input
              id="pcat-edit-name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pcat-edit-desc">Description</Label>
            <FormTextarea
              id="pcat-edit-desc"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Optional"
              rows={3}
            />
          </div>
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>
    </div>
  );
}
