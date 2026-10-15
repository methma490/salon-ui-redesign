import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  DollarSign,
  Edit2,
  Eye,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  Truck,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { suppliersApi } from '@/api/suppliers.api';
import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from '@/types/supplier.types';

function formatMoney(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage, OpsStatusBadge, FormTextarea, OpsPagination } from './salon-ops-ui';

export default function SuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<CreateSupplierInput>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    isActive: true,
  });
  const [formError, setFormError] = useState('');

  // Fetch Suppliers
  const { data: response, isLoading } = useQuery({
    queryKey: ['suppliers', { search, statusFilter, page, limit }],
    queryFn: () =>
      suppliersApi.getSuppliers({
        search: search || undefined,
        status: statusFilter,
        page,
        limit,
      }),
  });

  const suppliersList: Supplier[] = useMemo(() => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    return response.data || [];
  }, [response]);

  const paginationMeta = useMemo(() => {
    if (response && !Array.isArray(response)) {
      return {
        total: (response as any).meta?.total ?? (response as any).total ?? ((response as any).data?.length || 0),
        totalPages: (response as any).meta?.totalPages ?? (response as any).totalPages ?? 1,
      };
    }
    return null;
  }, [response]);

  // Overall totals
  const totalOutstanding = useMemo(() => {
    return suppliersList.reduce((acc, s) => acc + (Number(s.currentOutstanding) || 0), 0);
  }, [suppliersList]);

  const totalPurchases = useMemo(() => {
    return suppliersList.reduce((acc, s) => acc + (Number(s.totalPurchases) || 0), 0);
  }, [suppliersList]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: CreateSupplierInput) => suppliersApi.createSupplier(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (err) => {
      setFormError(getErrorMessage(err, 'Failed to create supplier'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSupplierInput }) =>
      suppliersApi.updateSupplier(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setEditingSupplier(null);
      resetForm();
    },
    onError: (err) => {
      setFormError(getErrorMessage(err, 'Failed to update supplier'));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      suppliersApi.updateSupplierStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDeletingSupplier(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      isActive: true,
    });
    setFormError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
      isActive: supplier.isActive,
    });
    setEditingSupplier(supplier);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Supplier name is required');
      return;
    }

    const payload: CreateSupplierInput = {
      name: formData.name.trim(),
      contactPerson: formData.contactPerson?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      isActive: formData.isActive,
    };

    if (editingSupplier) {
      updateMutation.mutate({
        id: editingSupplier.id,
        input: payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button to Suppliers & GRN hub */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/salon/suppliers-hub"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Suppliers &amp; GRN</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your vendors, procurement channels, and monitor payables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/salon/grns')} variant="outline">
            View GRNs
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Suppliers</span>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">{suppliersList.length}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Purchases</span>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {formatMoney(totalPurchases)}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Current Payables</span>
            <Building2 className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {formatMoney(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers by name, phone, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(val: any) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">Supplier</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Purchases</th>
                <th className="p-3 text-right">Outstanding</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliersList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No suppliers found matching your filters.
                  </td>
                </tr>
              ) : (
                suppliersList.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/salon/suppliers/${supplier.id}`)}
                        className="font-medium text-primary hover:underline text-left"
                      >
                        {supplier.name}
                      </button>
                      {supplier.contactPerson && (
                        <div className="text-xs text-muted-foreground">
                          Contact: {supplier.contactPerson}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      <div>{supplier.phone || '—'}</div>
                      <div>{supplier.email || ''}</div>
                    </td>
                    <td className="p-3">
                      <OpsStatusBadge status={supplier.status || (supplier.isActive ? 'ACTIVE' : 'INACTIVE')} />
                    </td>
                    <td className="p-3 text-right font-mono font-medium">
                      {formatMoney(supplier.totalPurchases || 0)}
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-rose-600">
                      {formatMoney(supplier.currentOutstanding || 0)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/salon/suppliers/${supplier.id}`)}
                          className="h-8 w-8 p-0"
                          title="View Supplier"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(supplier)}
                          className="h-8 w-8 p-0"
                          title="Edit Supplier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: supplier.id,
                              status: supplier.isActive ? 'INACTIVE' : 'ACTIVE',
                            })
                          }
                          className="h-8 w-8 p-0"
                          title={supplier.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {supplier.isActive ? (
                            <PowerOff className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Power className="h-4 w-4 text-emerald-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingSupplier(supplier)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {paginationMeta && (
          <OpsPagination
            page={page}
            limit={limit}
            total={paginationMeta.total}
            totalPages={paginationMeta.totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
            itemLabel="Suppliers"
          />
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editingSupplier}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingSupplier(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </DialogTitle>
              <DialogDescription>
                {editingSupplier
                  ? 'Update supplier contact details.'
                  : 'Add a new vendor or procurement partner.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {formError && (
                <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. L'Oreal Professional Direct"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactPerson: e.target.value,
                      }))
                    }
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="e.g. 0771234567"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="e.g. orders@supplier.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <FormTextarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Billing / Delivery address"
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <FormTextarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Credit terms, bank details, delivery schedule..."
                  className="min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingSupplier(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingSupplier ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingSupplier}
        onOpenChange={(open) => !open && setDeletingSupplier(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deletingSupplier?.name}</strong>? Suppliers with existing GRNs
              cannot be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingSupplier(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingSupplier) {
                  deleteMutation.mutate(deletingSupplier.id);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
