import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { tenantApi } from '@/api/tenant.api';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { getErrorMessage, OpsError, OpsLoading, OpsPageHeader } from './salon-ops-ui';
import { formatMoneyAmount, moneyHeader } from '@/lib/money';
import { formatSriLankaDate } from '@/lib/sri-lanka-time';
import './employees-page.css';

function statusClass(status: string) {
  if (status === 'ACCEPTED' || status === 'CONVERTED') return 'emp-qty-badge emp-qty-badge-ok';
  if (status === 'SENT') return 'emp-qty-badge emp-qty-badge-low';
  if (status === 'DECLINED' || status === 'CANCELLED' || status === 'EXPIRED') {
    return 'emp-qty-badge emp-qty-badge-out';
  }
  return 'emp-qty-badge';
}

export default function QuotationsPage() {
  const { branchId, setBranchId, branches } = useSalonBranch();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedSearch(search, 400, 2);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['quotations', branchId, status, debouncedSearch, page],
    queryFn: () =>
      tenantApi.quotations.list({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        branchId: branchId === 'all' ? undefined : branchId,
        status: status === 'all' ? undefined : status,
      }),
  });

  if (query.isLoading) return <OpsLoading />;
  if (query.isError) {
    return <OpsError message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="emp-page">
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
        title="Quotations"
        subtitle="Create tenant-branded quotations and convert accepted quotes to invoices"
        action={
          <Button asChild>
            <Link to="/salon/quotations/new">New Quotation</Link>
          </Button>
        }
      />

      <div className="emp-toolbar">
        <div className="emp-toolbar-filters" style={{ flexWrap: 'wrap', gap: 8 }}>
          <Input
            placeholder="Search quote / customer / phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[240px]"
          />
          <Select
            value={branchId}
            onValueChange={(v) => {
              setBranchId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="emp-select w-full sm:w-[160px]">
              <SelectValue placeholder="Branch" />
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
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="emp-select w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED', 'CANCELLED'].map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="emp-panel">
        {rows.length === 0 ? (
          <div className="emp-empty">No quotations yet.</div>
        ) : (
          <div className="emp-table-wrap">
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Branch</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th>{moneyHeader('Total')}</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="emp-name-cell">{row.quotationNo}</td>
                    <td>{row.customerName}</td>
                    <td>{row.customerPhone || '—'}</td>
                    <td>{row.branchName}</td>
                    <td>{formatSriLankaDate(row.quotationDate)}</td>
                    <td>{row.validUntil ? formatSriLankaDate(row.validUntil) : '—'}</td>
                    <td>{formatMoneyAmount(row.totalAmount)}</td>
                    <td>
                      <span className={statusClass(row.displayStatus)}>{row.displayStatus}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/salon/quotations/${row.id}`}>View</Link>
                        </Button>
                        {['DRAFT', 'SENT'].includes(row.status) && (
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/salon/quotations/${row.id}/edit`}>Edit</Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="emp-toolbar" style={{ marginTop: 12 }}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span style={{ fontSize: 13, color: 'var(--emp-muted)' }}>
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
