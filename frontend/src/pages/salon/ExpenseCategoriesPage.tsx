import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { tenantApi, type ExpenseCategory } from '@/api/tenant.api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FormError,
  FormSubmit,
  FormTextarea,
  getErrorMessage,
  OpsDeleteButton,
  OpsEditButton,
  OpsError,
  OpsLoading,
  OpsPageHeader,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import './employees-page.css';

export default function ExpenseCategoriesPage() {
  const qc = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: tenantApi.expenseCategories.list,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [deleteCategoryItem, setDeleteCategoryItem] = useState<ExpenseCategory | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: tenantApi.expenseCategories.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      setForm({ code: '', name: '', description: '' });
      setFormError(null);
      setCreateOpen(false);
      toast.success('Category created successfully');
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.expenseCategories.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      setEditId(null);
      setFormError(null);
      toast.success('Category updated successfully');
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantApi.expenseCategories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      setDeleteCategoryItem(null);
      toast.success('Category deleted successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Expense Categories"
        subtitle="Organize operating costs into categories"
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
          <div className="emp-empty">No expense categories yet.</div>
        ) : (
          <>
            <div className="emp-cards">
              {categories.map((category) => (
                <article key={category.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{category.name}</div>
                      <div className="emp-code">{category.code}</div>
                    </div>
                  </div>
                  {category.description && (
                    <div className="emp-card-meta">
                      <span>{category.description}</span>
                    </div>
                  )}
                  <div className="emp-card-actions">
                    <OpsEditButton
                      onClick={() => {
                        setFormError(null);
                        setEditId(category.id);
                        setEditForm({
                          name: category.name,
                          description: category.description || '',
                        });
                      }}
                    />
                    <OpsDeleteButton onClick={() => setDeleteCategoryItem(category)} />
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
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="emp-code">{category.code}</td>
                      <td className="emp-name-cell">{category.name}</td>
                      <td>{category.description || '—'}</td>
                      <td>
                        <div className="emp-actions">
                          <OpsEditButton
                            onClick={() => {
                              setFormError(null);
                              setEditId(category.id);
                              setEditForm({
                                name: category.name,
                                description: category.description || '',
                              });
                            }}
                          />
                          <OpsDeleteButton onClick={() => setDeleteCategoryItem(category)} />
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

      <SimpleFormDialog open={createOpen} onOpenChange={setCreateOpen} title="Add Category">
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            createMutation.mutate({
              code: form.code.trim() ? form.code.trim().toUpperCase() : undefined,
              name: form.name.trim(),
              description: form.description.trim() || undefined,
            });
          }}
        >
          <FormError message={formError} />
          <div className="space-y-2">
            <Label htmlFor="ec-code">Code (Optional)</Label>
            <Input
              id="ec-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. RENT (auto-generated if empty)"
            />
            <p style={{ fontSize: 12, color: 'var(--emp-muted, #64748b)' }}>
              Leave blank to automatically generate a unique category code.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec-name">Name</Label>
            <Input
              id="ec-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Rent"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec-desc">Description</Label>
            <FormTextarea
              id="ec-desc"
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
        open={!!editId}
        onOpenChange={(open) => !open && setEditId(null)}
        title="Edit Category"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editId) return;
            setFormError(null);
            updateMutation.mutate({
              id: editId,
              data: {
                name: editForm.name.trim(),
                description: editForm.description.trim() || undefined,
              },
            });
          }}
        >
          <FormError message={formError} />
          <div className="space-y-2">
            <Label htmlFor="ec-edit-name">Name</Label>
            <Input
              id="ec-edit-name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec-edit-desc">Description</Label>
            <FormTextarea
              id="ec-edit-desc"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
            />
          </div>
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      <Dialog
        open={!!deleteCategoryItem}
        onOpenChange={(open) => !open && setDeleteCategoryItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p style={{ color: 'var(--emp-muted, #64748b)', fontSize: 14 }}>
            Are you sure you want to delete category{' '}
            <strong>{deleteCategoryItem?.name}</strong> ({deleteCategoryItem?.code})?
          </p>
          <DialogFooter style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCategoryItem(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteCategoryItem) {
                  deleteMutation.mutate(deleteCategoryItem.id);
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
