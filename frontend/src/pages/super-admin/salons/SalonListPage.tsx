import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { EditSalonDialog } from '@/features/salons/components/EditSalonDialog';
import { ManageFeaturesDialog } from '@/features/salons/components/ManageFeaturesDialog';
import { StatusBadge } from '@/features/salons/components/StatusBadge';
import { StatusChangeDialog } from '@/features/salons/components/StatusChangeDialog';
import { useSalons } from '@/features/salons/hooks/useSalons';
import type { SalonFilters, SalonListItem, SalonStatus } from '@/features/salons/types/salon.types';

type ListAction = 'edit' | 'features' | 'status';

export default function SalonListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SalonFilters['status']>('ALL');
  const [page, setPage] = useState(1);
  const [activeSalon, setActiveSalon] = useState<SalonListItem | null>(null);
  const [activeAction, setActiveAction] = useState<ListAction | null>(null);
  const [statusTarget, setStatusTarget] = useState<SalonStatus | null>(null);

  const openAction = (salon: SalonListItem, action: ListAction) => {
    setActiveSalon(salon);
    setActiveAction(action);
  };

  const closeAction = () => {
    setActiveSalon(null);
    setActiveAction(null);
    setStatusTarget(null);
  };

  const filters = useMemo(
    () => ({ page, limit: 10, search: search || undefined, status }),
    [page, search, status],
  );

  const { data, isLoading, error } = useSalons(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Salons</h1>
          <p className="text-sm text-muted-foreground">
            Manage salon tenants, features, and admins.
          </p>
        </div>
        <Button asChild>
          <Link to="/super-admin/salons/new">
            <Plus className="h-4 w-4" />
            Create Salon
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salon Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, code, email, or phone"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as SalonFilters['status']);
                setPage(1);
              }}
            >
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Loading salons...</p>}
          {error && <p className="text-sm text-destructive">Failed to load salons.</p>}

          {!isLoading && !error && !data?.data.length && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="font-medium">No salons found.</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first salon.</p>
              <Button asChild className="mt-4">
                <Link to="/super-admin/salons/new">Create Salon</Link>
              </Button>
            </div>
          )}

          {!!data?.data.length && (
            <>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Salon</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((salon) => (
                      <TableRow key={salon.id}>
                        <TableCell className="font-medium">{salon.name}</TableCell>
                        <TableCell>{salon.code}</TableCell>
                        <TableCell>
                          <div className="text-sm">{salon.email || '—'}</div>
                          <div className="text-xs text-muted-foreground">{salon.phone || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {salon.enabledFeatures.map((feature) => (
                              <Badge key={feature} variant="secondary">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={salon.status} />
                        </TableCell>
                        <TableCell>{new Date(salon.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/super-admin/salons/${salon.id}`}>View</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAction(salon, 'edit')}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAction(salon, 'features')}
                            >
                              Features
                            </Button>
                            {salon.status === 'ACTIVE' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setActiveSalon(salon);
                                  setStatusTarget('SUSPENDED');
                                }}
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setActiveSalon(salon);
                                  setStatusTarget('ACTIVE');
                                }}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {data.meta.page} of {data.meta.totalPages || 1} ({data.meta.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.meta.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {activeSalon && activeAction === 'edit' && (
        <EditSalonDialog salon={activeSalon} open onOpenChange={(open) => !open && closeAction()} />
      )}
      {activeSalon && activeAction === 'features' && (
        <ManageFeaturesDialog
          salon={{
            id: activeSalon.id,
            name: activeSalon.name,
            enabledFeatures: activeSalon.enabledFeatures,
          }}
          open
          onOpenChange={(open) => !open && closeAction()}
        />
      )}
      {activeSalon && statusTarget && (
        <StatusChangeDialog
          salonId={activeSalon.id}
          salonName={activeSalon.name}
          targetStatus={statusTarget}
          open
          onOpenChange={(open) => !open && closeAction()}
        />
      )}
    </div>
  );
}
