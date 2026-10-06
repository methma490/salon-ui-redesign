import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Pencil,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  CreditCard,
  Package,
  Plus,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import type { GRN, CreateSupplierPaymentInput, SupplierPaymentMethod } from '@/types/supplier.types';
import {
  OpsLoading,
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

export default function GrnDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [grn, setGrn] = useState<GRN | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action Dialogs
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Pay Dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [notes, setNotes] = useState('');
  const [payPending, setPayPending] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const loadGrn = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await suppliersApi.getGrn(id);
      setGrn(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load GRN details'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGrn();
  }, [loadGrn]);

  const handleReceive = async () => {
    if (!id) return;
    try {
      setActionPending(true);
      setActionError(null);
      await suppliersApi.receiveGrn(id);
      setShowReceiveModal(false);
      loadGrn();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to receive GRN and update inventory'));
    } finally {
      setActionPending(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      setActionPending(true);
      setActionError(null);
      await suppliersApi.cancelGrn(id);
      setShowCancelModal(false);
      loadGrn();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to cancel GRN'));
    } finally {
      setActionPending(false);
    }
  };

  const openPayDialog = () => {
    if (!grn) return;
    setPaymentAmount(String(grn.outstandingAmount || 0));
    setPaymentMethod('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setBankName('');
    setChequeNumber('');
    setChequeDate('');
    setNotes(`Settlement for ${grn.grnNumber}`);
    setPayError(null);
    setPayDialogOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grn) return;

    const parsedAmount = parseFloat(paymentAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setPayError('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setPayPending(true);
      setPayError(null);

      const payload: CreateSupplierPaymentInput = {
        supplierId: grn.supplierId,
        paymentDate,
        amount: parsedAmount,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        chequeNumber: chequeNumber.trim() || undefined,
        chequeDate: chequeDate || undefined,
        notes: notes.trim() || undefined,
        allocations: [
          {
            grnId: grn.id,
            allocatedAmount: parsedAmount,
          },
        ],
      };

      await suppliersApi.createSupplierPayment(payload);
      setPayDialogOpen(false);
      loadGrn();
    } catch (err) {
      setPayError(getErrorMessage(err, 'Failed to process payment'));
    } finally {
      setPayPending(false);
    }
  };

  if (loading) {
    return <OpsLoading />;
  }

  if (error || !grn) {
    return (
      <div className="emp-page p-8 text-center text-destructive">
        <AlertCircle className="mx-auto h-8 w-8 mb-2" />
        <p>{error || 'GRN not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/salon/grns')}>
          Back to GRNs List
        </Button>
      </div>
    );
  }

  const isDraft = grn.grnStatus === 'DRAFT';
  const isReceived = grn.grnStatus === 'RECEIVED';
  const isCancelled = grn.grnStatus === 'CANCELLED';
  const hasOutstanding = Number(grn.outstandingAmount || 0) > 0;

  return (
    <div className="emp-page space-y-6 max-w-6xl mx-auto pb-12 print:p-0">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/salon/grns')}
            className="flex items-center gap-1"
          >
            <ArrowLeft size={16} /> All GRNs
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
          >
            <Printer size={15} /> Print GRN
          </Button>

          {isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/salon/grns/${grn.id}/edit`)}
                className="flex items-center gap-1.5"
              >
                <Pencil size={15} /> Edit Draft
              </Button>

              <Button
                size="sm"
                onClick={() => setShowReceiveModal(true)}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <CheckCircle2 size={15} /> Receive & Update Stock
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-1.5"
              >
                <XCircle size={15} /> Cancel Draft
              </Button>
            </>
          )}

          {isReceived && hasOutstanding && (
            <Button
              size="sm"
              onClick={openPayDialog}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground"
            >
              <CreditCard size={15} /> Record Payment / Settlement
            </Button>
          )}
        </div>
      </div>

      {/* GRN Status Banner */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {grn.grnNumber}
              </h1>
              {isReceived && (
                <span className="emp-badge emp-badge-active flex items-center gap-1">
                  <CheckCircle2 size={12} /> Stock Received
                </span>
              )}
              {isDraft && (
                <span className="emp-badge emp-badge-pending flex items-center gap-1">
                  <Clock size={12} /> Draft
                </span>
              )}
              {isCancelled && (
                <span className="emp-badge emp-badge-resigned flex items-center gap-1">
                  <XCircle size={12} /> Cancelled
                </span>
              )}

              {grn.paymentStatus === 'PAID' && (
                <span className="emp-badge emp-badge-active">Fully Paid</span>
              )}
              {grn.paymentStatus === 'PARTIALLY_PAID' && (
                <span className="emp-badge emp-badge-probation">Partially Paid</span>
              )}
              {grn.paymentStatus === 'UNPAID' && (
                <span className="emp-badge emp-badge-resigned">Unpaid</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created on {new Date(grn.createdAt).toLocaleDateString()}
              {grn.createdByName && ` by ${grn.createdByName}`}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Total Value</span>
            <div className="text-2xl font-bold font-mono text-foreground">
              Rs. {Number(grn.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {hasOutstanding ? (
              <span className="text-xs font-semibold text-amber-600">
                Outstanding: Rs. {Number(grn.outstandingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600">Fully Settled</span>
            )}
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 gap-6 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Truck size={14} /> Supplier Information
            </span>
            <div className="font-medium text-foreground">
              <Link
                to={`/salon/suppliers/${grn.supplierId}`}
                className="text-primary hover:underline"
              >
                {grn.supplierName}
              </Link>
            </div>
            {grn.supplierPhone && (
              <div className="text-xs text-muted-foreground">Phone: {grn.supplierPhone}</div>
            )}
            {grn.supplierEmail && (
              <div className="text-xs text-muted-foreground">Email: {grn.supplierEmail}</div>
            )}
            {grn.supplierAddress && (
              <div className="text-xs text-muted-foreground">Address: {grn.supplierAddress}</div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Building2 size={14} /> Branch & Dates
            </span>
            <div className="font-medium text-foreground">Branch: {grn.branchName}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar size={12} /> GRN Date: {new Date(grn.grnDate).toLocaleDateString()}
            </div>
            {grn.dueDate && (
              <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <Clock size={12} /> Due Date: {new Date(grn.dueDate).toLocaleDateString()}
              </div>
            )}
            {grn.receivedAt && (
              <div className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Received At: {new Date(grn.receivedAt).toLocaleString()}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <DollarSign size={14} /> Invoicing & References
            </span>
            <div className="text-sm font-medium text-foreground">
              Supplier Invoice #: {grn.supplierInvoiceNumber || '—'}
            </div>
            {grn.notes && (
              <div className="text-xs text-muted-foreground mt-1 bg-muted/40 p-2 rounded">
                <strong>Notes:</strong> {grn.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Breakdown Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Package size={18} className="text-primary" /> Purchased Items ({grn.items?.length || 0})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3 text-right">Received Qty</th>
                <th className="px-4 py-3 text-right">Unit Cost (Rs.)</th>
                <th className="px-4 py-3 text-right">Line Total (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grn.items?.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground font-mono">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{item.productName}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{item.productCode || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{Number(item.quantity)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {Number(item.unitCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                    {Number(item.lineTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 border-t font-mono">
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right text-muted-foreground font-sans text-xs uppercase font-semibold">
                  Subtotal:
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  Rs. {Number(grn.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {Number(grn.discountAmount) > 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-muted-foreground font-sans text-xs uppercase font-semibold text-destructive">
                    Discount / Deductions:
                  </td>
                  <td className="px-4 py-2 text-right text-destructive font-semibold">
                    - Rs. {Number(grn.discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-border text-base">
                <td colSpan={5} className="px-4 py-3 text-right text-foreground font-sans font-bold">
                  Grand Total:
                </td>
                <td className="px-4 py-3 text-right font-bold text-primary">
                  Rs. {Number(grn.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Allocations & Settlements */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" /> Payments & Settlements ({grn.allocations?.length || 0})
          </h3>
          {isReceived && hasOutstanding && (
            <Button size="sm" onClick={openPayDialog} className="flex items-center gap-1.5">
              <Plus size={14} /> Pay Remaining Balance
            </Button>
          )}
        </div>

        {!grn.allocations || grn.allocations.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No payments have been allocated to this GRN yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference / Cheque Details</th>
                  <th className="px-4 py-3">Cheque Status</th>
                  <th className="px-4 py-3 text-right">Allocated Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grn.allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(alloc.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className="emp-badge emp-badge-info">{alloc.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {alloc.referenceNumber && <span>Ref: {alloc.referenceNumber} </span>}
                      {alloc.chequeNumber && (
                        <span>
                          [Cheque: #{alloc.chequeNumber} {alloc.bankName ? `(${alloc.bankName})` : ''} - Due: {alloc.chequeDate ? new Date(alloc.chequeDate).toLocaleDateString() : 'N/A'}]
                        </span>
                      )}
                      {!alloc.referenceNumber && !alloc.chequeNumber && '—'}
                    </td>
                    <td className="px-4 py-3">
                      {alloc.paymentMethod === 'CHEQUE' ? (
                        alloc.chequeStatus === 'CLEARED' ? (
                          <span className="emp-badge emp-badge-active">Cleared</span>
                        ) : alloc.chequeStatus === 'BOUNCED' ? (
                          <span className="emp-badge emp-badge-resigned">Bounced</span>
                        ) : (
                          <span className="emp-badge emp-badge-pending">Pending Clear</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      Rs. {Number(alloc.allocatedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t font-mono">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground font-sans text-xs uppercase font-semibold">
                    Total Settled:
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                    Rs. {Number(grn.paidAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground font-sans text-xs uppercase font-semibold">
                    Remaining Outstanding:
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-amber-600">
                    Rs. {Number(grn.outstandingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Dialog */}
      <SimpleFormDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        title={`Record Payment for ${grn.grnNumber}`}
        className="sm:max-w-lg"
      >
        <SimpleForm onSubmit={handlePaySubmit}>
          <FormError message={payError} />

          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Supplier:</span>
              <strong className="text-foreground">{grn.supplierName}</strong>
            </div>
            <div className="flex justify-between">
              <span>GRN Total:</span>
              <span>Rs. {Number(grn.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Outstanding:</span>
              <strong className="text-amber-600">
                Rs. {Number(grn.outstandingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
            </div>
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

          <div className="grid grid-cols-2 gap-3">
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
              <p className="text-xs text-muted-foreground italic">
                * Note: Cheque payments are saved with status 'PENDING'. Outstanding balance is deducted once the cheque is marked CLEARED.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Notes / Remarks
            </Label>
            <Input
              placeholder="Optional payment notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <FormSubmit pending={payPending}>Confirm Payment</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      {/* Receive Stock Confirmation Dialog */}
      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" /> Confirm & Receive Goods
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Are you sure you want to mark GRN <strong className="text-foreground">{grn.grnNumber}</strong> as <strong className="text-emerald-600">RECEIVED</strong>?
            </p>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 space-y-1">
              <p>✓ All product quantities on this GRN will be <strong>added to branch stock</strong>.</p>
              <p>✓ Stock movement logs will be generated.</p>
              <p>✓ This GRN will be locked from future edits.</p>
            </div>
            {actionError && <p className="text-destructive text-xs font-semibold">{actionError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReceiveModal(false)} disabled={actionPending}>
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={actionPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {actionPending ? 'Receiving...' : 'Yes, Receive & Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Cancel Draft GRN
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Are you sure you want to cancel draft GRN <strong className="text-foreground">{grn.grnNumber}</strong>?
            </p>
            {actionError && <p className="text-destructive text-xs font-semibold">{actionError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={actionPending}>
              Back
            </Button>
            <Button onClick={handleCancel} disabled={actionPending} variant="destructive">
              {actionPending ? 'Cancelling...' : 'Cancel GRN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
