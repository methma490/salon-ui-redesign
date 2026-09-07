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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [phoneSearch, setPhoneSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', phoneSearch],
    queryFn: () => tenantApi.customers.list(phoneSearch ? { phone: phoneSearch } : undefined),
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    notes: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setForm({ name: '', phone: '', email: '', birthday: '', notes: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.customers.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.customers.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  if (isLoading) return <p>Loading customers...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground">Manage customer records</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Customer</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  ...form,
                  birthday: form.birthday || undefined,
                  email: form.email || undefined,
                  notes: form.notes || undefined,
                });
              }}
            >
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Birthday</Label>
                <Input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>All Customers</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Search by phone..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="w-full sm:w-[220px]"
            />
            {phoneSearch && (
              <Button variant="outline" onClick={() => setPhoneSearch('')}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((cust) => (
                <TableRow key={cust.id}>
                  <TableCell>{cust.code}</TableCell>
                  <TableCell>{cust.name}</TableCell>
                  <TableCell>{cust.phone || '-'}</TableCell>
                  <TableCell>{cust.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={cust.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {cust.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Dialog
                      open={editId === cust.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditId(cust.id);
                          setEditForm({
                            name: cust.name,
                            phone: cust.phone || '',
                            email: cust.email || '',
                            birthday: cust.birthday?.slice(0, 10) || '',
                            notes: cust.notes || '',
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
                          <DialogTitle>Edit Customer</DialogTitle>
                        </DialogHeader>
                        <form
                          className="space-y-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            updateMutation.mutate({ id: cust.id, data: editForm });
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
                            <Label>Phone</Label>
                            <Input
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                          </div>
                          <Button type="submit" disabled={updateMutation.isPending}>
                            Save
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    {cust.status !== 'BLOCKED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          statusMutation.mutate({
                            id: cust.id,
                            status: cust.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                          })
                        }
                      >
                        {cust.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                    )}
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
