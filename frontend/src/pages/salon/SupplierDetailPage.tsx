import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Truck,
  User,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import type {
  GRN,
  SupplierPayment,
  CreateSupplierPaymentInput,
  SupplierPaymentMethod,
} from '@/types/supplier.types';

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
import { getErrorMessage, OpsStatusBadge, FormTextarea, OpsLoading } from './salon-ops-ui';

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'grns' | 'payments' | 'outstanding'>('grns');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Allocation state: map of grnId -> allocatedAmount
  const [allocations, setAllocations] = useState<{ [grnId: string]: number }>({});

  // 1. Fetch Supplier Detail
  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getSupplier(id!),
    enabled: !!id,
  });

  // 2. Fetch Supplier GRNs
  const { data: grnsResponse, isLoading: grnsLoading } = useQuery({
    queryKey: ['supplier-grns', id],
    queryFn: () => suppliersApi.getGrns({ supplierId: id, limit: 100 }),
    enabled: !!id,
  });

  const grnsList: GRN[] = useMemo(() => {
    if (!grnsResponse) return [];
    if (Array.isArray(grnsResponse)) return grnsResponse;
    return grnsResponse.data || [];
  }, [grnsResponse]);

  // 3. Fetch Supplier Payments
  const { data: paymentsResponse, isLoading: paymentsLoading } = useQuery({
    queryKey: ['supplier-payments', id],
    queryFn: () => suppliersApi.getSupplierPayments({ supplierId: id, limit: 100 }),
    enabled: !!id,
  });

  const paymentsList: SupplierPayment[] = useMemo(() => {
    if (!paymentsResponse) return [];
    if (Array.isArray(paymentsResponse)) return paymentsResponse;
    return paymentsResponse.data || [];
  }, [paymentsResponse]);

  // 4. Fetch Supplier Outstanding
  const { data: outstandingResponse, isLoading: outstandingLoading } = useQuery({
    queryKey: ['supplier-outstanding', id],
    queryFn: () => suppliersApi.getSupplierOutstanding({ supplierId: id, limit: 100 }),
    enabled: !!id,
  });

  const outstandingList = useMemo(() => {
    if (!outstandingResponse) return [];
    if (Array.isArray(outstandingResponse)) return outstandingResponse;
    return outstandingResponse.data || [];
  }, [outstandingResponse]);

  // Record Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: (input: CreateSupplierPaymentInput) =>
      suppliersApi.createSupplierPayment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-grns', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-outstanding', id] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setPaymentDialogOpen(false);
      resetPaymentForm();
    },
    onError: (err) => {
      setPaymentError(getErrorMessage(err, 'Failed to record payment'));
    },
  });

  // Cheque update mutation
  const chequeStatusMutation = useMutation({
    mutationFn: ({
      paymentId,
      status,
    }: {
      paymentId: string;
      status: 'CLEARED' | 'BOUNCED';
    }) => suppliersApi.updateChequeStatus(paymentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-outstanding', id] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setBankName('');
    setChequeNumber('');
    setChequeDate('');
    setNotes('');
    setAllocations({});
    setPaymentError('');
  };

  const handleOpenPayment = (presetAmount?: number, presetGrnId?: string) => {
    resetPaymentForm();
    if (presetAmount !== undefined) {
      setPaymentAmount(presetAmount.toString());
    } else if (supplier?.currentOutstanding) {
      setPaymentAmount(supplier.currentOutstanding.toString());
    }

    if (presetGrnId && presetAmount) {
      setAllocations({ [presetGrnId]: presetAmount });
    }

    setPaymentDialogOpen(true);
  };

  // Auto Allocate amount across outstanding GRNs
  const handleAutoAllocate = () => {
    const total = parseFloat(paymentAmount) || 0;
    if (total <= 0) return;

    let remaining = total;
    const newAlloc: { [grnId: string]: number } = {};

    for (const item of outstandingList) {
      if (remaining <= 0) break;
      const due = Number(item.outstandingAmount) || 0;
      if (due > 0) {
        const allocate = Math.min(remaining, due);
        newAlloc[item.id] = allocate;
        remaining -= allocate;
      }
    }

    setAllocations(newAlloc);
  };

  const handleManualAllocationChange = (grnId: string, val: number) => {
    setAllocations((prev) => ({
      ...prev,
      [grnId]: Math.max(0, val),
    }));
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      setPaymentError('Payment amount must be greater than 0');
      return;
    }

    // Build allocations array
    const allocArray = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([grnId, amt]) => ({
        grnId,
        allocatedAmount: amt,
      }));

    const totalAllocated = allocArray.reduce((acc, a) => acc + a.allocatedAmount, 0);
    if (allocArray.length > 0 && Math.abs(totalAllocated - amountNum) > 0.01) {
      setPaymentError(
        `Total allocated (Rs. ${totalAllocated.toFixed(2)}) must match payment amount (Rs. ${amountNum.toFixed(2)})`,
      );
      return;
    }

    paymentMutation.mutate({
      supplierId: id!,
      paymentDate,
      amount: amountNum,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      chequeNumber: chequeNumber.trim() || undefined,
      chequeDate: chequeDate || undefined,
      notes: notes.trim() || undefined,
      allocations: allocArray.length > 0 ? allocArray : undefined,
    });
  };

  if (supplierLoading) {
    return <OpsLoading />;
  }

  if (!supplier) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Truck className="mx-auto h-12 w-12 opacity-50 mb-3" />
        <h2 className="text-lg font-semibold">Supplier Not Found</h2>
        <Button onClick={() => navigate('/salon/suppliers')} className="mt-4">
          Back to Suppliers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/salon/suppliers')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
              <OpsStatusBadge status={supplier.status || (supplier.isActive ? 'ACTIVE' : 'INACTIVE')} />
            </div>
            <p className="text-xs text-muted-foreground">
              Added on {new Date(supplier.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate(`/salon/grns/new?supplierId=${supplier.id}`)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> New GRN
          </Button>
          <Button
            onClick={() => handleOpenPayment()}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Supplier Profile & KPI Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-base border-b pb-2">Supplier Profile</h2>

          <div className="space-y-3 text-sm">
            {supplier.contactPerson && (
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{supplier.contactPerson}</div>
                  <div className="text-xs text-muted-foreground">Contact Person</div>
                </div>
              </div>
            )}

            {supplier.phone && (
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{supplier.phone}</div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                </div>
              </div>
            )}

            {supplier.email && (
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{supplier.email}</div>
                  <div className="text-xs text-muted-foreground">Email</div>
                </div>
              </div>
            )}

            {supplier.address && (
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{supplier.address}</div>
                  <div className="text-xs text-muted-foreground">Address</div>
                </div>
              </div>
            )}

            {supplier.notes && (
              <div className="border-t pt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Notes: </span>
                {supplier.notes}
              </div>
            )}
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Purchases</span>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono">
              {formatMoney(supplier.totalPurchases || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              From {supplier.grnsCount || grnsList.length} received invoices
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Paid</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
              {formatMoney(supplier.totalPaid || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Confirmed settlements
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Current Outstanding</span>
              <Clock className="h-5 w-5 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-rose-600">
              {formatMoney(supplier.currentOutstanding || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Due to supplier
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab('grns')}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'grns'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            GRN / Purchases ({grnsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Payments History ({paymentsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outstanding')}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'outstanding'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Open Outstanding Invoices ({outstandingList.length})
          </button>
        </div>

        {/* Tab 1: GRNs List */}
        {activeTab === 'grns' && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
                  <tr>
                    <th className="p-3">GRN Number</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3 text-center">Payment Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grnsLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Loading GRNs...
                      </td>
                    </tr>
                  ) : grnsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        No GRNs recorded for this supplier.
                      </td>
                    </tr>
                  ) : (
                    grnsList.map((grn) => (
                      <tr key={grn.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium">
                          <button
                            type="button"
                            onClick={() => navigate(`/salon/grns/${grn.id}`)}
                            className="text-primary hover:underline"
                          >
                            {grn.grnNumber}
                          </button>
                          {grn.supplierInvoiceNumber && (
                            <div className="text-xs text-muted-foreground font-sans">
                              Inv: {grn.supplierInvoiceNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(grn.grnDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-muted-foreground">{grn.branchName}</td>
                        <td className="p-3">
                          <span
                            className={`emp-badge ${
                              grn.grnStatus === 'RECEIVED'
                                ? 'emp-badge-active'
                                : grn.grnStatus === 'DRAFT'
                                ? 'emp-badge-pending'
                                : 'emp-badge-resigned'
                            }`}
                          >
                            {grn.grnStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          {formatMoney(grn.totalAmount)}
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-emerald-600">
                          {formatMoney(grn.paidAmount)}
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-rose-600">
                          {formatMoney(grn.outstandingAmount)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`emp-badge ${
                              grn.paymentStatus === 'PAID'
                                ? 'emp-badge-active'
                                : grn.paymentStatus === 'PARTIALLY_PAID'
                                ? 'emp-badge-probation'
                                : 'emp-badge-resigned'
                            }`}
                          >
                            {grn.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/salon/grns/${grn.id}`)}
                              className="h-8 w-8 p-0"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {grn.grnStatus === 'RECEIVED' && grn.outstandingAmount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenPayment(grn.outstandingAmount, grn.id)
                                }
                                className="h-8 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <CreditCard className="h-3.5 w-3.5" /> Pay
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Payments History */}
        {activeTab === 'payments' && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
                  <tr>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Reference / Cheque</th>
                    <th className="p-3">Cheque Status</th>
                    <th className="p-3">Allocations</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paymentsLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Loading payments...
                      </td>
                    </tr>
                  ) : paymentsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <Receipt className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        No payments recorded for this supplier.
                      </td>
                    </tr>
                  ) : (
                    paymentsList.map((payment) => (
                      <tr key={payment.id} className="hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className="emp-badge emp-badge-info">
                            {payment.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {payment.referenceNumber && <div>Ref: {payment.referenceNumber}</div>}
                          {payment.chequeNumber && (
                            <div>
                              Cheque: #{payment.chequeNumber} {payment.bankName ? `(${payment.bankName})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {payment.paymentMethod === 'CHEQUE' ? (
                            payment.chequeStatus === 'CLEARED' ? (
                              <span className="emp-badge emp-badge-active">Cleared</span>
                            ) : payment.chequeStatus === 'BOUNCED' ? (
                              <span className="emp-badge emp-badge-resigned">Bounced</span>
                            ) : (
                              <span className="emp-badge emp-badge-pending">Pending</span>
                            )
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {payment.allocations && payment.allocations.length > 0 ? (
                            <div className="space-y-1">
                              {payment.allocations.map((a) => (
                                <div key={a.id} className="font-mono">
                                  {a.grnNumber}: {formatMoney(a.allocatedAmount)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">General Credit</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-emerald-600">
                          {formatMoney(payment.amount)}
                        </td>
                        <td className="p-3 text-right">
                          {payment.paymentMethod === 'CHEQUE' &&
                            payment.chequeStatus === 'PENDING' && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    chequeStatusMutation.mutate({
                                      paymentId: payment.id,
                                      status: 'CLEARED',
                                    })
                                  }
                                  className="h-7 text-xs text-primary hover:bg-primary/10"
                                >
                                  Clear
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    chequeStatusMutation.mutate({
                                      paymentId: payment.id,
                                      status: 'BOUNCED',
                                    })
                                  }
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                >
                                  Bounce
                                </Button>
                              </div>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Open Outstanding */}
        {activeTab === 'outstanding' && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
                  <tr>
                    <th className="p-3">GRN Number</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">GRN Date</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {outstandingLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Loading outstanding balances...
                      </td>
                    </tr>
                  ) : outstandingList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        <CheckCircle2 className="mx-auto h-8 w-8 mb-2 text-emerald-500 opacity-80" />
                        No outstanding balance for this supplier. Everything is settled!
                      </td>
                    </tr>
                  ) : (
                    outstandingList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium">
                          <button
                            type="button"
                            onClick={() => navigate(`/salon/grns/${item.id}`)}
                            className="text-primary hover:underline"
                          >
                            {item.grnNumber}
                          </button>
                        </td>
                        <td className="p-3 text-muted-foreground">{item.branchName}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(item.grnDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          {formatMoney(item.totalAmount)}
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-emerald-600">
                          {formatMoney(item.paidAmount)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">
                          {formatMoney(item.outstandingAmount)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`emp-badge ${
                              item.paymentStatus === 'PARTIALLY_PAID'
                                ? 'emp-badge-probation'
                                : 'emp-badge-resigned'
                            }`}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleOpenPayment(item.outstandingAmount, item.id)
                            }
                            className="h-8 text-xs gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Pay Now
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handlePaymentSubmit}>
            <DialogHeader>
              <DialogTitle>Record Supplier Payment</DialogTitle>
              <DialogDescription>
                Record a disbursement to <strong>{supplier.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {paymentError && (
                <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive">
                  {paymentError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="paymentAmount">Amount (Rs.) *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val: SupplierPaymentMethod) => setPaymentMethod(val)}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="space-y-1.5">
                  <Label htmlFor="referenceNumber">Transfer Reference / Txn ID</Label>
                  <Input
                    id="referenceNumber"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. TXN-12345678"
                  />
                </div>
              )}

              {paymentMethod === 'CHEQUE' && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Commercial Bank"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="chequeNumber">Cheque # *</Label>
                    <Input
                      id="chequeNumber"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="e.g. 001234"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="chequeDate">Cheque Date</Label>
                    <Input
                      id="chequeDate"
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <FormTextarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional remarks..."
                  className="min-h-[50px]"
                />
              </div>

              {/* Outstanding Allocation Section */}
              {outstandingList.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Allocate to Invoices
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoAllocate}
                      className="h-7 text-xs"
                    >
                      Auto Allocate
                    </Button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border p-2">
                    {outstandingList.map((item) => {
                      const due = Number(item.outstandingAmount) || 0;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30"
                        >
                          <div>
                            <span className="font-mono font-medium">{item.grnNumber}</span>
                            <span className="text-muted-foreground ml-2">
                              Due: {formatMoney(due)}
                            </span>
                          </div>
                          <div className="w-32">
                            <Input
                              type="number"
                              min="0"
                              max={due}
                              step="0.01"
                              value={allocations[item.id] || ''}
                              onChange={(e) =>
                                handleManualAllocationChange(
                                  item.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              placeholder="0.00"
                              className="h-7 text-right font-mono text-xs"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
