import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Printer, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi, type Customer, type Product, type Service } from '@/api/tenant.api';
import { useDebouncedSearch } from '@/hooks/useDebounce';
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
import { useAuth } from '@/contexts/AuthContext';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import {
  FormSubmit,
  getErrorMessage,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import './pos-page.css';

type CatalogTab = 'services' | 'products';
type CustomerMode = 'walkin' | 'registered';
type DiscountMode = 'amount' | 'percent';

interface CartService {
  key: string;
  serviceId: string;
  serviceName: string;
  categoryName?: string;
  price: number;
  employeeId: string;
  employeeName: string;
  discount: number;
}

interface CartProduct {
  key: string;
  productId: string;
  productName: string;
  categoryName?: string;
  price: number;
  quantity: number;
  discount: number;
}

type PaymentMode = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MIX';
type PayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER';

interface PaymentLine {
  key: string;
  method: PayMethod;
  amount: string;
  referenceNumber: string;
}

function equalSplitPercents(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];
  const base = Math.floor(10000 / count) / 100;
  const parts = Array.from({ length: count }, () => base);
  const sumExceptLast = Math.round(base * (count - 1) * 100) / 100;
  parts[count - 1] = Math.round((100 - sumExceptLast) * 100) / 100;
  return parts;
}

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MIX', label: 'Mix' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

