import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  DollarSign,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { tenantApi, type Branch } from '@/api/tenant.api';
import type { GRN, GRNStatus, GRNPaymentStatus, Supplier } from '@/types/supplier.types';
import {
  OpsPageHeader,
  OpsLoading,
  OpsPagination,
  getErrorMessage,
} from './salon-ops-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function GrnsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(searchParams.get('paymentStatus') || 'ALL');
  const [branchFilter, setBranchFilter] = useState<string>(searchParams.get('branchId') || 'ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>(searchParams.get('supplierId') || 'ALL');

  // Metadata dropdowns
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);

  // Action Dialogs
  const [receiveModalGrn, setReceiveModalGrn] = useState<GRN | null>(null);
  const [cancelModalGrn, setCancelModalGrn] = useState<GRN | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch dropdown metadata once
  useEffect(() => {
    async function loadMeta() {
      try {
        const [branchRes, supRes] = await Promise.all([
          tenantApi.branches.list(),
          suppliersApi.getSuppliers({ limit: 100 }),
        ]);
        setBranches(Array.isArray(branchRes) ? branchRes : []);
        const sups = Array.isArray(supRes) ? supRes : supRes.data || [];
        setSuppliersList(sups);
      } catch (e) {
        console.error('Failed to load branches or suppliers metadata', e);
      }
    }
    loadMeta();
  }, []);

  const loadGrns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.grnStatus = statusFilter;
      if (paymentStatusFilter !== 'ALL') params.paymentStatus = paymentStatusFilter;
      if (branchFilter !== 'ALL') params.branchId = branchFilter;
      if (supplierFilter !== 'ALL') params.supplierId = supplierFilter;

      const res = await suppliersApi.getGrns(params);
      setGrns(res.data || []);
      const totalCount = (res as any).meta?.total ?? (res as any).total ?? (res.data?.length || 0);
      const pagesCount = (res as any).meta?.totalPages ?? (res as any).totalPages ?? 1;
      setTotal(totalCount);
      setTotalPages(pagesCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load GRNs'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, paymentStatusFilter, branchFilter, supplierFilter]);

  useEffect(() => {
    loadGrns();
  }, [loadGrns]);

  const handleReceiveConfirm = async () => {
    if (!receiveModalGrn) return;
    try {
      setActionPending(true);
      setActionError(null);
      await suppliersApi.receiveGrn(receiveModalGrn.id);
      setReceiveModalGrn(null);
      loadGrns();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to receive GRN and update stock'));
    } finally {
      setActionPending(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelModalGrn) return;
    try {
      setActionPending(true);
      setActionError(null);
      await suppliersApi.cancelGrn(cancelModalGrn.id);
      setCancelModalGrn(null);
      loadGrns();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to cancel GRN'));
    } finally {
      setActionPending(false);
    }
  };

  const getStatusBadge = (status: GRNStatus) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="emp-badge emp-badge-active flex items-center gap-1"><CheckCircle2 size={12} /> Received</span>;
      case 'DRAFT':
        return <span className="emp-badge emp-badge-pending flex items-center gap-1"><Clock size={12} /> Draft</span>;
      case 'CANCELLED':
        return <span className="emp-badge emp-badge-resigned flex items-center gap-1"><XCircle size={12} /> Cancelled</span>;
      default:
        return <span className="emp-badge">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status: GRNPaymentStatus) => {
    switch (status) {
      case 'PAID':
        return <span className="emp-badge emp-badge-active">Paid</span>;
      case 'PARTIALLY_PAID':
        return <span className="emp-badge emp-badge-probation">Partially Paid</span>;
      case 'UNPAID':
        return <span className="emp-badge emp-badge-resigned">Unpaid</span>;
      default:
        return <span className="emp-badge">{status}</span>;
    }
  };

  // Quick summary numbers
  const totalValue = grns.reduce((sum, g) => sum + Number(g.totalAmount || 0), 0);
  const totalOutstanding = grns.reduce((sum, g) => sum + Number(g.outstandingAmount || 0), 0);

  return (
    <div className="emp-page space-y-6">
      <OpsPageHeader
        title="GRN / Purchases"
        subtitle="Manage Goods Received Notes, stock intake from suppliers, and purchase invoices."
        action={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/salon/suppliers')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Truck size={16} />
              Suppliers
            </Button>
            <Button
              onClick={() => navigate('/salon/grns/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground"
            >
              <Plus size={16} />
              New GRN / Purchase
            </Button>
          </div>
        }
      />

      {/* Top summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Invoices Listed</span>
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{total}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Page Purchases Value</span>
            <DollarSign className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold">Rs. {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Page Outstanding Balance</span>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">Rs. {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Direct Access</span>
            <Truck className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/salon/supplier-outstanding')}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              View Outstanding Queue <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GRN # or invoice..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div>
            <Select
              value={supplierFilter}
              onValueChange={(val) => {
                setSupplierFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Suppliers</SelectItem>
                {suppliersList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={branchFilter}
              onValueChange={(val) => {
                setBranchFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="GRN Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All GRN Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={paymentStatusFilter}
              onValueChange={(val) => {
                setPaymentStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payment Statuses</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="PAID">Fully Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <OpsLoading />
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={loadGrns}>
              Retry
            </Button>
          </div>
        ) : grns.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">No Goods Received Notes found</h3>
            <p className="mt-1 text-sm">Create your first GRN to receive stock and track supplier payments.</p>
            <Button
              onClick={() => navigate('/salon/grns/new')}
              className="mt-4 flex items-center gap-2 mx-auto"
            >
              <Plus size={16} />
              Create GRN
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">GRN #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Total (Rs.)</th>
                  <th className="px-4 py-3 text-right">Paid (Rs.)</th>
                  <th className="px-4 py-3 text-right">Outstanding (Rs.)</th>
                  <th className="px-4 py-3 text-center">GRN Status</th>
                  <th className="px-4 py-3 text-center">Payment Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grns.map((grn) => (
                  <tr key={grn.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      <button
                        type="button"
                        onClick={() => navigate(`/salon/grns/${grn.id}`)}
                        className="text-primary hover:underline font-semibold"
                      >
                        {grn.grnNumber}
                      </button>
                      {grn.supplierInvoiceNumber && (
                        <span className="block text-xs text-muted-foreground font-sans">
                          Inv: {grn.supplierInvoiceNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(grn.grnDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <button
                        type="button"
                        onClick={() => navigate(`/salon/suppliers/${grn.supplierId}`)}
                        className="hover:text-primary hover:underline"
                      >
                        {grn.supplierName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{grn.branchName}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                      {grn.itemsCount ?? grn.items?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium font-mono text-foreground">
                      {Number(grn.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">
                      {Number(grn.paidAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600">
                      {Number(grn.outstandingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {getStatusBadge(grn.grnStatus)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {getPaymentStatusBadge(grn.paymentStatus)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/salon/grns/${grn.id}`)}
                          title="View GRN Details"
                          className="h-8 w-8 p-0"
                        >
                          <Eye size={15} />
                        </Button>

                        {grn.grnStatus === 'DRAFT' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/salon/grns/${grn.id}/edit`)}
                              title="Edit Draft GRN"
                              className="h-8 w-8 p-0"
                            >
                              <Pencil size={15} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReceiveModalGrn(grn)}
                              title="Confirm & Receive Stock"
                              className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <CheckCircle2 size={15} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCancelModalGrn(grn)}
                              title="Cancel GRN"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <XCircle size={15} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <OpsPagination
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
          itemLabel="GRNs"
        />
      </div>

      {/* Receive Stock Confirmation Dialog */}
      <Dialog open={!!receiveModalGrn} onOpenChange={(open) => !open && setReceiveModalGrn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" /> Confirm & Receive Goods
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Are you sure you want to mark GRN <strong className="text-foreground">{receiveModalGrn?.grnNumber}</strong> as <strong className="text-emerald-600">RECEIVED</strong>?
            </p>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 space-y-1">
              <p>✓ All product quantities on this GRN will be <strong>added to branch stock</strong>.</p>
              <p>✓ Stock movement audit logs will be permanently created.</p>
              <p>✓ Any immediate payments made on this GRN will take accounting effect.</p>
              <p>✓ This GRN will be locked from further edits.</p>
            </div>
            {actionError && <p className="text-destructive text-xs font-semibold">{actionError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceiveModalGrn(null)} disabled={actionPending}>
              Cancel
            </Button>
            <Button onClick={handleReceiveConfirm} disabled={actionPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {actionPending ? 'Receiving...' : 'Yes, Receive & Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelModalGrn} onOpenChange={(open) => !open && setCancelModalGrn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Cancel Draft GRN
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Are you sure you want to cancel draft GRN <strong className="text-foreground">{cancelModalGrn?.grnNumber}</strong>?
            </p>
            <p className="text-xs text-muted-foreground">
              This will mark the draft as Cancelled. No stock or financial movements have occurred.
            </p>
            {actionError && <p className="text-destructive text-xs font-semibold">{actionError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelModalGrn(null)} disabled={actionPending}>
              Back
            </Button>
            <Button onClick={handleCancelConfirm} disabled={actionPending} variant="destructive">
              {actionPending ? 'Cancelling...' : 'Cancel GRN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
