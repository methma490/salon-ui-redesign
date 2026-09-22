import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import { formatMoneyAmount, formatMoneyLkr, moneyHeader } from '@/lib/money';
import { formatSriLankaDate } from '@/lib/sri-lanka-time';
import { getErrorMessage } from '@/pages/salon/salon-ops-ui';

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
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading quotation…</div>;
  }

  if (query.isError || !query.data) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        {getErrorMessage(query.error) || 'Quotation not found'}
      </div>
    );
  }

  const data = query.data;
  const brand = data.salon.primaryColor || '#0d5c3d';

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
        {data.salon.logoUrl && (
          <img
            src={data.salon.logoUrl}
            alt=""
            style={{ height: 48, objectFit: 'contain', marginBottom: 12 }}
          />
        )}
        <h1 style={{ margin: 0, color: brand, fontSize: 28 }}>{data.salon.name}</h1>
        <p style={{ margin: '4px 0 16px', color: '#64748b' }}>
          QUOTATION {data.quotationNo} · {data.status}
        </p>

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
