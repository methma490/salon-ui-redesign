import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { tenantApi } from '@/api/tenant.api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function DashboardPage() {
  const [branchId, setBranchId] = useState<string>('all');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', branchId],
    queryFn: () => tenantApi.dashboard.get(branchId === 'all' ? undefined : branchId),
  });

  if (isLoading) return <p>Loading dashboard...</p>;
  if (error) return <p className="text-destructive">Failed to load dashboard.</p>;

  const stats = [
    {
      label: "Today's Sales",
      value: formatMoney(data?.todaySales.total ?? 0),
      sub: `${data?.todaySales.count ?? 0} transactions`,
    },
    {
      label: 'Monthly Sales',
      value: formatMoney(data?.monthlySales.total ?? 0),
      sub: `${data?.monthlySales.count ?? 0} transactions`,
    },
    {
      label: 'Active Customers',
      value: String(data?.totalCustomers ?? 0),
      sub: 'Total registered',
    },
    {
      label: 'Low Stock Items',
      value: String(data?.lowStockProducts.length ?? 0),
      sub: 'Needs attention',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your salon performance</p>
        </div>
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
              <p className="text-sm text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.lowStockProducts.length ? (
              <p className="text-sm text-muted-foreground">No low stock items.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStockProducts.map((item) => (
                    <TableRow key={`${item.branchId}-${item.productId}`}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.quantity}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.topServices.length ? (
              <p className="text-sm text-muted-foreground">No service sales yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topServices.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell>{svc.name}</TableCell>
                      <TableCell>{svc.saleCount}</TableCell>
                      <TableCell>{formatMoney(svc.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
