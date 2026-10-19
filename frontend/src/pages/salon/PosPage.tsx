import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  History,
  Plus,
  Printer,
  Scissors,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi, type Customer, type Product, type Service } from '@/api/tenant.api';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  FormError,
  getErrorMessage,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import { printReceipt } from '@/lib/print-receipt';
import { resolveUploadUrl } from '@/lib/upload-url';
import SendEbillModal from './SendEbillModal';
import './pos-page.css';

function PosInvoiceLogo({ logoUrl }: { logoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveUploadUrl(logoUrl);

  if (!resolved || imgError) {
    return (
      <span className="pos-inv-logo-fallback" aria-hidden>
        <Scissors size={22} />
      </span>
    );
  }

  return (
    <img
      src={resolved}
      alt=""
      className="pos-inv-logo"
      onError={() => setImgError(true)}
    />
  );
}

function getUserDisplayRole(user?: { roles?: string[] } | null): string {
  if (!user?.roles || user.roles.length === 0) return 'Cashier';
  if (user.roles.includes('SUPER_ADMIN')) return 'System Admin';
  if (user.roles.includes('SALON_ADMIN')) return 'Salon Admin';
  if (user.roles.includes('MANAGER')) return 'Manager';
  if (user.roles.includes('CASHIER')) return 'Cashier';
  if (user.roles.includes('RECEPTIONIST')) return 'Receptionist';
  if (user.roles.includes('STYLIST')) return 'Stylist';

  return user.roles[0]
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatPaymentMethod(method?: string): string {
  if (!method) return '—';
  return method
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

type CatalogTab = 'services' | 'products';
type CustomerMode = 'walkin' | 'registered';
type DiscountMode = 'amount' | 'percent';

interface CartService {
  key: string;
  serviceId: string;
  serviceName: string;
  categoryName?: string;
  price: number;
  originalPrice: number;
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
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return {
    full: now.toLocaleString('en-LK', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Colombo',
    }),
    date: now.toLocaleDateString('en-LK', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Colombo',
    }),
    time: now.toLocaleTimeString('en-LK', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Colombo',
    }),
  };
}

