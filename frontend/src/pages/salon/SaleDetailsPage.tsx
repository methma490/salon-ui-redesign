import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, MapPin, Printer, User, Wallet } from 'lucide-react';
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

function itemStylistName(item: SaleItem) {
  if (item.itemType !== 'service') return null;
  if (item.employeeName) return item.employeeName;
  if (item.employees?.length) {
    return item.employees.map((e) => e.name).join(', ');
  }
  return null;
}

function userInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
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

function ItemTypeBadge({ type }: { type: string }) {
  const isService = type === 'service';
  return (
    <span className={`sale-type-badge ${isService ? 'sale-type-service' : 'sale-type-product'}`}>
      {isService ? 'Service' : 'Product'}
    </span>
  );
}

export default function SaleDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => tenantApi.sales.get(id!) as Promise<SaleDetail>,
    enabled: !!id,
  });

  if (isLoading) return <OpsLoading />;
  if (isError || !data) {
    return <OpsError message={getErrorMessage(error) || 'Sale not found.'} onRetry={() => void refetch()} />;
  }

  const saleDate = new Date(data.createdAt);

  return (
    <div className="sale-detail-page sales-page emp-page">
      <header className="sale-invoice-header">
        <div className="sale-invoice-header-left">
          <Link to="/salon/sales" className="sale-back-link">
            <ArrowLeft size={16} />
            Sales history
          </Link>
          <div className="sale-invoice-title-block">
            <div className="sale-invoice-title-row">
              <h1>{data.saleNumber}</h1>
              <SaleStatusBadge status={data.status} />
            </div>
            <p className="sale-invoice-subtitle">Sale receipt · {data.branchName}</p>
          </div>
        </div>
        <button type="button" className="sale-print-btn" onClick={() => window.print()}>
          <Printer size={16} />
          Print receipt
        </button>
      </header>

      <div className="sale-invoice-layout">
        <div className="sale-invoice-main">
          <section className="sale-invoice-card">
            <div className="sale-invoice-card-head">
              <h2>Line items</h2>
              <span>{data.items.length} item{data.items.length === 1 ? '' : 's'}</span>
            </div>

            <div className="sale-invoice-table-wrap">
              <table className="sale-invoice-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Stylist</th>
                    <th className="num">Qty</th>
                    <th className="num">Unit (LKR)</th>
                    <th className="num">Total (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => {
                    const stylist = itemStylistName(item);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="sale-invoice-item-cell">
                            <ItemTypeBadge type={item.itemType} />
                            <span className="sale-invoice-item-name">
                              {item.serviceName || item.productName || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="sale-invoice-muted">{stylist || '—'}</td>
                        <td className="num">{item.quantity}</td>
                        <td className="num">{formatMoney(Number(item.unitPrice))}</td>
                        <td className="num sale-invoice-amount">{formatMoney(Number(item.total))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sale-invoice-mobile-items">
              {data.items.map((item) => {
                const stylist = itemStylistName(item);
                return (
                  <div key={item.id} className="sale-invoice-mobile-item">
                    <div className="sale-invoice-mobile-item-top">
                      <ItemTypeBadge type={item.itemType} />
                      <strong>{item.serviceName || item.productName || '—'}</strong>
                      <span className="sale-invoice-amount">LKR {formatMoney(Number(item.total))}</span>
                    </div>
                    <div className="sale-invoice-mobile-item-meta">
                      {stylist && <span>Stylist: {stylist}</span>}
                      <span>
                        {item.quantity} × LKR {formatMoney(Number(item.unitPrice))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="sale-invoice-aside">
          <section className="sale-invoice-card sale-invoice-summary">
            <p className="sale-invoice-summary-label">Amount collected</p>
            <p className="sale-invoice-summary-total">LKR {formatMoney(data.total)}</p>
            <div className="sale-invoice-summary-rows">
              <div className="sale-invoice-summary-row">
                <span>Subtotal</span>
                <span>LKR {formatMoney(data.subtotal)}</span>
              </div>
              <div className="sale-invoice-summary-row">
                <span>Discount</span>
                <span>- LKR {formatMoney(data.discount)}</span>
              </div>
            </div>
          </section>

          <section className="sale-invoice-card">
            <h3 className="sale-invoice-aside-title">Sale info</h3>
            <ul className="sale-invoice-meta-list">
              <li>
                <Calendar size={15} />
                <span>{saleDate.toLocaleString()}</span>
              </li>
              <li>
                <MapPin size={15} />
                <span>{data.branchName}</span>
              </li>
              <li>
                <User size={15} />
                <span>{data.customerName || 'Walk-in customer'}</span>
              </li>
            </ul>
          </section>

          <section className="sale-invoice-card sale-invoice-cashier-card">
            <h3 className="sale-invoice-aside-title">Cashier</h3>
            <div className="sale-invoice-cashier">
              <span className="sale-invoice-cashier-avatar">
                {data.cashierName ? userInitials(data.cashierName) : '—'}
              </span>
              <div>
                <strong>{data.cashierName || '—'}</strong>
                <p>Processed this sale at POS</p>
              </div>
            </div>
          </section>

          <section className="sale-invoice-card">
            <h3 className="sale-invoice-aside-title">Payments</h3>
            {data.payments.length === 0 ? (
              <p className="sale-invoice-empty">No payment records.</p>
            ) : (
              <ul className="sale-invoice-payments">
                {data.payments.map((payment) => (
                  <li key={payment.id} className="sale-invoice-payment">
                    <div className="sale-invoice-payment-top">
                      <span className="sale-invoice-payment-method">
                        <Wallet size={14} />
                        {formatPaymentMethod(payment.method)}
                      </span>
                      <strong>LKR {formatMoney(Number(payment.amount))}</strong>
                    </div>
                    {payment.referenceNumber && (
                      <p className="sale-invoice-payment-ref">Ref: {payment.referenceNumber}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
