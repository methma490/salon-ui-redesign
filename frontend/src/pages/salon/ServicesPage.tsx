import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  FileText,
  Folder,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Scissors,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { appAlert } from '@/lib/app-alerts';
import { tenantApi, type Service, type ServiceCategory } from '@/api/tenant.api';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FormError, getErrorMessage, OpsLoading, OpsPagination } from './salon-ops-ui';
import './employees-page.css';

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

/**
 * Searchable & scrollable Category select component matching Screenshot 3
 */
function SearchableCategorySelect({
  value,
  onChange,
  categories,
  placeholder = 'Select category',
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  categories: ServiceCategory[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open && categories.length > 5) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (!open) {
      setSearch('');
    }
  }, [open, categories.length]);

  const selectedCategory = categories.find((c) => c.id === value);
  const showSearch = categories.length > 5;

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term),
    );
  }, [categories, search]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 transition-colors hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex items-center gap-2 truncate">
          <Folder className="h-4 w-4 text-slate-400 shrink-0" />
          <span className={!selectedCategory ? 'text-slate-400' : 'font-medium text-slate-900'}>
            {selectedCategory ? selectedCategory.name : placeholder}
          </span>
          {selectedCategory && (
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {selectedCategory.code}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95 overflow-hidden">
          {showSearch && (
            <div className="border-b border-slate-100 p-2 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
            {filteredCategories.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">
                No categories found
              </div>
            ) : (
              filteredCategories.map((c) => {
                const isSelected = value === c.id;
                const isInactive = c.status === 'INACTIVE';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-slate-100 ${
                      isSelected ? 'bg-[var(--brand-soft,#f0fdf4)] font-semibold text-[var(--brand-primary,#0d5c3d)]' : 'text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{c.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {c.code}
                      </span>
                      {isInactive && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[var(--brand-primary,#0d5c3d)] shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'duration'>('name-asc');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 400, 2);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editForm, setEditForm] = useState<ServiceForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => tenantApi.serviceCategories.list({ all: true }),
  });

  const {
    data: servicesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['services', categoryFilter, statusFilter, debouncedSearchTerm, page, limit],
    queryFn: () =>
      tenantApi.services.listPaginated({
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearchTerm.trim() || undefined,
        page,
        limit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const services = useMemo(() => {
    if (!servicesData) return [];
    if (Array.isArray(servicesData)) return servicesData;
    return (servicesData as { data?: Service[] })?.data ?? [];
  }, [servicesData]);

  const totalItems = useMemo(() => {
    if (!servicesData) return 0;
    if (Array.isArray(servicesData)) return servicesData.length;
    return (servicesData as { meta?: { total: number } })?.meta?.total ?? services.length;
  }, [servicesData, services.length]);

  const totalPages = useMemo(() => {
    if (!servicesData) return 1;
    if (Array.isArray(servicesData)) return Math.max(1, Math.ceil(servicesData.length / limit));
    return (servicesData as { meta?: { totalPages: number } })?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / limit));
  }, [servicesData, totalItems, limit]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, statusFilter, searchTerm, sortBy]);

  const paginatedServices = useMemo(() => {
    let list = [...services];
    list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'duration') return (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0);
      return 0;
    });

    if (Array.isArray(servicesData)) {
      const startIndex = (page - 1) * limit;
      return list.slice(startIndex, startIndex + limit);
    }
    return list;
  }, [servicesData, services, sortBy, page, limit]);

  const defaultCategoryId =
    categories.find((c) => c.status === 'ACTIVE')?.id ?? categories[0]?.id ?? '';

  const createMutation = useMutation({
    mutationFn: tenantApi.services.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      qc.invalidateQueries({ queryKey: ['service-categories'] });
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
      qc.invalidateQueries({ queryKey: ['service-categories'] });
      setEditService(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.services.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      qc.invalidateQueries({ queryKey: ['service-categories'] });
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      appAlert({
        icon: 'error',
        title: 'Action Failed',
        text: msg,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantApi.services.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      qc.invalidateQueries({ queryKey: ['service-categories'] });
      appAlert({
        icon: 'success',
        title: 'Deleted!',
        text: 'Service has been deleted successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      appAlert({
        icon: 'error',
        title: 'Cannot Delete Service',
        text: msg,
      });
    },
  });

  const handleToggleServiceStatus = (svc: Service) => {
    if (svc.status !== 'ACTIVE') {
      const parentCat = categories.find((c) => c.id === svc.categoryId);
      const isCategoryInactive = svc.categoryIsActive === false || parentCat?.status === 'INACTIVE';
      if (isCategoryInactive) {
        appAlert({
          icon: 'warning',
          title: 'Category Is Inactive',
          html: `
            <div style="text-align: center;">
              <p style="font-size: 14px; color: #475569; margin: 0 0 10px;">
                Cannot activate service <strong>${svc.name}</strong> because its category <strong>(${svc.categoryName || 'Unknown'})</strong> is deactivated.
              </p>
              <div style="font-size: 13px; line-height: 1.45; color: #b91c1c; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 12px; text-align: left; font-weight: 500;">
                Please activate the category first to activate its services.
              </div>
            </div>
          `,
          confirmButtonColor: '#065f46',
          confirmButtonText: 'Understood',
        });
        return;
      }
    }

    statusMutation.mutate({
      id: svc.id,
      status: svc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
  };

  const handleDeleteService = (svc: Service) => {
    appAlert({
      title: 'Delete Service?',
      html: `
        <div style="text-align: center;">
          <p style="font-size: 14px; color: #475569; margin: 0 0 8px;">
            Are you sure you want to delete <strong>${svc.name}</strong> (${svc.code})?
          </p>
          <p style="font-size: 12.5px; color: #64748b; margin: 0;">
            This will permanently remove the service from the catalog.
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
        deleteMutation.mutate(svc.id);
      }
    });
  };

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

  if (isLoading && !servicesData) return <OpsLoading />;
  if (isError && !servicesData) return (
    <div className="emp-page">
      <div className="emp-error-box">
        <strong>Error loading services</strong>
        <p>{getErrorMessage(error)}</p>
      </div>
      <button type="button" className="catalog-primary-btn" onClick={() => void refetch()}>
        Try again
      </button>
    </div>
  );

  return (
    <div className="emp-page">


      {/* Top Action */}
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setForm({ ...emptyForm, categoryId: defaultCategoryId });
            setCreateOpen(true);
          }}
          className="catalog-primary-btn"
        >
          <span>+</span> Add Service
        </button>
      </div>

      {/* Filter Toolbar Card matching Screenshot 1 */}
      <div className="catalog-filter-card">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="catalog-search-wrap">
            <Search className="search-icon h-4 w-4" />
            <input
              type="text"
              placeholder="Search services by name or code..."
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

          {/* Categories Dropdown Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="catalog-filter-select"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ACTIVE' | 'INACTIVE')}
            className="catalog-filter-select"
          >
            <option value="all">All status</option>
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
            <option value="price-asc">Price (Low-High)</option>
            <option value="price-desc">Price (High-Low)</option>
            <option value="duration">Duration</option>
          </select>
        </div>
      </div>

      {/* Services Table Container matching Screenshot 1 */}
      <div className="catalog-table-wrap">
        {paginatedServices.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' ? (
              <>
                No services match the selected filters.
                <div className="mt-2">
                  <button
                    type="button"
                    className="emp-btn emp-btn-secondary text-xs"
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              </>
            ) : (
              'No services found. Click "+ Add Service" to get started.'
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
                    <th>Service Name</th>
                    <th>Category</th>
                    <th>Price (LKR)</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedServices.map((svc, idx) => {
                    const rowNumber = (page - 1) * limit + idx + 1;
                    const isActive = svc.status === 'ACTIVE';

                    return (
                      <tr key={svc.id}>
                        <td className="catalog-num-col">{rowNumber}</td>
                        <td className="catalog-code-col">{svc.code}</td>
                        <td className="catalog-name-col">{svc.name}</td>
                        <td className="text-slate-600 font-medium">{svc.categoryName || '—'}</td>
                        <td className="catalog-price-col">{formatMoney(svc.price)}</td>
                        <td className="catalog-duration-col">
                          {svc.durationMinutes ? `${svc.durationMinutes} min` : '—'}
                        </td>
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
                              onClick={() => openEdit(svc)}
                              className="row-action-btn edit"
                              title="Edit Service"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleServiceStatus(svc)}
                              disabled={statusMutation.isPending}
                              className="row-action-btn toggle"
                              title={isActive ? 'Deactivate Service' : 'Activate Service'}
                            >
                              {isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteService(svc)}
                              disabled={deleteMutation.isPending}
                              className="row-action-btn delete"
                              title="Delete Service"
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
              itemLabel="services"
            />
          </>
        )}
      </div>

      {/* Create Service Dialog matching Screenshot 3 */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="dialog-header-badge">
              <Scissors className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Create Service</h2>
              <p className="text-xs text-slate-500 mt-1">Add a new salon service with pricing and duration.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const err = !form.categoryId
                ? 'Please select a category.'
                : !form.name.trim()
                  ? 'Service name is required.'
                  : !form.price.trim() || Number(form.price) < 0
                    ? 'Enter a valid price.'
                    : null;
              if (err) {
                setFormError(err);
                return;
              }
              setFormError(null);
              createMutation.mutate(toServicePayload(form));
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            {/* Category Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Category <span className="text-rose-500">*</span>
              </Label>
              <SearchableCategorySelect
                value={form.categoryId}
                onChange={(val) => setForm({ ...form, categoryId: val })}
                categories={categories}
                placeholder="Select category"
              />
            </div>

            {/* Service Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Service name <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Hair Cut - Short"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            {/* Price and Duration Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Price (LKR) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <CircleDollarSign className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Duration (min) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <Clock className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="1"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    placeholder="e.g. 30"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
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

            {/* Modal Actions */}
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
                <Plus className="h-4 w-4" /> Create Service
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog matching Screenshot 3 */}
      <Dialog
        open={editService !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditService(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="dialog-header-badge">
              <Scissors className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Edit Service</h2>
              <p className="text-xs text-slate-500 mt-1">Update service details, pricing, and duration.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editService) return;
              const err = !editForm.categoryId
                ? 'Please select a category.'
                : !editForm.name.trim()
                  ? 'Service name is required.'
                  : !editForm.price.trim() || Number(editForm.price) < 0
                    ? 'Enter a valid price.'
                    : null;
              if (err) {
                setFormError(err);
                return;
              }
              setFormError(null);
              updateMutation.mutate({ id: editService.id, data: toServicePayload(editForm) });
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            {/* Category Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Category <span className="text-rose-500">*</span>
              </Label>
              <SearchableCategorySelect
                value={editForm.categoryId}
                onChange={(val) => setEditForm({ ...editForm, categoryId: val })}
                categories={categories}
                placeholder="Select category"
              />
            </div>

            {/* Service Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Service name <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Hair Cut - Short"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            {/* Price and Duration Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Price (LKR) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <CircleDollarSign className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder="0.00"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Duration (min) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <Clock className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="1"
                    value={editForm.durationMinutes}
                    onChange={(e) => setEditForm({ ...editForm, durationMinutes: e.target.value })}
                    placeholder="e.g. 30"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
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

            {/* Modal Actions */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditService(null)}
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
