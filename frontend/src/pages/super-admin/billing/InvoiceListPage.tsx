import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { adminBillingApi } from '@/features/billing/api/billing.api';
import { useAdminInvoices } from '@/features/billing/hooks/useBilling';
import {
  formatAmount,
  formatDate,
  invoiceStatusBadgeClass,
} from '@/features/billing/lib/billing-utils';
import type { AdminInvoiceItem } from '@/features/billing/types/billing.types';
import {
  AdminEmpty,
  AdminKv,
  AdminPageHero,
  AdminPagination,
  AdminPanel,
  AdminStatCard,
} from '@/pages/super-admin/billing/AdminBillingUi';
import { OpsError, OpsIconButton, OpsLoading } from '@/pages/salon/salon-ops-ui';
import '@/pages/super-admin/billing/admin-billing-page.css';

function InvoiceCard({
  invoice,
  downloading,
  onDownload,
}: {
  invoice: AdminInvoiceItem;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <article className="admin-card">
      <div className="admin-card-top">
        <div>
          <h3 className="admin-card-title">{invoice.invoiceNumber}</h3>
          <div className="admin-card-sub">{invoice.salonName}</div>
        </div>
        <span className={invoiceStatusBadgeClass(invoice.status)}>{invoice.status}</span>
      </div>

      <div className="admin-kv-grid">
        <AdminKv label="Plan" value={invoice.planName} />
        <AdminKv
          label="Amount"
          value={formatAmount(invoice.total, invoice.currency)}
          amount
        />
        <AdminKv label="Billing" value={invoice.billingCycle.toLowerCase()} />
        <AdminKv
          label="Payment Date"
          value={formatDate(invoice.paidAt ?? invoice.issueDate)}
        />
        {invoice.paymentReference && (
          <AdminKv label="Reference" value={invoice.paymentReference} fullWidth />
        )}
      </div>

      <div className="admin-row-actions">
        <OpsIconButton
          label="Download invoice"
          icon={<Download size={16} strokeWidth={2} />}
          disabled={downloading}
          onClick={onDownload}
        />
      </div>
    </article>
  );
}

function InvoiceTableRow({
  invoice,
  downloading,
  onDownload,
}: {
  invoice: AdminInvoiceItem;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <tr>
      <td>
        <div className="admin-card-title">{invoice.invoiceNumber}</div>
        <div className="admin-card-sub">{invoice.paymentReference ?? '—'}</div>
      </td>
      <td>
        <div>{invoice.salonName}</div>
        <div className="admin-card-sub">{invoice.tenant.code}</div>
      </td>
      <td>
        <div>{invoice.planName}</div>
        <div className="admin-card-sub">{invoice.billingCycle.toLowerCase()}</div>
      </td>
      <td>{formatAmount(invoice.total, invoice.currency)}</td>
      <td>{formatDate(invoice.paidAt ?? invoice.issueDate)}</td>
      <td>
        <span className={invoiceStatusBadgeClass(invoice.status)}>{invoice.status}</span>
      </td>
      <td>
        <div className="admin-row-actions">
          <OpsIconButton
            label="Download invoice"
            icon={<Download size={16} strokeWidth={2} />}
            disabled={downloading}
            onClick={onDownload}
          />
        </div>
      </td>
    </tr>
  );
}

export default function InvoiceListPage() {
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const params = useMemo(() => ({ page, limit: 10 }), [page]);
  const { data, isLoading, isError, refetch } = useAdminInvoices(params);
  const items = data?.data ?? [];

  const handleDownload = async (id: string, invoiceNumber: string) => {
    setDownloadingId(id);
    try {
      const { blob, filename } = await adminBillingApi.downloadInvoice(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${invoiceNumber}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) return <OpsLoading />;
  if (isError) {
    return <OpsError message="Failed to load invoices." onRetry={() => void refetch()} />;
  }

  const paidOnPage = items.filter((i) => i.status === 'PAID').length;

  return (
    <div className="admin-page">
      <AdminPageHero
        title="Invoices"
        subtitle="View and download subscription invoices across all salons"
      />

      <section className="admin-stats" aria-label="Invoice summary">
        <AdminStatCard label="Total Invoices" value={data?.meta.total ?? 0} />
        <AdminStatCard label="Paid (page)" value={paidOnPage} />
        <AdminStatCard label="Showing" value={items.length} />
      </section>

      <AdminPanel
        title="Invoice History"
        description="Generated automatically after successful payments"
        footer={
          <AdminPagination meta={data?.meta} page={page} onPageChange={setPage} />
        }
      >
        {items.length === 0 ? (
          <AdminEmpty message="No invoices have been generated yet." />
        ) : (
          <>
            <div className="admin-grid">
              {items.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  downloading={downloadingId === invoice.id}
                  onDownload={() => void handleDownload(invoice.id, invoice.invoiceNumber)}
                />
              ))}
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Salon</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Payment Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((invoice) => (
                    <InvoiceTableRow
                      key={invoice.id}
                      invoice={invoice}
                      downloading={downloadingId === invoice.id}
                      onDownload={() => void handleDownload(invoice.id, invoice.invoiceNumber)}
                    />
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
