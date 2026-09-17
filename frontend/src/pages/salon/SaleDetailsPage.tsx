import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Scissors } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { OpsError, OpsLoading, getErrorMessage } from './salon-ops-ui';
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
  cashierId: string | null;
  cashierName: string | null;
  createdAt: string;
  assignedEmployees?: AssignedEmployee[];
  items: SaleItem[];
  payments: SalePayment[];
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPaymentMethod(method: string) {
  return method
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function formatInvoiceDate(value: string) {
  return new Date(value).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatInvoiceTime(value: string) {
  return new Date(value).toLocaleTimeString('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
  });
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
  return item.serviceName || item.productName || '—';
}

function itemTypeLabel(type: string) {
  return type === 'service' ? 'Service' : 'Product';
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

export default function SaleDetailsPage() {
  const { id } = useParams<{ id: string }>();

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
  const primaryPayment = data.payments[0];
  const paymentLabel =
    data.payments.length === 0
      ? '—'
      : data.payments.length === 1
        ? formatPaymentMethod(primaryPayment.method)
        : data.payments.map((p) => formatPaymentMethod(p.method)).join(', ');

  return (
    <div className="sale-detail-page sales-page emp-page">
      <div className="sale-inv-toolbar">
        <Link to="/salon/sales" className="sale-back-link">
          <ArrowLeft size={16} />
          Sales history
        </Link>
        <button type="button" className="sale-print-btn" onClick={() => window.print()}>
          <Printer size={16} />
          Print invoice
        </button>
      </div>

      <article className="sale-inv-document">
        <header className="sale-inv-brand-row">
          <div className="sale-inv-brand">
            {salon?.logoUrl ? (
              <img src={salon.logoUrl} alt="" className="sale-inv-logo" />
            ) : (
              <span className="sale-inv-logo-fallback" aria-hidden>
                <Scissors size={22} />
              </span>
            )}
            <div>
              <p className="sale-inv-brand-name">{salon?.name ?? 'Salon'}</p>
              {salon?.email && <p className="sale-inv-brand-meta">{salon.email}</p>}
              {salon?.phone && <p className="sale-inv-brand-meta">{salon.phone}</p>}
            </div>
          </div>

          <div className="sale-inv-meta">
            <p className="sale-inv-meta-label">Tax Invoice</p>
            <p className="sale-inv-meta-number">{data.saleNumber}</p>
            <p className="sale-inv-meta-line">
              Date: <strong>{formatInvoiceDate(data.createdAt)}</strong>
            </p>
            <p className="sale-inv-meta-line">
              Time: <strong>{formatInvoiceTime(data.createdAt)}</strong>
            </p>
            <SaleStatusBadge status={data.status} />
          </div>
        </header>

        <div className="sale-inv-parties">
          <section className="sale-inv-party">
            <h3>Bill to</h3>
            <p className="sale-inv-party-name">{data.customerName || 'Walk-in customer'}</p>
            <p className="sale-inv-party-detail">Customer</p>
          </section>
          <section className="sale-inv-party">
            <h3>Sale details</h3>
            <p className="sale-inv-party-name">{data.branchName}</p>
            <p className="sale-inv-party-detail">Branch location</p>
            {data.cashierName && (
              <p className="sale-inv-party-detail">
                Cashier: <strong>{data.cashierName}</strong>
              </p>
            )}
          </section>
        </div>

        {data.assignedEmployees && data.assignedEmployees.length > 0 && (
          <section className="sale-inv-party" style={{ marginBottom: '1.25rem' }}>
            <h3>Assigned employees</h3>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
              {data.assignedEmployees.map((emp) => (
                <li key={emp.employeeId} className="sale-inv-party-detail">
                  <strong>{emp.employeeName}</strong> · {emp.assignmentType} ·{' '}
                  {emp.allocationPercentage}% · LKR {formatMoney(emp.commissionableAmount)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <dl className="sale-inv-summary-grid">
          <div>
            <dt>Payment method</dt>
            <dd>{paymentLabel}</dd>
          </div>
          <div>
            <dt>Line items</dt>
            <dd>
              {data.items.length} item{data.items.length === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>LKR</dd>
          </div>
        </dl>

        <div className="sale-inv-table-wrap">
          <table className="sale-inv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Type</th>
                <th>Stylist</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Amount</th>
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
                      {itemTypeLabel(item.itemType)}
                    </span>
                  </td>
                  <td className="sale-inv-muted">{itemStylistName(item) || '—'}</td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">{formatMoney(Number(item.unitPrice))}</td>
                  <td className="num sale-inv-line-total">{formatMoney(Number(item.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sale-inv-mobile-lines">
          {data.items.map((item, index) => (
            <div key={item.id} className="sale-inv-mobile-line">
              <div className="sale-inv-mobile-line-top">
                <span className="sale-inv-row-num">{index + 1}</span>
                <strong>{itemLabel(item)}</strong>
                <span className="sale-inv-line-total">LKR {formatMoney(Number(item.total))}</span>
              </div>
              <p className="sale-inv-mobile-line-meta">
                {itemTypeLabel(item.itemType)}
                {itemStylistName(item) ? ` · ${itemStylistName(item)}` : ''} · {item.quantity} × LKR{' '}
                {formatMoney(Number(item.unitPrice))}
              </p>
            </div>
          ))}
        </div>

        <div className="sale-inv-totals-wrap">
          <div className="sale-inv-totals">
            <div className="sale-inv-totals-row">
              <span>Subtotal</span>
              <span>LKR {formatMoney(data.subtotal)}</span>
            </div>
            <div className="sale-inv-totals-row">
              <span>Discount</span>
              <span>- LKR {formatMoney(data.discount)}</span>
            </div>
            <div className="sale-inv-totals-row sale-inv-totals-grand">
              <span>Total paid</span>
              <span>LKR {formatMoney(data.total)}</span>
            </div>
          </div>
        </div>

        {data.payments.length > 0 && (
          <section className="sale-inv-payments-block">
            <h3>Payment breakdown</h3>
            <ul className="sale-inv-payments-list">
              {data.payments.map((payment) => (
                <li key={payment.id}>
                  <span>{formatPaymentMethod(payment.method)}</span>
                  <span>LKR {formatMoney(Number(payment.amount))}</span>
                  {payment.referenceNumber && (
                    <span className="sale-inv-payment-ref">Ref: {payment.referenceNumber}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="sale-inv-footer">
          <p>Thank you for your visit.</p>
          <p>
            This document was generated by {salon?.name ?? 'Salon SaaS'} · {data.saleNumber}
          </p>
        </footer>
      </article>
    </div>
  );
}
