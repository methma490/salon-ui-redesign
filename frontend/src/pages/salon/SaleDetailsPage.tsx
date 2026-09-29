import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Scissors, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import { printReceipt } from '@/lib/print-receipt';
import { formatSriLankaDate, formatSriLankaTime } from '@/lib/sri-lanka-time';
import { resolveUploadUrl } from '@/lib/upload-url';
import { OpsError, OpsLoading, getErrorMessage } from './salon-ops-ui';
import SendEbillModal from './SendEbillModal';
import './sales-page.css';

interface SaleItemEmployee {
  id: string;
  name: string;
}

interface SaleItem {
  id: string;
  itemType: string;
  serviceId: string | null;
  serviceName: string | null;
  productId: string | null;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  employeeId?: string | null;
  employeeName?: string | null;
  employees?: SaleItemEmployee[];
}

interface SalePayment {
  id: string;
  method: string;
  amount: number;
  status: string;
  referenceNumber: string | null;
  createdAt: string;
}

interface AssignedEmployee {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  designation?: string | null;
  assignmentType: string;
  allocationPercentage: number;
  commissionableAmount: number;
}

interface SaleDetail {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  branchId: string;
  branchName: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  cashierId: string | null;
  cashierName: string | null;
  cashierRole?: string | null;
  createdAt: string;
  assignedEmployees?: AssignedEmployee[];
  items: SaleItem[];
  payments: SalePayment[];
}

function itemStylistName(item: SaleItem) {
  if (item.itemType !== 'service') return null;
  if (item.employeeName) return item.employeeName;
  if (item.employees?.length) {
    return item.employees.map((e) => e.name).join(', ');
  }
  return null;
}

function itemLabel(item: SaleItem) {
  return item.serviceName || item.productName || (item as unknown as { name?: string }).name || (item as unknown as { itemName?: string }).itemName || 'Item';
}

function SaleStatusBadge({ status }: { status: string }) {
  const key = status.toUpperCase();
  const cls =
    key === 'COMPLETED'
      ? 'sale-inv-status sale-inv-status-completed'
      : key === 'CANCELLED' || key === 'REFUNDED'
        ? 'sale-inv-status sale-inv-status-cancelled'
        : 'sale-inv-status sale-inv-status-pending';
  return <span className={cls}>{status}</span>;
}

