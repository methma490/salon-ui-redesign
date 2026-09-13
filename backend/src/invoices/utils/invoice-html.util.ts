import { BillingCycle, Invoice, InvoiceItem } from '@prisma/client';

export interface InvoiceIssuerInfo {
  name: string;
  email: string;
  address: string;
}

export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

function formatMoney(amount: number | string | { toString(): string }, currency: string): string {
  const value = Number(amount);
  return `${currency} ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatBillingCycle(cycle: BillingCycle): string {
  return cycle === BillingCycle.YEARLY ? 'Yearly' : 'Monthly';
}

export function buildInvoiceHtml(
  invoice: InvoiceWithItems,
  issuer: InvoiceIssuerInfo,
): string {
  const itemRows = invoice.items
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td class="num">${Number(item.quantity)}</td>
          <td class="num">${formatMoney(item.unitPrice, invoice.currency)}</td>
          <td class="num">${formatMoney(item.amount, invoice.currency)}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; background: #f8f9fc; padding: 32px; }
    .page { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.08); overflow: hidden; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 40px 48px 24px; border-bottom: 3px solid #6366f1; }
    .brand { font-size: 28px; font-weight: 700; color: #6366f1; }
    .brand-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h1 { font-size: 22px; font-weight: 600; color: #334155; }
    .invoice-meta p { font-size: 13px; color: #64748b; margin-top: 4px; }
    .status { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #dcfce7; color: #166534; }
    .status.void, .status.refunded { background: #fee2e2; color: #991b1b; }
    .status.issued { background: #fef9c3; color: #854d0e; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding: 32px 48px; }
    .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin-bottom: 8px; }
    .party p { font-size: 14px; line-height: 1.6; color: #334155; }
    .party .name { font-weight: 600; font-size: 16px; }
    .summary { padding: 0 48px 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f1f5f9; border-radius: 8px; padding: 20px 24px; }
    .summary-grid dt { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; }
    .summary-grid dd { font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 4px; }
    table { width: calc(100% - 96px); margin: 24px 48px; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; }
    th.num, td.num { text-align: right; }
    td { padding: 14px 8px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .totals { padding: 8px 48px 40px; display: flex; justify-content: flex-end; }
    .totals-box { min-width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
    .totals-row.grand { font-size: 18px; font-weight: 700; color: #1e293b; border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 16px; }
    .footer { padding: 24px 48px; background: #f8fafc; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
    @media print { body { background: #fff; padding: 0; } .page { box-shadow: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">${escapeHtml(issuer.name)}</div>
        <div class="brand-sub">${escapeHtml(issuer.email)}<br/>${escapeHtml(issuer.address)}</div>
      </div>
      <div class="invoice-meta">
        <h1>INVOICE</h1>
        <p><strong>${escapeHtml(invoice.invoiceNumber)}</strong></p>
        <p>Issue date: ${formatDate(invoice.issueDate)}</p>
        <p>Payment date: ${formatDate(invoice.paidAt)}</p>
        <span class="status ${invoice.status.toLowerCase()}">${escapeHtml(invoice.status)}</span>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>Salon</h3>
        <p class="name">${escapeHtml(invoice.salonName)}</p>
        ${invoice.salonEmail ? `<p>${escapeHtml(invoice.salonEmail)}</p>` : ''}
        ${invoice.salonPhone ? `<p>${escapeHtml(invoice.salonPhone)}</p>` : ''}
      </div>
      <div class="party">
        <h3>Billing Contact</h3>
        <p class="name">${escapeHtml(invoice.customerName)}</p>
        <p>${escapeHtml(invoice.customerEmail)}</p>
        ${invoice.customerPhone ? `<p>${escapeHtml(invoice.customerPhone)}</p>` : ''}
      </div>
    </div>

    <div class="summary">
      <dl class="summary-grid">
        <div><dt>Plan</dt><dd>${escapeHtml(invoice.planName)} (${escapeHtml(invoice.planCode)})</dd></div>
        <div><dt>Billing Cycle</dt><dd>${formatBillingCycle(invoice.billingCycle)}</dd></div>
        <div><dt>Payment Reference</dt><dd>${escapeHtml(invoice.paymentReference ?? '—')}</dd></div>
      </dl>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row"><span>Subtotal</span><span>${formatMoney(invoice.subtotal, invoice.currency)}</span></div>
        <div class="totals-row grand"><span>Total Paid</span><span>${formatMoney(invoice.total, invoice.currency)}</span></div>
      </div>
    </div>

    <div class="footer">
      Thank you for your subscription. This invoice was generated automatically after payment confirmation.
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
