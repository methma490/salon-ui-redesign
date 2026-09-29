import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Scissors } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import { buildBrandPalette } from '@/lib/brand-theme';
import { formatMoneyAmount, formatMoneyLkr } from '@/lib/money';
import { printReceipt } from '@/lib/print-receipt';
import { formatSriLankaDate, formatSriLankaTime } from '@/lib/sri-lanka-time';
import { resolveUploadUrl } from '@/lib/upload-url';
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

function EbillLogo({ logoUrl, name, brandColor }: { logoUrl?: string | null; name?: string; brandColor: string }) {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveUploadUrl(logoUrl);

  if (!resolved || imgError) {
    return (
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
        <Scissors size={24} color={brandColor || '#38bdf8'} />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={name || 'Salon'}
      onError={() => setImgError(true)}
      style={{
        maxHeight: 56,
        maxWidth: 200,
        margin: '0 auto 12px auto',
        display: 'block',
        borderRadius: 8,
        objectFit: 'contain',
      }}
    />
  );
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
  const brandColor = ebill.salon?.primaryColor || '#0D5C3D';
  const palette = buildBrandPalette(brandColor);
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
        id="ebill-receipt-card"
        style={{
          width: '100%',
          maxWidth: 600,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.10)',
          overflow: 'hidden',
          border: `1px solid ${palette.border}`,
        }}
      >
        {/* Salon Branding Header matching Image 1 with admin configured brand color */}
        <div
          className="ebill-header"
          style={{
            background: `linear-gradient(135deg, ${palette.soft} 0%, ${palette.softStrong} 45%, #ffffff 85%)`,
            padding: '28px 24px 20px',
            position: 'relative',
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <EbillLogo logoUrl={ebill.salon.logoUrl} name={ebill.salon.name} brandColor={palette.primary} />
              <div>
                <h1
                  className="ebill-header-title"
                  style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}
                >
                  {ebill.salon.name}
                </h1>
                <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#94a3b8', textTransform: 'uppercase' }}>
                  HAIR · BEAUTY · SELF CARE
                </p>
                {ebill.salon.phone && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>{ebill.salon.phone}</p>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '2px 0 4px', letterSpacing: '-0.01em' }}>
                {invoiceNo}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Date: <strong style={{ color: '#334155' }}>{formatSriLankaDate(invoiceDate)}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                Time: <strong style={{ color: '#334155' }}>{formatSriLankaTime(invoiceDate)}</strong>
              </div>
              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: palette.soft,
                    color: palette.primary,
                    border: `1px solid ${palette.border}`,
                    padding: '3px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                  }}
                >
                  PAID
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Sale Details Grid */}
        <div style={{ padding: '24px 24px 12px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 20,
              paddingBottom: 20,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                BILL TO
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {customerName}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Customer</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: customerPhone ? '#0f172a' : '#94a3b8', marginTop: 3 }}>
                {customerPhone || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                SALE DETAILS
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {ebill.branchName || 'Main Branch'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Branch location</div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid #e2e8f0',
                    color: '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '8px 4px', width: 28 }}>#</th>
                  <th style={{ padding: '8px 4px' }}>DESCRIPTION</th>
                  <th style={{ padding: '8px 4px' }}>TYPE</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px' }}>QTY</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px' }}>UNIT PRICE (LKR)</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px' }}>AMOUNT (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(ebill.items) ? ebill.items : []).map((item, idx) => {
                  const displayName =
                    item.name || item.serviceName || item.productName || `Item #${idx + 1}`;
                  const isService = item.type === 'service' || item.itemType === 'service';

                  return (
                    <tr
                      key={item.id || `${displayName}-${idx}`}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '10px 4px', color: '#64748b', fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ padding: '10px 4px', color: '#0f172a', fontWeight: 600 }}>
                        {displayName}
                      </td>
                      <td style={{ padding: '10px 4px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: isService ? palette.primary : '#1d4ed8',
                            background: isService ? palette.soft : '#eff6ff',
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                          }}
                        >
                          {isService ? 'SERVICE' : 'PRODUCT'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 4px', color: '#334155' }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 4px', color: '#334155' }}>
                        {formatMoneyAmount(item.unitPrice)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '10px 4px',
                          color: '#0f172a',
                          fontWeight: 700,
                        }}
                      >
                        {formatMoneyAmount(item.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              marginTop: 16,
              paddingTop: 8,
            }}
          >
            <div style={{ width: 260 }}>
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
                <span>LKR {formatMoneyAmount(ebill.subtotal)}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 13,
                  color: '#475569',
                }}
              >
                <span>Discount</span>
                <span>- LKR {formatMoneyAmount(ebill.discount)}</span>
              </div>

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
                  <span>LKR {formatMoneyAmount(taxAmount)}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: palette.soft,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Total paid</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: palette.primary }}>{formatMoneyLkr(ebill.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Breakdown Card matching Image 1 */}
          {Array.isArray(ebill.payments) && ebill.payments.length > 0 && (
            <div
              style={{
                marginTop: 24,
                padding: '14px 16px',
                borderRadius: 8,
                border: `1px solid ${palette.border}`,
                background: '#fafbfc',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                PAYMENT BREAKDOWN
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>
                    <th style={{ width: 30, textAlign: 'left', padding: '4px 2px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '4px 2px' }}>PAYMENT METHOD</th>
                    <th style={{ textAlign: 'right', padding: '4px 2px' }}>AMOUNT (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {ebill.payments.map((p, idx) => (
                    <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ color: '#64748b', padding: '6px 2px' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize', padding: '6px 2px', color: '#0f172a' }}>
                        {p.method.toLowerCase()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, padding: '6px 2px', color: '#0f172a' }}>
                        {formatMoneyAmount(p.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 800, paddingTop: 8, fontSize: 13, color: '#0f172a' }}>
                      Total Payments
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, paddingTop: 8, fontSize: 13, color: '#0f172a' }}>
                      {formatMoneyLkr(ebill.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Action Buttons */}
          <div className="no-print" style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => printReceipt('ebill-receipt-card')}
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

        {/* Footer Note matching Image 1 */}
        <div
          className="ebill-footer-note"
          style={{
            padding: '20px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 12,
            background: '#ffffff',
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Thank You!</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>We appreciate your visit!</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{ebill.salon.name}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>
              LOOK GOOD · FEEL GOOD · ALWAYS YOU
            </div>
          </div>
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
