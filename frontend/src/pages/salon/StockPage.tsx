import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  tenantApi,
  type StockCreditDetail,
  type StockReceiptPaymentStatus,
} from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  FormError,
  FormSubmit,
  FormTextarea,
  getErrorMessage,
  OpsError,
  OpsLoading,
  OpsPageHeader,
  SimpleForm,
} from './salon-ops-ui';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import { formatSriLankaDateTime, sriLankaTodayIso } from '@/lib/sri-lanka-time';
import './employees-page.css';

type Tab = 'levels' | 'stock-in' | 'credits' | 'adjustment' | 'movements';
type PaymentType = 'PAID' | 'PARTIAL' | 'CREDIT';

const LOW_STOCK_THRESHOLD = 5;

function todayIso() {
  return sriLankaTodayIso();
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function qtyBadgeClass(qty: number) {
  if (qty <= 0) return 'emp-qty-badge emp-qty-badge-out';
  if (qty <= LOW_STOCK_THRESHOLD) return 'emp-qty-badge emp-qty-badge-low';
  return 'emp-qty-badge emp-qty-badge-ok';
}

function movementTypeClass(type: string) {
  const t = type.toUpperCase();
  if (t.includes('IN') || t === 'STOCK_IN') return 'emp-type-badge emp-type-in';
  if (t.includes('SALE')) return 'emp-type-badge emp-type-sale';
  if (t.includes('ADJUST')) return 'emp-type-badge emp-type-adjust';
  return 'emp-type-badge emp-type-out';
}

function paymentStatusLabel(status: string) {
  if (status === 'PAID') return 'Paid';
  if (status === 'PARTIALLY_PAID') return 'Partial';
  return 'Unpaid';
}

function paymentStatusClass(status: string) {
  if (status === 'PAID') return 'emp-qty-badge emp-qty-badge-ok';
  if (status === 'PARTIALLY_PAID') return 'emp-qty-badge emp-qty-badge-low';
  return 'emp-qty-badge emp-qty-badge-out';
}

export default function StockPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('levels');
  const [branchId, setBranchId] = useState<string>('all');
  const [formError, setFormError] = useState<string | null>(null);

  const [creditFilters, setCreditFilters] = useState({
    search: '',
    branchId: 'all',
    paymentStatus: 'all',
    fromDate: '',
    toDate: '',
    page: 1,
  });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<{
    id: string;
    referenceNo: string | null;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  } | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    paymentDate: todayIso(),
    paymentReference: '',
    notes: '',
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => tenantApi.products.list(),
  });

  const {
    data: stockLevels = [],
    isLoading: levelsLoading,
    isError: levelsError,
    error: levelsQueryError,
    refetch: refetchLevels,
  } = useQuery({
    queryKey: ['stock-levels', branchId],
    queryFn: () => tenantApi.stock.list(branchId === 'all' ? undefined : branchId),
    enabled: tab === 'levels',
  });

  const {
    data: movements = [],
    isLoading: movementsLoading,
    isError: movementsError,
    error: movementsQueryError,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: ['stock-movements', branchId],
    queryFn: () => tenantApi.stock.movements(branchId === 'all' ? undefined : { branchId }),
    enabled: tab === 'movements',
  });

  const creditsQuery = useQuery({
    queryKey: ['stock-credits', creditFilters],
    queryFn: () =>
      tenantApi.stock.credits({
        page: creditFilters.page,
        limit: 20,
        search: creditFilters.search || undefined,
        branchId: creditFilters.branchId === 'all' ? undefined : creditFilters.branchId,
        paymentStatus:
          creditFilters.paymentStatus === 'all' ? undefined : creditFilters.paymentStatus,
        fromDate: creditFilters.fromDate || undefined,
        toDate: creditFilters.toDate || undefined,
        sortBy: 'purchaseDate',
        sortDir: 'desc',
      }),
    enabled: tab === 'credits',
  });

  const detailQuery = useQuery({
    queryKey: ['stock-credit', detailId],
    queryFn: () => tenantApi.stock.credit(detailId!),
    enabled: !!detailId,
  });

  const [stockInForm, setStockInForm] = useState({
    branchId: '',
    productId: '',
    quantity: '',
    unitCost: '',
    paymentType: 'PAID' as PaymentType,
    paidAmount: '',
    referenceNo: '',
    purchaseDate: todayIso(),
    notes: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    branchId: '',
    productId: '',
    quantity: '',
    notes: '',
  });

  const stockInTotals = useMemo(() => {
    const qty = Number(stockInForm.quantity) || 0;
    const unit = Number(stockInForm.unitCost) || 0;
    const total = roundMoney(qty * unit);
    let paid = 0;
    if (stockInForm.paymentType === 'PAID') paid = total;
    else if (stockInForm.paymentType === 'CREDIT') paid = 0;
    else paid = Number(stockInForm.paidAmount) || 0;
    const outstanding = roundMoney(Math.max(0, total - paid));
    return { total, paid: roundMoney(paid), outstanding };
  }, [stockInForm]);

  const stockInMutation = useMutation({
    mutationFn: tenantApi.stock.stockIn,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['stock-credits'] });
      setStockInForm({
        branchId: '',
        productId: '',
        quantity: '',
        unitCost: '',
        paymentType: 'PAID',
        paidAmount: '',
        referenceNo: '',
        purchaseDate: todayIso(),
        notes: '',
      });
      setFormError(null);
      setTab(
        (variables as { paymentType?: string }).paymentType === 'PAID' ? 'levels' : 'credits',
      );
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const adjustMutation = useMutation({
    mutationFn: tenantApi.stock.adjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      setAdjustForm({ branchId: '', productId: '', quantity: '', notes: '' });
      setFormError(null);
      setTab('levels');
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const payMutation = useMutation({
    mutationFn: (payload: { id: string; data: Record<string, unknown> }) =>
      tenantApi.stock.payCredit(payload.id, payload.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-credits'] });
      qc.invalidateQueries({ queryKey: ['stock-credit'] });
      setPayTarget(null);
      setPayForm({
        amount: '',
        paymentMethod: 'CASH',
        paymentDate: todayIso(),
        paymentReference: '',
        notes: '',
      });
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const openPay = (row: {
    id: string;
    referenceNo: string | null;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  }) => {
    setPayTarget(row);
    setPayForm({
      amount: '',
      paymentMethod: 'CASH',
      paymentDate: todayIso(),
      paymentReference: '',
      notes: '',
    });
    setFormError(null);
  };

  const stats = useMemo(() => {
    const low = stockLevels.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD).length;
    const totalQty = stockLevels.reduce((sum, s) => sum + s.quantity, 0);
    return { skus: stockLevels.length, totalQty, low };
  }, [stockLevels]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'levels', label: 'Stock Levels', icon: '📊' },
    { id: 'stock-in', label: 'Stock In', icon: '📥' },
    { id: 'credits', label: 'Credits', icon: '💳' },
    { id: 'adjustment', label: 'Adjustment', icon: '⚖️' },
    { id: 'movements', label: 'Movements', icon: '📋' },
  ];

  const listLoading =
    tab === 'levels'
      ? levelsLoading
      : tab === 'movements'
        ? movementsLoading
        : tab === 'credits'
          ? creditsQuery.isLoading
          : false;
  const listError =
    tab === 'levels'
      ? levelsError
      : tab === 'movements'
        ? movementsError
        : tab === 'credits'
          ? creditsQuery.isError
          : false;
  const listQueryError =
    tab === 'levels'
      ? levelsQueryError
      : tab === 'movements'
        ? movementsQueryError
        : tab === 'credits'
          ? creditsQuery.error
          : null;

  if (listLoading && (tab === 'levels' || tab === 'movements' || tab === 'credits')) {
    return <OpsLoading />;
  }
  if (listError && (tab === 'levels' || tab === 'movements' || tab === 'credits')) {
    return (
      <OpsError
        message={getErrorMessage(listQueryError)}
        onRetry={() =>
          void (tab === 'levels'
            ? refetchLevels()
            : tab === 'movements'
              ? refetchMovements()
              : creditsQuery.refetch())
        }
      />
    );
  }

  const credits = creditsQuery.data?.data ?? [];
  const creditSummary = creditsQuery.data?.summary ?? {
    totalPurchases: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  };
  const creditMeta = creditsQuery.data?.meta;
  const detail: StockCreditDetail | undefined = detailQuery.data;

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Inventory"
        subtitle="Track stock levels, receive stock, manage purchase credits, and review movements"
      />

      {tab === 'levels' && (
        <div className="emp-stats">
          <div className="emp-stat">
            <div className="emp-stat-value">{stats.skus}</div>
            <div className="emp-stat-label">SKUs in stock</div>
          </div>
          <div className="emp-stat">
            <div className="emp-stat-value">{stats.totalQty}</div>
            <div className="emp-stat-label">Total units</div>
          </div>
          <div className="emp-stat">
            <div className="emp-stat-value">{stats.low}</div>
            <div className="emp-stat-label">Low stock</div>
          </div>
        </div>
      )}

      {tab === 'credits' && (
        <div className="emp-stats">
          <div className="emp-stat">
            <div className="emp-stat-value">{formatMoneyLkr(creditSummary.totalPurchases)}</div>
            <div className="emp-stat-label">Total purchases</div>
          </div>
          <div className="emp-stat">
            <div className="emp-stat-value">{formatMoneyLkr(creditSummary.totalPaid)}</div>
            <div className="emp-stat-label">Total paid</div>
          </div>
          <div className="emp-stat">
            <div className="emp-stat-value">{formatMoneyLkr(creditSummary.totalOutstanding)}</div>
            <div className="emp-stat-label">Outstanding credit</div>
          </div>
        </div>
      )}

      <div className="emp-tabs" role="tablist" aria-label="Inventory sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`emp-tab ${tab === t.id ? 'emp-tab-active' : ''}`}
            onClick={() => {
              setFormError(null);
              setDetailId(null);
              setTab(t.id);
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {(tab === 'levels' || tab === 'movements') && (
        <div className="emp-toolbar">
          <div className="emp-toolbar-filters">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="emp-select w-full sm:w-[200px]">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--emp-muted)' }}>
            {tab === 'levels'
              ? `${stockLevels.length} record${stockLevels.length === 1 ? '' : 's'}`
              : `${movements.length} movement${movements.length === 1 ? '' : 's'}`}
          </span>
        </div>
      )}

      {tab === 'levels' && (
        <div className="emp-panel">
          <div className="emp-panel-header">
            <div>
              <h2 className="emp-panel-title">Current Stock Levels</h2>
              <p className="emp-panel-desc">
                Products with quantity at or below {LOW_STOCK_THRESHOLD} are flagged
              </p>
            </div>
          </div>
          {stockLevels.length === 0 ? (
            <div className="emp-empty">No stock records yet. Use Stock In to add inventory.</div>
          ) : (
            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Product</th>
                    <th>Code</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLevels.map((item) => (
                    <tr key={item.id}>
                      <td>{item.branchName}</td>
                      <td className="emp-name-cell">{item.productName}</td>
                      <td className="emp-code">{item.productCode}</td>
                      <td>
                        <span className={qtyBadgeClass(item.quantity)}>{item.quantity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'stock-in' && (
        <div className="emp-panel">
          <div className="emp-form-panel">
            <h2 className="emp-form-panel-title">Stock In</h2>
            <p className="emp-form-panel-desc">
              Receive stock immediately. Payment can be paid, partial, or on credit.
            </p>
            <SimpleForm
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                const qty = Number(stockInForm.quantity);
                const unitCost = Number(stockInForm.unitCost);
                if (!(qty > 0)) {
                  setFormError('Quantity must be greater than 0');
                  return;
                }
                if (unitCost < 0) {
                  setFormError('Unit cost cannot be negative');
                  return;
                }
                if (stockInForm.paymentType === 'PARTIAL') {
                  const paid = Number(stockInForm.paidAmount);
                  if (!(paid > 0) || paid >= stockInTotals.total) {
                    setFormError('Partial paid amount must be greater than 0 and less than total');
                    return;
                  }
                }
                stockInMutation.mutate({
                  branchId: stockInForm.branchId,
                  productId: stockInForm.productId,
                  quantity: qty,
                  unitCost,
                  paymentType: stockInForm.paymentType,
                  paidAmount:
                    stockInForm.paymentType === 'PARTIAL'
                      ? Number(stockInForm.paidAmount)
                      : undefined,
                  referenceNo: stockInForm.referenceNo || undefined,
                  purchaseDate: stockInForm.purchaseDate || undefined,
                  notes: stockInForm.notes || undefined,
                });
              }}
            >
              <FormError message={formError} />
              <div className="emp-form-grid">
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select
                    value={stockInForm.branchId}
                    onValueChange={(v) => setStockInForm({ ...stockInForm, branchId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-in-ref">Reference No</Label>
                  <Input
                    id="stock-in-ref"
                    value={stockInForm.referenceNo}
                    onChange={(e) =>
                      setStockInForm({ ...stockInForm, referenceNo: e.target.value })
                    }
                    placeholder="INV-001 (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select
                    value={stockInForm.productId}
                    onValueChange={(v) => setStockInForm({ ...stockInForm, productId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-in-date">Purchase Date</Label>
                  <Input
                    id="stock-in-date"
                    type="date"
                    value={stockInForm.purchaseDate}
                    onChange={(e) =>
                      setStockInForm({ ...stockInForm, purchaseDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-in-qty">Quantity</Label>
                  <Input
                    id="stock-in-qty"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={stockInForm.quantity}
                    onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-in-unit">Unit Cost (LKR)</Label>
                  <Input
                    id="stock-in-unit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockInForm.unitCost}
                    onChange={(e) => setStockInForm({ ...stockInForm, unitCost: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input value={formatMoneyLkr(stockInTotals.total)} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select
                    value={stockInForm.paymentType}
                    onValueChange={(v) =>
                      setStockInForm({
                        ...stockInForm,
                        paymentType: v as PaymentType,
                        paidAmount: '',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="PARTIAL">Partial</SelectItem>
                      <SelectItem value="CREDIT">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {stockInForm.paymentType === 'PARTIAL' ? (
                  <div className="space-y-2">
                    <Label htmlFor="stock-in-paid">Paid Amount (LKR)</Label>
                    <Input
                      id="stock-in-paid"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={stockInForm.paidAmount}
                      onChange={(e) =>
                        setStockInForm({ ...stockInForm, paidAmount: e.target.value })
                      }
                      placeholder="0"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Paid Amount</Label>
                    <Input value={formatMoneyLkr(stockInTotals.paid)} readOnly disabled />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Outstanding Amount</Label>
                  <Input value={formatMoneyLkr(stockInTotals.outstanding)} readOnly disabled />
                </div>
                <div className="space-y-2" style={{ gridColumn: '1 / -1' }}>
                  <Label htmlFor="stock-in-notes">Notes</Label>
                  <FormTextarea
                    id="stock-in-notes"
                    value={stockInForm.notes}
                    onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
                    placeholder="Optional"
                    rows={2}
                  />
                </div>
              </div>
              <FormSubmit
                pending={stockInMutation.isPending}
                disabled={!stockInForm.branchId || !stockInForm.productId}
              >
                Record Stock In
              </FormSubmit>
            </SimpleForm>
          </div>
        </div>
      )}

      {tab === 'credits' && !detailId && (
        <div className="emp-panel">
          <div className="emp-toolbar">
            <div className="emp-toolbar-filters" style={{ flexWrap: 'wrap', gap: 8 }}>
              <Input
                placeholder="Search reference…"
                value={creditFilters.search}
                onChange={(e) =>
                  setCreditFilters({ ...creditFilters, search: e.target.value, page: 1 })
                }
                className="w-full sm:w-[180px]"
              />
              <Select
                value={creditFilters.branchId}
                onValueChange={(v) =>
                  setCreditFilters({ ...creditFilters, branchId: v, page: 1 })
                }
              >
                <SelectTrigger className="emp-select w-full sm:w-[160px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={creditFilters.paymentStatus}
                onValueChange={(v) =>
                  setCreditFilters({ ...creditFilters, paymentStatus: v, page: 1 })
                }
              >
                <SelectTrigger className="emp-select w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partial</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={creditFilters.fromDate}
                onChange={(e) =>
                  setCreditFilters({ ...creditFilters, fromDate: e.target.value, page: 1 })
                }
                className="w-full sm:w-[150px]"
              />
              <Input
                type="date"
                value={creditFilters.toDate}
                onChange={(e) =>
                  setCreditFilters({ ...creditFilters, toDate: e.target.value, page: 1 })
                }
                className="w-full sm:w-[150px]"
              />
            </div>
          </div>

          {credits.length === 0 ? (
            <div className="emp-empty">No stock purchase credits found.</div>
          ) : (
            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Total (LKR)</th>
                    <th>Paid (LKR)</th>
                    <th>Balance (LKR)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((row) => (
                    <tr key={row.id}>
                      <td className="emp-name-cell">{row.referenceNo || '—'}</td>
                      <td>{row.purchaseDate}</td>
                      <td>{row.branchName}</td>
                      <td>{formatMoneyAmount(row.totalAmount)}</td>
                      <td>{formatMoneyAmount(row.paidAmount)}</td>
                      <td>{formatMoneyAmount(row.outstandingAmount)}</td>
                      <td>
                        <span className={paymentStatusClass(row.paymentStatus)}>
                          {paymentStatusLabel(row.paymentStatus)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailId(row.id)}
                          >
                            View
                          </Button>
                          {row.paymentStatus !== 'PAID' && (
                            <Button type="button" size="sm" onClick={() => openPay(row)}>
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {creditMeta && creditMeta.totalPages > 1 && (
            <div className="emp-toolbar" style={{ marginTop: 12 }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={creditFilters.page <= 1}
                onClick={() =>
                  setCreditFilters({ ...creditFilters, page: Math.max(1, creditFilters.page - 1) })
                }
              >
                Previous
              </Button>
              <span style={{ fontSize: '0.8125rem', color: 'var(--emp-muted)' }}>
                Page {creditMeta.page} of {creditMeta.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={creditFilters.page >= creditMeta.totalPages}
                onClick={() =>
                  setCreditFilters({ ...creditFilters, page: creditFilters.page + 1 })
                }
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === 'credits' && detailId && (
        <div className="emp-panel">
          <div className="emp-panel-header">
            <div>
              <h2 className="emp-panel-title">
                Credit detail {detail?.referenceNo ? `· ${detail.referenceNo}` : ''}
              </h2>
              <p className="emp-panel-desc">Payment history does not change stock quantities</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="outline" onClick={() => setDetailId(null)}>
                Back
              </Button>
              {detail && detail.paymentStatus !== 'PAID' && (
                <Button type="button" onClick={() => openPay(detail)}>
                  Pay
                </Button>
              )}
            </div>
          </div>

          {detailQuery.isLoading ? (
            <OpsLoading />
          ) : detailQuery.isError || !detail ? (
            <OpsError
              message={getErrorMessage(detailQuery.error)}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : (
            <>
              <div className="emp-stats">
                <div className="emp-stat">
                  <div className="emp-stat-value">{formatMoneyLkr(detail.totalAmount)}</div>
                  <div className="emp-stat-label">Total</div>
                </div>
                <div className="emp-stat">
                  <div className="emp-stat-value">{formatMoneyLkr(detail.paidAmount)}</div>
                  <div className="emp-stat-label">Paid</div>
                </div>
                <div className="emp-stat">
                  <div className="emp-stat-value">{formatMoneyLkr(detail.outstandingAmount)}</div>
                  <div className="emp-stat-label">Balance</div>
                </div>
                <div className="emp-stat">
                  <div className="emp-stat-value">
                    <span className={paymentStatusClass(detail.paymentStatus)}>
                      {paymentStatusLabel(detail.paymentStatus as StockReceiptPaymentStatus)}
                    </span>
                  </div>
                  <div className="emp-stat-label">Status · {detail.branchName}</div>
                </div>
              </div>

              <h3 className="emp-panel-title" style={{ marginTop: 8 }}>
                Items
              </h3>
              <div className="emp-table-wrap">
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Cost (LKR)</th>
                      <th>Line Total (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.id}>
                        <td className="emp-name-cell">{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{formatMoneyAmount(item.unitCost)}</td>
                        <td>{formatMoneyAmount(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="emp-panel-title" style={{ marginTop: 16 }}>
                Payment History
              </h3>
              {detail.payments.length === 0 ? (
                <div className="emp-empty">No payments recorded yet.</div>
              ) : (
                <div className="emp-table-wrap">
                  <table className="emp-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount (LKR)</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.paymentDate}</td>
                          <td>{formatMoneyAmount(p.amount)}</td>
                          <td>{p.paymentMethod.replace('_', ' ')}</td>
                          <td>{p.paymentReference || '—'}</td>
                          <td>{p.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'adjustment' && (
        <div className="emp-panel">
          <div className="emp-form-panel">
            <h2 className="emp-form-panel-title">Stock Adjustment</h2>
            <p className="emp-form-panel-desc">
              Use positive values to increase stock, negative values to decrease (e.g. damage or
              correction).
            </p>
            <SimpleForm
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                adjustMutation.mutate({
                  branchId: adjustForm.branchId,
                  productId: adjustForm.productId,
                  quantity: Number(adjustForm.quantity),
                  notes: adjustForm.notes || undefined,
                });
              }}
            >
              <FormError message={formError} />
              <div className="emp-form-grid">
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select
                    value={adjustForm.branchId}
                    onValueChange={(v) => setAdjustForm({ ...adjustForm, branchId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select
                    value={adjustForm.productId}
                    onValueChange={(v) => setAdjustForm({ ...adjustForm, productId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjust-qty">Adjustment quantity</Label>
                  <Input
                    id="adjust-qty"
                    type="number"
                    step="0.01"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                    placeholder="+ or −"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjust-notes">Notes</Label>
                  <FormTextarea
                    id="adjust-notes"
                    value={adjustForm.notes}
                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                    placeholder="Reason for adjustment"
                    rows={2}
                  />
                </div>
              </div>
              <FormSubmit
                pending={adjustMutation.isPending}
                disabled={!adjustForm.branchId || !adjustForm.productId}
              >
                Apply Adjustment
              </FormSubmit>
            </SimpleForm>
          </div>
        </div>
      )}

      {tab === 'movements' && (
        <div className="emp-panel">
          <div className="emp-panel-header">
            <div>
              <h2 className="emp-panel-title">Movement History</h2>
              <p className="emp-panel-desc">
                Stock in, adjustments, and POS sales. Credit payments do not appear here.
              </p>
            </div>
          </div>
          {movements.length === 0 ? (
            <div className="emp-empty">No movements recorded for this filter.</div>
          ) : (
            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td>{formatSriLankaDateTime(m.createdAt)}</td>
                      <td>{m.branchName}</td>
                      <td className="emp-name-cell">{m.productName}</td>
                      <td>
                        <span className={movementTypeClass(m.type)}>{m.type}</span>
                      </td>
                      <td>{m.quantity}</td>
                      <td>{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={!!payTarget}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credit Payment</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--emp-muted)' }}>
              <div>
                <strong>Reference:</strong> {payTarget.referenceNo || '—'}
              </div>
              <div>
                <strong>Total:</strong> {formatMoneyLkr(payTarget.totalAmount)}
              </div>
              <div>
                <strong>Already Paid:</strong> {formatMoneyLkr(payTarget.paidAmount)}
              </div>
              <div>
                <strong>Outstanding:</strong> {formatMoneyLkr(payTarget.outstandingAmount)}
              </div>
            </div>
          )}
          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              if (!payTarget) return;
              setFormError(null);
              payMutation.mutate({
                id: payTarget.id,
                data: {
                  amount: Number(payForm.amount),
                  paymentMethod: payForm.paymentMethod,
                  paymentDate: payForm.paymentDate || undefined,
                  paymentReference: payForm.paymentReference || undefined,
                  notes: payForm.notes || undefined,
                },
              });
            }}
          >
            <FormError message={formError} />
            <div className="emp-form-grid">
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Payment Amount</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={payForm.paymentMethod}
                  onValueChange={(v) => setPayForm({ ...payForm, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">Payment Date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payForm.paymentDate}
                  onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-ref">Payment Reference</Label>
                <Input
                  id="pay-ref"
                  value={payForm.paymentReference}
                  onChange={(e) => setPayForm({ ...payForm, paymentReference: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2" style={{ gridColumn: '1 / -1' }}>
                <Label htmlFor="pay-notes">Notes</Label>
                <FormTextarea
                  id="pay-notes"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <FormSubmit pending={payMutation.isPending}>Record Payment</FormSubmit>
          </SimpleForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}
