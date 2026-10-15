import { useQuery } from '@tanstack/react-query';
import { Banknote, Eye, Receipt, Smartphone, Users, ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import SendEbillModal from './SendEbillModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import {
  getErrorMessage,
  OpsError,
  OpsLoading,
  OpsPagination,
  OpsPageHeader,
} from './salon-ops-ui';
import './sales-page.css';

import { formatMoneyAmount } from '@/lib/money';
import { formatSriLankaDateTime, sriLankaTodayIso } from '@/lib/sri-lanka-time';

function todayStr() {
  return sriLankaTodayIso();
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
  const { branchId, setBranchId, branches } = useSalonBranch();
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [saleStatus, setSaleStatus] = useState<'COMPLETED' | 'PENDING'>('COMPLETED');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [ebillModalSale, setEbillModalSale] = useState<{
    id: string;
    customerName?: string | null;
    customerPhone?: string | null;
  } | null>(null);

  const {
    data: salesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sales', startDate, endDate, branchId, saleStatus, search, page, limit],
    queryFn: () =>
      tenantApi.sales.listPaginated({
        ...(saleStatus === 'PENDING' ? {} : { startDate, endDate }),
        status: saleStatus,
        ...(branchId !== 'all' ? { branchId } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        page: String(page),
        limit: String(limit),
      }),
  });

  const sales = salesResponse?.data ?? [];
  const pagination = salesResponse?.meta ?? { page, limit, total: 0, totalPages: 0 };

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, branchId, saleStatus, search]);

  const stats = useMemo(() => {
    const revenue = sales.reduce((sum, s) => sum + s.total, 0);
    const walkIns = sales.filter((s) => !s.customerName).length;
    return { count: sales.length, revenue, walkIns };
  }, [sales]);

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="sales-page emp-page">
      {/* Back button to Sales hub */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/salon/sales-hub"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Sales</span>
        </Link>
      </div>

      <OpsPageHeader
        title={saleStatus === 'PENDING' ? 'POS Drafts' : 'Sales History'}
        subtitle={saleStatus === 'PENDING' ? 'View saved POS drafts from any page' : 'Browse completed sales, receipts, and customer details'}
      />

      <div className="sales-stats">
        <div className="sales-stat-card">
          <span className="sales-stat-icon">
            <Receipt size={20} />
          </span>
          <div>
            <div className="sales-stat-value">{stats.count}</div>
            <div className="sales-stat-label">On this page</div>
          </div>
        </div>
        <div className="sales-stat-card">
          <span className="sales-stat-icon">
            <Banknote size={20} />
          </span>
          <div>
            <div className="sales-stat-value is-revenue">
              {formatMoneyAmount(stats.revenue, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="sales-stat-label">Page revenue (LKR)</div>
          </div>
        </div>
        <div className="sales-stat-card">
          <span className="sales-stat-icon">
            <Users size={20} />
          </span>
          <div>
            <div className="sales-stat-value">{stats.walkIns}</div>
            <div className="sales-stat-label">Walk-ins on page</div>
          </div>
        </div>
      </div>

      <section className="sales-filters">
        <h2 className="sales-filters-title">Find transactions</h2>
        <div className="sales-filters-grid">
          <div className="sales-filter-field">
            <label htmlFor="sales-search">Search</label>
            <Input
              id="sales-search"
              type="search"
              placeholder="Invoice # or customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {saleStatus === 'COMPLETED' && <div className="sales-filter-field sales-filter-date">
            <label htmlFor="sales-start">Date range</label>
            <div className="sales-date-range">
              <Input
                id="sales-start"
                aria-label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartDate(newStart);
                  if (endDate && newStart && endDate < newStart) setEndDate(newStart);
                }}
              />
              <span>to</span>
              <Input
                id="sales-end"
                aria-label="End date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>}
          <div className="sales-filter-field">
            <Label>Type</Label>
            <Select value={saleStatus} onValueChange={(value) => setSaleStatus(value as 'COMPLETED' | 'PENDING')}>
              <SelectTrigger aria-label="Transaction type">
                <SelectValue placeholder="All transactions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETED">Completed sales</SelectItem>
                <SelectItem value="PENDING">POS drafts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sales-filter-field">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger aria-label="Branch">
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
            <h2>{saleStatus === 'PENDING' ? 'POS Drafts' : 'Transactions'}</h2>
            <p>
              {pagination.total} result{pagination.total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="sales-empty">No transactions found. Try changing your search or filters.</div>
        ) : (
          <>
            <div className="sales-cards">
              {sales.map((sale) => (
                <article key={sale.id} className="sales-card">
                  <div className="sales-card-top">
                    <div>
                      <div className="sales-sale-number">{sale.saleNumber}</div>
                      <div className="sales-sale-date">{formatSriLankaDateTime(sale.createdAt)}</div>
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
                      <strong>Total (LKR):</strong>{' '}
                      <span className="sales-total-cell">{formatMoneyAmount(sale.total)}</span>
                    </div>
                  </div>
                  <div className="sales-card-actions">
                    {saleStatus === 'COMPLETED' && <button
                      type="button"
                      className="sales-view-btn"
                      style={{
                        flex: 1,
                        background: '#f0f9ff',
                        color: '#0284c7',
                        border: '1px solid #bae6fd',
                        justifyContent: 'center',
                      }}
                      onClick={() =>
                        setEbillModalSale({ id: sale.id, customerName: sale.customerName })
                      }
                    >
                      <Smartphone size={14} />
                      eBill SMS
                    </button>}
                    <Link
                      to={`/salon/sales/${sale.id}`}
                      className="sales-view-btn"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Eye size={14} />
                      View invoice
                    </Link>
                  </div>
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
                      <td className="sales-sale-date">{formatSriLankaDateTime(sale.createdAt)}</td>
                      <td>{sale.branchName}</td>
                      <td>{sale.customerName || 'Walk-in'}</td>
                      <td className="num sales-total-cell">{formatMoneyAmount(sale.total)}</td>
                      <td>
                        <SaleStatusBadge status={sale.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {saleStatus === 'COMPLETED' && <button
                            type="button"
                            className="sales-view-btn"
                            title="Send or Resend eBill SMS"
                            style={{
                              background: '#f0f9ff',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                            }}
                            onClick={() =>
                              setEbillModalSale({
                                id: sale.id,
                                customerName: sale.customerName,
                                customerPhone: sale.customerPhone,
                              })
                            }
                          >
                            <Smartphone size={14} />
                            eBill SMS
                          </button>}
                          <Link to={`/salon/sales/${sale.id}`} className="sales-view-btn">
                            <Eye size={14} />
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <OpsPagination
          page={pagination.page || page}
          limit={pagination.limit || limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onLimitChange={setLimit}
          itemLabel="transactions"
        />
      </section>

      {ebillModalSale && (
        <SendEbillModal
          open={!!ebillModalSale}
          onOpenChange={(open) => {
            if (!open) setEbillModalSale(null);
          }}
          saleId={ebillModalSale.id}
          customerName={ebillModalSale.customerName}
          defaultPhone={ebillModalSale.customerPhone}
        />
      )}
    </div>
  );
}
