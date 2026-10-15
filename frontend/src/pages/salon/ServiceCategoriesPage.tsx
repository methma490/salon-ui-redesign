import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Building2,
  FileText,
  Pencil,
  Power,
  PowerOff,
  Search,
  Tag,
  Trash2,
  X,
  ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { appAlert } from '@/lib/app-alerts';
import { tenantApi, type ServiceCategory } from '@/api/tenant.api';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FormError, getErrorMessage, OpsLoading, OpsPagination } from './salon-ops-ui';
import './employees-page.css';

type CategoryForm = {
  name: string;
  description: string;
  branchIds: string[];
};

const emptyForm: CategoryForm = {
  name: '',
  description: '',
  branchIds: [],
};

function toCategoryPayload(form: CategoryForm) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    branchIds: form.branchIds,
  };
  const desc = form.description.trim();
  if (desc) payload.description = desc;
  return payload;
}

export default function ServiceCategoriesPage() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 400, 2);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'services-desc' | 'services-asc'>('name-asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<ServiceCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editForm, setEditForm] = useState<CategoryForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['service-categories', statusFilter, debouncedSearchTerm, page, limit],
    queryFn: () =>
      tenantApi.serviceCategories.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearchTerm.trim() || undefined,
        page,
        limit,
      }),
  });

  const categories = useMemo(() => {
    if (!categoriesData) return [];
    if (Array.isArray(categoriesData)) return categoriesData;
    return (categoriesData as { data?: ServiceCategory[] })?.data ?? [];
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
      if (sortBy === 'services-desc') return (b.servicesCount ?? 0) - (a.servicesCount ?? 0);
      if (sortBy === 'services-asc') return (a.servicesCount ?? 0) - (b.servicesCount ?? 0);
      return 0;
    });

    if (Array.isArray(categoriesData)) {
      const startIndex = (page - 1) * limit;
      return list.slice(startIndex, startIndex + limit);
    }
    return list;
  }, [categoriesData, categories, sortBy, page, limit]);

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
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['service-categories'] });
      qc.invalidateQueries({ queryKey: ['services'] });
      setFormError(null);
      appAlert({
        icon: 'success',
        title: variables.status === 'ACTIVE' ? 'Category Activated' : 'Category Deactivated',
        text:
          variables.status === 'ACTIVE'
            ? 'The service category and assigned services are now active.'
            : 'The category and all its assigned services have been deactivated.',
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
    mutationFn: (id: string) => tenantApi.serviceCategories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-categories'] });
      qc.invalidateQueries({ queryKey: ['services'] });
      setFormError(null);
      appAlert({
        icon: 'success',
        title: 'Category Deleted',
        text: 'The service category has been deleted successfully.',
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

  const openEdit = (cat: ServiceCategory) => {
    setFormError(null);
    setEditCategory(cat);
    setEditForm({
      name: cat.name,
      description: cat.description || '',
      branchIds: cat.branchIds || (cat.branches ? cat.branches.map((b) => b.id) : []),
    });
  };

  const handleToggleStatus = (cat: ServiceCategory) => {
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
              ⚠️ <strong>Warning:</strong> if deactivated all the services assigned to the this category will be deactivated
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
        text: `Do you want to activate "${cat.name}" and all its assigned services?`,
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

  const handleDeleteCategory = (cat: ServiceCategory) => {
    setFormError(null);
    appAlert({
      title: 'Delete Service Category?',
      html: `
        <div style="text-align: center; margin-bottom: 12px;">
          <p style="font-size: 15px; color: #475569; margin: 0 0 10px;">
            Are you sure you want to delete <strong>${cat.name}</strong> (${cat.code})?
          </p>
          <p style="font-size: 13px; color: #64748b; margin: 0;">
            This action cannot be undone. Categories with assigned services cannot be deleted.
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

  if (isLoading) return <OpsLoading />;
  if (isError) return <div className="emp-page"><div className="emp-error-box"><strong>Error loading categories</strong><p>{getErrorMessage(error)}</p></div><button type="button" className="emp-btn emp-btn-primary" onClick={() => void refetch()}>Try again</button></div>;

  return (
    <div className="emp-page">
      {/* Back button to Services hub */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/salon/services-hub"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Services</span>
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Service Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Group your salon services into clear categories</p>
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

      {/* Filter Toolbar Card */}
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
            <option value="services-desc">Services (High-Low)</option>
            <option value="services-asc">Services (Low-High)</option>
          </select>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="catalog-table-wrap">
        {paginatedCategories.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {searchTerm || statusFilter !== 'all' ? (
              <>
                No categories match the selected filters.
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
              'No categories yet. Click "+ Add Category" to create your first category.'
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
                    <th>Services</th>
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
                        <td className="font-medium text-slate-700">{cat.servicesCount ?? 0}</td>
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

      {/* Create Dialog matching Screenshot 2 */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setFormError(null); setCreateOpen(open); }}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="dialog-header-badge">
              <Tag className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Create Service Category</h2>
              <p className="text-xs text-slate-500 mt-1">Add a new service category to organise your salon services.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              createMutation.mutate(toCategoryPayload(form));
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Category name <span className="text-rose-500">*</span></Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Hair, Makeup, Facial"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            {branches.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Assign to Branch(es)
                  </Label>
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline font-medium"
                    onClick={() => {
                      if (form.branchIds.length === branches.length) {
                        setForm({ ...form, branchIds: [] });
                      } else {
                        setForm({ ...form, branchIds: branches.map((b) => b.id) });
                      }
                    }}
                  >
                    {form.branchIds.length === branches.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50/50">
                  {branches.map((b) => {
                    const isChecked = form.branchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 p-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-[var(--brand-border,#bbf7d0)] bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] font-medium'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setForm({ ...form, branchIds: [...form.branchIds, b.id] });
                            else setForm({ ...form, branchIds: form.branchIds.filter((id) => id !== b.id) });
                          }}
                          className="h-3.5 w-3.5 rounded text-[var(--brand-primary,#0d5c3d)]"
                        />
                        <span className="truncate">{b.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

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
                Create Category
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog matching Screenshot 2 */}
      <Dialog open={editCategory !== null} onOpenChange={(open) => { if (!open) { setEditCategory(null); setFormError(null); } }}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="dialog-header-badge">
              <Tag className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Edit Service Category</h2>
              <p className="text-xs text-slate-500 mt-1">Update category details and branch assignments.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editCategory) return;
              setFormError(null);
              updateMutation.mutate({ id: editCategory.id, data: toCategoryPayload(editForm) });
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Category name <span className="text-rose-500">*</span></Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Hair, Makeup, Facial"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            {branches.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Assign to Branch(es)
                  </Label>
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline font-medium"
                    onClick={() => {
                      if (editForm.branchIds.length === branches.length) {
                        setEditForm({ ...editForm, branchIds: [] });
                      } else {
                        setEditForm({ ...editForm, branchIds: branches.map((b) => b.id) });
                      }
                    }}
                  >
                    {editForm.branchIds.length === branches.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50/50">
                  {branches.map((b) => {
                    const isChecked = editForm.branchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 p-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-[var(--brand-border,#bbf7d0)] bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] font-medium'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setEditForm({ ...editForm, branchIds: [...editForm.branchIds, b.id] });
                            else setEditForm({ ...editForm, branchIds: editForm.branchIds.filter((id) => id !== b.id) });
                          }}
                          className="h-3.5 w-3.5 rounded text-[var(--brand-primary,#0d5c3d)]"
                        />
                        <span className="truncate">{b.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

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
