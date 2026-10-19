import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpDown,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileText,
  Folder,
  Image as ImageIcon,
  Layers,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { appAlert } from '@/lib/app-alerts';
import { tenantApi, type Product, type ProductCategory } from '@/api/tenant.api';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatMoneyAmount } from '@/lib/money';
import { sriLankaTodayIso } from '@/lib/sri-lanka-time';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { resolveUploadUrl } from '@/lib/upload-url';
import { FormError, getErrorMessage, OpsLoading, OpsPagination } from './salon-ops-ui';
import {
  ADJUSTMENT_INCREASE_REASONS,
  ADJUSTMENT_DECREASE_REASONS,
} from './StockPage';
import './employees-page.css';

type ProductForm = {
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  sellingPrice: string;
  costPrice: string;
  imageUrl: string | null;
  branchIds: string[];
};

const emptyForm: ProductForm = {
  categoryId: '',
  name: '',
  description: '',
  unit: '',
  sellingPrice: '',
  costPrice: '',
  imageUrl: null,
  branchIds: [],
};

function toProductPayload(form: ProductForm) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    sellingPrice: Number(form.sellingPrice),
    costPrice: Number(form.costPrice),
    unit: form.unit.trim(),
    categoryId: form.categoryId || null,
    imageUrl: form.imageUrl || null,
    branchIds: form.branchIds,
  };
  const desc = form.description.trim();
  if (desc) payload.description = desc;
  return payload;
}

/**
 * Product Image Uploader component with preview
 */