function InvoiceLogo({ logoUrl }: { logoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveUploadUrl(logoUrl);

  if (!resolved || imgError) {
    return (
      <span className="sale-inv-logo-fallback" aria-hidden>
        <Scissors size={22} />
      </span>
    );
  }

  return (
    <img
      src={resolved}
      alt=""
      className="sale-inv-logo"
      onError={() => setImgError(true)}
    />
  );
}

export default function SaleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [sendEbillOpen, setSendEbillOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => tenantApi.sales.get(id!) as Promise<SaleDetail>,
    enabled: !!id,
  });

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantApi.settings.get,
  });

  if (isLoading) return <OpsLoading />;
  if (isError || !data) {
    return <OpsError message={getErrorMessage(error) || 'Sale not found.'} onRetry={() => void refetch()} />;
  }

  const salon = settings?.salon;

  return (
    <div className="sale-detail-page sales-page emp-page">
      <div className="sale-inv-toolbar">
        <Link to="/salon/sales" className="sale-back-link">
          <ArrowLeft size={16} />
          Sales history
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="sale-print-btn"
            style={{ background: '#0284c7', color: '#fff', border: 'none' }}
            onClick={() => setSendEbillOpen(true)}
          >
            <Send size={16} />
            Send E-Bill
          </button>
          <button
            type="button"
            className="sale-print-btn"
            onClick={() => printReceipt('sale-printable-invoice')}
          >
            <Printer size={16} />
            Print invoice
          </button>
        </div>
      </div>

      <SendEbillModal
        open={sendEbillOpen}
        onOpenChange={setSendEbillOpen}
        saleId={data.id}
        customerName={data.customerName}
        defaultPhone={data.customerPhone}
      />

      <article className="sale-inv-document" id="sale-printable-invoice">
        <header className="sale-inv-brand-row">
          <div className="sale-inv-brand">
            <InvoiceLogo logoUrl={salon?.logoUrl} />
            <div>
              <p className="sale-inv-brand-name">{salon?.name ?? 'Glamour Studio'}</p>
              <p className="sale-inv-brand-tagline">HAIR · BEAUTY · SELF CARE</p>
              {salon?.phone && <p className="sale-inv-brand-meta">{salon.phone}</p>}
            </div>
          </div>

          <div className="sale-inv-meta">
            <p className="sale-inv-meta-label">TAX INVOICE</p>
            <p className="sale-inv-meta-number">{data.saleNumber}</p>
            <p className="sale-inv-meta-line">
              Date: <strong>{formatSriLankaDate(data.createdAt)}</strong>
            </p>
            <p className="sale-inv-meta-line">
              Time: <strong>{formatSriLankaTime(data.createdAt)}</strong>
            </p>
            <div style={{ marginTop: 6 }}>
              <SaleStatusBadge status={data.status} />
            </div>
          </div>
        </header>

        <div className="sale-inv-parties">
          <section className="sale-inv-party">
            <h3>BILL TO</h3>
            <p className="sale-inv-party-name">{data.customerName || 'Walk-in customer'}</p>
            <p className="sale-inv-party-detail">Customer</p>
            <p className="sale-inv-party-detail" style={{ fontWeight: 600, color: data.customerPhone ? '#0f172a' : '#94a3b8', marginTop: 3 }}>
              {data.customerPhone || '—'}
            </p>
          </section>
          <section className="sale-inv-party">
            <h3>SALE DETAILS</h3>
            <p className="sale-inv-party-name">{data.branchName || 'Main Branch'}</p>
            <p className="sale-inv-party-detail">Branch location</p>
            {data.cashierName && (
              <p className="sale-inv-party-detail">
                Cashier: <strong>{data.cashierName}</strong>
                {data.cashierRole ? (
                  <span className="sale-inv-cashier-role"> ({data.cashierRole})</span>
                ) : null}
              </p>
            )}
          </section>
        </div>

        <div className="sale-inv-table-wrap">
          <table className="sale-inv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>DESCRIPTION</th>
                <th>TYPE</th>
                <th>STYLIST</th>
                <th className="num">QTY</th>
                <th className="num">UNIT PRICE (LKR)</th>
                <th className="num">AMOUNT (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="sale-inv-row-num">{index + 1}</td>
                  <td className="sale-inv-desc">{itemLabel(item)}</td>
                  <td>
                    <span
                      className={`sale-type-badge ${item.itemType === 'service' ? 'sale-type-service' : 'sale-type-product'}`}
                    >
                      {item.itemType === 'service' ? 'SERVICE' : 'PRODUCT'}
                    </span>
                  </td>
                  <td className="sale-inv-muted">{itemStylistName(item) || '—'}</td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">{formatMoneyAmount(Number(item.unitPrice))}</td>
                  <td className="num sale-inv-line-total">{formatMoneyAmount(Number(item.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile lines list fallback */}
        <div className="sale-inv-mobile-lines">
          {data.items.map((item, index) => (
            <div key={item.id} className="sale-inv-mobile-line">
              <div className="sale-inv-mobile-line-top">
                <span className="sale-inv-row-num">{index + 1}</span>
                <div>
                  <strong>{itemLabel(item)}</strong>
                  <span
                    className={`sale-type-badge ${item.itemType === 'service' ? 'sale-type-service' : 'sale-type-product'}`}
                    style={{ marginLeft: 6 }}
                  >
                    {item.itemType === 'service' ? 'SERVICE' : 'PRODUCT'}
                  </span>
                </div>
                <strong className="sale-inv-line-total">{formatMoneyAmount(Number(item.total))}</strong>
              </div>
              <p className="sale-inv-mobile-line-meta">
                Qty {item.quantity} × {formatMoneyAmount(Number(item.unitPrice))}
                {itemStylistName(item) ? ` · Stylist: ${itemStylistName(item)}` : ''}
              </p>
            </div>
          ))}
        </div>

        <div className="sale-inv-totals-wrap">
          <div className="sale-inv-totals">
            <div className="sale-inv-totals-row">
              <span>Subtotal</span>
              <span>LKR {formatMoneyAmount(data.subtotal)}</span>
            </div>
            <div className="sale-inv-totals-row">
              <span>Discount</span>
              <span>- LKR {formatMoneyAmount(data.discount)}</span>
            </div>
            <div className="sale-inv-grand-total-callout">
              <span className="sale-inv-grand-total-label">Total paid</span>
              <span className="sale-inv-grand-total-val">{formatMoneyLkr(data.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Breakdown Card matching Image 1 */}
        {data.payments && data.payments.length > 0 && (
          <div className="sale-inv-payment-card">
            <div className="sale-inv-payment-card-title">PAYMENT BREAKDOWN</div>
            <table className="sale-inv-payment-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>PAYMENT METHOD</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td style={{ color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {p.method.toLowerCase()}
                      {p.referenceNumber ? ` (${p.referenceNumber})` : ''}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoneyAmount(Number(p.amount))}</td>
                  </tr>
                ))}
                <tr className="sale-inv-payment-total-row">
                  <td colSpan={2} style={{ fontWeight: 800, fontSize: 14 }}>Total Payments</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14 }}>
                    {formatMoneyLkr(data.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <footer className="sale-inv-footer">
          <div className="sale-inv-footer-inner">
            <div className="sale-inv-footer-left">
              <h4>Thank You!</h4>
              <p>We appreciate your visit!</p>
            </div>
            <div className="sale-inv-footer-right">
              <div className="sale-inv-footer-salon-name">{salon?.name ?? 'Glamour Studio'}</div>
              <div className="sale-inv-footer-tagline">LOOK GOOD · FEEL GOOD · ALWAYS YOU</div>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
