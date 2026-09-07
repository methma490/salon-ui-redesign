import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SaleItem {
  id: string;
  itemType: string;
  serviceId: string | null;
  serviceName: string | null;
  productId: string | null;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  employeeId: string | null;
  employeeName: string | null;
}

interface SalePayment {
  id: string;
  method: string;
  amount: number;
  status: string;
  referenceNumber: string | null;
  createdAt: string;
}

interface SaleDetail {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  branchId: string;
  branchName: string;
  customerId: string | null;
  customerName: string | null;
  cashierId: string | null;
  cashierName: string | null;
  createdAt: string;
  items: SaleItem[];
  payments: SalePayment[];
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SaleDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => tenantApi.sales.get(id!) as Promise<SaleDetail>,
    enabled: !!id,
  });

  if (isLoading) return <p>Loading sale details...</p>;
  if (error || !data) return <p className="text-destructive">Sale not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/salon/sales">← Back to Sales</Link>
          </Button>
          <h1 className="text-2xl font-semibold">Sale {data.saleNumber}</h1>
          <p className="text-muted-foreground">
            {new Date(data.createdAt).toLocaleString()} · {data.branchName}
          </p>
        </div>
        <Badge className="w-fit">{data.status}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{data.customerName || 'Walk-in'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cashier</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{data.cashierName || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(data.total)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{item.itemType}</Badge>
                  </TableCell>
                  <TableCell>{item.serviceName || item.productName || '—'}</TableCell>
                  <TableCell>{item.employeeName || '—'}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatMoney(Number(item.unitPrice))}</TableCell>
                  <TableCell>{formatMoney(Number(item.discount))}</TableCell>
                  <TableCell>{formatMoney(Number(item.total))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-end gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(data.subtotal)}</span>
            </div>
            <div className="flex justify-end gap-8">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatMoney(data.discount)}</span>
            </div>
            <div className="flex justify-end gap-8 font-semibold">
              <span>Total</span>
              <span>{formatMoney(data.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>{formatMoney(Number(p.amount))}</TableCell>
                  <TableCell>{p.referenceNumber || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
