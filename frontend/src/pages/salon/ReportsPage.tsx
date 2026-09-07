import { useQuery } from '@tanstack/react-query';
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

function formatMoney(value: number | string) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type ReportSection =
  | 'daily-sales'
  | 'branch-sales'
  | 'service-sales'
  | 'product-sales'
  | 'employee-performance'
  | 'low-stock';

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [branchId, setBranchId] = useState<string>('all');
  const [activeReport, setActiveReport] = useState<ReportSection>('daily-sales');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const dateParams = {
    startDate,
    endDate,
    ...(branchId !== 'all' ? { branchId } : {}),
  };

  const { data: dailySales = [], isLoading: dailyLoading } = useQuery({
    queryKey: ['report-daily-sales', startDate, endDate, branchId],
    queryFn: () => tenantApi.reports.dailySales(dateParams),
    enabled: activeReport === 'daily-sales',
  });

  const { data: branchSales = [], isLoading: branchLoading } = useQuery({
    queryKey: ['report-branch-sales', startDate, endDate],
    queryFn: () => tenantApi.reports.branchSales({ startDate, endDate }),
    enabled: activeReport === 'branch-sales',
  });

  const { data: serviceSales = [], isLoading: serviceLoading } = useQuery({
    queryKey: ['report-service-sales', startDate, endDate, branchId],
    queryFn: () => tenantApi.reports.serviceSales(dateParams),
    enabled: activeReport === 'service-sales',
  });

  const { data: productSales = [], isLoading: productLoading } = useQuery({
    queryKey: ['report-product-sales', startDate, endDate, branchId],
    queryFn: () => tenantApi.reports.productSales(dateParams),
    enabled: activeReport === 'product-sales',
  });

  const { data: employeePerformance = [], isLoading: employeeLoading } = useQuery({
    queryKey: ['report-employee-performance', startDate, endDate, branchId],
    queryFn: () => tenantApi.reports.employeePerformance(dateParams),
    enabled: activeReport === 'employee-performance',
  });

  const { data: lowStock = [], isLoading: lowStockLoading } = useQuery({
    queryKey: ['report-low-stock', branchId, lowStockThreshold],
    queryFn: () =>
      tenantApi.reports.lowStock({
        threshold: lowStockThreshold,
        ...(branchId !== 'all' ? { branchId } : {}),
      }),
    enabled: activeReport === 'low-stock',
  });

  const reports: { id: ReportSection; label: string }[] = [
    { id: 'daily-sales', label: 'Daily Sales' },
    { id: 'branch-sales', label: 'Branch Sales' },
    { id: 'service-sales', label: 'Service Sales' },
    { id: 'product-sales', label: 'Product Sales' },
    { id: 'employee-performance', label: 'Employee Performance' },
    { id: 'low-stock', label: 'Low Stock' },
  ];

  const isLoading =
    dailyLoading ||
    branchLoading ||
    serviceLoading ||
    productLoading ||
    employeeLoading ||
    lowStockLoading;

  const needsDateRange = activeReport !== 'low-stock';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">Analyze salon performance</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {reports.map((r) => (
          <Button
            key={r.id}
            variant={activeReport === r.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveReport(r.id)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {needsDateRange && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
            {activeReport === 'low-stock' && (
              <div>
                <Label>Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
              </div>
            )}
            {activeReport !== 'branch-sales' && (
              <div>
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
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
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{reports.find((r) => r.id === activeReport)?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading report...</p>
          ) : activeReport === 'daily-sales' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sales Count</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dailySales as Array<{ date: string; saleCount: number; total: string }>).map(
                  (row) => (
                    <TableRow key={row.date}>
                      <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                      <TableCell>{Number(row.saleCount)}</TableCell>
                      <TableCell>{formatMoney(row.total)}</TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          ) : activeReport === 'branch-sales' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Sales Count</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  branchSales as Array<{
                    branchId: string;
                    branchName: string;
                    saleCount: number;
                    total: string;
                  }>
                ).map((row) => (
                  <TableRow key={row.branchId}>
                    <TableCell>{row.branchName}</TableCell>
                    <TableCell>{Number(row.saleCount)}</TableCell>
                    <TableCell>{formatMoney(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : activeReport === 'service-sales' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Sales Count</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  serviceSales as Array<{
                    id: string;
                    name: string;
                    saleCount: number;
                    total: string;
                  }>
                ).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{Number(row.saleCount)}</TableCell>
                    <TableCell>{formatMoney(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : activeReport === 'product-sales' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  productSales as Array<{
                    id: string;
                    name: string;
                    quantity: string;
                    total: string;
                  }>
                ).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{Number(row.quantity)}</TableCell>
                    <TableCell>{formatMoney(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : activeReport === 'employee-performance' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  employeePerformance as Array<{
                    employeeId: string;
                    employeeName: string;
                    designation: string;
                    serviceCount: number;
                    total: string;
                  }>
                ).map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>{row.employeeName}</TableCell>
                    <TableCell>{row.designation || '—'}</TableCell>
                    <TableCell>{Number(row.serviceCount)}</TableCell>
                    <TableCell>{formatMoney(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  lowStock as Array<{
                    branchName: string;
                    productName: string;
                    quantity: number;
                  }>
                ).map((row, i) => (
                  <TableRow key={`${row.branchName}-${row.productName}-${i}`}>
                    <TableCell>{row.branchName}</TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.quantity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
