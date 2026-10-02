import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  FileText,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { appAlert } from '@/lib/app-alerts';
import { tenantApi, type ProductCategory } from '@/api/tenant.api';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FormError, getErrorMessage, OpsLoading, OpsPagination } from './salon-ops-ui';
import './employees-page.css';

type CategoryForm = {
  name: string;
  description: string;
};

const emptyForm: CategoryForm = {
  name: '',
  description: '',
};

function toCategoryPayload(form: CategoryForm) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
  };
  const desc = form.description.trim();
  if (desc) payload.description = desc;
  return payload;
}

export default function ProductCategoriesPage() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 400, 2);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'products-desc' | 'products-asc'>('name-asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editForm, setEditForm] = useState<CategoryForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['product-categories', statusFilter, debouncedSearchTerm, page, limit],
    queryFn: () =>
      tenantApi.productCategories.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearchTerm.trim() || undefined,
        page,
        limit,
      }),
  });

  const categories = useMemo(() => {
    if (!categoriesData) return [];
    if (Array.isArray(categoriesData)) return categoriesData;
    return (categoriesData as { data?: ProductCategory[] })?.data ?? [];
  }, [categoriesData]);

  const totalItems = useMemo(() => {
    if (!categoriesData) return 0;
    if (Array.isArray(categoriesData)) return categoriesData.length;
    return (categoriesData as { meta?: { total: number } })?.meta?.total ?? categories.length;
  }, [categoriesData, categories.length]);

  const totalPages = useMemo(() => {
    if (!categoriesData) return 1;
    if (Array.isArray(categoriesData)) return Math.max(1, Math.ceil(categoriesData.length / limit));
    return (categoriesData as { meta?: { totalPages: number } })?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / limit));
  }, [categoriesData, totalItems, limit]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, sortBy]);

  const paginatedCategories = useMemo(() => {
    let list = [...categories];
    list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'products-desc') return (b.productsCount ?? 0) - (a.productsCount ?? 0);
      if (sortBy === 'products-asc') return (a.productsCount ?? 0) - (b.productsCount ?? 0);
      return 0;
    });

    if (Array.isArray(categoriesData)) {
      const startIndex = (page - 1) * limit;
      return list.slice(startIndex, startIndex + limit);
    }
    return list;
  }, [categoriesData, categories, sortBy, page, limit]);

  const createMutation = useMutation({
    mutationFn: tenantApi.productCategories.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
      appAlert({
        icon: 'success',
        title: 'Category Created',
        text: 'Product category created successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.productCategories.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditCategory(null);
      setFormError(null);
      appAlert({
        icon: 'success',
        title: 'Changes Saved',
        text: 'Product category updated successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.productCategories.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setFormError(null);
      appAlert({
        icon: 'success',
        title: variables.status === 'ACTIVE' ? 'Category Activated' : 'Category Deactivated',
        text:
          variables.status === 'ACTIVE'
            ? 'The product category and assigned products are now active.'
            : 'The category and all its assigned products have been deactivated.',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      setFormError(msg);
      appAlert({
        icon: 'error',
        title: 'Error',
        text: msg,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantApi.productCategories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setFormError(null);
      appAlert({
        icon: 'success',
        title: 'Category Deleted',
        text: 'The product category has been deleted successfully.',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      setFormError(msg);
      appAlert({
        icon: 'error',
        title: 'Cannot Delete Category',
        text: msg,
      });
    },
  });

  const openEdit = (cat: ProductCategory) => {
    setFormError(null);
    setEditCategory(cat);
    setEditForm({
      name: cat.name,
      description: cat.description || '',
    });
  };

  const handleToggleStatus = (cat: ProductCategory) => {
    setFormError(null);
    if (cat.status === 'ACTIVE') {
      appAlert({
        title: 'Deactivate Category?',
        html: `
          <div style="text-align: center; margin-bottom: 14px;">
            <p style="font-size: 15px; color: #475569; margin: 0 0 10px;">
              Are you sure you want to deactivate <strong>${cat.name}</strong> (${cat.code})?
            </p>
            <div style="font-size: 13.5px; line-height: 1.45; color: #b91c1c; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; text-align: left; font-weight: 500;">
              ⚠️ <strong>Warning:</strong> if deactivated all the products assigned to this category will be deactivated
            </div>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, deactivate',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        focusCancel: true,
      }).then((result) => {
        if (result.isConfirmed) {
          statusMutation.mutate({ id: cat.id, status: 'INACTIVE' });
        }
      });
    } else {
      appAlert({
        title: 'Activate Category?',
        text: `Do you want to activate "${cat.name}" and all its assigned products?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, activate',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          statusMutation.mutate({ id: cat.id, status: 'ACTIVE' });
        }
      });
    }
  };

  const handleDeleteCategory = (cat: ProductCategory) => {
    setFormError(null);
    appAlert({
      title: 'Delete Product Category?',
      html: `
        <div style="text-align: center; margin-bottom: 12px;">
          <p style="font-size: 15px; color: #475569; margin: 0 0 10px;">
            Are you sure you want to delete <strong>${cat.name}</strong> (${cat.code})?
          </p>
          <p style="font-size: 13px; color: #64748b; margin: 0;">
            This action cannot be undone. Categories with assigned products cannot be deleted.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(cat.id);
      }
    });
  };

  if (isLoading && !categoriesData) return <OpsLoading />;
  if (isError && !categoriesData)
    return (
      <div className="emp-page">
        <div className="emp-error-box">
          <strong>Error loading categories</strong>
          <p>{getErrorMessage(error)}</p>
        </div>
        <button type="button" className="catalog-primary-btn" onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    );

  return (
    <div className="emp-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organize your retail products into categories</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setForm(emptyForm);
            setCreateOpen(true);
          }}
          className="catalog-primary-btn"
        >
          <span>+</span> Add Category
        </button>
      </div>

      {/* Filter Toolbar Card (Summary cards removed as requested) */}
      <div className="catalog-filter-card">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="catalog-search-wrap">
            <Search className="search-icon h-4 w-4" />
            <input
              type="text"
              placeholder="Search categories by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="catalog-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ACTIVE' | 'INACTIVE')}
            className="catalog-filter-select"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="catalog-sort-wrap">
          <ArrowUpDown className="sort-icon h-3.5 w-3.5" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="catalog-sort-select"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="products-desc">Products (High-Low)</option>
            <option value="products-asc">Products (Low-High)</option>
          </select>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="catalog-table-wrap">
        {paginatedCategories.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {searchTerm || statusFilter !== 'all' ? (
              <>
                No product categories match the selected filters.
                <div className="mt-2">
                  <button
                    type="button"
                    className="emp-btn emp-btn-secondary text-xs"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              </>
            ) : (
              'No categories yet. Click "+ Add Category" to create your first product category.'
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Code</th>
                    <th>Category Name</th>
                    <th>Description</th>
                    <th>Products</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.map((cat, idx) => {
                    const rowNumber = (page - 1) * limit + idx + 1;
                    const isActive = cat.status === 'ACTIVE';

                    return (
                      <tr key={cat.id}>
                        <td className="catalog-num-col">{rowNumber}</td>
                        <td className="catalog-code-col">{cat.code}</td>
                        <td className="catalog-name-col">{cat.name}</td>
                        <td className="text-slate-500">{cat.description || '—'}</td>
                        <td className="font-medium text-slate-700">{cat.productsCount ?? 0}</td>
                        <td>
                          <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                            <span className="status-pill-dot" />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5 pr-1">
                            <button
                              type="button"
                              onClick={() => openEdit(cat)}
                              className="row-action-btn edit"
                              title="Edit Category"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(cat)}
                              disabled={statusMutation.isPending}
                              className="row-action-btn toggle"
                              title={isActive ? 'Deactivate Category' : 'Activate Category'}
                            >
                              {isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              disabled={deleteMutation.isPending}
                              className="row-action-btn delete"
                              title="Delete Category"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <OpsPagination
              page={page}
              limit={limit}
              total={totalItems}
              totalPages={totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
              itemLabel="categories"
            />
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormError(null);
            setCreateOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="dialog-header-badge">
              <Tag className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Create Product Category</h2>
              <p className="text-xs text-slate-500 mt-1">Add a new product category to organise your inventory.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                setFormError('Category name is required.');
                return;
              }
              setFormError(null);
              createMutation.mutate(toCategoryPayload(form));
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Category name <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Hair Care, Skin Care, Styling"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Description</Label>
              <div className="input-icon-field textarea-field">
                <FileText className="field-icon h-4 w-4" />
                <textarea
                  value={form.description}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Add a short description (optional)"
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div className="char-counter">{form.description.length}/200</div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="dialog-action-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="dialog-action-submit"
              >
                <Plus className="h-4 w-4" /> Create Category
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditCategory(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="dialog-header-badge">
              <Tag className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Edit Product Category</h2>
              <p className="text-xs text-slate-500 mt-1">Update category details.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editCategory) return;
              if (!editForm.name.trim()) {
                setFormError('Category name is required.');
                return;
              }
              setFormError(null);
              updateMutation.mutate({ id: editCategory.id, data: toCategoryPayload(editForm) });
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Category name <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Hair Care, Skin Care"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Description</Label>
              <div className="input-icon-field textarea-field">
                <FileText className="field-icon h-4 w-4" />
                <textarea
                  value={editForm.description}
                  maxLength={200}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Add a short description (optional)"
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div className="char-counter">{editForm.description.length}/200</div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditCategory(null)}
                className="dialog-action-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="dialog-action-submit"
              >
                Save Changes
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
