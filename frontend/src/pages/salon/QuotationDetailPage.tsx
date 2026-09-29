import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authStorage } from '@/lib/auth-storage';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormError,
  FormSubmit,
  getErrorMessage,
  OpsError,
  OpsLoading,
  SimpleForm,
} from './salon-ops-ui';
import { formatMoneyAmount, formatMoneyLkr, moneyHeader } from '@/lib/money';
import { formatSriLankaDate, formatSriLankaDateTime } from '@/lib/sri-lanka-time';
import './employees-page.css';
import './quotation-detail.css';

function statusClass(status: string) {
  const key = status.toLowerCase();
  if (key === 'sent') return 'qd-status qd-status-sent';
  if (key === 'accepted' || key === 'converted') return 'qd-status qd-status-accepted';
  if (key === 'declined' || key === 'cancelled' || key === 'expired') {
    return 'qd-status qd-status-declined';
  }
  if (key === 'draft') return 'qd-status qd-status-draft';
  return 'qd-status';
}

export default function QuotationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [performers, setPerformers] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => tenantApi.quotations.get(id),
    enabled: !!id,
  });

  const performersQuery = useQuery({
    queryKey: ['pos-performers', query.data?.branchId],
    queryFn: async () => {
      const res = await tenantApi.pos.getPerformers({ branchId: query.data!.branchId });
      return res.performers;
    },
    enabled: !!query.data?.branchId && convertOpen,
  });

  const whatsappMutation = useMutation({
    mutationFn: () => tenantApi.quotations.whatsapp(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quotation', id] });
      if (data.externalUrl) window.open(data.externalUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const smsMutation = useMutation({
    mutationFn: () => tenantApi.quotations.sms(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotation', id] });
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => tenantApi.quotations.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotation', id] });
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const convertMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => tenantApi.quotations.convert(id, payload),
    onSuccess: (data: { saleId: string }) => {
      qc.invalidateQueries({ queryKey: ['quotation', id] });
      qc.invalidateQueries({ queryKey: ['quotations'] });
      setConvertOpen(false);
      navigate(`/salon/sales/${data.saleId}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const detail = query.data;
  const itemPerformerDefaults = useMemo(() => {
    if (!detail) return {};
    const map: Record<string, string> = {};
    for (const item of detail.items) {
      if (item.employeeId) map[item.id] = item.employeeId;
    }
    return map;
  }, [detail]);

  if (query.isLoading) return <OpsLoading />;
  if (query.isError || !detail) {
    return (
      <OpsError message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  }

  const printQuotation = () => {
    const token = authStorage.getAccessToken();
    const url = tenantApi.quotations.printUrl(id);
    void fetch(url, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.text())
      .then((html) => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  const canEdit = ['DRAFT', 'SENT'].includes(detail.status);
  const canCancel = !['CONVERTED', 'CANCELLED'].includes(detail.status);

  return (
    <div className="emp-page qd-page">
      <header className="qd-header">
        <div className="qd-header-top">
          <div>
            <h1 className="qd-title">{detail.quotationNo}</h1>
            <p className="qd-subtitle">{detail.salonNameSnapshot}</p>
            <span className={statusClass(detail.displayStatus)}>{detail.displayStatus}</span>
          </div>
          <Button asChild variant="outline" size="sm" className="qd-back">
            <Link to="/salon/quotations">Back</Link>
          </Button>
        </div>
      </header>

      <FormError message={error} />

      <section className="qd-hero" aria-label="Quotation summary">
        <div className="qd-card">
          <div className="qd-card-label">Customer</div>
          <div className="qd-card-value">{detail.customerName}</div>
          <div className="qd-card-meta">{detail.customerPhone || 'No phone'}</div>
        </div>
        <div className="qd-card">
          <div className="qd-card-label">Branch & dates</div>
          <div className="qd-card-value">{detail.branchName}</div>
          <div className="qd-card-meta">
            {formatSriLankaDate(detail.quotationDate)}
            {detail.validUntil ? ` → ${formatSriLankaDate(detail.validUntil)}` : ''}
          </div>
        </div>
        <div className="qd-card qd-card-total">
          <div className="qd-card-label">Total</div>
          <div className="qd-card-value">{formatMoneyLkr(detail.totalAmount)}</div>
          <div className="qd-card-meta">
            Subtotal {formatMoneyLkr(detail.subtotal)}
            {detail.discountAmount > 0 ? ` · Discount ${formatMoneyLkr(detail.discountAmount)}` : ''}
          </div>
        </div>
      </section>

      <nav className="qd-actions" aria-label="Quotation actions">
        <Button
          type="button"
          className="qd-btn-primary"
          onClick={() => whatsappMutation.mutate()}
          disabled={whatsappMutation.isPending}
        >
          {whatsappMutation.isPending ? 'Opening…' : 'WhatsApp'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => smsMutation.mutate()}
          disabled={smsMutation.isPending}
        >
          SMS
        </Button>
        {canEdit && (
          <Button asChild variant="outline">
            <Link to={`/salon/quotations/${id}/edit`}>Edit</Link>
          </Button>
        )}
        <Button type="button" variant="outline" onClick={printQuotation}>
          Print / PDF
        </Button>
        {detail.publicUrl && (
          <Button asChild variant="outline">
            <a href={detail.publicUrl} target="_blank" rel="noreferrer">
              Customer Link
            </a>
          </Button>
        )}
        {detail.status === 'ACCEPTED' && !detail.convertedSaleId && (
          <Button
            type="button"
            onClick={() => {
              setPerformers(itemPerformerDefaults);
              setPaymentAmount(String(detail.totalAmount));
              setConvertOpen(true);
            }}
          >
            Convert to Invoice
          </Button>
        )}
        {detail.convertedSaleId && (
          <Button asChild>
            <Link to={`/salon/sales/${detail.convertedSaleId}`}>View Invoice</Link>
          </Button>
        )}
        {canCancel && (
          <Button
            type="button"
            variant="destructive"
            className="qd-btn-danger"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            Cancel
          </Button>
        )}
      </nav>

      <section className="qd-section">
        <h2 className="qd-section-title">Items</h2>

        <div className="qd-item-cards">
          {detail.items.map((item) => (
            <article key={item.id} className="qd-item-card">
              <div className="qd-item-card-title">{item.descriptionSnapshot}</div>
              <div className="qd-item-card-grid">
                <div>
                  <span>Qty</span>
                  <strong>{item.quantity}</strong>
                </div>
                <div>
                  <span>{moneyHeader('Master')}</span>
                  <strong>{formatMoneyAmount(item.originalServicePrice)}</strong>
                </div>
                <div>
                  <span>{moneyHeader('Quote price')}</span>
                  <strong>{formatMoneyAmount(item.quotationUnitPrice)}</strong>
                </div>
                <div>
                  <span>{moneyHeader('Line total')}</span>
                  <strong>{formatMoneyAmount(item.lineTotal)}</strong>
                </div>
              </div>
              <div className="qd-item-card-total">
                <span>{moneyHeader('Total')}</span>
                <span>{formatMoneyAmount(item.lineTotal)}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="qd-table-wrap">
          <table className="qd-table">
            <thead>
              <tr>
                <th>Service</th>
                <th className="qd-num">Qty</th>
                <th className="qd-num">{moneyHeader('Master')}</th>
                <th className="qd-num">{moneyHeader('Quote price')}</th>
                <th className="qd-num">{moneyHeader('Total')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((item) => (
                <tr key={item.id}>
                  <td className="qd-name">{item.descriptionSnapshot}</td>
                  <td className="qd-num">{item.quantity}</td>
                  <td className="qd-num">{formatMoneyAmount(item.originalServicePrice)}</td>
                  <td className="qd-num">{formatMoneyAmount(item.quotationUnitPrice)}</td>
                  <td className="qd-num">{formatMoneyAmount(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="qd-totals">
          <div className="qd-totals-row">
            <span>Subtotal</span>
            <span>{formatMoneyLkr(detail.subtotal)}</span>
          </div>
          <div className="qd-totals-row">
            <span>Discount</span>
            <span>{formatMoneyLkr(detail.discountAmount)}</span>
          </div>
          <div className="qd-totals-row qd-totals-grand">
            <span>Total</span>
            <span>{formatMoneyLkr(detail.totalAmount)}</span>
          </div>
        </div>

        {(detail.customerNotes || detail.internalNotes) && (
          <div className="qd-notes">
            {detail.customerNotes && (
              <div className="qd-note">
                <strong>Customer notes</strong>
                {detail.customerNotes}
              </div>
            )}
            {detail.internalNotes && (
              <div className="qd-note qd-note-internal">
                <strong>Internal notes</strong>
                {detail.internalNotes}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="qd-section">
        <h2 className="qd-section-title">Communication History</h2>
        {detail.messages.length === 0 ? (
          <div className="qd-empty">No messages yet. Send via WhatsApp or SMS to start tracking.</div>
        ) : (
          <>
            <div className="qd-msg-cards">
              {detail.messages.map((m) => (
                <article key={m.id} className="qd-msg-card">
                  <div className="qd-msg-card-top">
                    <span className="qd-msg-channel">{m.channel}</span>
                    <span className="qd-msg-status">{m.status}</span>
                  </div>
                  <div className="qd-msg-meta">{m.recipient}</div>
                  <div className="qd-msg-meta">{formatSriLankaDateTime(m.createdAt)}</div>
                </article>
              ))}
            </div>

            <div className="qd-table-wrap">
              <table className="qd-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Channel</th>
                    <th>Number</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.messages.map((m) => (
                    <tr key={m.id}>
                      <td>{formatSriLankaDateTime(m.createdAt)}</td>
                      <td>{m.channel}</td>
                      <td>{m.recipient}</td>
                      <td>{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 13, color: 'var(--qd-muted)' }}>
            Uses quotation snapshot prices. Assign performers and collect payment.
          </p>
          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              try {
                const itemPerformers = detail.items.map((item) => {
                  const employeeId = performers[item.id] || item.employeeId;
                  if (!employeeId) {
                    throw new Error(`Performer required for ${item.descriptionSnapshot}`);
                  }
                  return { quotationItemId: item.id, employeeId };
                });
                convertMutation.mutate({
                  payments: [
                    {
                      method: paymentMethod,
                      amount: Number(paymentAmount),
                    },
                  ],
                  itemPerformers,
                });
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to convert');
              }
            }}
          >
            <FormError message={error} />
            {detail.items.map((item) => (
              <div key={item.id} className="space-y-2" style={{ marginBottom: 8 }}>
                <Label>{item.descriptionSnapshot}</Label>
                <Select
                  value={performers[item.id] || item.employeeId || undefined}
                  onValueChange={(v) => setPerformers((prev) => ({ ...prev, [item.id]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select performer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(performersQuery.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="emp-form-grid">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <FormSubmit pending={convertMutation.isPending}>Create Invoice</FormSubmit>
          </SimpleForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}
