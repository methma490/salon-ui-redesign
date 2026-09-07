import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { tenantApi } from '@/api/tenant.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type Tab = 'levels' | 'stock-in' | 'adjustment' | 'movements';

export default function StockPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('levels');
  const [branchId, setBranchId] = useState<string>('all');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => tenantApi.products.list(),
  });

  const { data: stockLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['stock-levels', branchId],
    queryFn: () => tenantApi.stock.list(branchId === 'all' ? undefined : branchId),
    enabled: tab === 'levels',
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements', branchId],
    queryFn: () => tenantApi.stock.movements(branchId === 'all' ? undefined : { branchId }),
    enabled: tab === 'movements',
  });

  const [stockInForm, setStockInForm] = useState({
    branchId: '',
    productId: '',
    quantity: '',
    notes: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    branchId: '',
    productId: '',
    quantity: '',
    notes: '',
  });

  const stockInMutation = useMutation({
    mutationFn: tenantApi.stock.stockIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      setStockInForm({ branchId: '', productId: '', quantity: '', notes: '' });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: tenantApi.stock.adjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      setAdjustForm({ branchId: '', productId: '', quantity: '', notes: '' });
    },
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'levels', label: 'Stock Levels' },
    { id: 'stock-in', label: 'Stock In' },
    { id: 'adjustment', label: 'Adjustment' },
    { id: 'movements', label: 'Movements' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-muted-foreground">Manage stock levels and movements</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {(tab === 'levels' || tab === 'movements') && (
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
      )}

      {tab === 'levels' && (
        <Card>
          <CardHeader>
            <CardTitle>Current Stock Levels</CardTitle>
          </CardHeader>
          <CardContent>
            {levelsLoading ? (
              <p>Loading stock levels...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockLevels.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.branchName}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.productCode}</TableCell>
                      <TableCell>
                        <Badge variant={item.quantity <= 5 ? 'secondary' : 'default'}>
                          {item.quantity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'stock-in' && (
        <Card>
          <CardHeader>
            <CardTitle>Stock In</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="max-w-md space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                stockInMutation.mutate({
                  branchId: stockInForm.branchId,
                  productId: stockInForm.productId,
                  quantity: Number(stockInForm.quantity),
                  notes: stockInForm.notes || undefined,
                });
              }}
            >
              <div>
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
              <div>
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
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stockInForm.quantity}
                  onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={stockInForm.notes}
                  onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                disabled={
                  stockInMutation.isPending || !stockInForm.branchId || !stockInForm.productId
                }
              >
                Record Stock In
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'adjustment' && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Use positive values to increase stock, negative values to decrease.
            </p>
            <form
              className="max-w-md space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                adjustMutation.mutate({
                  branchId: adjustForm.branchId,
                  productId: adjustForm.productId,
                  quantity: Number(adjustForm.quantity),
                  notes: adjustForm.notes || undefined,
                });
              }}
            >
              <div>
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
              <div>
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
              <div>
                <Label>Adjustment Quantity</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                disabled={adjustMutation.isPending || !adjustForm.branchId || !adjustForm.productId}
              >
                Apply Adjustment
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'movements' && (
        <Card>
          <CardHeader>
            <CardTitle>Movement History</CardTitle>
          </CardHeader>
          <CardContent>
            {movementsLoading ? (
              <p>Loading movements...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{m.branchName}</TableCell>
                      <TableCell>{m.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.type}</Badge>
                      </TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell>{m.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
