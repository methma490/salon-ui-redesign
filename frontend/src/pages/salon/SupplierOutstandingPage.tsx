import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Truck,
  DollarSign,
  CreditCard,
  Search,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { tenantApi, type Branch } from '@/api/tenant.api';
import type {
  SupplierOutstandingItem,
  Supplier,
  SupplierPaymentMethod,
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

export default function SupplierOutstandingPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<SupplierOutstandingItem[]>([]);
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
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');

  // Metadata
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Direct Pay Dialog
  const [payModalItem, setPayModalItem] = useState<SupplierOutstandingItem | null>(null);
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

  useEffect(() => {
    async function loadMeta() {
      try {
        const [supRes, brRes] = await Promise.all([
          suppliersApi.getSuppliers({ limit: 100, status: 'ACTIVE' }),
          tenantApi.branches.list(),
        ]);
        const sups = Array.isArray(supRes) ? supRes : supRes.data || [];
        const brList = Array.isArray(brRes) ? brRes : [];
        setSuppliers(sups);
        setBranches(brList);
      } catch (e) {
        console.error('Failed to load metadata', e);
      }
    }
    loadMeta();
  }, []);

  const loadOutstanding = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (supplierFilter !== 'ALL') params.supplierId = supplierFilter;
      if (branchFilter !== 'ALL') params.branchId = branchFilter;
      if (paymentStatusFilter !== 'ALL') params.paymentStatus = paymentStatusFilter;

      const res = await suppliersApi.getSupplierOutstanding(params);
      const list = Array.isArray(res) ? res : res.data || [];
      const totalCount = (res as any).meta?.total ?? (res as any).total ?? list.length;
      const pagesCount = (res as any).meta?.totalPages ?? (res as any).totalPages ?? 1;

      setItems(list);
      setTotal(totalCount);
      setTotalPages(pagesCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load supplier outstanding balances'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, supplierFilter, branchFilter, paymentStatusFilter]);

  useEffect(() => {
    loadOutstanding();
  }, [loadOutstanding]);

  const openPayModal = (item: SupplierOutstandingItem) => {
    setPayModalItem(item);
    setPaymentAmount(String(item.outstandingAmount || 0));
    setPaymentMethod('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setBankName('');
    setChequeNumber('');
    setChequeDate('');
    setNotes(`Settlement for ${item.grnNumber}`);
    setPayError(null);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalItem) return;

    const parsedAmount = parseFloat(paymentAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setPayError('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setPayPending(true);
      setPayError(null);
      

      const payload: CreateSupplierPaymentInput = {
        supplierId: payModalItem.supplierId,
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
            grnId: payModalItem.id,
            allocatedAmount: parsedAmount,
          },
        ],
      };

      await suppliersApi.createSupplierPayment(payload);
      setPayModalItem(null);
      loadOutstanding();
    } catch (err) {
      setPayError(getErrorMessage(err, 'Failed to process payment'));
    } finally {
      setPayPending(false);
    }
  };

  const totalOutstandingSum = items.reduce(
    (sum, it) => sum + Number(it.outstandingAmount || 0),
    0,
  );

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    return due < today;
  };

  return (
    <div className="emp-page space-y-6">
      <OpsPageHeader
        title="Supplier Outstanding & Credit"
        subtitle="Track open supplier balances, overdue purchase invoices, and settle supplier credits."
        action={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/salon/suppliers')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Truck size={16} />
              Suppliers List
            </Button>
            <Button
              onClick={() => navigate('/salon/supplier-payments')}
              className="flex items-center gap-2 bg-primary text-primary-foreground"
            >
              <CreditCard size={16} />
              Payment History
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Open Credit Invoices</span>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold">{total}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Page Outstanding Total</span>
            <DollarSign className="h-5 w-5 text-destructive" />
          </div>
          <div className="mt-2 text-2xl font-bold text-destructive">
            Rs. {totalOutstandingSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Quick Action</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Click 'Pay Balance' on any open invoice to settle vendor dues immediately.
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              value={paymentStatusFilter}
              onValueChange={(val) => {
                setPaymentStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Open Statuses</SelectItem>
                <SelectItem value="UNPAID">Unpaid Only</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid Only</SelectItem>
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
            <Button variant="outline" className="mt-4" onClick={loadOutstanding}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">All Clear! No Outstanding Balances</h3>
            <p className="mt-1 text-sm">All supplier purchases and credit invoices are fully paid.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">GRN #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">GRN Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Total (Rs.)</th>
                  <th className="px-4 py-3 text-right">Settled (Rs.)</th>
                  <th className="px-4 py-3 text-right">Outstanding (Rs.)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const overdue = isOverdue(item.dueDate);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        <button
                          type="button"
                          onClick={() => navigate(`/salon/grns/${item.id}`)}
                          className="text-primary hover:underline font-semibold"
                        >
                          {item.grnNumber}
                        </button>
                        {item.supplierInvoiceNumber && (
                          <span className="block text-xs text-muted-foreground font-sans">
                            Inv: {item.supplierInvoiceNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <button
                          type="button"
                          onClick={() => navigate(`/salon/suppliers/${item.supplierId}`)}
                          className="hover:text-primary hover:underline text-left"
                        >
                          {item.supplierName}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.branchName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(item.grnDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.dueDate ? (
                          <span
                            className={
                              overdue
                                ? 'text-destructive font-semibold flex items-center gap-1'
                                : 'text-muted-foreground'
                            }
                          >
                            {overdue && <Clock size={12} />}
                            {new Date(item.dueDate).toLocaleDateString()}
                            {overdue && ' (Overdue)'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                        {Number(item.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">
                        {Number(item.paidAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-destructive">
                        {Number(item.outstandingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {item.paymentStatus === 'PARTIALLY_PAID' ? (
                          <span className="emp-badge emp-badge-probation">Partially Paid</span>
                        ) : (
                          <span className="emp-badge emp-badge-resigned">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => openPayModal(item)}
                          className="h-8 text-xs bg-primary text-primary-foreground flex items-center gap-1 ml-auto"
                        >
                          <CreditCard size={13} /> Pay Balance
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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
          itemLabel="Outstanding Invoices"
        />
      </div>

      {/* Settle Balance Dialog */}
      <SimpleFormDialog
        open={!!payModalItem}
        onOpenChange={(open) => !open && setPayModalItem(null)}
        title={`Settle Balance for ${payModalItem?.grnNumber}`}
        className="sm:max-w-lg"
      >
        <SimpleForm onSubmit={handlePaySubmit}>
          <FormError message={payError} />

          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Supplier:</span>
              <strong className="text-foreground">{payModalItem?.supplierName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Invoice Total:</span>
              <span>Rs. {Number(payModalItem?.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Outstanding:</span>
              <strong className="text-destructive">
                Rs. {Number(payModalItem?.outstandingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
    </div>
  );
}
