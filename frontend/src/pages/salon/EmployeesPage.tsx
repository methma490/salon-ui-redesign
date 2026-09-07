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

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', branchFilter],
    queryFn: () =>
      tenantApi.employees.list(branchFilter === 'all' ? undefined : { branchId: branchFilter }),
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    designation: '',
    branchId: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    designation: '',
    branchId: '',
  });

  const createMutation = useMutation({
    mutationFn: tenantApi.employees.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setForm({ name: '', phone: '', email: '', designation: '', branchId: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.employees.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setEditId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.employees.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  if (isLoading) return <p>Loading employees...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-muted-foreground">Manage salon staff</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Employee</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
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
                <Label>Designation</Label>
                <Input
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Branch</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(v) => setForm({ ...form, branchId: v })}
                  required
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
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              <Button type="submit" disabled={createMutation.isPending || !form.branchId}>
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Employees</CardTitle>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter branch" />
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.code}</TableCell>
                  <TableCell>{emp.name}</TableCell>
                  <TableCell>{emp.designation || '-'}</TableCell>
                  <TableCell>{emp.branchName}</TableCell>
                  <TableCell>{emp.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={emp.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Dialog
                      open={editId === emp.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditId(emp.id);
                          setEditForm({
                            name: emp.name,
                            phone: emp.phone || '',
                            email: emp.email || '',
                            designation: emp.designation || '',
                            branchId: emp.branchId,
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
                          <DialogTitle>Edit Employee</DialogTitle>
                        </DialogHeader>
                        <form
                          className="space-y-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            updateMutation.mutate({ id: emp.id, data: editForm });
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
                            <Label>Designation</Label>
                            <Input
                              value={editForm.designation}
                              onChange={(e) =>
                                setEditForm({ ...editForm, designation: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Branch</Label>
                            <Select
                              value={editForm.branchId}
                              onValueChange={(v) => setEditForm({ ...editForm, branchId: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
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
                            <Label>Phone</Label>
                            <Input
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                          </div>
                          <Button type="submit" disabled={updateMutation.isPending}>
                            Save
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    {emp.status !== 'RESIGNED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          statusMutation.mutate({
                            id: emp.id,
                            status: emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                          })
                        }
                      >
                        {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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
