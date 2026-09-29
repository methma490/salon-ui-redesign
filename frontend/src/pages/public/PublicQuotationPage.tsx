import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import { formatMoneyAmount, formatMoneyLkr, moneyHeader } from '@/lib/money';
import { formatSriLankaDate } from '@/lib/sri-lanka-time';
import { resolveUploadUrl } from '@/lib/upload-url';
import { getErrorMessage } from '@/pages/salon/salon-ops-ui';

function QuotationLogo({ logoUrl }: { logoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveUploadUrl(logoUrl);
  if (!resolved || imgError) return null;
  return (
    <img
      src={resolved}
      alt=""
      onError={() => setImgError(true)}
      style={{ height: 48, objectFit: 'contain', marginBottom: 12 }}
    />
  );
}

export default function PublicQuotationPage() {
  const { token = '' } = useParams();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['public-quotation', token],
    queryFn: () => tenantApi.publicQuotations.get(token),
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: () => tenantApi.publicQuotations.accept(token),
    onSuccess: (data: { message: string }) => {
      setMessage(data.message);
      setError(null);
      void query.refetch();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const declineMutation = useMutation({
    mutationFn: () => tenantApi.publicQuotations.decline(token),
    onSuccess: (data: { message: string }) => {
      setMessage(data.message);
      setError(null);
      void query.refetch();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (query.isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 16 }}>
        Loading quotation…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: 16,
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: '100%',
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 24,
              fontWeight: 'bold',
            }}
          >
            !
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#1e293b' }}>
            Quotation Unavailable
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            {getErrorMessage(query.error) ||
              'This quotation could not be found or may no longer be available. Please contact your salon for assistance.'}
          </p>
        </div>
      </div>
    );
  }

  const data = query.data;
  const brand = data.salon.primaryColor || '#0d5c3d';
  const isCancelled = data.status === 'CANCELLED';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${brand}14 0%, #f8fafc 40%)`,
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: 24,
          boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
        }}
      >
        <QuotationLogo logoUrl={data.salon.logoUrl} />
        <h1 style={{ margin: 0, color: brand, fontSize: 28 }}>{data.salon.name}</h1>
        <p style={{ margin: '4px 0 16px', color: '#64748b' }}>
          QUOTATION {data.quotationNo} ·{' '}
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: isCancelled ? '#fee2e2' : '#f1f5f9',
              color: isCancelled ? '#dc2626' : '#475569',
            }}
          >
            {data.status}
          </span>
        </p>

        {isCancelled && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              color: '#991b1b',
              marginBottom: 16,
            }}
          >
            <strong style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>
              This quotation has been cancelled
            </strong>
            {data.cancelReason ? (
              <span style={{ fontSize: 13 }}>
                <strong>Reason:</strong> {data.cancelReason}
              </span>
            ) : (
              <span style={{ fontSize: 13 }}>
                This quotation is no longer valid. Please contact the salon for more information.
              </span>
            )}
          </div>
        )}

        <p>
          <strong>Customer:</strong> {data.customerName}
        </p>
        <p>
          <strong>Date:</strong> {formatSriLankaDate(data.quotationDate)}
          {data.validUntil ? ` · Valid until ${formatSriLankaDate(data.validUntil)}` : ''}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>
                Service
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 8 }}>
                Qty
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 8 }}>
                {moneyHeader('Price')}
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 8 }}>
                {moneyHeader('Total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(data.items) ? data.items : []).map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{item.description}</td>
                <td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                  {formatMoneyAmount(item.unitPrice)}
                </td>
                <td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                  {formatMoneyAmount(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>
          Total: {formatMoneyLkr(data.totalAmount)}
        </p>

        {data.customerNotes && (
          <p style={{ color: '#475569' }}>
            <strong>Notes:</strong> {data.customerNotes}
          </p>
        )}

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {message && <p style={{ color: brand, fontWeight: 600 }}>{message}</p>}

        {data.canRespond && !message && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button
              style={{ background: brand }}
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
            >
              Accept Quotation
            </Button>
            <Button
              variant="outline"
              onClick={() => declineMutation.mutate()}
              disabled={declineMutation.isPending}
            >
              Decline
            </Button>
          </div>
        )}

        <p style={{ marginTop: 28, fontSize: 11, color: '#94a3b8' }}>{data.platformAttribution}</p>
      </div>
    </div>
  );
}
