import { useQuery } from '@tanstack/react-query';
import { Banknote, Eye, Receipt, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
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
  getErrorMessage,
  OpsError,
  OpsLoading,
  OpsPageHeader,
} from './salon-ops-ui';
import './sales-page.css';

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function SaleStatusBadge({ status }: { status: string }) {
  const key = status.toUpperCase();
  const cls =
    key === 'COMPLETED'
      ? 'sale-badge sale-badge-completed'
      : key === 'CANCELLED' || key === 'REFUNDED'
        ? 'sale-badge sale-badge-cancelled'
        : 'sale-badge sale-badge-pending';
  return <span className={cls}>{status}</span>;
}

export default function SalesPage() {
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [branchId, setBranchId] = useState<string>('all');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const {
    data: sales = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sales', startDate, endDate, branchId],
    queryFn: () =>
      tenantApi.sales.list({
        startDate,
        endDate,
        ...(branchId !== 'all' ? { branchId } : {}),
      }),
  });

  const stats = useMemo(() => {
    const revenue = sales.reduce((sum, s) => sum + s.total, 0);
    const walkIns = sales.filter((s) => !s.customerName).length;
    return { count: sales.length, revenue, walkIns };
  }, [sales]);

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="sales-page emp-page">
      <OpsPageHeader
        title="Sales History"
        subtitle="Browse completed sales, receipts, and customer details"
      />

      <div className="sales-stats">
        <div className="sales-stat-card">
          <span className="sales-stat-icon">
            <Receipt size={20} />
          </span>
          <div>
            <div className="sales-stat-value">{stats.count}</div>
            <div className="sales-stat-label">Sales</div>
          </div>
        </div>
        <div className="sales-stat-card">
          <span className="sales-stat-icon">
            <Banknote size={20} />
          </span>
          <div>
            <div className="sales-stat-value is-revenue">{formatMoney(stats.revenue)}</div>
            <div className="sales-stat-label">Revenue (LKR)</div>
          </div>
        </div>
        <div className="sales-stat-card">
          <span className="sales-stat-icon">
            <Users size={20} />
          </span>
          <div>
            <div className="sales-stat-value">{stats.walkIns}</div>
            <div className="sales-stat-label">Walk-ins</div>
          </div>
        </div>
      </div>

      <section className="sales-filters">
        <h2 className="sales-filters-title">Filters</h2>
        <div className="sales-filters-grid">
          <div className="sales-filter-field">
            <label htmlFor="sales-start">Start date</label>
            <Input
              id="sales-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="sales-filter-field">
            <label htmlFor="sales-end">End date</label>
            <Input
              id="sales-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="sales-filter-field">
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
        </div>
      </section>

      <section className="sales-panel">
        <div className="sales-panel-head">
          <div>
            <h2>All Sales</h2>
            <p>
              {sales.length} sale{sales.length === 1 ? '' : 's'} in selected period
            </p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="sales-empty">No sales found for the selected filters.</div>
        ) : (
          <>
            <div className="sales-cards">
              {sales.map((sale) => (
                <article key={sale.id} className="sales-card">
                  <div className="sales-card-top">
                    <div>
                      <div className="sales-sale-number">{sale.saleNumber}</div>
                      <div className="sales-sale-date">{new Date(sale.createdAt).toLocaleString()}</div>
                    </div>
                    <SaleStatusBadge status={sale.status} />
                  </div>
                  <div className="sales-card-meta">
                    <div>
                      <strong>Branch:</strong> {sale.branchName}
                    </div>
                    <div>
                      <strong>Customer:</strong> {sale.customerName || 'Walk-in'}
                    </div>
                    <div>
                      <strong>Total:</strong>{' '}
                      <span className="sales-total-cell">LKR {formatMoney(sale.total)}</span>
                    </div>
                  </div>
                  <Link to={`/salon/sales/${sale.id}`} className="sales-view-btn">
                    <Eye size={15} />
                    View invoice
                  </Link>
                </article>
              ))}
            </div>

            <div className="sales-desktop-table sales-table-wrap">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Customer</th>
                    <th className="num">Total (LKR)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="sales-sale-number">{sale.saleNumber}</td>
                      <td className="sales-sale-date">{new Date(sale.createdAt).toLocaleString()}</td>
                      <td>{sale.branchName}</td>
                      <td>{sale.customerName || 'Walk-in'}</td>
                      <td className="num sales-total-cell">{formatMoney(sale.total)}</td>
                      <td>
                        <SaleStatusBadge status={sale.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/salon/sales/${sale.id}`} className="sales-view-btn">
                          <Eye size={15} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
