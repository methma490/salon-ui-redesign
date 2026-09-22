import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Phone, Mail, Printer, Scissors } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import { getErrorMessage } from '@/pages/salon/salon-ops-ui';

interface PublicInvoiceData {
  token?: string;
  id?: string;
  invoiceNumber?: string;
  saleNumber?: string;
  date?: string | Date;
  createdAt?: string | Date;
  subtotal: number;
  discount: number;
  tax?: number;
  total: number;
  status: string;
  branchName?: string;
  customer?: {
    name: string | null;
    phone?: string | null;
    maskedPhone: string | null;
  };
  customerName?: string | null;
  customerPhone?: string | null;
  salon: {
    name: string;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    primaryColor?: string | null;
  };
  items: Array<{
    id?: string;
    type?: 'service' | 'product';
    itemType?: string;
    name?: string;
    serviceName?: string | null;
    productName?: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  payments: Array<{
    id?: string;
    method: string;
    amount: number;
    status: string;
    date?: string | Date;
    createdAt?: string | Date;
  }>;
}

function formatPaymentMethod(method?: string) {
  if (!method) return '—';
  return method
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function formatInvoiceDate(dateVal?: string | Date) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Colombo',
  });
}

function formatInvoiceTime(dateVal?: string | Date) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Colombo',
  });
}

