import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Mail, Phone, Plus, Star } from 'lucide-react';
import { useState } from 'react';
import { tenantApi, type Branch } from '@/api/tenant.api';
import {
  FormError,
  FormSubmit,
  getErrorMessage,
  OpsEditButton,
  OpsToggleStatusButton,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import './employees-page.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
type BranchForm = {
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
};

const emptyForm: BranchForm = { code: '', name: '', phone: '', email: '', address: '' };

function toBranchPayload(form: BranchForm, includeCode = false) {
  const payload: Record<string, string> = { name: form.name.trim() };
  if (includeCode) payload.code = form.code.trim().toUpperCase();
  const phone = form.phone.trim();
  const email = form.email.trim();
  const address = form.address.trim();
  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (address) payload.address = address;
  return payload;
}

function BranchStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'} className="shrink-0">
      {status}
    </Badge>
  );
}

function BranchCard({
  branch,
  onEdit,
  onToggleStatus,
  isUpdating,
}: {
  branch: Branch;
  onEdit: () => void;
  onToggleStatus: () => void;
  isUpdating: boolean;
}) {
  return (
    <Card className="md:hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{branch.name}</p>
              {branch.isMain && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Star className="h-3 w-3 fill-current" />
                  Main
                </Badge>
              )}
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{branch.code}</p>
          </div>
          <BranchStatusBadge status={branch.status} />
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {branch.phone || 'No phone'}
          </p>
          {branch.email && (
            <p className="flex items-center gap-2 truncate">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {branch.email}
            </p>
          )}
          {branch.address && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{branch.address}</span>
            </p>
          )}
        </div>

        <div className="emp-card-actions pt-1">
          <OpsEditButton onClick={onEdit} />
          {!branch.isMain && (
            <OpsToggleStatusButton
              isActive={branch.status === 'ACTIVE'}
              disabled={isUpdating}
              onClick={onToggleStatus}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BranchFormFields({
  form,
  setForm,
  mode,
}: {
  form: BranchForm;
  setForm: (form: BranchForm) => void;
  mode: 'create' | 'edit';
}) {
  return (
    <>
      {mode === 'create' && (
        <div className="space-y-2">
          <Label htmlFor="branch-code">Branch code</Label>
          <Input
            id="branch-code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="e.g. BR02"
            required
            maxLength={50}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="branch-name">Branch name</Label>
        <Input
          id="branch-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Branch display name"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="branch-phone">Phone</Label>
          <Input
            id="branch-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-email">Email</Label>
          <Input
            id="branch-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="branch-address">Address</Label>
        <Input
          id="branch-address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Optional"
        />
      </div>
    </>
  );
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const {
    data: branches = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: features = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  const canManageBranches = features.includes('MULTI_BRANCH');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BranchForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: tenantApi.branches.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.branches.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setEditId(null);
      setFormError(null);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.branches.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });

  const openEdit = (branch: Branch) => {
    setFormError(null);
    setEditId(branch.id);
    setEditForm({
      code: branch.code,
      name: branch.name,
      phone: branch.phone || '',
      email: branch.email || '',
      address: branch.address || '',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Could not load branches</CardTitle>
          <CardDescription>{getErrorMessage(error)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void refetch()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Manage salon locations and branch details
          </p>
        </div>

        {canManageBranches ? (
          <>
            <Button
              className="w-full gap-2 sm:w-auto"
              onClick={() => {
                setFormError(null);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Branch
            </Button>
            <SimpleFormDialog
              open={createOpen}
              onOpenChange={(open) => {
                if (!open) setFormError(null);
                setCreateOpen(open);
              }}
              title="Create Branch"
            >
              <SimpleForm
                onSubmit={(e) => {
                  e.preventDefault();
                  setFormError(null);
                  createMutation.mutate(toBranchPayload(form, true));
                }}
              >
                <FormError message={formError} />
                <BranchFormFields form={form} setForm={setForm} mode="create" />
                <FormSubmit pending={createMutation.isPending}>Create Branch</FormSubmit>
              </SimpleForm>
            </SimpleFormDialog>
          </>
        ) : (
          <Card className="border-dashed sm:max-w-xs">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Multi-branch management requires the{' '}
              <span className="font-medium text-foreground">Platinum</span> plan or higher.
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Branches</CardTitle>
          <CardDescription>
            {branches.length} branch{branches.length === 1 ? '' : 'es'} registered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {branches.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              No branches found.
            </div>
          ) : (
            <>
              {/* Mobile & tablet cards */}
              <div className="grid gap-3 md:hidden">
                {branches.map((branch) => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    isUpdating={statusMutation.isPending}
                    onEdit={() => openEdit(branch)}
                    onToggleStatus={() =>
                      statusMutation.mutate({
                        id: branch.id,
                        status: branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                      })
                    }
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Main</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell className="font-mono text-sm">{branch.code}</TableCell>
                        <TableCell className="font-medium">{branch.name}</TableCell>
                        <TableCell>{branch.phone || '—'}</TableCell>
                        <TableCell>
                          <BranchStatusBadge status={branch.status} />
                        </TableCell>
                        <TableCell>{branch.isMain ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-right">
                          <div className="emp-actions">
                            <OpsEditButton onClick={() => openEdit(branch)} />
                            {!branch.isMain && (
                              <OpsToggleStatusButton
                                isActive={branch.status === 'ACTIVE'}
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: branch.id,
                                    status: branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                  })
                                }
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SimpleFormDialog
        open={editId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditId(null);
            setFormError(null);
          }
        }}
        title="Edit Branch"
      >
        {editId && (
          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              updateMutation.mutate({
                id: editId,
                data: toBranchPayload(editForm),
              });
            }}
          >
            <FormError message={formError} />
            <BranchFormFields form={editForm} setForm={setEditForm} mode="edit" />
            <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
          </SimpleForm>
        )}
      </SimpleFormDialog>
    </div>
  );
}
