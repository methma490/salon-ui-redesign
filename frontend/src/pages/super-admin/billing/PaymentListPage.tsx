import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminPayments } from '@/features/billing/hooks/useBilling';
import {
  formatAmount,
  formatDate,
  paymentStatusBadgeClass,
} from '@/features/billing/lib/billing-utils';
import type { AdminPaymentItem } from '@/features/billing/types/billing.types';
import {
  AdminEmpty,
  AdminKv,
  AdminPageHero,
  AdminPagination,
  AdminPanel,
  AdminStatCard,
} from '@/pages/super-admin/billing/AdminBillingUi';
import { OpsError, OpsLoading } from '@/pages/salon/salon-ops-ui';
import '@/pages/super-admin/billing/admin-billing-page.css';

type PaymentFilter = 'ALL' | 'SUCCESS' | 'FAILED';

function PaymentCard({ payment }: { payment: AdminPaymentItem }) {
  return (
    <article className="admin-card">
      <div className="admin-card-top">
        <div>
          <h3 className="admin-card-title">{payment.tenant.name}</h3>
          <div className="admin-card-sub">{payment.reference}</div>
        </div>
        <span className={paymentStatusBadgeClass(payment.status)}>{payment.status}</span>
      </div>

      <div className="admin-kv-grid">
        <AdminKv label="Plan" value={payment.plan.name} />
        <AdminKv
          label="Amount"
          value={formatAmount(payment.amount, payment.currency)}
          amount
        />
        <AdminKv label="Gateway" value={payment.gateway} />
        <AdminKv
          label="Date"
          value={formatDate(payment.payment?.paidAt ?? payment.createdAt)}
        />
        {payment.payment?.transactionId && (
          <AdminKv
            label="Transaction"
            value={payment.payment.transactionId}
            fullWidth
          />
        )}
      </div>
    </article>
  );
}

function PaymentTableRow({ payment }: { payment: AdminPaymentItem }) {
  return (
    <tr>
      <td>
        <div className="admin-card-sub">{payment.reference}</div>
        {payment.payment?.transactionId && (
          <div className="admin-card-meta">TX: {payment.payment.transactionId}</div>
        )}
      </td>
      <td>
        <div className="admin-card-title">{payment.tenant.name}</div>
        <div className="admin-card-sub">{payment.tenant.code}</div>
      </td>
      <td>{payment.plan.name}</td>
      <td>{formatAmount(payment.amount, payment.currency)}</td>
      <td>{payment.gateway}</td>
      <td>
        <span className={paymentStatusBadgeClass(payment.status)}>{payment.status}</span>
      </td>
      <td>{formatDate(payment.payment?.paidAt ?? payment.createdAt)}</td>
    </tr>
  );
}

export default function PaymentListPage() {
  const [filter, setFilter] = useState<PaymentFilter>('ALL');
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      page,
      limit: 10,
      filter: filter === 'ALL' ? undefined : filter,
    }),
    [filter, page],
  );

  const { data, isLoading, isError, refetch } = useAdminPayments(params);
  const items = data?.data ?? [];

  if (isLoading) return <OpsLoading />;
  if (isError) {
    return <OpsError message="Failed to load payments." onRetry={() => void refetch()} />;
  }

  const successCount = items.filter((p) => p.status === 'PAID').length;
  const failedCount = items.filter(
    (p) => p.status === 'FAILED' || p.status === 'CANCELLED',
  ).length;

  return (
    <div className="admin-page">
      <AdminPageHero
        title="Payments"
        subtitle="Review successful and failed payment orders across all salons"
      />

      <section className="admin-stats" aria-label="Payment summary">
        <AdminStatCard label="Total Orders" value={data?.meta.total ?? 0} />
        <AdminStatCard label="Successful (page)" value={successCount} />
        <AdminStatCard label="Failed (page)" value={failedCount} />
      </section>

      <AdminPanel
        title="Payment Orders"
        description="Gateway-verified payment records"
        filters={
          <div className="admin-filters">
            <div className="admin-filter-field">
              <Label>Result</Label>
              <Select
                value={filter}
                onValueChange={(v) => {
                  setFilter(v as PaymentFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All payments</SelectItem>
                  <SelectItem value="SUCCESS">Successful</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        footer={
          <AdminPagination meta={data?.meta} page={page} onPageChange={setPage} />
        }
      >
        {items.length === 0 ? (
          <AdminEmpty message="No payment orders found." />
        ) : (
          <>
            <div className="admin-grid">
              {items.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Salon</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Gateway</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((payment) => (
                    <PaymentTableRow key={payment.id} payment={payment} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminPanel>
    </div>
  );
}
