import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  Truck,
  DollarSign,
  AlertCircle,
  Save,
  CheckCircle2,
  HelpCircle,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { tenantApi, type Branch, type Product, type ProductCategory } from '@/api/tenant.api';
import type {
  Supplier,
  GRNPaymentOption,
  CreateGRNInput,
  UpdateGRNInput,
} from '@/types/supplier.types';
import { OpsPageHeader, OpsLoading, getErrorMessage } from './salon-ops-ui';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface FormItemRow {
  id: string; // temporary client id
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitCost: number;
}

export default function GrnFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // In-place Product Creation state
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [createProductError, setCreateProductError] = useState<string | null>(null);
  const [targetRowIndex, setTargetRowIndex] = useState<number | null>(null);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    categoryId: '',
    unit: 'Item',
    costPrice: '',
    sellingPrice: '',
    description: '',
  });

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Items rows
  const [items, setItems] = useState<FormItemRow[]>([
    {
      id: '1',
      productId: '',
      productName: '',
      productCode: '',
      quantity: 1,
      unitCost: 0,
    },
  ]);

  // Initial Payment (Creation only)
  const [paymentOption, setPaymentOption] = useState<GRNPaymentOption>('CREDIT');
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  // Initial Data loading
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [supRes, branchRes, prodRes, catRes] = await Promise.all([
          suppliersApi.getSuppliers({ limit: 100, status: 'ACTIVE' }),
          tenantApi.branches.list(),
          tenantApi.products.list(),
          tenantApi.productCategories.list().catch(() => []),
        ]);

        const sups = Array.isArray(supRes) ? supRes : supRes.data || [];
        const brs = Array.isArray(branchRes) ? branchRes : [];
        const prods = Array.isArray(prodRes) ? prodRes : [];
        const cats = Array.isArray(catRes) ? catRes : (catRes as any)?.data || [];

        setSuppliers(sups);
        setBranches(brs);
        setProducts(prods);
        setCategories(cats);

        // Default branch selection
        if (!isEdit && brs.length > 0) {
          setBranchId(brs[0].id);
        }

        // If editing existing GRN
        if (isEdit && id) {
          const grn = await suppliersApi.getGrn(id);
          if (grn.grnStatus !== 'DRAFT') {
            setError('Only DRAFT GRNs can be edited.');
            return;
          }

          setSupplierId(grn.supplierId);
          setBranchId(grn.branchId);
          setSupplierInvoiceNumber(grn.supplierInvoiceNumber || '');
          setGrnDate(grn.grnDate ? grn.grnDate.split('T')[0] : '');
          setDueDate(grn.dueDate ? grn.dueDate.split('T')[0] : '');
          setNotes(grn.notes || '');
          setDiscountAmount(Number(grn.discountAmount) || 0);

          if (grn.items && grn.items.length > 0) {
            setItems(
              grn.items.map((it, idx) => ({
                id: String(idx + 1),
                productId: it.productId,
                productName: it.productName,
                productCode: it.productCode,
                quantity: Number(it.quantity) || 1,
                unitCost: Number(it.unitCost) || 0,
              })),
            );
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load form metadata'));
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, isEdit]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, row) => acc + (Number(row.quantity) || 0) * (Number(row.unitCost) || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - (Number(discountAmount) || 0));
  }, [subtotal, discountAmount]);

  // Sync initial payment default if full payment is selected
  useEffect(() => {
    if (paymentOption !== 'CREDIT' && initialPaidAmount === 0 && totalAmount > 0) {
      setInitialPaidAmount(totalAmount);
    }
  }, [paymentOption, totalAmount]);

  // Row item actions
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        productId: '',
        productName: '',
        productCode: '',
        quantity: 1,
        unitCost: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      return; // Keep at least 1 row
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, pId: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code || '',
        unitCost: Number(prod.costPrice) || Number(prod.sellingPrice) || copy[index].unitCost || 0,
      };
      return copy;
    });
  };

  const handleQuantityChange = (index: number, val: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity: Math.max(1, val),
      };
      return copy;
    });
  };

  const handleCostChange = (index: number, val: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        unitCost: Math.max(0, val),
      };
      return copy;
    });
  };

  const openCreateProductModal = (rowIndex?: number) => {
    const rowCost =
      rowIndex !== undefined && items[rowIndex]?.unitCost
        ? String(items[rowIndex].unitCost)
        : '';
    setNewProductForm({
      name: '',
      categoryId: '',
      unit: 'Item',
      costPrice: rowCost,
      sellingPrice: rowCost ? String(Math.round(Number(rowCost) * 1.3)) : '',
      description: '',
    });
    setCreateProductError(null);
    setTargetRowIndex(rowIndex !== undefined ? rowIndex : null);
    setCreateProductOpen(true);
  };

  const handleCreateProductSubmit = async () => {
    const trimmedName = newProductForm.name.trim();
    if (!trimmedName) {
      setCreateProductError('Product name is required.');
      return;
    }
    const cost = Number(newProductForm.costPrice) || 0;
    const sell = Number(newProductForm.sellingPrice) || 0;
    if (cost < 0 || sell < 0) {
      setCreateProductError('Cost and selling prices cannot be negative.');
      return;
    }

    try {
      setCreatingProduct(true);
      setCreateProductError(null);

      const activeBranchIds = branchId ? [branchId] : branches.map((b) => b.id);
      const payload: Record<string, unknown> = {
        name: trimmedName,
        unit: newProductForm.unit.trim() || 'Item',
        costPrice: cost,
        sellingPrice: sell > 0 ? sell : cost,
        description: newProductForm.description.trim() || undefined,
        categoryId: newProductForm.categoryId || undefined,
        branchIds: activeBranchIds.length > 0 ? activeBranchIds : undefined,
      };

      const res = await tenantApi.products.create(payload);
      const createdId = res?.id;

      // Re-fetch products to ensure full object synchronization
      const freshProducts = await tenantApi.products.list();
      const prodsList = Array.isArray(freshProducts) ? freshProducts : [];
      setProducts(prodsList);

      const createdProd =
        prodsList.find((p) => p.id === createdId) ||
        prodsList.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());

      const prodId = createdProd?.id || createdId || '';
      const prodName = createdProd?.name || trimmedName;
      const prodCode = createdProd?.code || '';
      const prodUnitCost = cost > 0 ? cost : Number(createdProd?.costPrice) || 0;

      if (targetRowIndex !== null && items[targetRowIndex]) {
        // Apply directly to the row that requested creation
        setItems((prev) => {
          const copy = [...prev];
          copy[targetRowIndex] = {
            ...copy[targetRowIndex],
            productId: prodId,
            productName: prodName,
            productCode: prodCode,
            unitCost: prodUnitCost,
          };
          return copy;
        });
      } else {
        // Check for first empty row or append new row
        const firstEmptyIdx = items.findIndex((it) => !it.productId);
        if (firstEmptyIdx !== -1) {
          setItems((prev) => {
            const copy = [...prev];
            copy[firstEmptyIdx] = {
              ...copy[firstEmptyIdx],
              productId: prodId,
              productName: prodName,
              productCode: prodCode,
              unitCost: prodUnitCost,
            };
            return copy;
          });
        } else {
          setItems((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              productId: prodId,
              productName: prodName,
              productCode: prodCode,
              quantity: 1,
              unitCost: prodUnitCost,
            },
          ]);
        }
      }

      setCreateProductOpen(false);
      toast.success(`Product "${trimmedName}" created and added to GRN!`);
    } catch (err) {
      setCreateProductError(getErrorMessage(err, 'Failed to create product'));
    } finally {
      setCreatingProduct(false);
    }
  };

  const validateForm = () => {
    if (!supplierId) {
      setError('Please select a supplier.');
      return false;
    }
    if (!branchId) {
      setError('Please select a branch.');
      return false;
    }
    if (!grnDate) {
      setError('Please enter the GRN date.');
      return false;
    }
    if (items.length === 0 || items.some((it) => !it.productId || it.quantity <= 0)) {
      setError('Please ensure all items have a selected product and valid quantity (>= 1).');
      return false;
    }
    if (totalAmount <= 0) {
      setError('Total amount must be greater than 0.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (receiveImmediately: boolean) => {
    setError(null);
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const itemsDto = items.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost),
      }));

      if (isEdit && id) {
        const updatePayload: UpdateGRNInput = {
          supplierId,
          branchId,
          supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
          grnDate,
          dueDate: dueDate || undefined,
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || undefined,
          items: itemsDto,
        };

        await suppliersApi.updateGrn(id, updatePayload);

        if (receiveImmediately) {
          await suppliersApi.receiveGrn(id);
        }

        navigate(`/salon/grns/${id}`);
      } else {
        const createPayload: CreateGRNInput = {
          supplierId,
          branchId,
          supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
          grnDate,
          dueDate: dueDate || undefined,
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || undefined,
          items: itemsDto,
          status: receiveImmediately ? 'RECEIVED' : 'DRAFT',
          paymentMethod: receiveImmediately ? paymentOption : undefined,
          paidAmount:
            receiveImmediately && paymentOption !== 'CREDIT' ? Number(initialPaidAmount) : undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          bankName: bankName.trim() || undefined,
          chequeNumber: chequeNumber.trim() || undefined,
          chequeDate: chequeDate || undefined,
        };

        const created = await suppliersApi.createGrn(createPayload);
        navigate(`/salon/grns/${created.id}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save GRN'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <OpsLoading />;
  }

  return (
    <div className="emp-page space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back
        </Button>
      </div>

      <OpsPageHeader
        title={isEdit ? 'Edit Draft GRN / Purchase' : 'Create New GRN / Purchase'}
        subtitle={
          isEdit
            ? 'Update draft details and items before receiving into stock.'
            : 'Record received inventory, vendor invoices, item purchase costs, and payment terms.'
        }
      />

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="space-y-6">
        {/* Section 1: Header / Supplier Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b pb-3">
            <Truck className="h-5 w-5 text-primary" /> 1. Supplier & Invoice Details
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Supplier *
              </Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Destination Branch *
              </Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Supplier Invoice / Bill #
              </Label>
              <Input
                placeholder="e.g. INV-98432"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                GRN / Purchase Date *
              </Label>
              <Input
                type="date"
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Payment Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Notes / Reference
              </Label>
              <Input
                placeholder="Optional purchase notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Items Table */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> 2. Purchased Items & Stock Intake
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select existing products or create a brand new product right here without leaving this page.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openCreateProductModal()}
                className="flex items-center gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 font-medium"
              >
                <PlusCircle size={15} /> New Product
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="flex items-center gap-1.5"
              >
                <Plus size={15} /> Add Item Row
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2.5 min-w-[300px]">Product / Item *</th>
                  <th className="px-3 py-2.5 w-[140px] text-right">Quantity *</th>
                  <th className="px-3 py-2.5 w-[160px] text-right">Unit Cost (Rs.) *</th>
                  <th className="px-3 py-2.5 w-[160px] text-right">Line Total (Rs.)</th>
                  <th className="px-3 py-2.5 w-[60px] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row, idx) => {
                  const lineTotal = (Number(row.quantity) || 0) * (Number(row.unitCost) || 0);
                  return (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 min-w-0">
                            <Select
                              value={row.productId}
                              onValueChange={(val) => {
                                if (val === '__new_product__') {
                                  openCreateProductModal(idx);
                                } else {
                                  handleProductSelect(idx, val);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="-- Select Product --" />
                              </SelectTrigger>
                              <SelectContent className="max-h-64">
                                <SelectItem
                                  value="__new_product__"
                                  className="text-emerald-700 font-semibold bg-emerald-50/80 hover:bg-emerald-100 cursor-pointer border-b mb-1 focus:bg-emerald-100"
                                >
                                  + Create New Product...
                                </SelectItem>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} {p.code ? `[${p.code}]` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Create new product for this row"
                            onClick={() => openCreateProductModal(idx)}
                            className="h-9 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80 shrink-0"
                          >
                            <Plus size={13} className="mr-0.5" /> New
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          step="any"
                          className="text-right font-mono"
                          value={row.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="text-right font-mono"
                          value={row.unitCost}
                          onChange={(e) => handleCostChange(idx, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                        {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(idx)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Another Item
            </Button>
          </div>
        </div>

        {/* Section 3: Summary Totals */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2 border-b pb-3">
            <DollarSign className="h-5 w-5 text-primary" /> 3. Calculation & Financial Totals
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <HelpCircle size={14} /> Inventory & Stock Notice:
                </div>
                <p>• Clicking <strong>"Save as Draft"</strong> saves your invoice without touching stock.</p>
                <p>• Clicking <strong>"Receive & Update Stock"</strong> automatically adds quantities to branch inventory and records a verified Goods Received transaction.</p>
              </div>
            </div>

            <div className="space-y-3 bg-muted/20 p-4 rounded-lg border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Items Subtotal:</span>
                <span className="font-mono font-medium">Rs. {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Discount / Deductions:</span>
                <div className="w-36">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="text-right h-8 font-mono"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between items-center text-lg font-bold">
                <span className="text-foreground">Grand Total:</span>
                <span className="font-mono text-primary">Rs. {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Immediate Payment Terms (Only available on creation) */}
        {!isEdit && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2 border-b pb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> 4. Initial Payment Settlement (Optional on Receive)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Payment Option
                </Label>
                <Select
                  value={paymentOption}
                  onValueChange={(val) => setPaymentOption(val as GRNPaymentOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDIT">Full Credit (Pay Later)</SelectItem>
                    <SelectItem value="CASH">Cash Settlement</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentOption !== 'CREDIT' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Amount Paying Now (Rs.) *
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="font-mono"
                      value={initialPaidAmount}
                      onChange={(e) => setInitialPaidAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {paymentOption === 'BANK_TRANSFER' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        Transfer Reference #
                      </Label>
                      <Input
                        placeholder="e.g. TXN-78461"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                  )}

                  {paymentOption === 'CHEQUE' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">
                          Bank Name *
                        </Label>
                        <Input
                          placeholder="e.g. Commercial Bank"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">
                          Cheque Number *
                        </Label>
                        <Input
                          placeholder="e.g. CHQ-001928"
                          value={chequeNumber}
                          onChange={(e) => setChequeNumber(e.target.value)}
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
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {submitting ? 'Saving...' : 'Save as Draft'}
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CheckCircle2 size={16} />
            {submitting ? 'Processing...' : 'Receive & Update Stock'}
          </Button>
        </div>
      </div>

      {/* In-Place Quick Product Creation Dialog */}
      <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Quick Create Product
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-2">
            Add a new product into your catalog without leaving this GRN. It will automatically be selected in this row.
          </p>

          {createProductError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{createProductError}</span>
            </div>
          )}

          <div className="space-y-3.5 py-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                placeholder="e.g. L'Oréal Pro Scalp Treatment 250ml"
                value={newProductForm.name}
                onChange={(e) =>
                  setNewProductForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={newProductForm.categoryId}
                  onValueChange={(val) =>
                    setNewProductForm((prev) => ({ ...prev, categoryId: val }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Unit of Measure *</Label>
                <Select
                  value={newProductForm.unit}
                  onValueChange={(val) =>
                    setNewProductForm((prev) => ({ ...prev, unit: val }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Item">Item</SelectItem>
                    <SelectItem value="Bottle">Bottle</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Pack">Pack</SelectItem>
                    <SelectItem value="Tube">Tube</SelectItem>
                    <SelectItem value="Pcs">Pcs</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Purchase / Cost Price (Rs.) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="font-mono text-right"
                  value={newProductForm.costPrice}
                  onChange={(e) => {
                    const cVal = e.target.value;
                    setNewProductForm((prev) => ({
                      ...prev,
                      costPrice: cVal,
                      sellingPrice:
                        prev.sellingPrice === '' && cVal
                          ? String(Math.round(Number(cVal) * 1.3))
                          : prev.sellingPrice,
                    }));
                  }}
                />
                <span className="text-[10px] text-muted-foreground">Pre-fills GRN item cost</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Retail Selling Price (Rs.) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="font-mono text-right"
                  value={newProductForm.sellingPrice}
                  onChange={(e) =>
                    setNewProductForm((prev) => ({ ...prev, sellingPrice: e.target.value }))
                  }
                />
                <span className="text-[10px] text-muted-foreground">Price charged to clients</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Description (Optional)</Label>
              <Input
                placeholder="Product barcode, SKU note or usage details"
                value={newProductForm.description}
                onChange={(e) =>
                  setNewProductForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={creatingProduct}
              onClick={() => setCreateProductOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={creatingProduct || !newProductForm.name.trim()}
              onClick={handleCreateProductSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {creatingProduct ? 'Creating...' : 'Create & Select Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
