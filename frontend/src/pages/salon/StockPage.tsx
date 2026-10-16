import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  Boxes,
  CreditCard,
  History,
  Layers,
  Package,
  Receipt,
  Search,
  SlidersHorizontal,
  TrendingDown,
  X,
  ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  tenantApi,
  type StockCreditDetail,
  type StockReceiptPaymentStatus,
} from '@/api/tenant.api';
import { useDebouncedSearch } from '@/hooks/useDebounce';
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
import { useSalonBranch } from '@/contexts/SalonBranchContext';
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

type Tab = 'movements' | 'levels' | 'credits';

const LOW_STOCK_THRESHOLD = 5;

function todayIso() {
  return sriLankaTodayIso();
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

export const ADJUSTMENT_INCREASE_REASONS = [
  { value: 'RESTOCK', label: 'New Shipment / Restock' },
  { value: 'FOUND_STOCK', label: 'Found Stock / Unrecorded Inventory' },
  { value: 'CUSTOMER_RETURN', label: 'Customer Return' },
  { value: 'INITIAL_COUNT', label: 'Initial Inventory Count' },
  { value: 'AUDIT_CORRECTION_IN', label: 'Inventory Audit Correction (+)' },
  { value: 'OTHER_INCREASE', label: 'Other Increase' },
];

export const ADJUSTMENT_DECREASE_REASONS = [
  { value: 'DAMAGED', label: 'Damaged / Broken Item' },
  { value: 'EXPIRED', label: 'Expired / Spoiled Item' },
  { value: 'THEFT_LOSS', label: 'Lost / Theft / Shrinkage' },
  { value: 'SALON_USE', label: 'Internal Salon Service Use' },
  { value: 'AUDIT_CORRECTION_OUT', label: 'Inventory Audit Correction (−)' },
  { value: 'SUPPLIER_RETURN', label: 'Returned to Supplier' },
  { value: 'OTHER_DECREASE', label: 'Other Decrease' },
];

export default function StockPage() {
  const qc = useQueryClient();
  const { branchId, setBranchId, branches } = useSalonBranch();
  const [tab, setTab] = useState<Tab>('movements');
  const [chartBranchId, setChartBranchId] = useState('all');
  const [formError, setFormError] = useState<string | null>(null);

  // Search & Filters for Movements
  const [movementSearch, setMovementSearch] = useState('');
  const debouncedMovementSearch = useDebouncedSearch(movementSearch, 300, 2);
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [selectedProductId, setSelectedProductId] = useState('all');

  // Search & Filters for Stock Levels
  const [levelSearch, setLevelSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Search & Filters for Credits
  const [creditSearch, setCreditSearch] = useState('');
  const debouncedCreditSearch = useDebouncedSearch(creditSearch, 400, 2);
  const [creditFilters, setCreditFilters] = useState({
    branchId: branchId,
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

  const { data: chartMovements = [] } = useQuery({
    queryKey: ['stock-movement-chart', chartBranchId],
    queryFn: () =>
      tenantApi.stock.movements(chartBranchId === 'all' ? undefined : { branchId: chartBranchId }),
    enabled: tab === 'movements',
  });

  const creditsQuery = useQuery({
    queryKey: ['stock-credits', creditFilters, debouncedCreditSearch],
    queryFn: () =>
      tenantApi.stock.credits({
        page: creditFilters.page,
        limit: 20,
        search: debouncedCreditSearch || undefined,
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

  // Sync with ribbon branch selection
  useEffect(() => {
    setCreditFilters((prev) => ({ ...prev, branchId, page: 1 }));
  }, [branchId]);

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
      amount: String(row.outstandingAmount > 0 ? row.outstandingAmount : ''),
      paymentMethod: 'CASH',
      paymentDate: todayIso(),
      paymentReference: '',
      notes: '',
    });
    setFormError(null);
  };

  // Stock Level Stats & Filtered Data
  const filteredLevels = useMemo(() => {
    let list = [...stockLevels];
    if (lowStockOnly) {
      list = list.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD);
    }
    if (levelSearch.trim()) {
      const term = levelSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.productName.toLowerCase().includes(term) ||
          s.productCode.toLowerCase().includes(term) ||
          s.branchName.toLowerCase().includes(term),
      );
    }
    return list;
  }, [stockLevels, lowStockOnly, levelSearch]);

  const stats = useMemo(() => {
    const low = stockLevels.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD).length;
    const outOfStock = stockLevels.filter((s) => s.quantity <= 0).length;
    const totalQty = stockLevels.reduce((sum, s) => sum + s.quantity, 0);
    return { skus: stockLevels.length, totalQty, low, outOfStock };
  }, [stockLevels]);

  // Movement Stats, Charts & Filtered Data
  const filteredMovements = useMemo(() => {
    let list = [...movements];
    if (selectedProductId !== 'all') {
      list = list.filter((m) => m.productId === selectedProductId);
    }
    if (movementTypeFilter !== 'all') {
      list = list.filter((m) => {
        const t = m.type.toUpperCase();
        if (movementTypeFilter === 'IN') return t.includes('IN') || t === 'STOCK_IN';
        if (movementTypeFilter === 'SALE') return t.includes('SALE');
        if (movementTypeFilter === 'ADJUSTMENT') return t.includes('ADJUST');
        return true;
      });
    }
    if (debouncedMovementSearch.trim()) {
      const term = debouncedMovementSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.productName.toLowerCase().includes(term) ||
          m.branchName.toLowerCase().includes(term) ||
          (m.notes && m.notes.toLowerCase().includes(term)),
      );
    }
    return list;
  }, [movements, selectedProductId, movementTypeFilter, debouncedMovementSearch]);

  const movementMetrics = useMemo(() => {
    let totalIn = 0;
    let totalSales = 0;
    let totalAdjustments = 0;

    filteredMovements.forEach((m) => {
      const t = m.type.toUpperCase();
      const qty = Math.abs(Number(m.quantity) || 0);
      if (t.includes('IN') || t === 'STOCK_IN') {
        totalIn += qty;
      } else if (t.includes('SALE')) {
        totalSales += qty;
      } else if (t.includes('ADJUST')) {
        totalAdjustments += qty;
      }
    });

    return { totalIn, totalSales, totalAdjustments, totalEvents: filteredMovements.length };
  }, [filteredMovements]);

  // Movement Breakdown for Chart (by product or recent 10 entries)
  const movementChartData = useMemo(() => {
    const map = new Map<string, { name: string; stockIn: number; sales: number; adjustment: number }>();
    const recent = chartMovements.slice(0, 10).reverse();

    recent.forEach((m) => {
      const label = m.productName.length > 14 ? m.productName.slice(0, 12) + '…' : m.productName;
      const key = `${label}-${m.id.slice(0, 4)}`;
      const current = map.get(key) || { name: label, stockIn: 0, sales: 0, adjustment: 0 };
      const t = m.type.toUpperCase();
      const qty = Math.abs(Number(m.quantity) || 0);

      if (t.includes('IN') || t === 'STOCK_IN') current.stockIn += qty;
      else if (t.includes('SALE')) current.sales += qty;
      else current.adjustment += qty;

      map.set(key, current);
    });

    return Array.from(map.values());
  }, [chartMovements]);

  const tabsList: { id: Tab; label: string; icon: any }[] = [
    { id: 'movements', label: 'Movement Chart & History', icon: History },
    { id: 'levels', label: 'Stock Reports & Levels', icon: Boxes },
    { id: 'credits', label: 'Supplier Credits', icon: CreditCard },
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
      {/* Back button to Inventory hub */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/salon/inventory-hub"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </Link>
      </div>
      <OpsPageHeader
        title="Stock Management & Analytics"
        subtitle="View live stock movements, inventory reports, level metrics, and supplier credits"
      />

      {/* Tabs Navigation */}
      <div className="emp-tabs" role="tablist" aria-label="Inventory sections">
        {tabsList.map((t) => {
          const IconComp = t.icon;
          return (
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
              <IconComp className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. Movements & Chart View */}
      {tab === 'movements' && (
        <div className="space-y-4">
          {/* Movement Summary Stats */}
          <div className="emp-stats">
            <div className="emp-stat">
              <div className="emp-stat-value text-emerald-700 flex items-center gap-1.5">
                <ArrowDownLeft className="h-5 w-5" /> +{movementMetrics.totalIn}
              </div>
              <div className="emp-stat-label">Stock Inflow (Units)</div>
            </div>
            <div className="emp-stat">
              <div className="emp-stat-value text-blue-700 flex items-center gap-1.5">
                <TrendingDown className="h-5 w-5" /> −{movementMetrics.totalSales}
              </div>
              <div className="emp-stat-label">Sales / Dispensed (Units)</div>
            </div>
            <div className="emp-stat">
              <div className="emp-stat-value text-amber-700 flex items-center gap-1.5">
                <SlidersHorizontal className="h-5 w-5" /> {movementMetrics.totalAdjustments}
              </div>
              <div className="emp-stat-label">Adjustments (Units)</div>
            </div>
          </div>

          {/* Movement Visual Chart */}
          {movementChartData.length > 0 && (
            <div className="emp-panel p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="emp-panel-title text-base sm:text-lg">Recent Movement Volume Chart</h2>
                  <p className="emp-panel-desc text-xs sm:text-sm">Visual comparison of incoming vs sales vs adjustment activity</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-semibold">
                  <Select value={chartBranchId} onValueChange={setChartBranchId}>
                    <SelectTrigger aria-label="Filter chart by branch" className="h-8 w-full sm:w-[170px] bg-white text-xs">
                      <SelectValue placeholder="All branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-3 text-xs pt-1 sm:pt-0">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" /> Stock In
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block" /> Sales Out
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Adjustments
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full overflow-x-auto pb-2">
                <div className="h-64 sm:h-72 w-full min-w-[500px] pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={movementChartData} margin={{ top: 10, right: 15, left: -20, bottom: 45 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        }}
                      />
                      <Bar dataKey="stockIn" fill="#10b981" radius={[4, 4, 0, 0]} name="Stock In" />
                      <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sales" />
                      <Bar dataKey="adjustment" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Adjustments" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Movement Filter Card */}
          <div className="catalog-filter-card">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
              <div className="catalog-search-wrap w-full sm:w-auto">
                <Search className="search-icon h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search product, branch, or notes..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  className="catalog-search-input"
                />
                {movementSearch && (
                  <button
                    type="button"
                    onClick={() => setMovementSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Movement Type Filter */}
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="catalog-filter-select w-full sm:w-auto"
              >
                <option value="all">All Movement Types</option>
                <option value="IN">Stock In (Receipts)</option>
                <option value="SALE">POS Sales</option>
                <option value="ADJUSTMENT">Adjustments</option>
              </select>

              {/* Product Filter */}
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="catalog-filter-select w-full sm:w-auto"
              >
                <option value="all">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Branch Filter */}
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="emp-select w-full sm:w-[170px] h-[38px]">
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
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap self-end sm:self-center">
              {filteredMovements.length} movement{filteredMovements.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Movements Table */}
          <div className="emp-panel">
            {filteredMovements.length === 0 ? (
              <div className="emp-empty">No movement records match the selected filters.</div>
            ) : (
              <div className="emp-table-wrap">
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Branch</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((m) => (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap">{formatSriLankaDateTime(m.createdAt)}</td>
                        <td>{m.branchName}</td>
                        <td className="emp-name-cell">{m.productName}</td>
                        <td>
                          <span className={movementTypeClass(m.type)}>{m.type}</span>
                        </td>
                        <td className="font-semibold text-slate-800">
                          {m.type.toUpperCase().includes('IN')
                            ? `+${m.quantity}`
                            : m.type.toUpperCase().includes('SALE')
                            ? `−${m.quantity}`
                            : m.quantity}
                        </td>
                        <td className="text-slate-600">{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Stock Reports & Levels View */}
      {tab === 'levels' && (
        <div className="space-y-4">
          <div className="emp-stats">
            <div className="emp-stat">
              <div className="emp-stat-value text-slate-900 flex items-center justify-between">
                <span>{stats.skus}</span>
                <Boxes className="h-6 w-6 text-slate-400 stroke-1" />
              </div>
              <div className="emp-stat-label">SKUs Monitored</div>
            </div>
            <div className="emp-stat">
              <div className="emp-stat-value text-slate-900 flex items-center justify-between">
                <span>{stats.totalQty}</span>
                <Package className="h-6 w-6 text-emerald-500 stroke-1" />
              </div>
              <div className="emp-stat-label">Total Units in Stock</div>
            </div>
            <div className="emp-stat">
              <div className="emp-stat-value text-amber-600 flex items-center justify-between">
                <span>{stats.low}</span>
                <AlertTriangle className="h-6 w-6 text-amber-500 stroke-1" />
              </div>
              <div className="emp-stat-label">Low Stock Items (≤ 5)</div>
            </div>
          </div>

          <div className="catalog-filter-card">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
              <div className="catalog-search-wrap w-full sm:w-auto">
                <Search className="search-icon h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search stock by product or branch..."
                  value={levelSearch}
                  onChange={(e) => setLevelSearch(e.target.value)}
                  className="catalog-search-input"
                />
                {levelSearch && (
                  <button
                    type="button"
                    onClick={() => setLevelSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="emp-select w-full sm:w-[180px] h-[38px]">
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

              <button
                type="button"
                onClick={() => setLowStockOnly((prev) => !prev)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                  lowStockOnly
                    ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⚠️ Low Stock Only</span>
                <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {stats.low}
                </span>
              </button>
            </div>
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap self-end sm:self-center">
              {filteredLevels.length} record{filteredLevels.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="emp-panel">
            <div className="emp-panel-header">
              <div>
                <h2 className="emp-panel-title">Current Stock Reports</h2>
                <p className="emp-panel-desc">
                  Products with quantity at or below {LOW_STOCK_THRESHOLD} are flagged with warning badges
                </p>
              </div>
            </div>

            {filteredLevels.length === 0 ? (
              <div className="emp-empty">No stock records found for this selection.</div>
            ) : (
              <div className="emp-table-wrap">
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Product Name</th>
                      <th>Product Code</th>
                      <th>Current Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLevels.map((item) => {
                      const isLow = item.quantity <= LOW_STOCK_THRESHOLD;
                      const isOut = item.quantity <= 0;
                      return (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap">{item.branchName}</td>
                          <td className="emp-name-cell">{item.productName}</td>
                          <td className="emp-code">{item.productCode}</td>
                          <td>
                            <span className={qtyBadgeClass(item.quantity)}>{item.quantity}</span>
                          </td>
                          <td>
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Low Stock Alert
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Credits Tab - List View */}
      {tab === 'credits' && !detailId && (
        <div className="space-y-4">
          <div className="emp-stats">
            <div className="emp-stat">
              <div className="emp-stat-value text-slate-900">{formatMoneyLkr(creditSummary.totalPurchases)}</div>
              <div className="emp-stat-label">Total Purchases</div>
            </div>
            <div className="emp-stat">
              <div className="emp-stat-value text-emerald-700">{formatMoneyLkr(creditSummary.totalPaid)}</div>
              <div className="emp-stat-label">Total Paid</div>
            </div>
            <div className="emp-stat">
              <div className="emp-stat-value text-rose-600">{formatMoneyLkr(creditSummary.totalOutstanding)}</div>
              <div className="emp-stat-label">Outstanding Balance</div>
            </div>
          </div>

          <div className="catalog-filter-card">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
              <div className="catalog-search-wrap w-full sm:w-auto">
                <Search className="search-icon h-4 w-4" />
                <input
                  placeholder="Search reference no..."
                  value={creditSearch}
                  onChange={(e) => {
                    setCreditSearch(e.target.value);
                    setCreditFilters((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="catalog-search-input"
                />
              </div>

              <Select
                value={creditFilters.branchId}
                onValueChange={(v) =>
                  setCreditFilters({ ...creditFilters, branchId: v, page: 1 })
                }
              >
                <SelectTrigger className="emp-select w-full sm:w-[160px] h-[38px]">
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
                <SelectTrigger className="emp-select w-full sm:w-[140px] h-[38px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partial</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="date"
                  value={creditFilters.fromDate}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setCreditFilters((prev) => ({
                      ...prev,
                      fromDate: newFrom,
                      toDate: prev.toDate && newFrom && prev.toDate < newFrom ? newFrom : prev.toDate,
                      page: 1,
                    }));
                  }}
                  className="w-full sm:w-[140px] h-[38px] text-xs"
                />
                <span className="text-slate-400 text-xs">to</span>
                <Input
                  type="date"
                  value={creditFilters.toDate}
                  min={creditFilters.fromDate || undefined}
                  onChange={(e) =>
                    setCreditFilters((prev) => ({ ...prev, toDate: e.target.value, page: 1 }))
                  }
                  className="w-full sm:w-[140px] h-[38px] text-xs"
                />
              </div>
            </div>
          </div>

          <div className="emp-panel">
            {credits.length === 0 ? (
              <div className="emp-empty">No supplier purchase credits found.</div>
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
                    {credits.map((row) => {
                      const refCode = row.referenceNo || `REC-${row.id.slice(0, 8).toUpperCase()}`;
                      return (
                        <tr key={row.id}>
                          <td>
                            <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-flex items-center gap-1">
                              {refCode}
                            </span>
                          </td>
                          <td className="whitespace-nowrap">{row.purchaseDate}</td>
                          <td>{row.branchName}</td>
                          <td>{formatMoneyAmount(row.totalAmount)}</td>
                          <td className="text-emerald-700 font-semibold">{formatMoneyAmount(row.paidAmount)}</td>
                          <td className="font-bold text-slate-900">{formatMoneyAmount(row.outstandingAmount)}</td>
                          <td>
                            <span className={paymentStatusClass(row.paymentStatus)}>
                              {paymentStatusLabel(row.paymentStatus)}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs px-2.5"
                                onClick={() => setDetailId(row.id)}
                              >
                                View
                              </Button>
                              {row.paymentStatus !== 'PAID' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="catalog-primary-btn h-8 text-xs px-3"
                                  onClick={() => openPay(row)}
                                >
                                  Pay
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {creditMeta && creditMeta.totalPages > 1 && (
              <div className="emp-toolbar p-4 border-t border-slate-100 mt-3 flex-row justify-between items-center">
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
                <span className="text-xs font-semibold text-slate-500">
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
        </div>
      )}

      {/* 4. Supplier Credit Detail View */}
      {tab === 'credits' && detailId && (
        <div className="space-y-4">
          <div className="emp-panel p-4 sm:p-6">
            {/* Header with Back button and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-lg flex items-center justify-center shrink-0"
                  onClick={() => setDetailId(null)}
                >
                  <ArrowLeft className="h-4 w-4 text-slate-700" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">Credit Receipt Detail</h2>
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200">
                      {detail?.referenceNo || `REC-${(detail?.id?.slice(0, 8) ?? '').toUpperCase()}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View line items, cost breakdown, and recorded payments ledger
                  </p>
                </div>
              </div>

              {detail && detail.paymentStatus !== 'PAID' && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    className="catalog-primary-btn"
                    onClick={() => openPay(detail)}
                  >
                    <CreditCard className="h-4 w-4" /> Pay Balance ({formatMoneyLkr(detail.outstandingAmount)})
                  </Button>
                </div>
              )}
            </div>

            {detailQuery.isLoading ? (
              <OpsLoading />
            ) : detailQuery.isError || !detail ? (
              <OpsError
                message={getErrorMessage(detailQuery.error)}
                onRetry={() => void detailQuery.refetch()}
              />
            ) : (
              <div className="space-y-6">
                {/* Meta details banner */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block uppercase tracking-wider text-[10px]">
                      Reference Number
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                      {detail.referenceNo || `REC-${detail.id.slice(0, 8).toUpperCase()}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block uppercase tracking-wider text-[10px]">
                      Purchase Date
                    </span>
                    <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                      {detail.purchaseDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block uppercase tracking-wider text-[10px]">
                      Receiving Branch
                    </span>
                    <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                      {detail.branchName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block uppercase tracking-wider text-[10px]">
                      Payment Status
                    </span>
                    <div className="mt-1">
                      <span className={paymentStatusClass(detail.paymentStatus)}>
                        {paymentStatusLabel(detail.paymentStatus as StockReceiptPaymentStatus)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 KPI cards for financial summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Total Purchase
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatMoneyLkr(detail.totalAmount)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Invoice amount from stock in</div>
                  </div>

                  <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
                      Amount Paid
                    </div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {formatMoneyLkr(detail.paidAmount)}
                    </div>
                    <div className="text-[11px] text-emerald-600/80 mt-1">Recorded payments to date</div>
                  </div>

                  <div
                    className={`border rounded-xl p-4 shadow-sm ${
                      detail.outstandingAmount > 0
                        ? 'bg-rose-50/40 border-rose-200/80'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                        detail.outstandingAmount > 0 ? 'text-rose-800' : 'text-slate-500'
                      }`}
                    >
                      Outstanding Balance
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        detail.outstandingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatMoneyLkr(detail.outstandingAmount)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {detail.outstandingAmount > 0 ? 'Payable supplier balance' : 'Fully settled'}
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-slate-500" /> Purchased Items ({detail.items.length})
                    </h3>
                  </div>
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
                            <td className="font-semibold text-slate-800">{item.quantity}</td>
                            <td>{formatMoneyAmount(item.unitCost)}</td>
                            <td className="font-bold text-slate-900">{formatMoneyAmount(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/70 font-semibold text-slate-800">
                          <td>Total</td>
                          <td>{detail.items.reduce((sum, it) => sum + it.quantity, 0)}</td>
                          <td>—</td>
                          <td className="text-slate-900 font-bold">{formatMoneyLkr(detail.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Payment History Section */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-slate-500" /> Payment History ({detail.payments.length})
                    </h3>
                  </div>
                  {detail.payments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 bg-slate-50/50">
                      No payments recorded yet for this purchase credit.
                    </div>
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
                              <td className="whitespace-nowrap font-medium text-slate-800">{p.paymentDate}</td>
                              <td className="font-bold text-emerald-700">{formatMoneyAmount(p.amount)}</td>
                              <td>
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {p.paymentMethod.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="font-mono text-xs text-slate-600">{p.paymentReference || '—'}</td>
                              <td className="text-slate-600 text-xs">{p.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pay Credit Modal */}
      <Dialog
        open={!!payTarget}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Credit Payment</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-bold text-slate-900">
                  {payTarget.referenceNo || `REC-${payTarget.id.slice(0, 8).toUpperCase()}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Purchase:</span>
                <span className="font-semibold text-slate-800">{formatMoneyLkr(payTarget.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-semibold text-emerald-700">{formatMoneyLkr(payTarget.paidAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-700">Outstanding Balance:</span>
                <span className="text-rose-600">{formatMoneyLkr(payTarget.outstandingAmount)}</span>
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
                <Label htmlFor="pay-amount">Payment Amount (LKR)</Label>
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
                  placeholder="e.g. Cheque # / Slip #"
                />
              </div>
              <div className="space-y-2" style={{ gridColumn: '1 / -1' }}>
                <Label htmlFor="pay-notes">Notes</Label>
                <FormTextarea
                  id="pay-notes"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes regarding this payment"
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