function CartItemPriceInput({
  value,
  originalPrice,
  onChange,
  onReset,
}: {
  value: number;
  originalPrice?: number;
  onChange?: (val: number) => void;
  onReset?: () => void;
}) {
  const [localVal, setLocalVal] = useState(() => String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(String(value));
    }
  }, [value, isFocused]);

  const isCustom = originalPrice !== undefined && Math.abs(value - originalPrice) > 0.001;

  return (
    <div
      className={`pos-cart-price-input-wrap ${isCustom ? 'is-custom-price' : ''}`}
      title={
        isCustom && originalPrice !== undefined
          ? `Custom price (Catalog: Rs. ${originalPrice.toLocaleString()})`
          : 'Edit service price'
      }
    >
      <span className="pos-cart-price-currency">Rs.</span>
      <input
        type="number"
        min="0"
        step="1"
        aria-label="Service price"
        className="pos-cart-price-input"
        value={localVal}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.select();
        }}
        onChange={(e) => {
          const str = e.target.value;
          setLocalVal(str);
          const parsed = parseFloat(str);
          if (!isNaN(parsed) && parsed >= 0) {
            onChange?.(parsed);
          }
        }}
        onBlur={() => {
          setIsFocused(false);
          const parsed = parseFloat(localVal);
          if (isNaN(parsed) || parsed < 0) {
            setLocalVal(String(value));
          } else {
            setLocalVal(String(parsed));
            onChange?.(parsed);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {isCustom && onReset && (
        <button
          type="button"
          className="pos-cart-price-reset-btn"
          title={`Reset to catalog price (Rs. ${originalPrice?.toLocaleString()})`}
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          aria-label="Reset price"
        >
          ↺
        </button>
      )}
    </div>
  );
}

export default function PosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const clock = useClock();
  const { branchId: ribbonBranchId, setBranchId: setRibbonBranchId, activeBranches } = useSalonBranch();

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileCheckoutStep, setMobileCheckoutStep] = useState<'cart' | 'payment'>('cart');
  const [mobileWizardStep, setMobileWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const wizardBodyRef = useRef<HTMLDivElement>(null);
  const [mixPaymentSheetOpen, setMixPaymentSheetOpen] = useState(false);
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('services');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const hasInventory = useMemo(
    () => user?.features?.includes('INVENTORY') ?? false,
    [user?.features],
  );

  useEffect(() => {
    if (!hasInventory && catalogTab === 'products') {
      setCatalogTab('services');
    }
  }, [hasInventory, catalogTab]);

  useEffect(() => {
    wizardBodyRef.current?.scrollTo({ top: 0 });
  }, [mobileWizardStep]);

  useEffect(() => {
    const handleAppBack = (e: Event) => {
      if (mobileWizardStep > 1) {
        e.preventDefault();
        setFormError(null);
        setMobileWizardStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      }
    };
    window.addEventListener('app:back', handleAppBack);
    return () => window.removeEventListener('app:back', handleAppBack);
  }, [mobileWizardStep]);

  const [branchId, setBranchId] = useState<string>(() =>
    ribbonBranchId !== 'all' ? ribbonBranchId : activeBranches[0]?.id || '',
  );
  const [customerMode, setCustomerMode] = useState<CustomerMode>('walkin');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebouncedSearch(customerSearch, 300, 1);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' });
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);

  const handleOpenCreateCustomer = () => {
    setNewCustomerForm({ name: '', phone: '', email: '' });
    setNewCustomerError(null);
    setCreateCustomerOpen(true);
  };

  const handleCloseCreateCustomer = (open: boolean) => {
    setCreateCustomerOpen(open);
    if (!open) {
      setNewCustomerForm({ name: '', phone: '', email: '' });
      setNewCustomerError(null);
    }
  };

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
  const [draftSaleId, setDraftSaleId] = useState<string | null>(null);
  const [draftHistoryOpen, setDraftHistoryOpen] = useState(false);
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);
  const [pendingServiceId, setPendingServiceId] = useState('');
  const [assignEmployeeSearch, setAssignEmployeeSearch] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantApi.settings.get,
  });
  const salon = settings?.salon;

  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const [sendEbillOpen, setSendEbillOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    id: string;
    saleNumber: string;
    subtotal: number;
    discount: number;
    total: number;
    customerName: string;
    customerPhone?: string | null;
    branchName: string;
    cashierName: string;
    cashierRole: string;
    items: Array<{
      id: string;
      name: string;
      itemType: 'service' | 'product';
      stylistName?: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    payments: Array<{
      method: string;
      amount: number;
      referenceNumber?: string | null;
    }>;
    cashReceived?: string;
    changeDue?: number;
    date: string;
    time: string;
    status?: string;
  } | null>(null);

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

  const filteredAssignEmployees = useMemo(() => {
    const q = assignEmployeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.designation && e.designation.toLowerCase().includes(q)) ||
        (e.code && e.code.toLowerCase().includes(q)),
    );
  }, [employees, assignEmployeeSearch]);

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

  const updateCartServicePrice = (cartKey: string, newPrice: number) => {
    setCartServices((prev) =>
      prev.map((s) =>
        s.key === cartKey
          ? { ...s, price: Math.max(0, newPrice) }
          : s,
      ),
    );
  };
  const { data: services = [] } = useQuery({
    queryKey: ['services', 'pos-all'],
    queryFn: () => tenantApi.services.list({ all: true }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', branchId],
    queryFn: () => tenantApi.products.list(branchId ? { branchId, all: true } : { all: true }),
    enabled: hasInventory,
  });

  const { data: posDrafts = [], isLoading: draftsLoading } = useQuery({
    queryKey: ['pos-drafts', branchId],
    queryFn: () => tenantApi.sales.list({ status: 'PENDING', ...(branchId ? { branchId } : {}) }),
    enabled: draftHistoryOpen,
  });

  const loadDraft = async (saleId: string) => {
    setLoadingDraftId(saleId);
    setFormError(null);
    try {
      const sale = await tenantApi.sales.get(saleId) as any;
      const itemRows = Array.isArray(sale.items) ? sale.items : [];
      const serviceItems = itemRows.filter((item: any) => item.itemType?.toLowerCase() === 'service' || item.serviceId);
      const productItems = itemRows.filter((item: any) => item.itemType?.toLowerCase() === 'product' || item.productId);
      setBranchId(sale.branchId);
      setRibbonBranchId(sale.branchId);
      setCustomerId(sale.customerId || null);
      setCustomerName(sale.customerName || null);
      setCustomerPhone(sale.customerPhone || null);
      setCustomerMode(sale.customerId ? 'registered' : 'walkin');
      setCustomerSearch(sale.customerName || '');
      setCartServices(serviceItems.map((item: any) => {
        const performer = item.employees?.[0];
        const matchingSvc = (services as any[]).find((s) => s.id === item.serviceId);
        const catalogPrice = matchingSvc ? Number(matchingSvc.price) : Number(item.unitPrice);
        return {
          key: crypto.randomUUID(), serviceId: item.serviceId, serviceName: item.name,
          price: Number(item.unitPrice), originalPrice: catalogPrice, employeeId: performer?.id || '',
          employeeName: performer?.name || '', discount: Number(item.discount) || 0,
        };
      }));
      setCartProducts(productItems.map((item: any) => ({
        key: crypto.randomUUID(), productId: item.productId, productName: item.name,
        price: Number(item.unitPrice), quantity: Number(item.quantity), discount: Number(item.discount) || 0,
      })));
      setDiscountInput(String(Number(sale.discount) || 0));
      setDiscountMode('amount');
      setDraftSaleId(sale.id);
      setMobileWizardStep(3);
      setPaymentMode('CASH');
      setPaymentReference('');
      setCashReceived('');
      setPaymentLines([{ key: crypto.randomUUID(), method: 'CASH', amount: '', referenceNumber: '' }]);
      setDraftHistoryOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setLoadingDraftId(null);
    }
  };

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

  const { data: searchResults = [], isFetching: isCustomerSearching } = useQuery({
    queryKey: ['customer-search', debouncedCustomerSearch],
    queryFn: () => tenantApi.customers.search({ search: debouncedCustomerSearch }),
    enabled: customerMode === 'registered' && debouncedCustomerSearch.length >= 1 && !customerId,
  });

  const createCustomerMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: (customer: Customer) => {
      setCustomerMode('registered');
      setCustomerId(customer.id);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone || null);
      setCustomerSearch(customer.name || customer.phone || '');
      setCreateCustomerOpen(false);
      setNewCustomerForm({ name: '', phone: '', email: '' });
      setNewCustomerError(null);
      setFormError(null);
      setMobileWizardStep(2);
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer-search'] });
    },
    onError: (err: unknown) => {
      setNewCustomerError(getErrorMessage(err));
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: tenantApi.pos.createSale,
    onSuccess: (
      sale: { id: string; saleNumber?: string; status?: string },
      variables: Record<string, unknown>,
    ) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['pos-drafts'] });
      qc.invalidateQueries({ queryKey: ['sales-analytics'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });

      const currentBranch = activeBranches.find((b) => b.id === branchId)?.name || 'Main Branch';
      const itemsList = [
        ...cartServices.map((s) => ({
          id: s.key,
          name: s.serviceName,
          itemType: 'service' as const,
          stylistName: s.employeeName,
          quantity: 1,
          unitPrice: s.price,
          total: s.price - (s.discount || 0),
        })),
        ...cartProducts.map((p) => ({
          id: p.key,
          name: p.productName,
          itemType: 'product' as const,
          quantity: p.quantity,
          unitPrice: p.price,
          total: p.price * p.quantity - (p.discount || 0),
        })),
      ];

      const paymentsList =
        paymentMode === 'MIX'
          ? paymentLines
              .filter((l) => Number(l.amount) > 0)
              .map((l) => ({
                method: l.method,
                amount: Number(l.amount) || 0,
                referenceNumber: l.referenceNumber.trim() || null,
              }))
          : [
              {
                method: paymentMode,
                amount: total,
                referenceNumber: paymentReference.trim() || null,
              },
            ];

      setCompletedSale({
        id: sale.id,
        saleNumber: sale.saleNumber || 'SALE-RECORDED',
        subtotal,
        discount,
        total,
        customerName: customerName || 'Walk-in customer',
        customerPhone: customerPhone || null,
        branchName: currentBranch,
        cashierName: user?.name || 'Staff',
        cashierRole: getUserDisplayRole(user),
        items: itemsList,
        payments: paymentsList,
        cashReceived:
          (paymentMode === 'CASH' || paymentLines.some((p) => p.method === 'CASH')) && cashReceived
            ? cashReceived
            : undefined,
        changeDue: changeDue > 0 ? changeDue : undefined,
        date: clock.date,
        time: clock.time,
        status: sale.status || (typeof variables?.status === 'string' ? variables.status : 'COMPLETED'),
      });

      setCompletedModalOpen(true);
      setDraftHistoryOpen(false);
      clearCart();
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

  const cashLineTotal =
    paymentMode === 'CASH'
      ? total
      : paymentLines
          .filter((line) => line.method === 'CASH')
          .reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const cashReceivedNum = Number(cashReceived) || 0;
  const changeDue = Math.max(0, cashReceivedNum - cashLineTotal);

  const paymentTotal = useMemo(() => {
    if (paymentMode === 'MIX') {
      return paymentLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    }
    if (paymentMode === 'CASH') {
      return cashReceivedNum > 0 ? Math.min(total, cashReceivedNum) : 0;
    }
    return total;
  }, [paymentLines, paymentMode, total, cashReceivedNum]);

  const paymentRemaining = Math.max(0, total - paymentTotal);

  const paymentBalanced = useMemo(() => {
    if (total <= 0 || cartCount === 0) return false;
    if (paymentMode === 'MIX') {
      const mixSum = paymentLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
      return Math.abs(mixSum - total) < 0.01;
    }
    if (paymentMode === 'CASH') {
      return cashReceived.trim() !== '' && cashReceivedNum >= total;
    }
    return true;
  }, [total, cartCount, paymentMode, paymentLines, cashReceived, cashReceivedNum]);

  const selectPaymentMode = (mode: PaymentMode) => {
    setPaymentMode(mode);
    setPaymentReference('');
    setCashReceived('');
    if (mode === 'MIX') {
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
        setMixPaymentSheetOpen(true);
      }
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
    } else if (paymentMode === 'MIX' && total > 0) {
      setPaymentLines((prev) => {
        if (prev.length === 2) {
          if (prev[0].amount.trim() !== '') {
            const first = parseFloat(prev[0].amount);
            if (!isNaN(first)) {
              const rem = Math.max(0, Math.round((total - first) * 100) / 100);
              const remStr = rem > 0 ? (Number.isInteger(rem) ? String(rem) : rem.toFixed(2)) : '0';
              if (prev[1].amount !== remStr) {
                return [prev[0], { ...prev[1], amount: remStr }];
              }
            }
          }
        }
        return prev;
      });
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
        originalPrice: svc.price,
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
    if (!prod || (prod.stockQuantity ?? 0) <= 0) return;

    setCartProducts((prev) => {
      const existing = prev.find((p) => p.productId === productId);
      if (existing) {
        if (existing.quantity >= (prod.stockQuantity ?? 99999)) return prev;
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
    setDiscountInput('');
    setDiscountMode('amount');
    setCustomerMode('walkin');
    setCustomerId(null);
    setCustomerName(null);
    setCustomerPhone(null);
    setCustomerSearch('');
    setPaymentMode('CASH');
    setCashReceived('');
    setPaymentReference('');
    setPaymentLines([
      { key: crypto.randomUUID(), method: 'CASH', amount: '', referenceNumber: '' },
    ]);
    setFormError(null);
    setDraftSaleId(null);
    setMobileWizardStep(1);
  };

  const addPaymentLine = (method: PayMethod = 'CASH') => {
    if (paymentRemaining <= 0 || paymentTotal >= total) return;
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
    setPaymentLines((prev) => {
      const targetIndex = prev.findIndex((l) => l.key === key);
      if (targetIndex === -1) return prev;

      const nextLines = prev.map((line) => (line.key === key ? { ...line, ...patch } : line));

      // Auto-calculate remaining payment amounts when editing MIX split lines
      if (paymentMode === 'MIX' && patch.amount !== undefined) {
        const rawAmount = patch.amount.trim();

        if (nextLines.length === 2) {
          const otherIndex = targetIndex === 0 ? 1 : 0;
          if (rawAmount === '') {
            nextLines[otherIndex] = { ...nextLines[otherIndex], amount: '' };
          } else {
            const parsed = parseFloat(rawAmount);
            if (!isNaN(parsed)) {
              const rem = Math.max(0, Math.round((total - parsed) * 100) / 100);
              const remStr = rem > 0 ? (Number.isInteger(rem) ? String(rem) : rem.toFixed(2)) : '0';
              nextLines[otherIndex] = { ...nextLines[otherIndex], amount: remStr };
            }
          }
        } else if (nextLines.length > 2 && targetIndex < nextLines.length - 1) {
          const lastIdx = nextLines.length - 1;
          let sumOthers = 0;
          for (let i = 0; i < lastIdx; i++) {
            const val = parseFloat(nextLines[i].amount);
            if (!isNaN(val)) sumOthers += val;
          }
          const rem = Math.max(0, Math.round((total - sumOthers) * 100) / 100);
          const remStr = rem > 0 ? (Number.isInteger(rem) ? String(rem) : rem.toFixed(2)) : '0';
          nextLines[lastIdx] = { ...nextLines[lastIdx], amount: remStr };
        }
      }

      return nextLines;
    });
  };

  const removePaymentLine = (key: string) => {
    const minLines = 1;
    setPaymentLines((prev) => {
      if (prev.length <= minLines) return prev;
      const remaining = prev.filter((line) => line.key !== key);
      if (paymentMode === 'MIX' && remaining.length >= 2) {
        const lastIdx = remaining.length - 1;
        let sumOthers = 0;
        for (let i = 0; i < lastIdx; i++) {
          const val = parseFloat(remaining[i].amount);
          if (!isNaN(val)) sumOthers += val;
        }
        const rem = Math.max(0, Math.round((total - sumOthers) * 100) / 100);
        const remStr = rem > 0 ? (Number.isInteger(rem) ? String(rem) : rem.toFixed(2)) : '0';
        remaining[lastIdx] = { ...remaining[lastIdx], amount: remStr };
      }
      return remaining;
    });
  };

  const saveDraftSale = () => {
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

    const payments =
      paymentMode === 'MIX'
        ? paymentLines
            .filter((line) => Number(line.amount) > 0)
            .map((line) => ({
              method: line.method,
              amount: Number(line.amount) || 0,
              referenceNumber: line.referenceNumber.trim() || undefined,
            }))
        : paymentBalanced
          ? [
              {
                method: paymentMode,
                amount: total,
                referenceNumber: paymentReference.trim() || undefined,
              },
            ]
          : [];

    createSaleMutation.mutate({
      ...(draftSaleId ? { saleId: draftSaleId } : {}),
      branchId,
      customerId: customerId || undefined,
      status: 'PENDING',
      services: cartServices.map((s) => ({
        serviceId: s.serviceId,
        employeeId: s.employeeId,
        unitPrice: s.price,
        discount: s.discount || undefined,
      })),
      products: cartProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        unitPrice: p.price,
        discount: p.discount || undefined,
      })),
      employees: derivedSaleEmployees,
      discount: discount || undefined,
      payments,
    });
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
      ...(draftSaleId ? { saleId: draftSaleId } : {}),
      branchId,
      customerId: customerId || undefined,
      status: 'COMPLETED',
      services: cartServices.map((s) => ({
        serviceId: s.serviceId,
        employeeId: s.employeeId,
        unitPrice: s.price,
        discount: s.discount || undefined,
      })),
      products: cartProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        unitPrice: p.price,
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

  const draftDisabled =
    createSaleMutation.isPending ||
    !branchId ||
    cartCount === 0 ||
    (cartServices.length > 0 && hasNoEmployees) ||
    cartServices.some((s) => !s.employeeId);

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
      originalPrice: s.originalPrice,
      qty: 1,
      total: s.price - (s.discount || 0),
      onRemove: () => setCartServices((prev) => prev.filter((x) => x.key !== s.key)),
      onQtyChange: null as null | ((next: number) => void),
      onEmployeeChange: (employeeId: string) => updateCartServiceEmployee(s.key, employeeId),
      onPriceChange: (nextPrice: number) => updateCartServicePrice(s.key, nextPrice),
      onResetPrice: () => updateCartServicePrice(s.key, s.originalPrice),
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
        originalPrice: p.price,
        qty: p.quantity,
        total: p.price * p.quantity - (p.discount || 0),
        onRemove: () => setCartProducts((prev) => prev.filter((x) => x.key !== p.key)),
        onQtyChange: (next: number) => {
          if (next <= 0) {
            setCartProducts((prev) => prev.filter((x) => x.key !== p.key));
            return;
          }
          const currentProd = activeProducts.find((item) => item.id === p.productId);
          const maxStock = currentProd?.stockQuantity ?? 99999;
          if (next > maxStock) return;
          setCartProducts((prev) =>
            prev.map((x) => (x.key === p.key ? { ...x, quantity: next } : x)),
          );
        },
        onEmployeeChange: null as null | ((employeeId: string) => void),
        onPriceChange: null as null | ((nextPrice: number) => void),
        onResetPrice: null as null | (() => void),
      };
    }),
  ];

  const renderMobileCartList = () => (
    <div className="pos-mobile-cart-list">
      {cartRows.map((row) => (
        <div key={row.key} className="pos-cart-card">
          <div className="pos-cart-card-header">
            <div className="pos-cart-item-info">
              <span className="pos-cart-item-icon">{row.icon}</span>
              <div className="pos-cart-item-titles">
                <span className="pos-cart-item-name">{row.name}</span>
                {row.sub && <span className="pos-cart-item-badge">{row.sub}</span>}
              </div>
            </div>
            <div className="pos-cart-card-actions">
              <span className="pos-cart-item-total">{formatMoneyAmount(row.total)}</span>
              <button
                type="button"
                className="pos-cart-remove-btn"
                aria-label={`Remove ${row.name}`}
                onClick={row.onRemove}
                title="Remove item"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="pos-cart-card-footer">
            {row.kind === 'service' && row.onEmployeeChange ? (
              <div className="pos-cart-stylist-wrapper">
                {hasNoEmployees ? (
                  <span className="pos-cart-stylist-empty">No stylist</span>
                ) : employees.length === 1 ? (
                  <div className="pos-cart-stylist-solo" title={row.employeeName}>
                    <User size={12} className="pos-cart-stylist-icon" />
                    <span className="pos-cart-stylist-text">{row.employeeName}</span>
                  </div>
                ) : (
                  <Select value={row.employeeId} onValueChange={row.onEmployeeChange}>
                    <SelectTrigger className="pos-cart-stylist-trigger" aria-label="Select stylist">
                      <div className="pos-cart-stylist-val">
                        <User size={12} className="pos-cart-stylist-icon" />
                        <span className="pos-cart-stylist-text">
                          <SelectValue placeholder="Assign stylist" />
                        </span>
                      </div>
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
            ) : (
              <div className="pos-cart-empty-spacer" />
            )}

            <div className="pos-cart-pricing-controls">
              {row.kind === 'service' && row.onPriceChange && (
                <div className="pos-cart-service-price-edit">
                  <CartItemPriceInput
                    value={row.price}
                    originalPrice={row.originalPrice}
                    onChange={row.onPriceChange}
                    onReset={row.onResetPrice}
                  />
                </div>
              )}
              {row.kind === 'product' && (
                <div className="pos-cart-product-controls">
                  <span className="pos-cart-product-unit-price">
                    @{formatMoneyAmount(row.price)}
                  </span>
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
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCartPanel = (
    className = '',
    variant: 'desktop' | 'mobile' = 'desktop',
    discountLabel = 'Discount',
  ) => (
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
            <span>{discountLabel}</span>
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
    <div className={`pos-panel ${options?.className ?? ''} ${paymentMode === 'MIX' ? 'pos-payment-mix' : ''}`.trim()}>
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

        {paymentMode === 'MIX' && (
          <button type="button" className="pos-mix-mobile-trigger" onClick={() => setMixPaymentSheetOpen(true)}>
            Edit split payment · {formatMoneyLkr(paymentRemaining)} remaining
          </button>
        )}

        <div className="pos-mix-inline">
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
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="pos-add-split-btn"
              disabled={paymentRemaining <= 0 || paymentTotal >= total}
              onClick={() => addPaymentLine()}
            >
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

        </div>

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
              onClick={() => setInvoicePreviewOpen(true)}
            >
              <Printer size={15} />
              Print Preview
            </button>
            <button
              type="button"
              className="pos-btn-outline"
              disabled={draftDisabled}
              onClick={saveDraftSale}
            >
              <FileText size={15} />
              Save Draft
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

  const renderInvoiceDocument = (saleData: {
    saleNumber: string;
    date: string;
    time: string;
    branchName: string;
    customerName: string;
    customerPhone?: string | null;
    cashierName: string;
    cashierRole: string;
    items: Array<{
      id: string;
      name: string;
      itemType: 'service' | 'product';
      stylistName?: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    payments: Array<{
      method: string;
      amount: number;
      referenceNumber?: string | null;
    }>;
    cashReceived?: string;
    changeDue?: number;
    isDraft?: boolean;
  }) => {
    return (
      <div className="pos-inv-document" id="pos-printable-invoice">
        <header className="pos-inv-header">
          <div className="pos-inv-brand">
            <PosInvoiceLogo logoUrl={salon?.logoUrl} />
            <div>
              <h2 className="pos-inv-brand-name">{salon?.name || 'Glamour Studio'}</h2>
              <p className="pos-inv-brand-tagline">HAIR · BEAUTY · SELF CARE</p>
            </div>
          </div>
          <div className="pos-inv-meta">
            <span className="pos-inv-type-label">TAX INVOICE</span>
            <p className="pos-inv-number">{saleData.saleNumber}</p>
            <p className="pos-inv-meta-row">
              Date: <strong>{saleData.date}</strong>
            </p>
            <p className="pos-inv-meta-row">
              Time: <strong>{saleData.time}</strong>
            </p>
            <span
              className={`pos-inv-status-pill ${saleData.isDraft ? 'is-draft' : 'is-paid'}`}
            >
              {saleData.isDraft ? 'DRAFT' : 'PAID'}
            </span>
          </div>
        </header>

        <div className="pos-inv-inner-body">
          <div className="pos-inv-info-grid">
            <div className="pos-inv-info-box">
              <h4>BILL TO</h4>
              <p className="pos-inv-customer-name">{saleData.customerName || 'Walk-in customer'}</p>
              <p className="pos-inv-customer-role">Customer</p>
              <p className="pos-inv-customer-phone">
                {saleData.customerPhone ? saleData.customerPhone : '—'}
              </p>
            </div>
            <div className="pos-inv-info-box">
              <h4>SALE DETAILS</h4>
              <p className="pos-inv-branch-name">{saleData.branchName}</p>
              <p className="pos-inv-branch-location">Branch location</p>
              <p className="pos-inv-cashier">
                Cashier: <strong>{saleData.cashierName}</strong>
              </p>
            </div>
          </div>

          <div className="pos-inv-table-wrapper">
            <table className="pos-inv-table">
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}>#</th>
                  <th>DESCRIPTION</th>
                  <th>TYPE</th>
                  <th>STYLIST</th>
                  <th className="num">QTY</th>
                  <th className="num">UNIT PRICE (LKR)</th>
                  <th className="num">AMOUNT (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {saleData.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="pos-inv-cell-muted">{index + 1}</td>
                    <td className="pos-inv-cell-desc">
                      <strong>{item.name}</strong>
                    </td>
                    <td>
                      <span className={`pos-inv-badge pos-inv-badge-${item.itemType}`}>
                        {item.itemType === 'service' ? 'SERVICE' : 'PRODUCT'}
                      </span>
                    </td>
                    <td className="pos-inv-cell-muted">{item.stylistName || '—'}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">{formatMoneyAmount(item.unitPrice)}</td>
                    <td className="num pos-inv-cell-total">{formatMoneyAmount(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pos-inv-summary-section">
            <div className="pos-inv-totals-box">
              <div className="pos-inv-totals-row">
                <span>Subtotal</span>
                <span>LKR {formatMoneyAmount(saleData.subtotal)}</span>
              </div>
              <div className="pos-inv-totals-row">
                <span>Discount</span>
                <span>- LKR {formatMoneyAmount(saleData.discount || 0)}</span>
              </div>
              <div className="pos-inv-grand-total-callout">
                <span>Total paid</span>
                <span>LKR {formatMoneyAmount(saleData.total)}</span>
              </div>
            </div>
          </div>

          {saleData.payments && saleData.payments.length > 0 && (
            <div className="pos-inv-payment-card">
              <h4 className="pos-inv-payment-card-title">PAYMENT BREAKDOWN</h4>
              <table className="pos-inv-payment-table">
                <thead>
                  <tr>
                    <th style={{ width: '2.5rem' }}>#</th>
                    <th>PAYMENT METHOD</th>
                    <th className="num">AMOUNT (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {saleData.payments.map((p, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{formatPaymentMethod(p.method)}</td>
                      <td className="num">{formatMoneyAmount(p.amount)}</td>
                    </tr>
                  ))}
                  <tr className="pos-inv-payment-total-row">
                    <td colSpan={2}>
                      <strong>Total Payments</strong>
                    </td>
                    <td className="num">
                      <strong>LKR {formatMoneyAmount(saleData.total)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <footer className="pos-inv-footer">
            <div>
              <p className="pos-inv-footer-thanks">Thank You!</p>
              <p className="pos-inv-footer-sub">We appreciate your visit!</p>
            </div>
            <div>
              <p className="pos-inv-footer-brand">{salon?.name || 'Glamour Studio'}</p>
              <p className="pos-inv-footer-tagline">LOOK GOOD · FEEL GOOD · ALWAYS YOU</p>
            </div>
          </footer>
        </div>
      </div>
    );
  };

  return (
    <div className="pos-page">
      <header className="pos-toolbar">
        <div className="pos-toolbar-grid">
          <div className="pos-toolbar-left">
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

            <button
              type="button"
              className="pos-btn-outline pos-draft-history-btn"
              onClick={() => setDraftHistoryOpen(true)}
            >
              <History size={15} />
              <span>Draft history</span>
            </button>
          </div>

          <div className="pos-toolbar-right">
            <div className="pos-datetime-block">
              <div className="pos-datetime-badge">
                <span className="pos-datetime-item">
                  <Calendar size={13} className="pos-datetime-icon" />
                  <span>{clock.date}</span>
                </span>
                <span className="pos-datetime-divider" aria-hidden="true">•</span>
                <span className="pos-datetime-item">
                  <Clock size={13} className="pos-datetime-icon" />
                  <span>{clock.time}</span>
                </span>
              </div>
            </div>

            {user && (
              <div className="pos-user-chip">
                <span className="pos-user-avatar">{userInitials(user.name)}</span>
                <span className="pos-user-meta">
                  <span className="pos-user-name">{user.name}</span>
                  <span className="pos-user-role">{getUserDisplayRole(user)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <Dialog open={draftHistoryOpen} onOpenChange={setDraftHistoryOpen}>
        <DialogContent
          className="pos-assign-dialog pos-draft-history-sheet sm:max-w-xl"
          style={{ maxHeight: 'calc(100dvh - 1.5rem)', overflowY: 'auto' }}
        >
          <DialogHeader>
            <DialogTitle>POS draft history</DialogTitle>
          </DialogHeader>
          {draftsLoading ? (
            <p>Loading saved drafts…</p>
          ) : posDrafts.length === 0 ? (
            <p>No saved drafts for this branch.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {posDrafts.map((draft: any) => (
                <button
                  key={draft.id}
                  type="button"
                  className="pos-btn-outline"
                  style={{ justifyContent: 'space-between', textAlign: 'left', padding: 12 }}
                  disabled={loadingDraftId !== null}
                  onClick={() => void loadDraft(draft.id)}
                >
                  <span>
                    <strong>{draft.saleNumber}</strong>
                    <span style={{ display: 'block', fontSize: 12, opacity: 0.72 }}>
                      {draft.customerName || 'Walk-in'} · {draft.branchName}
                    </span>
                  </span>
                  <span>{loadingDraftId === draft.id ? 'Loading…' : formatMoneyLkr(Number(draft.total))}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="pos-mobile-wizard">
        <nav className="pos-wizard-steps" aria-label="Sale progress">
          {(['Customer', 'Services', 'Details', 'Payment'] as const).map((label, index) => {
            const step = (index + 1) as 1 | 2 | 3 | 4;
            const completed = mobileWizardStep > step;
            return (
              <button
                key={label}
                type="button"
                className={`pos-wizard-step ${mobileWizardStep === step ? 'is-current' : ''} ${completed ? 'is-complete' : ''}`}
                onClick={() => step < mobileWizardStep && setMobileWizardStep(step)}
                disabled={step >= mobileWizardStep}
              >
                <span className="pos-wizard-step-dot">{completed ? '✓' : step}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pos-wizard-body" ref={wizardBodyRef}>
        {mobileWizardStep === 1 && (
          <section className="pos-wizard-card">
            <div className="pos-wizard-card-heading">
              <span className="pos-wizard-icon">♙</span>
              <div><h2>Select Customer</h2><p>Choose a customer for this sale</p></div>
            </div>
            <div className="pos-wizard-choice-row">
              <button
                type="button"
                className={`pos-wizard-choice ${customerMode === 'walkin' ? 'is-selected' : ''}`}
                onClick={() => {
                  setCustomerMode('walkin');
                  setCustomerId(null);
                  setCustomerName(null);
                  setCustomerPhone(null);
                  setCustomerSearch('');
                  setFormError(null);
                  setMobileWizardStep(2);
                }}
              ><strong>Walk-in</strong><span>Quick sale for walk-in customer</span></button>
              <button
                type="button"
                className={`pos-wizard-choice ${customerMode === 'registered' ? 'is-selected' : ''}`}
                onClick={() => {
                  setCustomerMode('registered');
                  if (customerId) {
                    setFormError(null);
                    setMobileWizardStep(2);
                  }
                }}
              ><strong>Registered</strong><span>Search or create customer</span></button>
            </div>
            {customerMode === 'registered' && (
              <div className="pos-wizard-customer-box">
                <label htmlFor="pos-wizard-customer-search">Search Existing Customer</label>
                <input
                  id="pos-wizard-customer-search"
                  className="pos-wizard-search"
                  type="search"
                  placeholder="Search by name, phone number or email"
                  value={customerSearch}
                  onChange={(event) => {
                    setCustomerSearch(event.target.value);
                    if (customerId) {
                      setCustomerId(null);
                      setCustomerName(null);
                      setCustomerPhone(null);
                    }
                  }}
                />
                {isCustomerSearching && <p className="pos-wizard-muted">Searching customers…</p>}
                {searchResults.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className={`pos-wizard-customer-result ${customer.id === customerId ? 'is-selected' : ''}`}
                    onClick={() => {
                      setCustomerId(customer.id);
                      setCustomerName(customer.name);
                      setCustomerPhone(customer.phone || null);
                      setCustomerSearch(customer.name);
                      setFormError(null);
                      setMobileWizardStep(2);
                    }}
                  >
                    <span className="pos-wizard-customer-initials">{userInitials(customer.name)}</span>
                    <span className="pos-wizard-customer-info"><strong>{customer.name}</strong><span>{customer.phone || 'No phone'}{customer.email ? ` · ${customer.email}` : ''}</span></span>
                    <span className="pos-wizard-radio" />
                  </button>
                ))}
                {customerSearch.trim() && !isCustomerSearching && searchResults.length === 0 && !customerId && (
                  <p className="pos-wizard-muted">No customer found. Create a new customer below.</p>
                )}
                <button type="button" className="pos-wizard-create-customer" onClick={handleOpenCreateCustomer}>
                  <span className="pos-wizard-create-plus">+</span><span><strong>Create New Customer</strong><small>Add a new customer to the system</small></span><span className="pos-wizard-chevron">›</span>
                </button>
              </div>
            )}
            <div
              className="pos-wizard-selected-customer"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setFormError(null);
                setMobileWizardStep(2);
              }}
            >
              <strong>Selected Customer</strong>
              <span>{customerName || (customerMode === 'walkin' ? 'Walk-in customer' : 'None selected')}</span>
            </div>
          </section>
        )}

        {mobileWizardStep === 2 && (
          <section className="pos-wizard-card">
            <div className="pos-wizard-card-heading">
              <span className="pos-wizard-icon">✂</span>
              <div><h2>Select Services</h2><p>Choose services and assign employees</p></div>
            </div>
            <div className="pos-wizard-catalog-tabs">
              <button type="button" className={catalogTab === 'services' ? 'is-selected' : ''} onClick={() => { setCatalogTab('services'); setCatalogSearch(''); }}>Services ({activeServices.length})</button>
              {hasInventory && (
                <button type="button" className={catalogTab === 'products' ? 'is-selected' : ''} onClick={() => { setCatalogTab('products'); setCatalogSearch(''); }}>Products ({activeProducts.length})</button>
              )}
            </div>
            <input className="pos-wizard-search" type="search" placeholder={`Search ${catalogTab}…`} value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} />
            <div className="pos-wizard-categories">
              {categories.map((category) => <button key={category} type="button" className={categoryFilter === category ? 'is-selected' : ''} onClick={() => setCategoryFilter(category)}>{category === 'ALL' ? 'All' : category}</button>)}
            </div>
            {hasNoEmployees && catalogTab === 'services' && <div className="pos-alert pos-alert-warn">Select a branch to load your stylist profile.</div>}
            <div className="pos-wizard-items">
              {catalogTab === 'services' ? filteredServices.map((service) => {
                const isSelected = cartServices.some((item) => item.serviceId === service.id);
                const isPending = pendingServiceId === service.id;
                return (
                <button key={service.id} type="button" aria-pressed={isSelected || isPending} className={`pos-wizard-item ${isSelected ? 'is-selected' : ''} ${isPending ? 'is-pending' : ''}`} disabled={hasNoEmployees} onClick={() => handleServiceAdd(service.id)}>
                  <span className="pos-wizard-item-check">{isSelected ? <Check size={17} /> : <Plus size={17} />}</span><span className="pos-wizard-item-info"><strong>{service.name}</strong><small>{service.durationMinutes ?? '—'} min</small></span><strong className="pos-wizard-item-price">LKR {formatMoneyAmount(service.price)}</strong>
                </button>
              )}) : filteredProducts.map((product) => (
                <button key={product.id} type="button" className="pos-wizard-item" disabled={(product.stockQuantity ?? 0) <= 0} onClick={() => handleProductAdd(product.id)}>
                  <span className="pos-wizard-item-check">+</span><span className="pos-wizard-item-info"><strong>{product.name}</strong><small>{product.categoryName || 'Product'} · {product.stockQuantity ?? 0} in stock</small></span><strong className="pos-wizard-item-price">LKR {formatMoneyAmount(product.sellingPrice)}</strong>
                </button>
              ))}
              {(catalogTab === 'services' ? filteredServices.length : filteredProducts.length) === 0 && <p className="pos-wizard-muted">No {catalogTab} found.</p>}
            </div>
            {cartCount > 0 && <div className="pos-wizard-selection-summary"><strong>{cartCount} item{cartCount === 1 ? '' : 's'} selected</strong><span>{formatMoneyLkr(total)}</span></div>}
          </section>
        )}

        {mobileWizardStep === 3 && (
          <section className="pos-wizard-card">
            <div className="pos-wizard-card-heading">
              <span className="pos-wizard-icon">▤</span>
              <div><h2>Sale Details</h2><p>Review selected items and adjust the sale</p></div>
            </div>
            <div className="pos-wizard-section-title"><strong>Selected Items</strong><span>{cartCount} items</span></div>
            {renderCartPanel('pos-wizard-cart', 'mobile', 'Discount amount')}
          </section>
        )}

        {mobileWizardStep === 4 && (
          <section className="pos-wizard-card">
            <div className="pos-wizard-card-heading">
              <span className="pos-wizard-icon">▣</span>
              <div><h2>Payment</h2><p>Review the total and complete the sale</p></div>
            </div>
            <div className="pos-wizard-payment-summary">
              <div className="pos-wizard-section-title"><strong>Order Summary</strong><span>{cartCount} items</span></div>
              {cartRows.map((row) => <div className="pos-wizard-summary-row" key={row.key}><span><strong>{row.name}</strong><small>{row.kind === 'service' ? row.employeeName || row.sub : `Qty ${row.qty}`}</small></span><b>{formatMoneyLkr(row.total)}</b></div>)}
              <div className="pos-wizard-summary-adjustment"><span>Subtotal</span><b>{formatMoneyLkr(subtotal)}</b></div>
              {discount > 0 && <div className="pos-wizard-summary-adjustment is-discount"><span>Discount applied</span><b>− {formatMoneyLkr(discount)}</b></div>}
              <div className="pos-wizard-summary-total"><strong>Total</strong><strong>{formatMoneyLkr(total)}</strong></div>
            </div>
            {renderPaymentPanel({ hideActions: true, className: 'pos-wizard-payment-panel' })}
          </section>
        )}

        {formError && <div className="pos-alert pos-alert-error pos-wizard-error">{formError}</div>}
        </div>

        <footer className={`pos-wizard-footer ${mobileWizardStep === 1 ? 'is-step-1' : ''}`}>
          <button
            type="button"
            className="pos-wizard-save"
            disabled={draftDisabled}
            onClick={saveDraftSale}
          >
            <FileText size={17} /> Save Draft
          </button>
          {mobileWizardStep === 1 ? (
            <button
              type="button"
              className="pos-wizard-continue"
              onClick={() => {
                setFormError(null);
                setMobileWizardStep(2);
              }}
            >
              Continue to Services <span>→</span>
            </button>
          ) : mobileWizardStep < 4 ? (
            <button
              type="button"
              className="pos-wizard-continue"
              disabled={(mobileWizardStep === 2 || mobileWizardStep === 3) && cartCount === 0}
              onClick={() => {
                setFormError(null);
                setMobileWizardStep((mobileWizardStep + 1) as 2 | 3 | 4);
              }}
            >
              {mobileWizardStep === 2 ? 'Continue to Details' : 'Continue to Payment'} <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              className="pos-wizard-continue"
              disabled={completeDisabled}
              onClick={completeSale}
            >
              {createSaleMutation.isPending ? 'Processing…' : 'Complete Sale'} <span>→</span>
            </button>
          )}
        </footer>
      </main>

      <section className="pos-customer-panel">
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
                setCustomerSearch('');
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
                placeholder="Search customer by name, phone…"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
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
                onClick={handleOpenCreateCustomer}
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
                  setCustomerSearch('');
                }}
              >
                ×
              </button>
            </span>
          )}
        </div>

        {customerMode === 'registered' && customerSearch.trim().length >= 1 && !customerId && searchResults.length > 0 && (
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
                  setCustomerSearch(c.name);
                }}
              >
                <strong>{c.name}</strong>
                {c.phone ? <span style={{ marginLeft: 6, color: '#64748b' }}>· {c.phone}</span> : null}
              </button>
            ))}
          </div>
        )}

        {customerMode === 'registered' && customerSearch.trim().length >= 1 && !customerId && !isCustomerSearching && searchResults.length === 0 && (
          <p className="pos-customer-hint">No customer found — tap + New to create one.</p>
        )}
      </section>

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
              {hasInventory && (
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
              )}
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

          <div className="pos-catalog-section-head">
            <h2>{catalogTab === 'services' ? 'Services' : 'Products'}</h2>
            <span>
              {catalogTab === 'services' ? filteredServices.length : filteredProducts.length} items
            </span>
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
                    className={`pos-item-card pos-service-card ${pendingServiceId === s.id ? 'pos-item-card-selected' : ''}`}
                    disabled={hasNoEmployees}
                    onClick={() => handleServiceAdd(s.id)}
                  >
                    <span className="pos-card-add-icon">
                      <Plus size={14} />
                    </span>
                    <div className="pos-item-thumb">✂️</div>
                    <div className="pos-item-info">
                      <div className="pos-item-name">{s.name}</div>
                      <div className="pos-item-price-row">
                        <span className="pos-item-price">LKR {formatMoneyAmount(s.price)}</span>
                        <span className="pos-service-duration">
                          {s.durationMinutes == null ? '—' : `${s.durationMinutes} min`}
                        </span>
                      </div>
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
                filteredProducts.map((p) => {
                  const stockQty = p.stockQuantity ?? 0;
                  const isOutOfStock = stockQty <= 0;
                  const isLowStock = stockQty > 0 && stockQty <= 3;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`pos-item-card ${isOutOfStock ? 'pos-item-card-disabled pos-item-card-out-of-stock' : ''}`}
                      disabled={isOutOfStock}
                      onClick={() => !isOutOfStock && handleProductAdd(p.id)}
                    >
                      <span className="pos-card-add-icon">
                        <Plus size={14} />
                      </span>
                      <div className="pos-item-thumb">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="pos-item-thumb-img" />
                        ) : (
                          '🧴'
                        )}
                      </div>
                      <div className="pos-item-info">
                        <div className="pos-item-name">{p.name}</div>
                        <div className="pos-item-meta">{p.categoryName || 'Product'}</div>
                        <div className="pos-item-price-row">
                          <span className="pos-item-price">LKR {formatMoneyAmount(p.sellingPrice)}</span>
                          {isOutOfStock ? (
                            <span className="pos-item-stock-tag pos-out-of-stock">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="pos-item-stock-tag pos-low-stock">Low Stock</span>
                          ) : (
                            <span className="pos-item-stock-tag pos-in-stock">In Stock</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
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
              <div className="pos-sheet-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="pos-btn-outline"
                  style={{ flex: 1, padding: '0.65rem', justifyContent: 'center' }}
                  onClick={saveDraftSale}
                  disabled={draftDisabled}
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  className="pos-sheet-primary-btn"
                  style={{ flex: 2, justifyContent: 'center' }}
                  onClick={completeSale}
                  disabled={completeDisabled}
                >
                  {createSaleMutation.isPending ? 'Processing…' : `Complete · ${formatMoneyLkr(total)}`}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={mixPaymentSheetOpen} onOpenChange={setMixPaymentSheetOpen}>
        <DialogContent className="pos-mix-sheet sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Split payment</DialogTitle>
            <p className="pos-mix-sheet-description">Add payment methods until the total is covered.</p>
          </DialogHeader>
          <div className="pos-mix-sheet-body">
            <div className="pos-split-list">
              {paymentLines.map((line) => (
                <div key={line.key} className="pos-split-row">
                  <select
                    aria-label="Payment method"
                    value={line.method}
                    onChange={(event) => updatePaymentLine(line.key, { method: event.target.value as PayMethod })}
                  >
                    {SPLIT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                  </select>
                  <input
                    aria-label={`${line.method} amount`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={line.amount}
                    onChange={(event) => updatePaymentLine(line.key, { amount: event.target.value })}
                  />
                  <button type="button" className="pos-split-remove" aria-label="Remove payment line" onClick={() => removePaymentLine(line.key)}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="pos-add-split-btn" disabled={paymentRemaining <= 0 || paymentTotal >= total} onClick={() => addPaymentLine()}>
              + Add payment line
            </button>
            <div className={`pos-pay-summary ${paymentBalanced ? 'is-ok' : paymentTotal > total ? 'is-error' : ''}`}>
              <span>Paid {formatMoneyLkr(paymentTotal)}</span>
              <span>{paymentRemaining > 0 ? `Remaining ${formatMoneyLkr(paymentRemaining)}` : 'Fully allocated'}</span>
            </div>
            {showCashFields && (
              <div className="pos-pay-fields">
                <div className="pos-field">
                  <label htmlFor="pos-mix-cash-received">Amount received in cash</label>
                  <input id="pos-mix-cash-received" type="number" min="0" step="0.01" value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} placeholder={cashLineTotal.toFixed(2)} />
                </div>
                <div className="pos-field">
                  <label htmlFor="pos-mix-change">Change</label>
                  <input id="pos-mix-change" readOnly value={formatMoneyAmount(changeDue)} />
                </div>
              </div>
            )}
          </div>
          <div className="pos-mix-sheet-footer">
            <button type="button" className="pos-mix-done" onClick={() => setMixPaymentSheetOpen(false)}>Done</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingService && hasMultipleEmployees}
        onOpenChange={(open) => {
          if (!open) {
            setPendingServiceId('');
            setAssignEmployeeSearch('');
          }
        }}
      >
        <DialogContent className="pos-assign-sheet w-[min(28rem,calc(100%-1.5rem))] max-w-[calc(100%-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-border/80 shadow-2xl rounded-2xl bg-card">
          <DialogHeader className="p-5 pb-3 sm:p-6 sm:pb-4 border-b border-border/60 bg-muted/20 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Assign Stylist
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Select who performed this service
                </DialogDescription>
              </div>
            </div>

            {pendingService && (
              <div className="mt-3.5 flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border/80 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {pendingService.name}
                    </div>
                    {pendingService.categoryName && (
                      <div className="text-xs text-muted-foreground truncate">
                        {pendingService.categoryName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                    {formatMoneyLkr(pendingService.price)}
                  </Badge>
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="p-5 pt-3 sm:p-6 sm:pt-4 space-y-3">
            {employees.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search stylist by name or role..."
                  value={assignEmployeeSearch}
                  onChange={(e) => setAssignEmployeeSearch(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs sm:text-sm rounded-lg bg-background"
                  autoFocus={false}
                />
                {assignEmployeeSearch && (
                  <button
                    type="button"
                    onClick={() => setAssignEmployeeSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1.5 max-h-[48vh] sm:max-h-[280px] overflow-y-auto pr-1">
              {filteredAssignEmployees.length === 0 ? (
                <div className="py-8 text-center text-xs sm:text-sm text-muted-foreground">
                  No stylists found matching "{assignEmployeeSearch}"
                </div>
              ) : (
                filteredAssignEmployees.map((e) => {
                  const initials = e.name
                    .split(' ')
                    .map((p: string) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        addServiceToCart(pendingService!.id, e.id);
                        setAssignEmployeeSearch('');
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-primary/50 bg-background hover:bg-primary/5 active:scale-[0.99] transition-all duration-150 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/80 to-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ring-2 ring-background">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {e.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-muted-foreground truncate">
                              {e.designation || e.code || 'Stylist'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-5 pt-0 sm:pt-0 flex items-center justify-end gap-2 border-t border-border/40 bg-muted/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm rounded-lg"
              onClick={() => {
                setPendingServiceId('');
                setAssignEmployeeSearch('');
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SimpleFormDialog
        open={createCustomerOpen}
        onOpenChange={handleCloseCreateCustomer}
        title="New Customer"
        className="pos-new-customer-modal"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setNewCustomerError(null);
            createCustomerMutation.mutate({
              name: newCustomerForm.name.trim(),
              phone: newCustomerForm.phone.trim(),
              email: newCustomerForm.email.trim() || undefined,
            });
          }}
        >
          <FormError message={newCustomerError} />
          <div className="pos-field">
            <Label htmlFor="pos-cust-name">Full name</Label>
            <Input
              id="pos-cust-name"
              placeholder="e.g. Namal Fernando"
              value={newCustomerForm.name}
              onChange={(e) => {
                setNewCustomerError(null);
                setNewCustomerForm({ ...newCustomerForm, name: e.target.value });
              }}
              required
            />
          </div>
          <div className="pos-field">
            <Label htmlFor="pos-cust-phone">Phone</Label>
            <Input
              id="pos-cust-phone"
              placeholder="e.g. 0771234567"
              value={newCustomerForm.phone}
              onChange={(e) => {
                setNewCustomerError(null);
                setNewCustomerForm({ ...newCustomerForm, phone: e.target.value });
              }}
              required
            />
          </div>
          <div className="pos-field">
            <Label htmlFor="pos-cust-email">Email (optional)</Label>
            <Input
              id="pos-cust-email"
              type="email"
              placeholder="e.g. customer@example.com"
              value={newCustomerForm.email}
              onChange={(e) => {
                setNewCustomerError(null);
                setNewCustomerForm({ ...newCustomerForm, email: e.target.value });
              }}
            />
          </div>
          <Button
            type="submit"
            className="pos-customer-submit w-full"
            disabled={createCustomerMutation.isPending}
          >
            {createCustomerMutation.isPending ? 'Saving…' : 'Add Customer'}
          </Button>
        </SimpleForm>
      </SimpleFormDialog>

      {/* Draft Invoice Preview Modal */}
      <Dialog open={invoicePreviewOpen} onOpenChange={setInvoicePreviewOpen}>
        <DialogContent className="pos-inv-dialog-content sm:max-w-3xl">
          <div className="pos-inv-preview-header">
            <div className="pos-inv-preview-title">
              <FileText size={20} className="text-primary" />
              <span>Invoice Preview</span>
            </div>
            <div className="pos-inv-preview-actions">
              <button
                type="button"
                className="pos-inv-btn-outline pos-inv-close-btn"
                onClick={() => {
                  setInvoicePreviewOpen(false);
                  clearCart();
                }}
                aria-label="Close invoice preview"
              >
                <X size={16} />
                <span>Close</span>
              </button>
              <button
                type="button"
                className="pos-inv-btn-primary"
                onClick={() => printReceipt('pos-printable-invoice')}
              >
                <Printer size={15} />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
          <div className="pos-inv-preview-body">
            {renderInvoiceDocument({
              saleNumber: 'PREVIEW-' + clock.time.replace(':', ''),
              date: clock.date,
              time: clock.time,
              branchName: activeBranches.find((b) => b.id === branchId)?.name || 'Main Branch',
              customerName: customerName || 'Walk-in customer',
              customerPhone: customerPhone || null,
              cashierName: user?.name || 'Staff',
              cashierRole: getUserDisplayRole(user),
              items: [
                ...cartServices.map((s) => ({
                  id: s.key,
                  name: s.serviceName,
                  itemType: 'service' as const,
                  stylistName: s.employeeName,
                  quantity: 1,
                  unitPrice: s.price,
                  total: s.price - (s.discount || 0),
                })),
                ...cartProducts.map((p) => ({
                  id: p.key,
                  name: p.productName,
                  itemType: 'product' as const,
                  quantity: p.quantity,
                  unitPrice: p.price,
                  total: p.price * p.quantity - (p.discount || 0),
                })),
              ],
              subtotal,
              discount,
              total,
              payments:
                paymentMode === 'MIX'
                  ? paymentLines
                      .filter((l) => Number(l.amount) > 0)
                      .map((l) => ({
                        method: l.method,
                        amount: Number(l.amount) || 0,
                        referenceNumber: l.referenceNumber.trim() || null,
                      }))
                  : [
                      {
                        method: paymentMode,
                        amount: total,
                        referenceNumber: paymentReference.trim() || null,
                      },
                    ],
              cashReceived:
                (paymentMode === 'CASH' || paymentLines.some((p) => p.method === 'CASH')) && cashReceived
                  ? cashReceived
                  : undefined,
              changeDue: changeDue > 0 ? changeDue : undefined,
              isDraft: true,
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Completed Sale Receipt & Print Modal */}
      <Dialog
        open={completedModalOpen}
        onOpenChange={(open) => {
          if (!open) setCompletedModalOpen(false);
        }}
      >
        <DialogContent className="pos-inv-dialog-content sm:max-w-3xl">
          <div className="pos-inv-preview-header">
            <div className="pos-inv-preview-title">
              <CheckCircle2
                size={20}
                className={completedSale?.status === 'PENDING' ? 'text-amber-500' : 'text-emerald-600'}
              />
              <span>
                {completedSale?.status === 'PENDING' ? 'Draft Transaction Saved' : 'Sale Completed'}
              </span>
            </div>
            <div className="pos-inv-preview-actions">
              <button
                type="button"
                className="pos-inv-btn-outline pos-inv-close-btn"
                onClick={() => {
                  setCompletedModalOpen(false);
                  clearCart();
                }}
                aria-label="Close completed invoice"
              >
                <X size={16} />
                <span>Close</span>
              </button>
              <button
                type="button"
                className="pos-inv-btn-primary"
                onClick={() => printReceipt('pos-printable-invoice')}
              >
                <Printer size={15} />
                <span>Print Invoice</span>
              </button>
              {completedSale && (
                <button
                  type="button"
                  className="pos-inv-btn-secondary"
                  onClick={() => setSendEbillOpen(true)}
                >
                  <Send size={14} />
                  <span>Send E-Bill</span>
                </button>
              )}
              {completedSale && (
                <button
                  type="button"
                  className="pos-inv-btn-outline"
                  onClick={() => navigate(`/salon/sales/${completedSale.id}`)}
                >
                  <Eye size={14} />
                  <span>View Details</span>
                </button>
              )}
            </div>
          </div>
          <div className="pos-inv-preview-body">
            <div
              className="pos-inv-success-banner"
              style={
                completedSale?.status === 'PENDING'
                  ? { background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }
                  : undefined
              }
            >
              <CheckCircle2
                size={22}
                className={completedSale?.status === 'PENDING' ? 'text-amber-500' : 'text-emerald-600'}
              />
              <div>
                <div>
                  {completedSale?.status === 'PENDING'
                    ? 'Draft Transaction Recorded'
                    : 'Transaction Completed Successfully'}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 400, opacity: 0.9 }}>
                  {completedSale?.status === 'PENDING'
                    ? `Sale #${completedSale?.saleNumber} has been saved as a draft. Open Draft history in POS to load and complete it.`
                    : `Sale #${completedSale?.saleNumber} has been recorded. You can print the receipt below.`}
                </div>
              </div>
            </div>
            {completedSale &&
              renderInvoiceDocument({
                ...completedSale,
                isDraft: completedSale.status === 'PENDING',
              })}
          </div>
        </DialogContent>
      </Dialog>

      {completedSale && (
        <SendEbillModal
          open={sendEbillOpen}
          onOpenChange={setSendEbillOpen}
          saleId={completedSale.id}
          customerName={completedSale.customerName}
          defaultPhone={completedSale.customerPhone || undefined}
        />
      )}
    </div>
  );
}
