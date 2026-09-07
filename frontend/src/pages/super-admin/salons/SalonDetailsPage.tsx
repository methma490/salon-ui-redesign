import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditSalonDialog } from '@/features/salons/components/EditSalonDialog';
import { ManageFeaturesDialog } from '@/features/salons/components/ManageFeaturesDialog';
import { StatusBadge } from '@/features/salons/components/StatusBadge';
import { StatusChangeDialog } from '@/features/salons/components/StatusChangeDialog';
import { useSalon } from '@/features/salons/hooks/useSalons';
import type { SalonStatus } from '@/features/salons/types/salon.types';

export default function SalonDetailsPage() {
  const { id = '' } = useParams();
  const { data: salon, isLoading, error } = useSalon(id);
  const [editOpen, setEditOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<SalonStatus | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading salon details...</p>;
  }

  if (error || !salon) {
    return <p className="text-destructive">Salon not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
            <Link to="/super-admin/salons">
              <ArrowLeft className="h-4 w-4" />
              Back to salons
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{salon.name}</h1>
          <p className="text-sm text-muted-foreground">{salon.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit Salon
          </Button>
          <Button variant="outline" onClick={() => setFeaturesOpen(true)}>
            Manage Features
          </Button>
          {salon.status !== 'ACTIVE' && (
            <Button onClick={() => setStatusTarget('ACTIVE')}>Activate</Button>
          )}
          {salon.status !== 'SUSPENDED' && (
            <Button variant="secondary" onClick={() => setStatusTarget('SUSPENDED')}>
              Suspend
            </Button>
          )}
          {salon.status !== 'ARCHIVED' && (
            <Button variant="destructive" onClick={() => setStatusTarget('ARCHIVED')}>
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salon Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={salon.status} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span>{salon.email || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span>{salon.phone || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(salon.createdAt).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Main Branch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {salon.mainBranch ? (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span>{salon.mainBranch.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Code</span>
                  <span>{salon.mainBranch.code}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <span>{salon.mainBranch.status}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No main branch found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salon Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {salon.admin ? (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span>{salon.admin.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Email</span>
                  <span>{salon.admin.email}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{salon.admin.phone || '—'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {salon.admin.roles.map((role) => (
                    <Badge key={role}>{role}</Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No salon admin assigned.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enabled Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {salon.enabledFeatures.map((feature) => (
                <Badge key={feature.code} variant="secondary">
                  {feature.code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <EditSalonDialog salon={salon} open={editOpen} onOpenChange={setEditOpen} />
      <ManageFeaturesDialog salon={salon} open={featuresOpen} onOpenChange={setFeaturesOpen} />
      {statusTarget && (
        <StatusChangeDialog
          salonId={salon.id}
          salonName={salon.name}
          targetStatus={statusTarget}
          open={!!statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
        />
      )}
    </div>
  );
}
