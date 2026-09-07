import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi, type Customer, type Product, type Service } from '@/api/tenant.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';

interface CartService {
  key: string;
  serviceId: string;
  serviceName: string;
  price: number;
  employeeId: string;
  employeeName: string;
  discount: number;
}

interface CartProduct {
  key: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  discount: number;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [cartServices, setCartServices] = useState<CartService[]>([]);
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);
  const [saleDiscount, setSaleDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'>(
    'CASH',
  );
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const [addServiceId, setAddServiceId] = useState('');
  const [addServiceEmployeeId, setAddServiceEmployeeId] = useState('');
  const [addProductId, setAddProductId] = useState('');
  const [addProductQty, setAddProductQty] = useState('1');

  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => tenantApi.employees.list({ status: 'ACTIVE' }),
  });

  const soleEmployee = employees.length === 1 ? employees[0] : null;
  const hasMultipleEmployees = employees.length > 1;
  const hasNoEmployees = employees.length === 0;

  useEffect(() => {
    if (soleEmployee) {
      setAddServiceEmployeeId(soleEmployee.id);
    }
  }, [soleEmployee]);

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

  const { data: searchResults = [] } = useQuery({
    queryKey: ['customer-search', phoneSearch],
    queryFn: () => tenantApi.customers.search({ phone: phoneSearch }),
    enabled: phoneSearch.length >= 3,
  });

  const createCustomerMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: (customer: Customer) => {
      setCustomerId(customer.id);
      setCustomerName(customer.name);
      setPhoneSearch(customer.phone || '');
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: tenantApi.pos.createSale,
    onSuccess: (sale: { id: string }) => {
      navigate(`/salon/sales/${sale.id}`);
    },
  });

  const subtotal = useMemo(() => {
    const svcTotal = cartServices.reduce((sum, s) => sum + s.price - s.discount, 0);
    const prodTotal = cartProducts.reduce((sum, p) => sum + p.price * p.quantity - p.discount, 0);
    return svcTotal + prodTotal;
  }, [cartServices, cartProducts]);

  const discount = Number(saleDiscount) || 0;
  const total = Math.max(0, subtotal - discount);

  const addServiceToCart = () => {
    const svc = activeServices.find((s) => s.id === addServiceId);
    if (!svc) return;

    if (hasNoEmployees) return;

    const emp = soleEmployee ?? employees.find((e) => e.id === addServiceEmployeeId);
    if (!emp) return;

    setCartServices([
      ...cartServices,
      {
        key: crypto.randomUUID(),
        serviceId: svc.id,
        serviceName: svc.name,
        price: svc.price,
        employeeId: emp.id,
        employeeName: emp.name,
        discount: 0,
      },
    ]);
    setAddServiceId('');
    if (!soleEmployee) {
      setAddServiceEmployeeId('');
    }
  };

  const addProductToCart = () => {
    const prod = activeProducts.find((p) => p.id === addProductId);
    if (!prod) return;
    const qty = Number(addProductQty) || 1;
    setCartProducts([
      ...cartProducts,
      {
        key: crypto.randomUUID(),
        productId: prod.id,
        productName: prod.name,
        price: prod.sellingPrice,
        quantity: qty,
        discount: 0,
      },
    ]);
    setAddProductId('');
    setAddProductQty('1');
  };

  const completeSale = () => {
    if (!branchId) return;
    if (cartServices.length > 0 && hasNoEmployees) return;
    const payAmount = Number(paymentAmount) || total;
    createSaleMutation.mutate({
      branchId,
      customerId: customerId || undefined,
      services: cartServices.map((s) => ({
        serviceId: s.serviceId,
        employeeId: s.employeeId || undefined,
        discount: s.discount || undefined,
      })),
      products: cartProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        discount: p.discount || undefined,
      })),
      discount: discount || undefined,
      payments: [
        {
          method: paymentMethod,
          amount: payAmount,
          referenceNumber: paymentRef || undefined,
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Point of Sale</h1>
        <p className="text-muted-foreground">Process sales and payments</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Branch & Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.status === 'ACTIVE')
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Search Customer by Phone</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter phone number..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                  />
                  {customerId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomerId(null);
                        setCustomerName(null);
                        setPhoneSearch('');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {phoneSearch.length >= 3 && !customerId && (
                  <div className="mt-2 space-y-1">
                    {searchResults.map((c) => (
                      <Button
                        key={c.id}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setCustomerId(c.id);
                          setCustomerName(c.name);
                          setPhoneSearch(c.phone || '');
                        }}
                      >
                        {c.name} — {c.phone}
                      </Button>
                    ))}
                    {!searchResults.length && (
                      <p className="text-sm text-muted-foreground">No customers found.</p>
                    )}
                  </div>
                )}
                {customerId && (
                  <p className="mt-2 text-sm">
                    Selected: <Badge>{customerName}</Badge>
                  </p>
                )}
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Add New Customer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Customer</DialogTitle>
                  </DialogHeader>
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      createCustomerMutation.mutate(newCustomerForm);
                    }}
                  >
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newCustomerForm.name}
                        onChange={(e) =>
                          setNewCustomerForm({ ...newCustomerForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={newCustomerForm.phone}
                        onChange={(e) =>
                          setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button type="submit" disabled={createCustomerMutation.isPending}>
                      Add Customer
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasNoEmployees && (
                <p className="text-sm text-destructive">
                  No active employees. Add an employee before selling services.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Service</Label>
                  <Select value={addServiceId} onValueChange={setAddServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeServices.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {formatMoney(s.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Performed By</Label>
                  {soleEmployee ? (
                    <p className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
                      {soleEmployee.name}
                    </p>
                  ) : (
                    <Select
                      value={addServiceEmployeeId}
                      onValueChange={setAddServiceEmployeeId}
                      disabled={hasNoEmployees}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={addServiceToCart}
                    disabled={
                      !addServiceId ||
                      hasNoEmployees ||
                      (hasMultipleEmployees && !addServiceEmployeeId)
                    }
                  >
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Product</Label>
                  <Select value={addProductId} onValueChange={setAddProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatMoney(p.sellingPrice)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={addProductQty}
                    onChange={(e) => setAddProductQty(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={addProductToCart} disabled={!addProductId}>
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {!cartServices.length && !cartProducts.length ? (
                <p className="text-sm text-muted-foreground">Cart is empty.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cartServices.map((s) => (
                      <TableRow key={s.key}>
                        <TableCell>
                          <Badge variant="outline">Service</Badge> {s.serviceName}
                        </TableCell>
                        <TableCell>Performed By: {s.employeeName}</TableCell>
                        <TableCell>{formatMoney(s.price)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCartServices(cartServices.filter((x) => x.key !== s.key))
                            }
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cartProducts.map((p) => (
                      <TableRow key={p.key}>
                        <TableCell>
                          <Badge variant="outline">Product</Badge> {p.productName}
                        </TableCell>
                        <TableCell>Qty: {p.quantity}</TableCell>
                        <TableCell>{formatMoney(p.price * p.quantity)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCartProducts(cartProducts.filter((x) => x.key !== p.key))
                            }
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user && (
                <p className="text-sm text-muted-foreground">
                  Cashier: <span className="font-medium text-foreground">{user.name}</span>
                </p>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatMoney(discount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>

              <div>
                <Label>Sale Discount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={saleDiscount}
                  onChange={(e) => setSaleDiscount(e.target.value)}
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) =>
                    setPaymentMethod(v as 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER')
                  }
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

              <div>
                <Label>Payment Amount</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={String(total)}
                />
              </div>

              <div>
                <Label>Reference Number</Label>
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={completeSale}
                disabled={
                  createSaleMutation.isPending ||
                  !branchId ||
                  (!cartServices.length && !cartProducts.length) ||
                  (cartServices.length > 0 && hasNoEmployees)
                }
              >
                {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