export default function PublicEbillPage() {
  const { token, id } = useParams<{ token?: string; id?: string }>();
  const activeIdentifier = token || id || '';

  const query = useQuery<PublicInvoiceData>({
    queryKey: ['public-ebill', activeIdentifier],
    queryFn: async () => {
      if (token) {
        return (await tenantApi.publicInvoices.getByToken(token)) as PublicInvoiceData;
      }
      return (await tenantApi.publicSales.getEbill(id!)) as PublicInvoiceData;
    },
    enabled: !!activeIdentifier,
  });

  if (query.isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#64748b',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #e2e8f0',
            borderTopColor: '#0284c7',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: 14, fontWeight: 500 }}>Loading Digital E-Bill…</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#0f172a',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 400,
            background: '#ffffff',
            padding: 32,
            borderRadius: 16,
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              background: '#fef2f2',
              color: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            !
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
            Receipt Not Found
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            {getErrorMessage(query.error) ||
              'This digital receipt link may be invalid, expired, or has been removed.'}
          </p>
        </div>
      </div>
    );
  }

  const ebill = query.data;
  const invoiceNo = ebill.invoiceNumber || ebill.saleNumber || 'RECEIPT';
  const invoiceDate = ebill.date || ebill.createdAt;
  const customerName = ebill.customer?.name || ebill.customerName || 'Walk-in Customer';
  const customerPhone =
    ebill.customer?.phone || ebill.customerPhone || ebill.customer?.maskedPhone;
  const brandColor = ebill.salon?.primaryColor || '#0284c7';
  const taxAmount = Number(ebill.tax || 0);

  return (
    <div
      className="ebill-page-wrapper"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        className="ebill-receipt-card"
        style={{
          width: '100%',
          maxWidth: 540,
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.12)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Salon Branding Header */}
        <div
          className="ebill-header"
          style={{
            background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`,
            color: '#ffffff',
            padding: '28px 24px',
            textAlign: 'center',
            position: 'relative',
            borderBottom: `3px solid ${brandColor}`,
          }}
        >
          {ebill.salon.logoUrl ? (
            <img
              src={ebill.salon.logoUrl}
              alt={ebill.salon.name}
              style={{
                maxHeight: 56,
                maxWidth: 200,
                margin: '0 auto 12px auto',
                display: 'block',
                borderRadius: 8,
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <Scissors size={24} color="#38bdf8" />
            </div>
          )}

          <h1
            className="ebill-header-title"
            style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {ebill.salon.name}
          </h1>

          <div
            className="ebill-header-contacts"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 6,
              color: '#94a3b8',
              fontSize: 12,
            }}
          >
            {ebill.salon.phone && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={12} /> {ebill.salon.phone}
              </span>
            )}
            {ebill.salon.email && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Mail size={12} /> {ebill.salon.email}
              </span>
            )}
          </div>

          <div
            className="ebill-paid-badge"
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} /> Official Digital E-Bill · Paid
          </div>
        </div>

        {/* Invoice Meta Grid */}
        <div style={{ padding: 24 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              padding: 16,
              background: '#f8fafc',
              borderRadius: 12,
              marginBottom: 20,
              fontSize: 13,
              border: '1px solid #f1f5f9',
            }}
          >
            <div>
              <span
                style={{
                  color: '#64748b',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Invoice No
              </span>
              <p style={{ margin: '3px 0 0', fontWeight: 700, color: '#0f172a' }}>{invoiceNo}</p>
            </div>

            <div>
              <span
                style={{
                  color: '#64748b',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Date & Time
              </span>
              <p style={{ margin: '3px 0 0', color: '#334155', fontWeight: 500 }}>
                {formatInvoiceDate(invoiceDate)} · {formatInvoiceTime(invoiceDate)}
              </p>
            </div>

            <div>
              <span
                style={{
                  color: '#64748b',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Customer
              </span>
              <p style={{ margin: '3px 0 0', color: '#0f172a', fontWeight: 600 }}>{customerName}</p>
              {customerPhone && (
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>{customerPhone}</p>
              )}
            </div>

            <div>
              <span
                style={{
                  color: '#64748b',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Location / Branch
              </span>
              <p style={{ margin: '3px 0 0', color: '#334155', fontWeight: 500 }}>
                {ebill.branchName || 'Main Salon'}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600 }}>Item</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 600 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>Price</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(ebill.items) ? ebill.items : []).map((item, idx) => {
                const displayName =
                  item.name || item.serviceName || item.productName || `Item #${idx + 1}`;
                const itemTypeBadge =
                  item.type === 'service' || item.itemType === 'service' ? 'Service' : 'Product';

                return (
                  <tr
                    key={item.id || `${displayName}-${idx}`}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '10px 4px', color: '#0f172a', fontWeight: 500 }}>
                      <div>{displayName}</div>
                      <span
                        style={{
                          fontSize: 10,
                          color: '#64748b',
                          background: '#f1f5f9',
                          padding: '1px 6px',
                          borderRadius: 4,
                          display: 'inline-block',
                          marginTop: 2,
                        }}
                      >
                        {itemTypeBadge}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 4px', color: '#475569' }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 4px', color: '#475569' }}>
                      {formatMoneyAmount(item.unitPrice)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '10px 4px',
                        color: '#0f172a',
                        fontWeight: 600,
                      }}
                    >
                      {formatMoneyAmount(item.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div
            style={{
              borderTop: '2px dashed #e2e8f0',
              paddingTop: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontSize: 13,
                color: '#475569',
              }}
            >
              <span>Subtotal</span>
              <span>{formatMoneyLkr(ebill.subtotal)}</span>
            </div>

            {ebill.discount > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 13,
                  color: '#ef4444',
                }}
              >
                <span>Discount</span>
                <span>-{formatMoneyLkr(ebill.discount)}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 13,
                  color: '#475569',
                }}
              >
                <span>Tax</span>
                <span>{formatMoneyLkr(taxAmount)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid #e2e8f0',
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              <span>Total Paid</span>
              <span style={{ color: brandColor }}>{formatMoneyLkr(ebill.total)}</span>
            </div>

            {ebill.payments && ebill.payments.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {(Array.isArray(ebill.payments) ? ebill.payments : []).map((p, idx) => (
                  <span
                    key={p.id || idx}
                    style={{
                      background: '#f1f5f9',
                      color: '#334155',
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {formatPaymentMethod(p.method)} · {formatMoneyLkr(p.amount)} (COMPLETED)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="no-print" style={{ display: 'flex', gap: 12 }}>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 42,
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              <Printer size={16} /> Print / Save PDF Receipt
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div
          className="ebill-footer-note"
          style={{
            background: '#f8fafc',
            padding: '16px 24px',
            textAlign: 'center',
            borderTop: '1px solid #e2e8f0',
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          Thank you for choosing {ebill.salon.name}!
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 8mm;
            size: auto;
          }
          html, body, #root {
            background: #ffffff !important;
            color: #0f172a !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          .ebill-page-wrapper {
            min-height: 0 !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            width: 100% !important;
          }
          .ebill-receipt-card {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            overflow: visible !important;
            background: #ffffff !important;
            page-break-inside: avoid;
          }
          .ebill-header {
            background: #f8fafc !important;
            color: #0f172a !important;
            border-bottom: 2px solid #0f172a !important;
            padding: 20px 24px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .ebill-header-title {
            color: #0f172a !important;
          }
          .ebill-header-contacts, .ebill-header-contacts span {
            color: #475569 !important;
          }
          .ebill-paid-badge {
            background: #f0fdf4 !important;
            border: 1px solid #16a34a !important;
            color: #15803d !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
