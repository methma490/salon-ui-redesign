import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Download, Printer, Scissors } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import { formatMoneyAmount, formatMoneyLkr, moneyHeader } from '@/lib/money';
import { getErrorMessage } from '@/pages/salon/salon-ops-ui';

interface PublicEbillDetail {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  branchName: string;
  customerName: string | null;
  createdAt: string;
  salon: {
    name: string;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
  items: Array<{
    id: string;
    itemType: string;
    serviceName: string | null;
    productName: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
    employees?: Array<{ name: string }>;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

function formatPaymentMethod(method: string) {
  return method
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PublicEbillPage() {
  const { id = '' } = useParams<{ id: string }>();

  const query = useQuery<PublicEbillDetail>({
    queryKey: ['public-ebill', id],
    queryFn: () => tenantApi.publicSales.getEbill(id),
    enabled: !!id,
  });

  if (query.isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
        Loading Digital E-Bill…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a', padding: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>E-Bill Not Found</h2>
        <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>
          {getErrorMessage(query.error) || 'The digital receipt link may be invalid or expired.'}
        </p>
      </div>
    );
  }

  const ebill = query.data;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.12)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header Branding Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            padding: '28px 24px',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {ebill.salon.logoUrl ? (
            <img
              src={ebill.salon.logoUrl}
              alt={ebill.salon.name}
              style={{ maxHeight: 56, margin: '0 auto 12px auto', display: 'block', borderRadius: 8 }}
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
              <Scissors size={24} color="#60a5fa" />
            </div>
          )}
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {ebill.salon.name}
          </h1>
          {ebill.salon.phone && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
              Tel: {ebill.salon.phone}
            </p>
          )}

          <div
            style={{
              marginTop: 16,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} /> Official E-Bill Paid
          </div>
        </div>

        {/* Invoice Body */}
        <div style={{ padding: 24 }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              padding: 16,
              background: '#f8fafc',
              borderRadius: 12,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
                Receipt No
              </span>
              <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#0f172a' }}>{ebill.saleNumber}</p>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
                Branch
              </span>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{ebill.branchName}</p>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
                Date & Time
              </span>
              <p style={{ margin: '2px 0 0', color: '#334155' }}>
                {formatDate(ebill.createdAt)} {formatTime(ebill.createdAt)}
              </p>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
                Customer
              </span>
              <p style={{ margin: '2px 0 0', color: '#334155', fontWeight: 500 }}>
                {ebill.customerName || 'Walk-in Customer'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600 }}>Item</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 600 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>Price</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ebill.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 4px', color: '#0f172a', fontWeight: 500 }}>
                    {item.serviceName || item.productName || '—'}
                    {item.employees && item.employees.length > 0 && (
                      <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>
                        Stylist: {item.employees.map((e) => e.name).join(', ')}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 4px', color: '#475569' }}>
                    {item.quantity}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 4px', color: '#475569' }}>
                    {formatMoneyAmount(item.unitPrice)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 4px', color: '#0f172a', fontWeight: 600 }}>
                    {formatMoneyAmount(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#475569' }}>
              <span>Subtotal</span>
              <span>{formatMoneyLkr(ebill.subtotal)}</span>
            </div>
            {ebill.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#ef4444' }}>
                <span>Discount</span>
                <span>-{formatMoneyLkr(ebill.discount)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justify: 'space-between',
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid #e2e8f0',
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              <span>Total Paid</span>
              <span style={{ color: '#0284c7' }}>{formatMoneyLkr(ebill.total)}</span>
            </div>
            {ebill.payments.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                Paid via {ebill.payments.map((p) => formatPaymentMethod(p.method)).join(', ')}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Printer size={16} /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{ background: '#f8fafc', padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#94a3b8' }}>
          Thank you for choosing {ebill.salon.name}!
        </div>
      </div>
    </div>
  );
}
