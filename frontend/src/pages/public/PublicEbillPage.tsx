import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2, Printer, Scissors } from 'lucide-react';
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
        className="ebill-logo-circle"
        style={{
          width: 52,
          height: 52,
          minWidth: 52,
          borderRadius: 12,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
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
      className="ebill-logo-img"
      style={{
        width: 52,
        height: 52,
        minWidth: 52,
        display: 'block',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        objectFit: 'contain',
        background: '#ffffff',
        padding: 2,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}
    />
  );
}

export default function PublicEbillPage() {
  const { token, id } = useParams<{ token?: string; id?: string }>();
  const activeIdentifier = token || id || '';
  const [generatingPdf, setGeneratingPdf] = useState(false);

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

  const handlePrintOrPdf = () => {
    const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.print();
    } else {
      printReceipt('ebill-receipt-card');
    }
  };

  const handleDownloadPdf = async (action: 'download' | 'preview' = 'download') => {
    const cardEl = document.getElementById('ebill-receipt-card');
    if (!cardEl) return;

    try {
      setGeneratingPdf(true);
      // Dynamically import html2pdf.js for client-side execution
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const invoiceNum = query.data?.invoiceNumber || query.data?.saleNumber || 'RECEIPT';
      const filename = `Invoice-${invoiceNum}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
        },
      };

      const worker = (html2pdf as unknown as () => {
        set: (o: unknown) => {
          from: (el: HTMLElement) => {
            output: (type: string) => Promise<Blob>;
            save: () => Promise<void>;
          };
        };
      })().set(opt).from(cardEl);

      if (action === 'preview') {
        const pdfBlob = await worker.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
      } else {
        await worker.save();
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

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
  const brandColor = ebill.salon?.primaryColor || '#A44A5C';
  const palette = buildBrandPalette(brandColor);
  const taxAmount = Number(ebill.tax || 0);

  return (
    <div
      className="ebill-page-wrapper"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        padding: '24px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Action Toolbar Header (Visible for Quick Mobile/Desktop Download/Print) */}
      <div
        className="no-print ebill-top-actions"
        style={{
          width: '100%',
          maxWidth: 620,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
          Official Receipt
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="outline"
            disabled={generatingPdf}
            onClick={() => handleDownloadPdf('preview')}
            style={{
              height: 36,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              gap: 6,
              background: '#ffffff',
            }}
          >
            {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            <span>Preview PDF</span>
          </Button>
          <Button
            size="sm"
            disabled={generatingPdf}
            onClick={() => handleDownloadPdf('download')}
            style={{
              height: 36,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              gap: 6,
              background: palette.primary,
              borderColor: palette.primary,
              color: '#ffffff',
            }}
          >
            {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Download PDF</span>
          </Button>
        </div>
      </div>

      <div
        className="ebill-receipt-card"
        id="ebill-receipt-card"
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.10)',
          overflow: 'hidden',
          border: `1px solid ${palette.border}`,
        }}
      >
        {/* Salon Branding Header - Fully responsive flex/grid */}
        <div
          className="ebill-header"
          style={{
            background: `linear-gradient(135deg, ${palette.soft} 0%, ${palette.softStrong} 45%, #ffffff 85%)`,
            padding: '24px 20px 18px',
            position: 'relative',
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <div className="ebill-header-content">
            <div className="ebill-salon-info">
              <EbillLogo logoUrl={ebill.salon.logoUrl} name={ebill.salon.name} brandColor={palette.primary} />
              <div className="ebill-salon-text">
                <h1
                  className="ebill-header-title"
                  style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.25 }}
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

            <div className="ebill-invoice-meta">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                TAX INVOICE
              </div>
              <div className="ebill-invoice-num" style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '2px 0 3px', letterSpacing: '-0.01em', wordBreak: 'break-all' }}>
                {invoiceNo}
              </div>
              <div className="ebill-meta-dates" style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                <div>Date: <strong style={{ color: '#334155' }}>{formatSriLankaDate(invoiceDate)}</strong></div>
                <div>Time: <strong style={{ color: '#334155' }}>{formatSriLankaTime(invoiceDate)}</strong></div>
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  className="ebill-paid-badge"
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
        <div className="ebill-body-container" style={{ padding: '20px 20px 12px' }}>
          <div
            className="ebill-parties-grid"
            style={{
              paddingBottom: 16,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div className="ebill-party-card">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                BILL TO
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4, wordBreak: 'break-word' }}>
                {customerName}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Customer</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: customerPhone ? '#0f172a' : '#94a3b8', marginTop: 3 }}>
                {customerPhone || '—'}
              </div>
            </div>

            <div className="ebill-party-card">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                SALE DETAILS
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4, wordBreak: 'break-word' }}>
                {ebill.branchName || 'Main Branch'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Branch location</div>
            </div>
          </div>

          {/* Items Section - Responsive Table with Horizontal Scroll Protection */}
          <div className="ebill-table-wrap" style={{ overflowX: 'auto', marginTop: 16, WebkitOverflowScrolling: 'touch' }}>
            <table
              className="ebill-items-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: 420,
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
                  <th style={{ padding: '8px 4px', width: 24 }}>#</th>
                  <th style={{ padding: '8px 6px' }}>DESCRIPTION</th>
                  <th style={{ padding: '8px 4px', width: 68 }}>TYPE</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px', width: 36 }}>QTY</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', whiteSpace: 'nowrap' }}>UNIT PRICE</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px', whiteSpace: 'nowrap' }}>AMOUNT (LKR)</th>
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
                      <td style={{ padding: '10px 6px', color: '#0f172a', fontWeight: 600, wordBreak: 'break-word' }}>
                        {displayName}
                      </td>
                      <td style={{ padding: '10px 4px' }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: isService ? palette.primary : '#1d4ed8',
                            background: isService ? palette.soft : '#eff6ff',
                            padding: '2px 5px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isService ? 'SERVICE' : 'PRODUCT'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 4px', color: '#334155' }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 6px', color: '#334155', whiteSpace: 'nowrap' }}>
                        {formatMoneyAmount(item.unitPrice)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '10px 4px',
                          color: '#0f172a',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
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
            <div className="ebill-totals-box" style={{ width: '100%', maxWidth: 280 }}>
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
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Total paid</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: palette.primary }}>{formatMoneyLkr(ebill.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Breakdown Card matching Image 1 */}
          {Array.isArray(ebill.payments) && ebill.payments.length > 0 && (
            <div
              style={{
                marginTop: 22,
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

          {/* Action Buttons (Print / PDF options) */}
          <div className="no-print ebill-bottom-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 22 }}>
            <Button
              variant="outline"
              onClick={handlePrintOrPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 42,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <Printer size={16} /> Print Receipt
            </Button>
            <Button
              variant="outline"
              disabled={generatingPdf}
              onClick={() => handleDownloadPdf('preview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 42,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              View PDF Preview
            </Button>
            <Button
              disabled={generatingPdf}
              onClick={() => handleDownloadPdf('download')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 42,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                background: palette.primary,
                borderColor: palette.primary,
                color: '#ffffff',
              }}
            >
              {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Save PDF Receipt
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div
          className="ebill-footer-note"
          style={{
            padding: '18px 20px',
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
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Thank You!</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>We appreciate your visit!</div>
          </div>
          <div className="ebill-footer-right" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{ebill.salon.name}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>
              LOOK GOOD · FEEL GOOD · ALWAYS YOU
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Responsive layout rules for eBill on Mobile and Tablet */
        .ebill-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
        }
        .ebill-salon-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1 1 auto;
          min-width: 220px;
        }
        .ebill-invoice-meta {
          text-align: right;
          flex: 0 0 auto;
        }
        .ebill-parties-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        @media (max-width: 640px) {
          .ebill-page-wrapper {
            padding: 12px 8px !important;
          }
          .ebill-header {
            padding: 20px 16px 16px !important;
          }
          .ebill-header-content {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          .ebill-salon-info {
            width: 100% !important;
          }
          .ebill-invoice-meta {
            width: 100% !important;
            text-align: left !important;
            padding-top: 12px !important;
            border-top: 1px dashed #cbd5e1 !important;
            display: grid !important;
            grid-template-columns: 1fr auto !important;
            align-items: center !important;
            gap: 4px 12px !important;
          }
          .ebill-invoice-meta > div:first-child {
            grid-column: 1 / -1 !important;
          }
          .ebill-invoice-num {
            grid-column: 1 / -1 !important;
            font-size: 16px !important;
          }
          .ebill-meta-dates {
            grid-column: 1 / 2 !important;
          }
          .ebill-invoice-meta > div:last-child {
            grid-column: 2 / 3 !important;
            margin-top: 0 !important;
            align-self: center !important;
          }
          .ebill-body-container {
            padding: 16px 14px 12px !important;
          }
          .ebill-parties-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .ebill-totals-box {
            max-width: 100% !important;
          }
          .ebill-footer-note {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .ebill-footer-right {
            text-align: left !important;
          }
        }

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
          .no-print, .ebill-top-actions, .ebill-bottom-actions {
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
