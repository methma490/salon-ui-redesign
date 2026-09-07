import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { tenantApi } from '@/api/tenant.api';
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

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: tenantApi.productCategories.list,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', categoryFilter],
    queryFn: () => tenantApi.products.list(categoryFilter === 'all' ? undefined : categoryFilter),
  });

  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    unit: '',
    sellingPrice: '',
    costPrice: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    unit: '',
    sellingPrice: '',
    costPrice: '',
  });

  const createMutation = useMutation({
    mutationFn: tenantApi.products.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setForm({
        categoryId: '',
        name: '',
        description: '',
        unit: '',
        sellingPrice: '',
        costPrice: '',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.products.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.products.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  if (isLoading) return <p>Loading products...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground">Manage retail products and pricing</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Product</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  categoryId: form.categoryId || undefined,
                  name: form.name,
                  description: form.description || undefined,
                  unit: form.unit || undefined,
                  sellingPrice: Number(form.sellingPrice),
                  costPrice: form.costPrice ? Number(form.costPrice) : undefined,
                });
              }}
            >
              <div>
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Selling Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Cost Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="e.g. bottle, piece"
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Products</CardTitle>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((prod) => (
                <TableRow key={prod.id}>
                  <TableCell>{prod.code}</TableCell>
                  <TableCell>{prod.name}</TableCell>
                  <TableCell>{prod.categoryName || '-'}</TableCell>
                  <TableCell>{prod.unit || '-'}</TableCell>
                  <TableCell>{formatMoney(prod.sellingPrice)}</TableCell>
                  <TableCell>{formatMoney(prod.costPrice)}</TableCell>
                  <TableCell>
                    <Badge variant={prod.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {prod.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Dialog
                      open={editId === prod.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditId(prod.id);
                          setEditForm({
                            categoryId: prod.categoryId || '',
                            name: prod.name,
                            description: prod.description || '',
                            unit: prod.unit || '',
                            sellingPrice: String(prod.sellingPrice),
                            costPrice: String(prod.costPrice),
                          });
                        } else {
                          setEditId(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Product</DialogTitle>
                        </DialogHeader>
                        <form
                          className="space-y-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            updateMutation.mutate({
                              id: prod.id,
                              data: {
                                categoryId: editForm.categoryId || undefined,
                                name: editForm.name,
                                unit: editForm.unit || undefined,
                                sellingPrice: Number(editForm.sellingPrice),
                                costPrice: Number(editForm.costPrice),
                              },
                            });
                          }}
                        >
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Selling Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editForm.sellingPrice}
                              onChange={(e) =>
                                setEditForm({ ...editForm, sellingPrice: e.target.value })
                              }
                            />
                          </div>
                          <Button type="submit" disabled={updateMutation.isPending}>
                            Save
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({
                          id: prod.id,
                          status: prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                        })
                      }
                    >
                      {prod.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