const SPLIT_METHODS: { value: PayMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

function userInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return {
    full: now.toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    date: now.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export default function PosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const clock = useClock();
  const { branchId: ribbonBranchId, setBranchId: setRibbonBranchId, activeBranches } = useSalonBranch();

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileCheckoutStep, setMobileCheckoutStep] = useState<'cart' | 'payment'>('cart');
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('services');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [branchId, setBranchId] = useState<string>(() =>
    ribbonBranchId !== 'all' ? ribbonBranchId : activeBranches[0]?.id || '',
  );
  const [customerMode, setCustomerMode] = useState<CustomerMode>('walkin');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const debouncedPhoneSearch = useDebouncedSearch(phoneSearch, 400, 3);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' });

  const [cartServices, setCartServices] = useState<CartService[]>([]);
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);
  const [discountInput, setDiscountInput] = useState('');
  const [discountMode, setDiscountMode] = useState<DiscountMode>('amount');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { key: 'cash-1', method: 'CASH', amount: '', referenceNumber: '' },
  ]);
  const [paymentReference, setPaymentReference] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [pendingServiceId, setPendingServiceId] = useState('');

  // Synchronize when ribbon branch changes
  useEffect(() => {
    if (ribbonBranchId && ribbonBranchId !== 'all') {
      setBranchId(ribbonBranchId);
    } else if (!branchId && activeBranches.length >= 1) {
      setBranchId(activeBranches[0].id);
    }
  }, [ribbonBranchId, activeBranches, branchId]);

  const handleBranchChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    setRibbonBranchId(newBranchId);
  };

  const { data: performerData } = useQuery({
    queryKey: ['pos-performers', branchId],
    queryFn: () => tenantApi.pos.getPerformers(branchId ? { branchId } : undefined),
    enabled: !!branchId || activeBranches.length > 0,
  });

  const employees = performerData?.performers ?? [];
  const soloOwnerMode = performerData?.autoProvisioned === true || employees.length === 1;
  const soleEmployee = employees.length === 1 ? employees[0] : null;
  const hasMultipleEmployees = employees.length > 1;
  const hasNoEmployees = employees.length === 0;

  /** Distinct performers on cart services — used only for backend sale roster (not commission). */
  const derivedSaleEmployees = useMemo(() => {
    const ids: string[] = [];
    for (const s of cartServices) {
      if (s.employeeId && !ids.includes(s.employeeId)) ids.push(s.employeeId);
    }
    const pcts = equalSplitPercents(ids.length);
    return ids.map((employeeId, index) => ({
      employeeId,
      assignmentType: (index === 0 ? 'PRIMARY' : 'ASSISTANT') as 'PRIMARY' | 'ASSISTANT',
      allocationPercentage: pcts[index] ?? 0,
    }));
  }, [cartServices]);

  const updateCartServiceEmployee = (cartKey: string, employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    setCartServices((prev) =>
      prev.map((s) =>
        s.key === cartKey
          ? { ...s, employeeId: emp.id, employeeName: emp.name }
          : s,
      ),
    );
  };
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => tenantApi.services.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => tenantApi.products.list(),
  });

  const activeServices = useMemo(
    () => services.filter((s: Service) => s.status === 'ACTIVE'),
    [services],
  );
  const activeProducts = useMemo(
    () => products.filter((p: Product) => p.status === 'ACTIVE'),
    [products],
  );

  const categories = useMemo(() => {
    const source = catalogTab === 'services' ? activeServices : activeProducts;
    const names = new Set<string>();
    source.forEach((item) => {
      if (item.categoryName) names.add(item.categoryName);
    });
    return ['ALL', ...Array.from(names).sort()];
  }, [activeProducts, activeServices, catalogTab]);

  useEffect(() => {
    setCategoryFilter('ALL');
  }, [catalogTab]);

  const filteredServices = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return activeServices.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.categoryName?.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === 'ALL' || s.categoryName === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [activeServices, catalogSearch, categoryFilter]);

  const filteredProducts = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return activeProducts.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === 'ALL' || p.categoryName === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [activeProducts, catalogSearch, categoryFilter]);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['customer-search', debouncedPhoneSearch],
    queryFn: () => tenantApi.customers.search({ phone: debouncedPhoneSearch }),
    enabled: customerMode === 'registered' && debouncedPhoneSearch.length >= 3 && !customerId,
  });

  const createCustomerMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: (customer: Customer) => {
      setCustomerMode('registered');
      setCustomerId(customer.id);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone || null);
      setPhoneSearch(customer.phone || '');
      setCreateCustomerOpen(false);
      setNewCustomerForm({ name: '', phone: '', email: '' });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: tenantApi.pos.createSale,
    onSuccess: (sale: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-analytics'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      navigate(`/salon/sales/${sale.id}`);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const subtotal = useMemo(() => {
    const svcTotal = cartServices.reduce((sum, s) => sum + s.price - s.discount, 0);
    const prodTotal = cartProducts.reduce((sum, p) => sum + p.price * p.quantity - p.discount, 0);
    return svcTotal + prodTotal;
  }, [cartServices, cartProducts]);

  const discount = useMemo(() => {
    const raw = Number(discountInput) || 0;
    if (discountMode === 'percent') {
      return Math.min(subtotal, (subtotal * raw) / 100);
    }
    return Math.min(subtotal, raw);
  }, [discountInput, discountMode, subtotal]);

  const total = Math.max(0, subtotal - discount);
  const cartCount = cartServices.length + cartProducts.reduce((sum, p) => sum + p.quantity, 0);

  const paymentTotal = useMemo(() => {
    if (paymentMode !== 'MIX') return total;
    return paymentLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  }, [paymentLines, paymentMode, total]);

  const paymentRemaining = Math.max(0, total - paymentTotal);
  const paymentBalanced =
    total > 0 &&
    (paymentMode !== 'MIX' ? true : Math.abs(paymentTotal - total) < 0.01);

  const cashLineTotal =
    paymentMode === 'CASH'
      ? total
      : paymentLines
          .filter((line) => line.method === 'CASH')
          .reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const changeDue = Math.max(0, (Number(cashReceived) || 0) - cashLineTotal);

  const selectPaymentMode = (mode: PaymentMode) => {
    setPaymentMode(mode);
    setPaymentReference('');
    setCashReceived('');
    if (mode === 'MIX') {
      setPaymentLines([
        { key: crypto.randomUUID(), method: 'CASH', amount: '', referenceNumber: '' },
        { key: crypto.randomUUID(), method: 'CARD', amount: '', referenceNumber: '' },
      ]);
      return;
    }
    setPaymentLines([
      {
        key: 'main',
        method: mode,
        amount: total > 0 ? total.toFixed(2) : '',
        referenceNumber: '',
      },
    ]);
  };

  useEffect(() => {
    if (paymentMode !== 'MIX' && total > 0) {
      setPaymentLines([
        {
          key: 'main',
          method: paymentMode,
          amount: total.toFixed(2),
          referenceNumber: paymentReference,
        },
      ]);
    }
  }, [total, paymentMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const addServiceToCart = (serviceId: string, employeeId: string) => {
    const svc = activeServices.find((s) => s.id === serviceId);
    const emp = employees.find((e) => e.id === employeeId);
    if (!svc || !emp) return;

    setCartServices((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        serviceId: svc.id,
        serviceName: svc.name,
        categoryName: svc.categoryName ?? undefined,
        price: svc.price,
        employeeId: emp.id,
        employeeName: emp.name,
        discount: 0,
      },
    ]);
    setPendingServiceId('');
  };

  const handleServiceAdd = (serviceId: string) => {
    if (hasNoEmployees) return;
    if (soleEmployee || soloOwnerMode) {
      addServiceToCart(serviceId, (soleEmployee ?? employees[0]).id);
      return;
    }
    setPendingServiceId(serviceId);
  };

  const handleProductAdd = (productId: string) => {
    const prod = activeProducts.find((p) => p.id === productId);
    if (!prod) return;

    setCartProducts((prev) => {
      const existing = prev.find((p) => p.productId === productId);
      if (existing) {
        return prev.map((p) =>
          p.productId === productId ? { ...p, quantity: p.quantity + 1 } : p,
        );
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          productId: prod.id,
          productName: prod.name,
          categoryName: prod.categoryName ?? undefined,
          price: prod.sellingPrice,
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const clearCart = () => {
    setCartServices([]);
    setCartProducts([]);
    setFormError(null);
  };

  const addPaymentLine = (method: PayMethod = 'CASH') => {
    setPaymentLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        method,
        amount: paymentRemaining > 0 ? paymentRemaining.toFixed(2) : '',
        referenceNumber: '',
      },
    ]);
  };

  const updatePaymentLine = (key: string, patch: Partial<PaymentLine>) => {
    setPaymentLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removePaymentLine = (key: string) => {
    const minLines = paymentMode === 'MIX' ? 2 : 1;
    setPaymentLines((prev) =>
      prev.length <= minLines ? prev : prev.filter((line) => line.key !== key),
    );
  };

  const completeSale = () => {
    setFormError(null);
    if (!branchId) {
      setFormError('Please select a branch.');
      return;
    }
    if (cartCount === 0) {
      setFormError('Cart is empty.');
      return;
    }
    if (cartServices.length > 0 && hasNoEmployees) {
      setFormError('Select a branch so your stylist profile can be loaded.');
      return;
    }
    if (cartServices.some((s) => !s.employeeId)) {
      setFormError('Assign an employee to every service in the cart.');
      return;
    }
    if (!paymentBalanced) {
      setFormError(`Payment total must equal ${formatMoneyLkr(total)}.`);
      return;
    }

    const payments =
      paymentMode === 'MIX'
        ? paymentLines
            .map((line) => ({
              method: line.method,
              amount: Number(line.amount) || 0,
              referenceNumber: line.referenceNumber.trim() || undefined,
            }))
            .filter((line) => line.amount > 0)
        : [
            {
              method: paymentMode,
              amount: total,
              referenceNumber: paymentReference.trim() || undefined,
            },
          ];

    createSaleMutation.mutate({
      branchId,
      customerId: customerId || undefined,
      services: cartServices.map((s) => ({
        serviceId: s.serviceId,
        employeeId: s.employeeId,
        discount: s.discount || undefined,
      })),
      products: cartProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        discount: p.discount || undefined,
      })),
      employees: derivedSaleEmployees,
      discount: discount || undefined,
      payments,
    });
  };

  const pendingService = activeServices.find((s) => s.id === pendingServiceId);

  useEffect(() => {
    if (!mobileSheetOpen) {
      setMobileCheckoutStep('cart');
    }
  }, [mobileSheetOpen]);

  const completeDisabled =
    createSaleMutation.isPending ||
    !branchId ||
    cartCount === 0 ||
    !paymentBalanced ||
    (cartServices.length > 0 && hasNoEmployees) ||
    cartServices.some((s) => !s.employeeId);

  const cartRows = [
    ...cartServices.map((s, index) => ({
      key: s.key,
      kind: 'service' as const,
      index: index + 1,
      icon: '✂️',
      name: s.serviceName,
      sub: s.categoryName || 'Service',
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      price: s.price,
      qty: 1,
      total: s.price,
      onRemove: () => setCartServices((prev) => prev.filter((x) => x.key !== s.key)),
      onQtyChange: null as null | ((next: number) => void),
      onEmployeeChange: (employeeId: string) => updateCartServiceEmployee(s.key, employeeId),
    })),
    ...cartProducts.flatMap((p, baseIndex) => {
      const index = cartServices.length + baseIndex + 1;
      return {
        key: p.key,
        kind: 'product' as const,
        index,
        icon: '📦',
        name: p.productName,
        sub: p.categoryName || 'Product',
        employeeId: '',
        employeeName: '',
        price: p.price,
        qty: p.quantity,
        total: p.price * p.quantity,
        onRemove: () => setCartProducts((prev) => prev.filter((x) => x.key !== p.key)),
        onQtyChange: (next: number) => {
          if (next <= 0) {
            setCartProducts((prev) => prev.filter((x) => x.key !== p.key));
            return;
          }
          setCartProducts((prev) =>
            prev.map((x) => (x.key === p.key ? { ...x, quantity: next } : x)),
          );
        },
        onEmployeeChange: null as null | ((employeeId: string) => void),
      };
    }),
  ];

  const renderMobileCartList = () => (
    <div className="pos-mobile-cart-list">
      {cartRows.map((row) => (
        <div key={row.key} className="pos-mobile-cart-card">
          <div className="pos-mobile-cart-card-top">
            <div className="pos-mobile-cart-item-main">
              <span className="pos-mobile-cart-icon">{row.icon}</span>
              <div className="pos-mobile-cart-item-text">
                <div className="pos-mobile-cart-name">{row.name}</div>
                <div className="pos-mobile-cart-sub">{row.sub}</div>
              </div>
            </div>
            <button
              type="button"
              className="pos-cart-remove"
              aria-label="Remove item"
              onClick={row.onRemove}
            >
              <Trash2 size={16} />
            </button>
          </div>
          {row.kind === 'service' && row.onEmployeeChange && (
            <div className="pos-cart-employee">
              <label className="pos-cart-employee-label">Employee</label>
              {hasNoEmployees ? (
                <span className="pos-muted">No employees for this branch</span>
              ) : employees.length === 1 ? (
                <span className="pos-cart-employee-solo">{row.employeeName}</span>
              ) : (
                <Select value={row.employeeId} onValueChange={row.onEmployeeChange}>
                  <SelectTrigger className="pos-cart-employee-select">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                        {e.designation ? ` · ${e.designation}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div className="pos-mobile-cart-card-bottom">
            <span className="pos-mobile-cart-price">{formatMoneyAmount(row.price)}</span>
            {row.onQtyChange ? (
              <div className="pos-qty-stepper">
                <button
                  type="button"
                  className="pos-qty-btn"
                  onClick={() => row.onQtyChange!(row.qty - 1)}
                >
                  −
                </button>
                <span>{row.qty}</span>
                <button
                  type="button"
                  className="pos-qty-btn"
                  onClick={() => row.onQtyChange!(row.qty + 1)}
                >
                  +
                </button>
              </div>
            ) : (
              <span className="pos-mobile-cart-qty">Qty {row.qty}</span>
            )}
            <span className="pos-mobile-cart-line-total">{formatMoneyAmount(row.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCartPanel = (className = '', variant: 'desktop' | 'mobile' = 'desktop') => (
    <div className={`pos-panel ${className}`.trim()}>
      {variant === 'desktop' && (
        <div className="pos-panel-head">
          <h2>Cart · {cartCount}</h2>
          {cartCount > 0 && (
            <button type="button" className="pos-panel-head-action" onClick={clearCart}>
              Clear
            </button>
          )}
        </div>
      )}
      <div className="pos-panel-body">
        {cartCount > 0 && (
          <div className={variant === 'mobile' ? 'pos-mobile-cart-toolbar' : 'pos-cart-toolbar'}>
            <span>
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
            {variant === 'mobile' && (
              <button type="button" className="pos-panel-head-action" onClick={clearCart}>
                Clear all
              </button>
            )}
          </div>
        )}
        {cartRows.length === 0 ? (
          <div className="pos-cart-empty">Tap a service or product to add it to the cart</div>
        ) : (
          renderMobileCartList()
        )}

        <div className="pos-totals">
          <div className="pos-total-row">
            <span>Subtotal</span>
            <span>{formatMoneyAmount(subtotal)}</span>
          </div>
          <div className="pos-total-row">
            <span>Discount</span>
            <div className="pos-discount-row">
              <div className="pos-discount-toggle">
                <button
                  type="button"
                  className={discountMode === 'amount' ? 'is-active' : ''}
                  onClick={() => setDiscountMode('amount')}
                >
                  LKR
                </button>
                <button
                  type="button"
                  className={discountMode === 'percent' ? 'is-active' : ''}
                  onClick={() => setDiscountMode('percent')}
                >
                  %
                </button>
              </div>
              <input
                className="pos-discount-input"
                type="number"
                min="0"
                step="0.01"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="pos-total-row pos-total-row-grand">
            <span>Total</span>
            <span>{formatMoneyLkr(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const showCashFields =
    paymentMode === 'CASH' ||
    (paymentMode === 'MIX' && paymentLines.some((line) => line.method === 'CASH'));

  const renderPaymentPanel = (options?: { hideActions?: boolean; className?: string }) => (
    <div className={`pos-panel ${options?.className ?? ''}`.trim()}>
      <div className="pos-panel-head">
        <h2>Payment</h2>
      </div>
      <div className="pos-panel-body">
        <div className="pos-pay-methods">
          {PAYMENT_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`pos-pay-method ${paymentMode === m.value ? 'pos-pay-method-active' : ''}`}
              onClick={() => selectPaymentMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {paymentMode === 'MIX' ? (
          <>
            <div className="pos-split-list">
              {paymentLines.map((line) => (
                <div key={line.key} className="pos-split-row">
                  <select
                    value={line.method}
                    onChange={(e) =>
                      updatePaymentLine(line.key, { method: e.target.value as PayMethod })
                    }
                  >
                    {SPLIT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={line.amount}
                    onChange={(e) => updatePaymentLine(line.key, { amount: e.target.value })}
                  />
                  <button
                    type="button"
                    className="pos-split-remove"
                    aria-label="Remove payment line"
                    onClick={() => removePaymentLine(line.key)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="pos-add-split-btn" onClick={() => addPaymentLine()}>
              + Add payment line
            </button>
            <div
              className={`pos-pay-summary ${paymentBalanced ? 'is-ok' : paymentTotal > total ? 'is-error' : ''}`}
            >
              <span>Paid</span>
              <span>
                {formatMoneyLkr(paymentTotal)} / {formatMoneyLkr(total)}
                {!paymentBalanced && paymentRemaining > 0
                  ? ` · Remaining ${formatMoneyLkr(paymentRemaining)}`
                  : ''}
              </span>
            </div>
          </>
        ) : (
          <div className="pos-single-pay">
            <div className="pos-single-pay-amount">
              <span>Amount</span>
              <strong>{formatMoneyLkr(total)}</strong>
            </div>
            {(paymentMode === 'CARD' || paymentMode === 'BANK_TRANSFER') && (
              <div className="pos-field">
                <label htmlFor="pos-pay-ref">
                  {paymentMode === 'CARD' ? 'Card reference (optional)' : 'Transfer reference (optional)'}
                </label>
                <input
                  id="pos-pay-ref"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            )}
          </div>
        )}

        {showCashFields && (
          <div className="pos-pay-fields">
            <div className="pos-field">
              <label htmlFor="pos-cash-received">Amount Received (Cash)</label>
              <input
                id="pos-cash-received"
                type="number"
                min="0"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={cashLineTotal.toFixed(2)}
              />
            </div>
            <div className="pos-field">
              <label htmlFor="pos-change">Change</label>
              <div className="pos-change-box">
                <input id="pos-change" readOnly value={formatMoneyAmount(changeDue)} />
              </div>
            </div>
          </div>
        )}

        {formError && <div className="pos-alert pos-alert-error">{formError}</div>}

        {!options?.hideActions && (
          <div className="pos-actions-row">
            <button
              type="button"
              className="pos-btn-outline"
              disabled={cartCount === 0}
              onClick={() => window.print()}
            >
              <Printer size={15} />
              Print
            </button>
            <button
              type="button"
              className="pos-complete-btn"
              onClick={completeSale}
              disabled={completeDisabled}
            >
              <Check size={15} />
              {createSaleMutation.isPending ? 'Processing…' : 'Complete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="pos-page">
      <header className="pos-toolbar">
        <div className="pos-toolbar-grid">
          <div className="pos-toolbar-brand">
            <h1 className="pos-title">
              <span className="pos-title-short">POS</span>
              <span className="pos-title-full">Point of Sale</span>
            </h1>
            <span className="pos-datetime pos-datetime-inline">{clock.time}</span>
          </div>

          <div className="pos-branch-select">
            <Select value={branchId} onValueChange={handleBranchChange}>
              <SelectTrigger aria-label="Select branch">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {activeBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pos-datetime-block">
            <span className="pos-datetime pos-datetime-tablet">{clock.date}</span>
            <span className="pos-datetime pos-datetime-desktop">{clock.full}</span>
          </div>

          {user && (
            <div className="pos-user-chip">
              <span className="pos-user-avatar">{userInitials(user.name)}</span>
              <span className="pos-user-meta">
                <span className="pos-user-name">{user.name}</span>
                <span className="pos-user-role">Cashier</span>
              </span>
            </div>
          )}
        </div>

        <div className="pos-toolbar-customer">
          <span className="pos-customer-label">Customer</span>
          <div className="pos-customer-modes">
            <button
              type="button"
              className={`pos-customer-mode ${customerMode === 'walkin' ? 'pos-customer-mode-active' : ''}`}
              onClick={() => {
                setCustomerMode('walkin');
                setCustomerId(null);
                setCustomerName(null);
                setCustomerPhone(null);
                setPhoneSearch('');
              }}
            >
              Walk-in
            </button>
            <button
              type="button"
              className={`pos-customer-mode ${customerMode === 'registered' ? 'pos-customer-mode-active' : ''}`}
              onClick={() => setCustomerMode('registered')}
            >
              Registered
            </button>
          </div>

          {customerMode === 'registered' && (
            <div className="pos-customer-search-wrap">
              <input
                className="pos-customer-search"
                type="search"
                placeholder="Search customer…"
                value={phoneSearch}
                onChange={(e) => {
                  setPhoneSearch(e.target.value);
                  if (customerId) {
                    setCustomerId(null);
                    setCustomerName(null);
                    setCustomerPhone(null);
                  }
                }}
              />
              <button
                type="button"
                className="pos-customer-add-btn"
                onClick={() => setCreateCustomerOpen(true)}
              >
                + New
              </button>
            </div>
          )}

          {customerId && customerName && (
            <span className="pos-customer-chip">
              {customerName}
              {customerPhone ? ` · ${customerPhone}` : ''}
              <button
                type="button"
                aria-label="Clear customer"
                onClick={() => {
                  setCustomerId(null);
                  setCustomerName(null);
                  setCustomerPhone(null);
                  setPhoneSearch('');
                }}
              >
                ×
              </button>
            </span>
          )}
        </div>

        {customerMode === 'registered' && phoneSearch.length >= 3 && !customerId && searchResults.length > 0 && (
          <div className="pos-customer-results">
            {searchResults.map((c) => (
              <button
                key={c.id}
                type="button"
                className="pos-customer-result"
                onClick={() => {
                  setCustomerId(c.id);
                  setCustomerName(c.name);
                  setCustomerPhone(c.phone || null);
                  setPhoneSearch(c.phone || c.name);
                }}
              >
                {c.name} — {c.phone}
              </button>
            ))}
          </div>
        )}

        {customerMode === 'registered' && phoneSearch.length >= 3 && !customerId && searchResults.length === 0 && (
          <p className="pos-customer-hint">No customer found — tap + New to create one.</p>
        )}
      </header>

      {hasNoEmployees && catalogTab === 'services' && (
        <div className="pos-alert pos-alert-warn">Select a branch to load your stylist profile.</div>
      )}

      {soloOwnerMode && !hasNoEmployees && catalogTab === 'services' && (
        <div className="pos-alert pos-alert-info">
          Solo salon mode — services are assigned to you automatically.
        </div>
      )}

      <div className="pos-layout">
        <div className="pos-catalog-panel">
          <div className="pos-catalog-toolbar">
            <div className="pos-catalog-tabs">
              <button
                type="button"
                className={`pos-catalog-tab ${catalogTab === 'services' ? 'pos-catalog-tab-active' : ''}`}
                onClick={() => {
                  setCatalogTab('services');
                  setCatalogSearch('');
                }}
              >
                Services
                <span className="pos-tab-count">{activeServices.length}</span>
              </button>
              <button
                type="button"
                className={`pos-catalog-tab ${catalogTab === 'products' ? 'pos-catalog-tab-active' : ''}`}
                onClick={() => {
                  setCatalogTab('products');
                  setCatalogSearch('');
                }}
              >
                Products
                <span className="pos-tab-count">{activeProducts.length}</span>
              </button>
            </div>
            <div className="pos-search">
              <input
                type="search"
                placeholder={`Search ${catalogTab}…`}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="pos-category-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`pos-category-chip ${categoryFilter === cat ? 'pos-category-chip-active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'ALL' ? 'All' : cat}
              </button>
            ))}
          </div>

          {catalogTab === 'services' ? (
            <div className="pos-item-grid">
              {filteredServices.length === 0 ? (
                <div className="pos-empty-catalog">No services found</div>
              ) : (
                filteredServices.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`pos-item-card ${pendingServiceId === s.id ? 'pos-item-card-selected' : ''}`}
                    disabled={hasNoEmployees}
                    onClick={() => handleServiceAdd(s.id)}
                  >
                    <div className="pos-item-thumb">✂️</div>
                    <div className="pos-item-info">
                      <div className="pos-item-name">{s.name}</div>
                      {s.categoryName && <div className="pos-item-meta">{s.categoryName}</div>}
                      <div className="pos-item-price">{formatMoneyAmount(s.price)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="pos-item-grid">
              {filteredProducts.length === 0 ? (
                <div className="pos-empty-catalog">No products found</div>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="pos-item-card"
                    onClick={() => handleProductAdd(p.id)}
                  >
                    <div className="pos-item-thumb">📦</div>
                    <div className="pos-item-info">
                      <div className="pos-item-name">{p.name}</div>
                      {p.categoryName && <div className="pos-item-meta">{p.categoryName}</div>}
                      <div className="pos-item-price">{formatMoneyAmount(p.sellingPrice)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <aside className="pos-checkout-panel">
          {renderCartPanel('pos-checkout-cart')}
          {renderPaymentPanel({ className: 'pos-checkout-pay' })}
        </aside>
      </div>

      <button
        type="button"
        className="pos-fab"
        aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
        onClick={() => setMobileSheetOpen(true)}
      >
        <ShoppingCart size={22} strokeWidth={2.25} />
        {cartCount > 0 && <span className="pos-fab-badge">{cartCount}</span>}
      </button>

      <Dialog open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <DialogContent
          className={`pos-sheet ${mobileCheckoutStep === 'payment' ? 'pos-sheet-payment' : ''}`}
        >
          {mobileCheckoutStep === 'cart' ? (
            <>
              <DialogHeader className="pos-sheet-header">
                <DialogTitle>Your cart</DialogTitle>
                <p className="pos-sheet-meta">{formatMoneyLkr(total)} due</p>
              </DialogHeader>
              <div className="pos-sheet-body">
                {renderCartPanel('pos-panel-mobile pos-panel-mobile-cart', 'mobile')}
              </div>
              <div className="pos-sheet-footer">
                <button
                  type="button"
                  className="pos-sheet-primary-btn"
                  disabled={cartCount === 0}
                  onClick={() => setMobileCheckoutStep('payment')}
                >
                  Pay {formatMoneyLkr(total)}
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="pos-sheet-header pos-sheet-header-payment">
                <button
                  type="button"
                  className="pos-sheet-back-btn"
                  aria-label="Back to cart"
                  onClick={() => setMobileCheckoutStep('cart')}
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <DialogTitle>Payment</DialogTitle>
                  <p className="pos-sheet-meta">{formatMoneyLkr(total)} to collect</p>
                </div>
              </DialogHeader>
              <div className="pos-sheet-body">
                {renderPaymentPanel({ hideActions: true, className: 'pos-panel-mobile-pay' })}
              </div>
              <div className="pos-sheet-footer">
                <button
                  type="button"
                  className="pos-sheet-primary-btn"
                  onClick={completeSale}
                  disabled={completeDisabled}
                >
                  {createSaleMutation.isPending ? 'Processing…' : `Complete sale · ${formatMoneyLkr(total)}`}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingService && hasMultipleEmployees}
        onOpenChange={(open) => {
          if (!open) setPendingServiceId('');
        }}
      >
        <DialogContent className="pos-assign-dialog sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign employee</DialogTitle>
          </DialogHeader>
          {pendingService && (
            <div className="pos-assign-body">
              <div className="pos-assign-service">
                <span className="pos-assign-service-icon">✂️</span>
                <div>
                  <div className="pos-assign-service-name">{pendingService.name}</div>
                  <div className="pos-assign-service-price">
                    {formatMoneyLkr(pendingService.price)}
                    {pendingService.categoryName ? ` · ${pendingService.categoryName}` : ''}
                  </div>
                </div>
              </div>
              <p className="pos-assign-hint">Select who performed this service</p>
              <div className="pos-assign-list">
                {employees.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="pos-assign-option"
                    onClick={() => addServiceToCart(pendingService.id, e.id)}
                  >
                    <span className="pos-assign-option-avatar">
                      {e.name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="pos-assign-option-text">
                      <strong>{e.name}</strong>
                      <span>{e.designation || e.code}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SimpleFormDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        title="New Customer"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            createCustomerMutation.mutate({
              name: newCustomerForm.name.trim(),
              phone: newCustomerForm.phone.trim(),
              email: newCustomerForm.email.trim() || undefined,
            });
          }}
        >
          <div className="pos-field">
            <Label htmlFor="pos-cust-name">Full name</Label>
            <Input
              id="pos-cust-name"
              value={newCustomerForm.name}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
              required
            />
          </div>
          <div className="pos-field">
            <Label htmlFor="pos-cust-phone">Phone</Label>
            <Input
              id="pos-cust-phone"
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
              required
            />
          </div>
          <FormSubmit pending={createCustomerMutation.isPending}>Add Customer</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>
    </div>
  );
}
