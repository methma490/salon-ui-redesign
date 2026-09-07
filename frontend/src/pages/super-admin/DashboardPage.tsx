import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/features/salons/components/StatusBadge';
import { useSalonStats } from '@/features/salons/hooks/useSalons';

export default function DashboardPage() {
  const { data, isLoading, error } = useSalonStats();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="text-destructive">Failed to load dashboard data.</p>;
  }

  const stats = [
    { label: 'Total Salons', value: data?.total ?? 0 },
    { label: 'Active Salons', value: data?.active ?? 0 },
    { label: 'Suspended Salons', value: data?.suspended ?? 0 },
    { label: 'Archived Salons', value: data?.archived ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of salon tenants on the platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Salons</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link to="/super-admin/salons">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!data?.recent.length ? (
            <p className="text-sm text-muted-foreground">
              No salons found. Create your first salon.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recent.map((salon) => (
                <div
                  key={salon.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <Link
                      to={`/super-admin/salons/${salon.id}`}
                      className="font-medium hover:underline"
                    >
                      {salon.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{salon.code}</p>
                  </div>
                  <StatusBadge status={salon.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
