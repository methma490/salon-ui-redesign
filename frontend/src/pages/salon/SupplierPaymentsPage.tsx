import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Truck,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import type {
  SupplierPayment,
  SupplierPaymentMethod,
  Supplier,
  SupplierOutstandingItem,
  CreateSupplierPaymentInput,
} from '@/types/supplier.types';
import {
  OpsPageHeader,
  OpsLoading,
  OpsPagination,
  getErrorMessage,
  SimpleFormDialog,
  SimpleForm,
  FormError,
  FormSubmit,
} from './salon-ops-ui';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function SupplierPaymentsPage() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [chequeStatusFilter, setChequeStatusFilter] = useState('ALL');

  // Metadata
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Cheque update modal
  const [chequeModalPayment, setChequeModalPayment] = useState<SupplierPayment | null>(null);
  const [chequeModalAction, setChequeModalAction] = useState<'CLEARED' | 'BOUNCED'>('CLEARED');
  const [chequeActionPending, setChequeActionPending] = useState(false);
  const [chequeActionError, setChequeActionError] = useState<string | null>(null);

  // Record Payment Dialog
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [unpaidGrns, setUnpaidGrns] = useState<SupplierOutstandingItem[]>([]);
  const [loadingGrns, setLoadingGrns] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [notes, setNotes] = useState('');

  // Allocation mapping: { [grnId: string]: number }
  const [allocationsMap, setAllocationsMap] = useState<{ [grnId: string]: number }>({});
  const [recordPending, setRecordPending] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Load suppliers list
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await suppliersApi.getSuppliers({ limit: 100, status: 'ACTIVE' });
        const list = Array.isArray(res) ? res : res.data || [];
        setSuppliers(list);
      } catch (e) {
        console.error('Failed to load suppliers metadata', e);
      }
    }
    loadMeta();
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (supplierFilter !== 'ALL') params.supplierId = supplierFilter;
      if (methodFilter !== 'ALL') params.paymentMethod = methodFilter;
      if (chequeStatusFilter !== 'ALL') params.chequeStatus = chequeStatusFilter;

      const res = await suppliersApi.getSupplierPayments(params);
      setPayments(res.data || []);
      const totalCount = (res as any).meta?.total ?? (res as any).total ?? (res.data?.length || 0);
      const pagesCount = (res as any).meta?.totalPages ?? (res as any).totalPages ?? 1;
      setTotal(totalCount);
      setTotalPages(pagesCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load supplier payments'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, supplierFilter, methodFilter, chequeStatusFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // When supplier is picked in Record Payment dialog, load open GRNs
  useEffect(() => {
    if (!selectedSupplierId) {
      setUnpaidGrns([]);
      setAllocationsMap({});
      return;
    }

    async function loadOutstandingGrns() {
      try {
        setLoadingGrns(true);
        const res = await suppliersApi.getSupplierOutstanding({
          supplierId: selectedSupplierId,
          limit: 100,
        });
        const openItems = Array.isArray(res) ? res : res.data || [];
        setUnpaidGrns(openItems);

        // Auto calculate total outstanding of this supplier
        const totalSupOutstanding = openItems.reduce(
          (sum, g) => sum + Number(g.outstandingAmount || 0),
          0,
        );
        if (totalSupOutstanding > 0 && !paymentAmount) {
          setPaymentAmount(String(totalSupOutstanding));
        }
      } catch (err) {
        console.error('Failed to load open GRNs for supplier', err);
      } finally {
        setLoadingGrns(false);
      }
    }
    loadOutstandingGrns();
  }, [selectedSupplierId]);

  // Auto-allocate entered amount across unpaid GRNs (FIFO order)
  const handleAutoAllocate = () => {
    const totalToAllocate = parseFloat(paymentAmount) || 0;
    let remaining = totalToAllocate;
    const newMap: { [grnId: string]: number } = {};

    for (const g of unpaidGrns) {
      if (remaining <= 0) break;
      const grnDue = Number(g.outstandingAmount) || 0;
      const alloc = Math.min(grnDue, remaining);
      newMap[g.id] = alloc;
      remaining -= alloc;
    }

    setAllocationsMap(newMap);
  };

  const handleManualAllocationChange = (grnId: string, val: number) => {
    setAllocationsMap((prev) => ({
      ...prev,
      [grnId]: Math.max(0, val),
    }));
  };

  const handleChequeStatusUpdate = async () => {
    if (!chequeModalPayment) return;
    try {
      setChequeActionPending(true);
      setChequeActionError(null);
      await suppliersApi.updateChequeStatus(chequeModalPayment.id, {
        status: chequeModalAction,
      });
      setChequeModalPayment(null);
      loadPayments();
    } catch (err) {
      setChequeActionError(getErrorMessage(err, 'Failed to update cheque status'));
    } finally {
      setChequeActionPending(false);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setRecordError('Please select a supplier.');
      return;
    }

    const parsedAmount = parseFloat(paymentAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setRecordError('Please enter a valid positive payment amount.');
      return;
    }

    // Build allocation array
    const allocationsList = Object.entries(allocationsMap)
      .filter(([_, amt]) => Number(amt) > 0)
      .map(([grnId, amt]) => ({
        grnId,
        allocatedAmount: Number(amt),
      }));

    const allocatedSum = allocationsList.reduce((sum, it) => sum + it.allocatedAmount, 0);
    if (allocationsList.length > 0 && Math.abs(allocatedSum - parsedAmount) > 0.01) {
      setRecordError(
        `Total allocated (Rs. ${allocatedSum.toFixed(2)}) does not match Payment Amount (Rs. ${parsedAmount.toFixed(2)}).`,
      );
      return;
    }

    try {
      setRecordPending(true);
      setRecordError(null);

      const payload: CreateSupplierPaymentInput = {
        supplierId: selectedSupplierId,
        paymentDate,
        amount: parsedAmount,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        chequeNumber: chequeNumber.trim() || undefined,
        chequeDate: chequeDate || undefined,
        notes: notes.trim() || undefined,
        allocations: allocationsList.length > 0 ? allocationsList : undefined,
      };

      await suppliersApi.createSupplierPayment(payload);
      setRecordDialogOpen(false);
      resetRecordForm();
      loadPayments();
    } catch (err) {
      setRecordError(getErrorMessage(err, 'Failed to record supplier payment'));
    } finally {
      setRecordPending(false);
    }
  };

  const resetRecordForm = () => {
    setSelectedSupplierId('');
    setUnpaidGrns([]);
    setAllocationsMap({});
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setBankName('');
    setChequeNumber('');
    setChequeDate('');
    setNotes('');
    setRecordError(null);
  };

  const openRecordDialog = () => {
    resetRecordForm();
    setRecordDialogOpen(true);
  };

  const totalPagePayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="emp-page space-y-6">
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

      <OpsPageHeader
        title="Supplier Payments"
        subtitle="Record cash, bank transfer, and cheque settlements with automated GRN allocations."
        action={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/salon/supplier-outstanding')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Truck size={16} />
              Outstanding Queue
            </Button>
            <Button
              onClick={openRecordDialog}
              className="flex items-center gap-2 bg-primary text-primary-foreground"
            >
              <Plus size={16} />
              Record Supplier Payment
            </Button>
          </div>
        }
      />

      {/* Top summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Payment Records</span>
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{total}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Page Payments Value</span>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            Rs. {totalPagePayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Settlement Flow</span>
            <CreditCard className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Cheques automatically update confirmed outstanding upon clearance.
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reference or notes..."
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
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={methodFilter}
              onValueChange={(val) => {
                setMethodFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payment Methods</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={chequeStatusFilter}
              onValueChange={(val) => {
                setChequeStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cheque Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Cheque Statuses</SelectItem>
                <SelectItem value="PENDING">Pending Cleared</SelectItem>
                <SelectItem value="CLEARED">Cleared</SelectItem>
                <SelectItem value="BOUNCED">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Payments Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <OpsLoading />
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={loadPayments}>
              Retry
            </Button>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">No Supplier Payments Found</h3>
            <p className="mt-1 text-sm">Record a payment to settle outstanding vendor balances.</p>
            <Button onClick={openRecordDialog} className="mt-4 flex items-center gap-2 mx-auto">
              <Plus size={16} /> Record Payment
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Details / Reference</th>
                  <th className="px-4 py-3">Allocations</th>
                  <th className="px-4 py-3 text-right">Amount (Rs.)</th>
                  <th className="px-4 py-3 text-center">Cheque Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <button
                        type="button"
                        onClick={() => navigate(`/salon/suppliers/${p.supplierId}`)}
                        className="hover:text-primary hover:underline text-left"
                      >
                        {p.supplierName}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="emp-badge emp-badge-info">{p.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.referenceNumber && <span>Ref: {p.referenceNumber} </span>}
                      {p.chequeNumber && (
                        <span>
                          [Cheque: #{p.chequeNumber} {p.bankName ? `(${p.bankName})` : ''} - Due:{' '}
                          {p.chequeDate ? new Date(p.chequeDate).toLocaleDateString() : 'N/A'}]
                        </span>
                      )}
                      {p.notes && <span className="block italic text-muted-foreground/80">{p.notes}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.allocations && p.allocations.length > 0 ? (
                        <div className="space-y-1">
                          {p.allocations.map((a) => (
                            <div key={a.id} className="flex items-center gap-1 font-mono">
                              <button
                                type="button"
                                onClick={() => navigate(`/salon/grns/${a.grnId}`)}
                                className="text-primary hover:underline font-semibold"
                              >
                                {a.grnNumber}:
                              </button>
                              <span>Rs. {Number(a.allocatedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">General Credit</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      {Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {p.paymentMethod === 'CHEQUE' ? (
                        p.chequeStatus === 'CLEARED' ? (
                          <span className="emp-badge emp-badge-active flex items-center justify-center gap-1">
                            <CheckCircle2 size={12} /> Cleared
                          </span>
                        ) : p.chequeStatus === 'BOUNCED' ? (
                          <span className="emp-badge emp-badge-resigned flex items-center justify-center gap-1">
                            <XCircle size={12} /> Bounced
                          </span>
                        ) : (
                          <span className="emp-badge emp-badge-pending flex items-center justify-center gap-1">
                            <Clock size={12} /> Pending
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p.paymentMethod === 'CHEQUE' && p.chequeStatus === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setChequeModalPayment(p);
                              setChequeModalAction('CLEARED');
                              setChequeActionError(null);
                            }}
                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setChequeModalPayment(p);
                              setChequeModalAction('BOUNCED');
                              setChequeActionError(null);
                            }}
                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            Bounce
                          </Button>
                        </div>
                      )}
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
          itemLabel="Payments"
        />
      </div>

      {/* Cheque Status Update Dialog */}
      <Dialog
        open={!!chequeModalPayment}
        onOpenChange={(open) => !open && setChequeModalPayment(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {chequeModalAction === 'CLEARED' ? (
                <span className="text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Mark Cheque as Cleared
                </span>
              ) : (
                <span className="text-destructive flex items-center gap-2">
                  <XCircle className="h-5 w-5" /> Mark Cheque as Bounced
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Are you sure you want to mark cheque <strong>#{chequeModalPayment?.chequeNumber}</strong> (Rs.{' '}
              {Number(chequeModalPayment?.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}) as{' '}
              <strong>{chequeModalAction}</strong>?
            </p>
            {chequeModalAction === 'CLEARED' ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 space-y-1">
                <p>✓ The supplier's outstanding balance will be officially reduced.</p>
                <p>✓ All allocated GRN balances will update to Paid / Partially Paid.</p>
              </div>
            ) : (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
                <p>• The cheque will be marked as Bounced.</p>
                <p>• Outstanding balances on allocated GRNs will remain open / unpaid.</p>
              </div>
            )}
            {chequeActionError && (
              <p className="text-destructive text-xs font-semibold">{chequeActionError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setChequeModalPayment(null)}
              disabled={chequeActionPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChequeStatusUpdate}
              disabled={chequeActionPending}
              className={
                chequeModalAction === 'CLEARED'
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-destructive hover:bg-destructive/90 text-white'
              }
            >
              {chequeActionPending ? 'Updating...' : `Confirm ${chequeModalAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <SimpleFormDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
        title="Record Supplier Payment"
        className="sm:max-w-2xl"
      >
        <SimpleForm onSubmit={handleRecordPaymentSubmit}>
          <FormError message={recordError} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Supplier *
              </Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} (Due: Rs. {Number(s.currentOutstanding).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Payment Date *
              </Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Payment Amount (Rs.) *
              </Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                className="font-mono text-base font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Payment Method *
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as SupplierPaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentMethod === 'BANK_TRANSFER' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Transfer Reference #
              </Label>
              <Input
                placeholder="e.g. TXN-9840"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          )}

          {paymentMethod === 'CHEQUE' && (
            <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Bank Name *
                </Label>
                <Input
                  placeholder="e.g. Commercial Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Cheque # *
                  </Label>
                  <Input
                    placeholder="e.g. 001934"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Cheque Date
                  </Label>
                  <Input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Notes / Reference
            </Label>
            <Input
              placeholder="Optional payment notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Allocation to open GRNs */}
          {selectedSupplierId && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Allocate Across Open GRNs
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAllocate}
                  className="h-7 text-xs"
                >
                  Auto Allocate Amount
                </Button>
              </div>

              {loadingGrns ? (
                <div className="text-xs text-muted-foreground py-2">Loading open GRNs...</div>
              ) : unpaidGrns.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2 italic">
                  This supplier has no outstanding GRN balances. Payment will be recorded as general supplier credit.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border divide-y text-xs">
                  {unpaidGrns.map((g) => {
                    const due = Number(g.outstandingAmount);
                    const allocated = allocationsMap[g.id] || 0;
                    return (
                      <div key={g.id} className="flex items-center justify-between p-2.5 bg-card">
                        <div>
                          <div className="font-semibold text-foreground font-mono">{g.grnNumber}</div>
                          <div className="text-muted-foreground">
                            Date: {new Date(g.grnDate).toLocaleDateString()} | Total: Rs. {Number(g.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} | Due: Rs. {due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            min={0}
                            max={due}
                            step="0.01"
                            value={allocated || ''}
                            placeholder="0.00"
                            onChange={(e) =>
                              handleManualAllocationChange(
                                g.id,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-7 text-right font-mono text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <FormSubmit pending={recordPending}>Record Payment</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>
    </div>
  );
}
