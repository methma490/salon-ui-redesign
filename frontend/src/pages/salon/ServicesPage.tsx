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

export default function ServicesPage() {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: categories = [] } = useQuery({
    queryKey: ['service-categories'],
    queryFn: tenantApi.serviceCategories.list,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', categoryFilter],
    queryFn: () => tenantApi.services.list(categoryFilter === 'all' ? undefined : categoryFilter),
  });

  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    durationMinutes: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    durationMinutes: '',
  });

  const createMutation = useMutation({
    mutationFn: tenantApi.services.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      setForm({ categoryId: '', name: '', description: '', price: '', durationMinutes: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.services.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      setEditId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.services.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });

  if (isLoading) return <p>Loading services...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="text-muted-foreground">Manage salon services and pricing</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  categoryId: form.categoryId,
                  name: form.name,
                  description: form.description || undefined,
                  price: Number(form.price),
                  durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
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
                    <SelectValue placeholder="Select category" />
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
                <Label>Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending || !form.categoryId}>
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Services</CardTitle>
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
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell>{svc.code}</TableCell>
                  <TableCell>{svc.name}</TableCell>
                  <TableCell>{svc.categoryName || '-'}</TableCell>
                  <TableCell>{formatMoney(svc.price)}</TableCell>
                  <TableCell>{svc.durationMinutes ? `${svc.durationMinutes} min` : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={svc.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {svc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Dialog
                      open={editId === svc.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditId(svc.id);
                          setEditForm({
                            categoryId: svc.categoryId || '',
                            name: svc.name,
                            description: svc.description || '',
                            price: String(svc.price),
                            durationMinutes: svc.durationMinutes ? String(svc.durationMinutes) : '',
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
                          <DialogTitle>Edit Service</DialogTitle>
                        </DialogHeader>
                        <form
                          className="space-y-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            updateMutation.mutate({
                              id: svc.id,
                              data: {
                                categoryId: editForm.categoryId,
                                name: editForm.name,
                                description: editForm.description || undefined,
                                price: Number(editForm.price),
                                durationMinutes: editForm.durationMinutes
                                  ? Number(editForm.durationMinutes)
                                  : undefined,
                              },
                            });
                          }}
                        >
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={editForm.categoryId}
                              onValueChange={(v) => setEditForm({ ...editForm, categoryId: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
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
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
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
                          id: svc.id,
                          status: svc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                        })
                      }
                    >
                      {svc.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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