function ProductImageUploader({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      appAlert({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please choose an image file (PNG, JPG, WebP).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      appAlert({
        icon: 'error',
        title: 'File Too Large',
        text: 'Image file size must be less than 5MB.',
      });
      return;
    }

    try {
      setUploading(true);
      const res = await tenantApi.products.uploadImage(file);
      onChange(res.imageUrl);
    } catch (err) {
      appAlert({
        icon: 'error',
        title: 'Upload Failed',
        text: getErrorMessage(err),
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resolvedUrl = resolveUploadUrl(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
          Product Image <span className="text-slate-400 font-normal">(Optional)</span>
        </Label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-rose-600 hover:underline font-normal"
          >
            Remove Image
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
            value
              ? 'border-emerald-300 bg-slate-50 shadow-xs'
              : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100'
          }`}
          title="Click to upload image"
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <div className="w-4 h-4 border-2 border-[var(--brand-primary,#0d5c3d)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : resolvedUrl ? (
            <img
              src={resolvedUrl}
              alt="Product preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <ImageIcon className="h-5 w-5 text-slate-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span>{uploading ? 'Uploading...' : value ? 'Change Image' : 'Upload Image'}</span>
          </button>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            PNG, JPG, or WebP up to 5MB
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Branch multi-select checklist component
 */
function BranchChecklistSelector({
  branchIds,
  onChange,
  branches,
}: {
  branchIds: string[];
  onChange: (ids: string[]) => void;
  branches: Array<{ id: string; name: string }>;
}) {
  if (branches.length === 0) return null;
  const allSelected = branchIds.length === branches.length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          Assign to Branch(es) <span className="text-rose-500">*</span>
        </Label>
        <button
          type="button"
          className="text-[11px] text-[var(--brand-primary,#0d5c3d)] hover:underline font-semibold"
          onClick={() => {
            if (allSelected) {
              onChange([]);
            } else {
              onChange(branches.map((b) => b.id));
            }
          }}
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50/50">
        {branches.map((b) => {
          const isChecked = branchIds.includes(b.id);
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
                  if (e.target.checked) onChange([...branchIds, b.id]);
                  else onChange(branchIds.filter((id) => id !== b.id));
                }}
                className="h-3.5 w-3.5 rounded text-[var(--brand-primary,#0d5c3d)]"
              />
              <span className="truncate">{b.name}</span>
            </label>
          );
        })}
      </div>
      {branchIds.length === 0 && (
        <p className="text-[11px] text-rose-500 font-medium">Please select at least one branch where this product can be sold.</p>
      )}
    </div>
  );
}

/**
 * Searchable & scrollable Category select component matching ServicesPage
 */
function SearchableProductCategorySelect({
  value,
  onChange,
  categories,
  placeholder = 'Select category',
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  categories: ProductCategory[];
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
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-slate-100 ${
                !value ? 'bg-[var(--brand-soft,#f0fdf4)] font-semibold text-[var(--brand-primary,#0d5c3d)]' : 'text-slate-500'
              }`}
            >
              <span>None (No category)</span>
              {!value && <Check className="h-3.5 w-3.5 text-[var(--brand-primary,#0d5c3d)] shrink-0 ml-2" />}
            </button>

            {filteredCategories.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">No categories found</div>
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

/**
 * More options actions menu component for each product row
 */
function ProductActionMenu({
  prod,
  onStockIn,
  onAdjust,
  onEdit,
  onToggleStatus,
  onDelete,
  statusPending,
  deletePending,
}: {
  prod: Product;
  onStockIn: (p: Product) => void;
  onAdjust: (p: Product) => void;
  onEdit: (p: Product) => void;
  onToggleStatus: (p: Product) => void;
  onDelete: (p: Product) => void;
  statusPending?: boolean;
  deletePending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  const isActive = prod.status === 'ACTIVE';

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div className="flex items-center justify-start gap-1.5">
        <button
          type="button"
          onClick={() => onStockIn(prod)}
          className="row-action-btn"
          style={{
            borderColor: 'var(--brand-border, #bbf7d0)',
            color: 'var(--brand-primary, #0d5c3d)',
            background: 'var(--brand-soft, #f0fdf4)',
          }}
          title="Stock In"
        >
          <ArrowDownLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onAdjust(prod)}
          className="row-action-btn"
          style={{ borderColor: '#e2e8f0', color: '#475569' }}
          title="Stock Adjustment"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(prod)}
          className="row-action-btn edit"
          title="Edit Product"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="row-action-btn"
          style={{ borderColor: '#e2e8f0', color: '#64748b' }}
          title="More options"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl animate-in fade-in-0 zoom-in-95">
          <button
            type="button"
            disabled={statusPending}
            onClick={() => {
              setOpen(false);
              onToggleStatus(prod);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {isActive ? (
              <>
                <PowerOff className="h-3.5 w-3.5 text-amber-600" />
                <span>Deactivate</span>
              </>
            ) : (
              <>
                <Power className="h-3.5 w-3.5 text-emerald-600" />
                <span>Activate</span>
              </>
            )}
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            disabled={deletePending}
            onClick={() => {
              setOpen(false);
              onDelete(prod);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            <span>Delete Product</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const { branchId, branches } = useSalonBranch();
  const [productBranchFilter, setProductBranchFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'>('name-asc');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 400, 2);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Stock In Modal State
  const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
  const [stockInForm, setStockInForm] = useState({
    branchIds: branchId !== 'all' ? [branchId] : [],
    quantity: '',
    unitCost: '',
    paymentType: 'PAID' as 'PAID' | 'PARTIAL' | 'CREDIT',
    paidAmount: '',
    referenceNo: '',
    purchaseDate: sriLankaTodayIso(),
    notes: '',
  });

  // Stock Adjustment Modal State
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    branchId: branchId !== 'all' ? branchId : '',
    adjustmentType: 'INCREASE' as 'INCREASE' | 'DECREASE',
    quantity: '',
    reason: 'RESTOCK',
    notes: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => tenantApi.productCategories.list({ all: true }),
  });

  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', productBranchFilter, categoryFilter, statusFilter, debouncedSearchTerm, page, limit],
    queryFn: () =>
      tenantApi.products.list({
        branchId: productBranchFilter === 'all' ? undefined : productBranchFilter,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearchTerm.trim() || undefined,
        page,
        limit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const products = useMemo(() => {
    if (!productsData) return [];
    if (Array.isArray(productsData)) return productsData;
    return (productsData as { data?: Product[] })?.data ?? [];
  }, [productsData]);

  const totalItems = useMemo(() => {
    if (!productsData) return 0;
    if (Array.isArray(productsData)) return productsData.length;
    return (productsData as { meta?: { total: number } })?.meta?.total ?? products.length;
  }, [productsData, products.length]);

  const totalPages = useMemo(() => {
    if (!productsData) return 1;
    if (Array.isArray(productsData)) return Math.max(1, Math.ceil(productsData.length / limit));
    return (productsData as { meta?: { totalPages: number } })?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / limit));
  }, [productsData, totalItems, limit]);

  useEffect(() => {
    setPage(1);
  }, [productBranchFilter, categoryFilter, statusFilter, searchTerm, sortBy]);

  const paginatedProducts = useMemo(() => {
    let list = [...products];
    list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price-asc') return Number(a.sellingPrice) - Number(b.sellingPrice);
      if (sortBy === 'price-desc') return Number(b.sellingPrice) - Number(a.sellingPrice);
      return 0;
    });

    if (Array.isArray(productsData)) {
      const startIndex = (page - 1) * limit;
      return list.slice(startIndex, startIndex + limit);
    }
    return list;
  }, [productsData, products, sortBy, page, limit]);

  const createMutation = useMutation({
    mutationFn: tenantApi.products.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
      appAlert({
        icon: 'success',
        title: 'Product Created',
        text: 'Product has been created successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.products.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      setEditProduct(null);
      setFormError(null);
      appAlert({
        icon: 'success',
        title: 'Changes Saved',
        text: 'Product details updated successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.products.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-categories'] });
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
    mutationFn: (id: string) => tenantApi.products.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      appAlert({
        icon: 'success',
        title: 'Deleted!',
        text: 'Product has been deleted successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      appAlert({
        icon: 'error',
        title: 'Cannot Delete Product',
        text: msg,
      });
    },
  });

  const stockInMutation = useMutation({
    mutationFn: tenantApi.stock.stockIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['stock-credits'] });
      setStockInProduct(null);
      setFormError(null);
      appAlert({
        icon: 'success',
        title: 'Stock Received',
        text: 'Stock has been added successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const adjustMutation = useMutation({
    mutationFn: tenantApi.stock.adjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      setAdjustProduct(null);
      setFormError(null);
      appAlert({
        icon: 'success',
        title: 'Adjustment Applied',
        text: 'Stock adjustment recorded successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const handleOpenStockIn = (prod: Product) => {
    setFormError(null);
    const initialBranches = branchId !== 'all' ? [branchId] : [];
    setStockInProduct(prod);
    setStockInForm({
      branchIds: initialBranches,
      quantity: '',
      unitCost: prod.costPrice ? String(prod.costPrice) : String(prod.sellingPrice || ''),
      paymentType: 'PAID',
      paidAmount: '',
      referenceNo: '',
      purchaseDate: sriLankaTodayIso(),
      notes: '',
    });
  };

  const handleOpenAdjust = (prod: Product) => {
    setFormError(null);
    const initialBranch = branchId !== 'all' ? branchId : branches[0]?.id || '';
    setAdjustProduct(prod);
    setAdjustForm({
      branchId: initialBranch,
      adjustmentType: 'INCREASE',
      quantity: '',
      reason: ADJUSTMENT_INCREASE_REASONS[0].value,
      notes: '',
    });
  };

  const handleToggleProductStatus = (prod: Product) => {
    if (prod.status !== 'ACTIVE') {
      const parentCat = categories.find((c) => c.id === prod.categoryId);
      const isCategoryInactive = prod.categoryIsActive === false || parentCat?.status === 'INACTIVE';
      if (isCategoryInactive) {
        appAlert({
          icon: 'warning',
          title: 'Category Is Inactive',
          html: `
            <div style="text-align: center;">
              <p style="font-size: 14px; color: #475569; margin: 0 0 10px;">
                Cannot activate product <strong>${prod.name}</strong> because its category <strong>(${prod.categoryName || 'Unknown'})</strong> is deactivated.
              </p>
              <div style="font-size: 13px; line-height: 1.45; color: #b91c1c; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 12px; text-align: left; font-weight: 500;">
                Please activate the category first to activate its products.
              </div>
            </div>
          `,
          confirmButtonColor: 'var(--brand-primary, #0d5c3d)',
          confirmButtonText: 'Understood',
        });
        return;
      }
    }

    statusMutation.mutate({
      id: prod.id,
      status: prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
  };

  const handleDeleteProduct = (prod: Product) => {
    appAlert({
      title: 'Delete Product?',
      html: `
        <div style="text-align: center;">
          <p style="font-size: 14px; color: #475569; margin: 0 0 8px;">
            Are you sure you want to delete <strong>${prod.name}</strong> (${prod.code})?
          </p>
          <p style="font-size: 12.5px; color: #64748b; margin: 0;">
            This action cannot be undone. Products linked to stock records or sales cannot be deleted.
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
        deleteMutation.mutate(prod.id);
      }
    });
  };

  const openEdit = (prod: Product) => {
    setFormError(null);
    setEditProduct(prod);
    setEditForm({
      categoryId: prod.categoryId || '',
      name: prod.name,
      description: prod.description || '',
      unit: prod.unit || '',
      sellingPrice: String(prod.sellingPrice),
      costPrice: prod.costPrice !== undefined && prod.costPrice !== null ? String(prod.costPrice) : '',
      imageUrl: prod.imageUrl || null,
      branchIds: prod.branchIds && prod.branchIds.length > 0 ? prod.branchIds : branches.map((b) => b.id),
    });
  };

  if (isLoading && !productsData) return <OpsLoading />;
  if (isError && !productsData)
    return (
      <div className="emp-page">
        <div className="emp-error-box">
          <strong>Error loading products</strong>
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
            setForm({
              ...emptyForm,
              branchIds: branches.map((b) => b.id),
            });
            setCreateOpen(true);
          }}
          className="catalog-primary-btn w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs space-y-3 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Search Input */}
          <div className="relative col-span-1 sm:col-span-2 lg:flex-1 min-w-0 lg:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] focus:border-[var(--brand-primary,#0d5c3d)] transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Branch Dropdown Filter */}
          <div className="w-full lg:w-44">
            <select
              value={productBranchFilter}
              onChange={(e) => setProductBranchFilter(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.65rem center',
                backgroundSize: '1rem',
              }}
              aria-label="Filter products by branch"
            >
              <option value="all">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categories Dropdown Filter */}
          <div className="w-full lg:w-44">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.65rem center',
                backgroundSize: '1rem',
              }}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown Filter */}
          <div className="w-full lg:w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ACTIVE' | 'INACTIVE')}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.65rem center',
                backgroundSize: '1rem',
              }}
            >
              <option value="all">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-full lg:w-44">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-10 pl-8 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.65rem center',
                backgroundSize: '1rem',
              }}
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Price (Low-High)</option>
              <option value="price-desc">Price (High-Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Presentation (Desktop Table + Mobile Cards) */}
      <div className="catalog-table-wrap">
        {paginatedProducts.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {searchTerm || productBranchFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all' ? (
              <>
                No products match the selected filters.
                <div className="mt-2">
                  <button
                    type="button"
                    className="emp-btn emp-btn-secondary text-xs"
                    onClick={() => {
                      setSearchTerm('');
                      setProductBranchFilter('all');
                      setCategoryFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              </>
            ) : (
              'No products found. Click "+ Add Product" to get started.'
            )}
          </div>
        ) : (
          <>
            {/* 1. Desktop & Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Code</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock Qty</th>
                    <th>Unit</th>
                    <th>Price (LKR)</th>
                    <th>Cost (LKR)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'left', minWidth: 160 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((prod, idx) => {
                    const rowNumber = (page - 1) * limit + idx + 1;
                    const isActive = prod.status === 'ACTIVE';
                    const stockQty = prod.stockQuantity ?? 0;
                    const imgUrl = resolveUploadUrl(prod.imageUrl);

                    return (
                      <tr key={prod.id}>
                        <td className="catalog-num-col">{rowNumber}</td>
                        <td className="catalog-code-col">{prod.code}</td>
                        <td className="catalog-name-col">
                          <div className="flex items-center gap-2.5">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={prod.name}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate">{prod.name}</span>
                              {prod.description && (
                                <span className="text-[11px] text-slate-400 block truncate max-w-[220px]">
                                  {prod.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-slate-600 font-medium">{prod.categoryName || '—'}</td>
                        {/* Current stock quantity */}
                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              stockQty <= 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : stockQty <= 5
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                stockQty <= 0
                                  ? 'bg-rose-500'
                                  : stockQty <= 5
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            {stockQty}
                          </span>
                        </td>
                        <td className="text-slate-500 font-medium">{prod.unit || '—'}</td>
                        <td className="catalog-price-col">{formatMoneyAmount(prod.sellingPrice)}</td>
                        <td className="text-slate-600 font-semibold">{formatMoneyAmount(prod.costPrice)}</td>
                        <td>
                          <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                            <span className="status-pill-dot" />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {/* More options menu */}
                        <td style={{ textAlign: 'left', minWidth: 160 }}>
                          <ProductActionMenu
                            prod={prod}
                            onStockIn={handleOpenStockIn}
                            onAdjust={handleOpenAdjust}
                            onEdit={openEdit}
                            onToggleStatus={handleToggleProductStatus}
                            onDelete={handleDeleteProduct}
                            statusPending={statusMutation.isPending}
                            deletePending={deleteMutation.isPending}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Cards View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedProducts.map((prod) => {
                const isActive = prod.status === 'ACTIVE';
                const stockQty = prod.stockQuantity ?? 0;
                const imgUrl = resolveUploadUrl(prod.imageUrl);

                return (
                  <div key={prod.id} className="p-3.5 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                    {/* Top row: Image, Name, Code, Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={prod.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs mt-0.5"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 mt-0.5">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-sm leading-snug break-words">
                              {prod.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {prod.code}
                            </span>
                          </div>
                          {prod.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                              {prod.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`status-pill shrink-0 ${isActive ? 'active' : 'inactive'}`}>
                        <span className="status-pill-dot" />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Meta info chips (Category, Stock, Unit) */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {prod.categoryName && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Folder className="h-3 w-3 text-slate-400" />
                          {prod.categoryName}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          stockQty <= 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : stockQty <= 5
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            stockQty <= 0
                              ? 'bg-rose-500'
                              : stockQty <= 5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        Stock: {stockQty} {prod.unit || ''}
                      </span>
                    </div>

                    {/* Pricing Row */}
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200/80 px-3 py-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Selling Price</span>
                        <span className="font-bold text-slate-900 text-sm">
                          LKR {formatMoneyAmount(prod.sellingPrice)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Cost Price</span>
                        <span className="font-semibold text-slate-600 text-xs">
                          LKR {formatMoneyAmount(prod.costPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] text-slate-400 font-medium">
                        Actions
                      </div>
                      <ProductActionMenu
                        prod={prod}
                        onStockIn={handleOpenStockIn}
                        onAdjust={handleOpenAdjust}
                        onEdit={openEdit}
                        onToggleStatus={handleToggleProductStatus}
                        onDelete={handleDeleteProduct}
                        statusPending={statusMutation.isPending}
                        deletePending={deleteMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <OpsPagination
              page={page}
              limit={limit}
              total={totalItems}
              totalPages={totalPages}
              onPageChange={setPage}
              onLimitChange={setLimit}
              itemLabel="products"
            />
          </>
        )}
      </div>

      {/* Create Product Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start gap-3.5 mb-4 sm:mb-5">
            <div className="dialog-header-badge">
              <Package className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Create Product</h2>
              <p className="text-xs text-slate-500 mt-1">Add a new retail product with pricing, packaging, and branches.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const nameErr = !form.name.trim() ? 'Product name is required.' : null;
              const sellErr =
                !form.sellingPrice.trim() || isNaN(Number(form.sellingPrice)) || Number(form.sellingPrice) < 0
                  ? 'Please enter a valid selling price (0 or greater).'
                  : null;
              const costErr =
                !form.costPrice.trim() || isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0
                  ? 'Cost price is required (0 or greater).'
                  : null;
              const unitErr = !form.unit.trim() ? 'Unit of measure is required (e.g. bottle, piece, box, ml).' : null;
              const branchErr =
                branches.length > 0 && form.branchIds.length === 0
                  ? 'Please select at least one branch where this product can be sold.'
                  : null;

              const err = nameErr || sellErr || costErr || unitErr || branchErr;
              if (err) {
                setFormError(err);
                return;
              }
              setFormError(null);
              createMutation.mutate(toProductPayload(form));
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            {/* Product Image Upload */}
            <ProductImageUploader
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />

            {/* Branch Assignment Checklist */}
            <BranchChecklistSelector
              branchIds={form.branchIds}
              onChange={(ids) => setForm({ ...form, branchIds: ids })}
              branches={branches}
            />

            {/* Category Select (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Category <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <SearchableProductCategorySelect
                value={form.categoryId}
                onChange={(val) => setForm({ ...form, categoryId: val })}
                categories={categories}
                placeholder="Select category (optional)"
              />
            </div>

            {/* Product Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Product name <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Argan Hair Oil 100ml"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            {/* Selling Price & Cost Price Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Selling Price (LKR) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <CircleDollarSign className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Cost Price (LKR) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <CircleDollarSign className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    placeholder="0.00"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>
            </div>

            {/* Unit of Measure (Required) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Unit of Measure (Packaging) <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Package className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="e.g. bottle, piece, box, ml"
                  required
                  className="catalog-search-input"
                />
              </div>
              <p className="text-[11px] text-slate-400">Packaging type (e.g. bottle, piece, jar). To receive quantity in stock, use <strong>Stock In</strong>.</p>
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
                  rows={2}
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
                <Plus className="h-4 w-4" /> Create Product
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={editProduct !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditProduct(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start gap-3.5 mb-4 sm:mb-5">
            <div className="dialog-header-badge">
              <Package className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Edit Product</h2>
              <p className="text-xs text-slate-500 mt-1">Update product pricing, unit, image, and branch assignment.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editProduct) return;
              const nameErr = !editForm.name.trim() ? 'Product name is required.' : null;
              const sellErr =
                !editForm.sellingPrice.trim() || isNaN(Number(editForm.sellingPrice)) || Number(editForm.sellingPrice) < 0
                  ? 'Please enter a valid selling price (0 or greater).'
                  : null;
              const costErr =
                !editForm.costPrice.trim() || isNaN(Number(editForm.costPrice)) || Number(editForm.costPrice) < 0
                  ? 'Cost price is required (0 or greater).'
                  : null;
              const unitErr = !editForm.unit.trim() ? 'Unit of measure is required (e.g. bottle, piece, box, ml).' : null;
              const branchErr =
                branches.length > 0 && editForm.branchIds.length === 0
                  ? 'Please select at least one branch where this product can be sold.'
                  : null;

              const err = nameErr || sellErr || costErr || unitErr || branchErr;
              if (err) {
                setFormError(err);
                return;
              }
              setFormError(null);
              updateMutation.mutate({ id: editProduct.id, data: toProductPayload(editForm) });
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            {/* Product Image Upload */}
            <ProductImageUploader
              value={editForm.imageUrl}
              onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
            />

            {/* Branch Assignment Checklist */}
            <BranchChecklistSelector
              branchIds={editForm.branchIds}
              onChange={(ids) => setEditForm({ ...editForm, branchIds: ids })}
              branches={branches}
            />

            {/* Category Select (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Category <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <SearchableProductCategorySelect
                value={editForm.categoryId}
                onChange={(val) => setEditForm({ ...editForm, categoryId: val })}
                categories={categories}
                placeholder="Select category (optional)"
              />
            </div>

            {/* Product Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Product name <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Product name"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            {/* Selling Price & Cost Price Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Selling Price (LKR) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <CircleDollarSign className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.sellingPrice}
                    onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Cost Price (LKR) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <CircleDollarSign className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.costPrice}
                    onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })}
                    placeholder="0.00"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>
            </div>

            {/* Unit of Measure */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Unit of Measure (Packaging) <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Package className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  placeholder="e.g. bottle, piece, box, ml"
                  required
                  className="catalog-search-input"
                />
              </div>
              <p className="text-[11px] text-slate-400">Packaging type (e.g. bottle, piece). To add stock quantity, use <strong>Stock In</strong>.</p>
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
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div className="char-counter">{editForm.description.length}/200</div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditProduct(null)}
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

      {/* Stock In Modal (Requirement 1) */}
      <Dialog
        open={stockInProduct !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStockInProduct(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start gap-3.5 mb-4 sm:mb-5">
            <div className="dialog-header-badge">
              <ArrowDownLeft className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Stock In</h2>
              <p className="text-xs text-slate-500 mt-1">
                Receive the same quantity for <strong className="text-slate-800">{stockInProduct?.name}</strong> at each selected branch.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!stockInProduct) return;
              const qty = Number(stockInForm.quantity);
              const unitCost = Number(stockInForm.unitCost);
              if (!(qty > 0)) {
                setFormError('Quantity must be greater than 0.');
                return;
              }
              if (unitCost < 0) {
                setFormError('Unit cost cannot be negative.');
                return;
              }
              if (stockInForm.branchIds.length === 0) {
                setFormError('Select at least one branch to receive stock.');
                return;
              }
              const totalAmount = Math.round((qty * unitCost + Number.EPSILON) * 100) / 100;
              if (stockInForm.paymentType === 'PARTIAL') {
                const paid = Number(stockInForm.paidAmount);
                if (!(paid > 0) || paid >= totalAmount) {
                  setFormError('Partial paid amount must be greater than 0 and less than total.');
                  return;
                }
              }
              setFormError(null);
              stockInMutation.mutate({
                branchId: stockInForm.branchIds[0],
                branchIds: stockInForm.branchIds,
                productId: stockInProduct.id,
                quantity: qty,
                unitCost,
                paymentType: stockInForm.paymentType,
                paidAmount:
                  stockInForm.paymentType === 'PARTIAL'
                    ? Number(stockInForm.paidAmount)
                    : undefined,
                referenceNo: stockInForm.referenceNo.trim() || undefined,
                purchaseDate: stockInForm.purchaseDate || undefined,
                notes: stockInForm.notes.trim() || undefined,
              });
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            {/* Branch Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  Branches <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  className="text-[11px] text-[var(--brand-primary,#0d5c3d)] hover:underline font-semibold"
                  onClick={() => setStockInForm({
                    ...stockInForm,
                    branchIds: stockInForm.branchIds.length === branches.length
                      ? []
                      : branches.map((branch) => branch.id),
                  })}
                >
                  {stockInForm.branchIds.length === branches.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50/50">
                {branches.map((branch) => {
                  const selected = stockInForm.branchIds.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={`flex items-center gap-2 p-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                        selected
                          ? 'border-[var(--brand-border,#bbf7d0)] bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] font-medium'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => setStockInForm({
                          ...stockInForm,
                          branchIds: event.target.checked
                            ? [...stockInForm.branchIds, branch.id]
                            : stockInForm.branchIds.filter((id) => id !== branch.id),
                        })}
                        className="h-3.5 w-3.5 rounded text-[var(--brand-primary,#0d5c3d)]"
                      />
                      <span className="truncate">{branch.name}</span>
                    </label>
                  );
                })}
              </div>
              {stockInForm.branchIds.length === 0 && (
                <p className="text-[11px] text-rose-500 font-medium">Select at least one branch.</p>
              )}
            </div>

            {/* Quantity & Unit Cost Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Quantity per branch <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <Package className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={stockInForm.quantity}
                    onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                    placeholder="e.g. 10"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Unit Cost (LKR) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <CircleDollarSign className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockInForm.unitCost}
                    onChange={(e) => setStockInForm({ ...stockInForm, unitCost: e.target.value })}
                    placeholder="0.00"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>
            </div>

            {/* Total Calculation Display */}
            {Number(stockInForm.quantity) > 0 && Number(stockInForm.unitCost) >= 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Total Purchase Value ({stockInForm.branchIds.length} branches):
                </span>
                <span className="font-bold text-slate-900">
                  LKR {((Number(stockInForm.quantity) || 0) * (Number(stockInForm.unitCost) || 0) * stockInForm.branchIds.length).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Payment Type & Purchase Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Payment Status</Label>
                <div className="input-icon-field">
                  <CreditCard className="field-icon h-4 w-4" />
                  <select
                    value={stockInForm.paymentType}
                    onChange={(e) =>
                      setStockInForm({
                        ...stockInForm,
                        paymentType: e.target.value as any,
                        paidAmount: '',
                      })
                    }
                    className="catalog-search-input"
                  >
                    <option value="PAID">Fully Paid</option>
                    <option value="PARTIAL">Partially Paid</option>
                    <option value="CREDIT">On Credit (Unpaid)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Purchase Date</Label>
                <div className="input-icon-field">
                  <Calendar className="field-icon h-4 w-4" />
                  <input
                    type="date"
                    value={stockInForm.purchaseDate}
                    onChange={(e) => setStockInForm({ ...stockInForm, purchaseDate: e.target.value })}
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>
            </div>

            {/* Partial Paid Amount Field if Partial */}
            {stockInForm.paymentType === 'PARTIAL' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Paid Amount per branch (LKR) <span className="text-rose-500">*</span>
                </Label>
                <div className="input-icon-field">
                  <CircleDollarSign className="field-icon h-4 w-4" />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={stockInForm.paidAmount}
                    onChange={(e) => setStockInForm({ ...stockInForm, paidAmount: e.target.value })}
                    placeholder="Enter amount paid"
                    required
                    className="catalog-search-input"
                  />
                </div>
              </div>
            )}

            {/* Reference No */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Reference / Invoice No (Optional)</Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <input
                  type="text"
                  value={stockInForm.referenceNo}
                  onChange={(e) => setStockInForm({ ...stockInForm, referenceNo: e.target.value })}
                  placeholder="e.g. INV-1008"
                  className="catalog-search-input"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Notes (Optional)</Label>
              <div className="input-icon-field textarea-field">
                <FileText className="field-icon h-4 w-4" />
                <textarea
                  value={stockInForm.notes}
                  onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
                  placeholder="Supplier details or remarks..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStockInProduct(null)}
                className="dialog-action-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                  disabled={stockInMutation.isPending || stockInForm.branchIds.length === 0}
                className="dialog-action-submit"
              >
                <ArrowDownLeft className="h-4 w-4" /> Record Stock In
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Modal (Requirement 1, 2, 3) */}
      <Dialog
        open={adjustProduct !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustProduct(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start gap-3.5 mb-4 sm:mb-5">
            <div className="dialog-header-badge">
              <SlidersHorizontal className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Stock Adjustment</h2>
              <p className="text-xs text-slate-500 mt-1">
                Adjust inventory count for <strong className="text-slate-800">{adjustProduct?.name}</strong> ({adjustProduct?.code}).
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!adjustProduct) return;
              const rawQty = Math.abs(Number(adjustForm.quantity));
              if (!(rawQty > 0)) {
                setFormError('Please enter a valid quantity greater than 0.');
                return;
              }
              const finalQty = adjustForm.adjustmentType === 'INCREASE' ? rawQty : -rawQty;
              const reasonList =
                adjustForm.adjustmentType === 'INCREASE'
                  ? ADJUSTMENT_INCREASE_REASONS
                  : ADJUSTMENT_DECREASE_REASONS;
              const reasonObj = reasonList.find((r) => r.value === adjustForm.reason);
              const reasonLabel = reasonObj?.label || adjustForm.reason;
              const combinedNotes = [
                reasonLabel ? `[${reasonLabel}]` : null,
                adjustForm.notes?.trim() || null,
              ]
                .filter(Boolean)
                .join(' ');

              setFormError(null);
              adjustMutation.mutate({
                branchId: adjustForm.branchId,
                productId: adjustProduct.id,
                quantity: finalQty,
                notes: combinedNotes || undefined,
              });
            }}
            className="space-y-4"
          >
            <FormError message={formError} />

            {/* Branch Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Branch <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Building2 className="field-icon h-4 w-4" />
                <select
                  value={adjustForm.branchId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, branchId: e.target.value })}
                  required
                  className="catalog-search-input"
                >
                  <option value="" disabled>Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Requirement 2: Adjustment Type Dropdown (Increase or Decrease) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Adjustment Type <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Layers className="field-icon h-4 w-4" />
                <select
                  value={adjustForm.adjustmentType}
                  onChange={(e) => {
                    const nextType = e.target.value as 'INCREASE' | 'DECREASE';
                    setAdjustForm({
                      ...adjustForm,
                      adjustmentType: nextType,
                      reason:
                        nextType === 'INCREASE'
                          ? ADJUSTMENT_INCREASE_REASONS[0].value
                          : ADJUSTMENT_DECREASE_REASONS[0].value,
                    });
                  }}
                  className="catalog-search-input font-medium"
                >
                  <option value="INCREASE">Increase (+)</option>
                  <option value="DECREASE">Decrease (−)</option>
                </select>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Quantity ({adjustForm.adjustmentType === 'INCREASE' ? '+ Increase' : '− Decrease'}) <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Package className="field-icon h-4 w-4" />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  placeholder="Enter quantity amount"
                  required
                  className="catalog-search-input"
                />
              </div>
            </div>

            {/* Requirement 3: Reason for Adjustment Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Reason for Adjustment <span className="text-rose-500">*</span>
              </Label>
              <div className="input-icon-field">
                <Tag className="field-icon h-4 w-4" />
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="catalog-search-input"
                >
                  {(adjustForm.adjustmentType === 'INCREASE'
                    ? ADJUSTMENT_INCREASE_REASONS
                    : ADJUSTMENT_DECREASE_REASONS
                  ).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Requirement 3: Optional Notes Field */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Notes (Optional)</Label>
              <div className="input-icon-field textarea-field">
                <FileText className="field-icon h-4 w-4" />
                <textarea
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="Specific details, batch remarks or reason context..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAdjustProduct(null)}
                className="dialog-action-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjustMutation.isPending || !adjustForm.branchId}
                className="dialog-action-submit"
              >
                <SlidersHorizontal className="h-4 w-4" /> Apply Adjustment
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
