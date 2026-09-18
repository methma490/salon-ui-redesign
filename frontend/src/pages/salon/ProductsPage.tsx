import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { tenantApi } from '@/api/tenant.api';
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
import { formatMoneyAmount } from '@/lib/money';
import './employees-page.css';

type ProductForm = {
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  sellingPrice: string;
  costPrice: string;
};

const emptyForm: ProductForm = {
  categoryId: '',
  name: '',
  description: '',
  unit: '',
  sellingPrice: '',
  costPrice: '',
};

function toProductPayload(form: ProductForm) {
  return {
    categoryId: form.categoryId || undefined,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    unit: form.unit.trim() || undefined,
    sellingPrice: Number(form.sellingPrice),
    costPrice: form.costPrice.trim() ? Number(form.costPrice) : undefined,
  };
}

function ProductFormFields({
  form,
  setForm,
  categories,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
  categories: Array<{ id: string; name: string }>;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={form.categoryId || '__none__'}
          onValueChange={(v) => setForm({ ...form, categoryId: v === '__none__' ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="prod-name">Product name</Label>
        <Input
          id="prod-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Product display name"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prod-selling">Selling price (LKR)</Label>
          <Input
            id="prod-selling"
            type="number"
            min="0"
            step="0.01"
            value={form.sellingPrice}
            onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prod-cost">Cost price (LKR)</Label>
          <Input
            id="prod-cost"
            type="number"
            min="0"
            step="0.01"
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="prod-unit">Unit</Label>
        <Input
          id="prod-unit"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          placeholder="e.g. bottle, piece"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prod-desc">Description</Label>
        <FormTextarea
          id="prod-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional"
          rows={3}
        />
      </div>
    </>
  );
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: tenantApi.productCategories.list,
  });

  const {
    data: products = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', categoryFilter],
    queryFn: () => tenantApi.products.list(categoryFilter === 'all' ? undefined : categoryFilter),
  });

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.status === 'ACTIVE').length,
    }),
    [products],
  );

  const createMutation = useMutation({
    mutationFn: tenantApi.products.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.products.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditId(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.products.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const openEdit = (prod: (typeof products)[number]) => {
    setFormError(null);
    setEditId(prod.id);
    setEditForm({
      categoryId: prod.categoryId || '',
      name: prod.name,
      description: prod.description || '',
      unit: prod.unit || '',
      sellingPrice: String(prod.sellingPrice),
      costPrice: String(prod.costPrice),
    });
  };

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Products"
        subtitle="Manage retail products and pricing"
        action={
          <button
            type="button"
            className="emp-btn emp-btn-primary"
            onClick={() => {
              setFormError(null);
              setCreateOpen(true);
            }}
          >
            + Add Product
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
          <div className="emp-stat-value">{categories.length}</div>
          <div className="emp-stat-label">Categories</div>
        </div>
      </div>

      <div className="emp-panel emp-form-panel emp-mobile-filters">
        <div className="emp-form-panel-title">Filter</div>
        <div className="emp-filter-field">
          <Label>Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="emp-filter-select">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="emp-panel">
        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">All Products</h2>
            <p className="emp-panel-desc">
              {products.length} product{products.length === 1 ? '' : 's'}
              {categoryFilter !== 'all'
                ? ` in ${categories.find((c) => c.id === categoryFilter)?.name ?? 'category'}`
                : ''}
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="emp-empty">No products found. Add your first product to sell at POS.</div>
        ) : (
          <>
            <div className="emp-cards">
              {products.map((prod) => (
                <article key={prod.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{prod.name}</div>
                      <div className="emp-code">{prod.code}</div>
                    </div>
                    <OpsStatusBadge status={prod.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Category:</strong> {prod.categoryName || '—'}
                    </span>
                    <span>
                      <strong>Unit:</strong> {prod.unit || '—'}
                    </span>
                    <span>
                      <strong>Price (LKR):</strong>{' '}
                      <span className="emp-price">{formatMoneyAmount(prod.sellingPrice)}</span>
                    </span>
                    <span>
                      <strong>Cost (LKR):</strong> {formatMoneyAmount(prod.costPrice)}
                    </span>
                  </div>
                  <div className="emp-card-actions emp-card-actions-mobile">
                    <OpsEditButton onClick={() => openEdit(prod)} />
                    <OpsToggleStatusButton
                      isActive={prod.status === 'ACTIVE'}
                      onClick={() =>
                        statusMutation.mutate({
                          id: prod.id,
                          status: prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
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
                    <th>Unit</th>
                    <th>Price (LKR)</th>
                    <th>Cost (LKR)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => (
                    <tr key={prod.id}>
                      <td className="emp-code">{prod.code}</td>
                      <td className="emp-name-cell">{prod.name}</td>
                      <td>{prod.categoryName || '—'}</td>
                      <td>{prod.unit || '—'}</td>
                      <td className="emp-price">{formatMoneyAmount(prod.sellingPrice)}</td>
                      <td>{formatMoneyAmount(prod.costPrice)}</td>
                      <td>
                        <OpsStatusBadge status={prod.status} />
                      </td>
                      <td>
                        <div className="emp-actions">
                          <OpsEditButton onClick={() => openEdit(prod)} />
                          <OpsToggleStatusButton
                            isActive={prod.status === 'ACTIVE'}
                            onClick={() =>
                              statusMutation.mutate({
                                id: prod.id,
                                status: prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
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
        title="Create Product"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            createMutation.mutate(toProductPayload(form));
          }}
        >
          <FormError message={formError} />
          <ProductFormFields form={form} setForm={setForm} categories={categories} />
          <FormSubmit pending={createMutation.isPending}>Create Product</FormSubmit>
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
        title="Edit Product"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!editId) return;
            setFormError(null);
            updateMutation.mutate({ id: editId, data: toProductPayload(editForm) });
          }}
        >
          <FormError message={formError} />
          <ProductFormFields form={editForm} setForm={setEditForm} categories={categories} />
          <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>
    </div>
  );
}
