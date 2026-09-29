/**
 * Dedicated receipt / invoice printing utility.
 * Renders the invoice into an isolated print document to prevent
 * browser modal dialogs, overlays, transforms, or scroll containers from clipping the preview.
 */
export function printReceipt(elementId = 'pos-printable-invoice'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  let iframe = document.getElementById('receipt-print-frame') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const styles = `
    @page {
      margin: 8mm 10mm;
      size: auto;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
    }
    .pos-inv-document, .sale-inv-document, .ebill-receipt-card {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #ffffff !important;
      border: none !important;
      box-shadow: none !important;
      display: block !important;
      visibility: visible !important;
      overflow: visible !important;
    }
    .pos-inv-header, .sale-inv-brand-row, .ebill-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      padding-bottom: 12px !important;
      border-bottom: 2px solid #000000 !important;
      margin-bottom: 12px !important;
    }
    .pos-inv-brand, .sale-inv-brand {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }
    .pos-inv-logo, .sale-inv-logo {
      width: 48px !important;
      height: 48px !important;
      object-fit: cover !important;
      border-radius: 6px !important;
      border: 1px solid #cbd5e1 !important;
    }
    .pos-inv-logo-fallback, .sale-inv-logo-fallback {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 44px !important;
      height: 44px !important;
      background: #f1f5f9 !important;
      border-radius: 6px !important;
    }
    .pos-inv-brand-name, .sale-inv-brand-name, .ebill-header-title {
      font-size: 18px !important;
      font-weight: 800 !important;
      margin: 0 !important;
      color: #000000 !important;
    }
    .pos-inv-brand-tagline, .sale-inv-brand-tagline {
      font-size: 9px !important;
      font-weight: 700 !important;
      letter-spacing: 0.1em !important;
      text-transform: uppercase !important;
      color: #666666 !important;
      margin: 2px 0 0 !important;
    }
    .pos-inv-brand-contact, .sale-inv-brand-meta {
      font-size: 11px !important;
      color: #555555 !important;
      margin: 2px 0 0 !important;
    }
    .pos-inv-meta, .sale-inv-meta {
      text-align: right !important;
    }
    .pos-inv-title-badge, .sale-inv-meta-label {
      font-size: 10px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      color: #555555 !important;
    }
    .pos-inv-number, .sale-inv-meta-number {
      font-size: 15px !important;
      font-weight: 800 !important;
      font-family: monospace !important;
      margin: 2px 0 !important;
      color: #000000 !important;
    }
    .pos-inv-meta-row, .sale-inv-meta-line {
      font-size: 11px !important;
      color: #555555 !important;
      margin: 1px 0 !important;
    }
    .pos-inv-status-pill, .sale-inv-status, .ebill-paid-badge {
      display: inline-block !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      padding: 2px 8px !important;
      border-radius: 999px !important;
      border: 1px solid #166534 !important;
      color: #166534 !important;
      background: #f0fdf4 !important;
    }
    .pos-inv-info-grid, .sale-inv-parties {
      display: flex !important;
      justify-content: space-between !important;
      gap: 20px !important;
      padding: 10px 0 !important;
      border-bottom: 1px solid #e2e8f0 !important;
      margin-bottom: 12px !important;
    }
    .pos-inv-info-box h4, .sale-inv-party h3 {
      font-size: 10px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      color: #666666 !important;
      margin: 0 0 4px !important;
    }
    .pos-inv-customer-name, .pos-inv-branch, .sale-inv-party-name {
      font-size: 13px !important;
      font-weight: 700 !important;
      color: #000000 !important;
      margin: 0 !important;
    }
    .pos-inv-customer-phone, .pos-inv-cashier, .sale-inv-party-detail {
      font-size: 11px !important;
      color: #444444 !important;
      margin: 2px 0 0 !important;
    }
    .pos-inv-table-wrapper, .sale-inv-table-wrap {
      width: 100% !important;
      margin: 10px 0 !important;
      display: block !important;
      overflow: visible !important;
    }
    .pos-inv-table, .sale-inv-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 12px !important;
      display: table !important;
    }
    .pos-inv-table th, .sale-inv-table th {
      border-bottom: 2px solid #000000 !important;
      padding: 6px 4px !important;
      text-align: left !important;
      font-size: 10px !important;
      text-transform: uppercase !important;
      font-weight: 700 !important;
      color: #000000 !important;
    }
    .pos-inv-table td, .sale-inv-table td {
      border-bottom: 1px solid #e2e8f0 !important;
      padding: 6px 4px !important;
      color: #000000 !important;
      vertical-align: middle !important;
    }
    .pos-inv-table .num, .sale-inv-table .num {
      text-align: right !important;
      font-variant-numeric: tabular-nums !important;
    }
    .pos-inv-badge, .sale-type-badge {
      display: inline-block !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      font-size: 9px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      border: 1px solid #cbd5e1 !important;
      background: #f8fafc !important;
      color: #000000 !important;
    }
    .pos-inv-summary-section, .sale-inv-totals-wrap {
      display: flex !important;
      justify-content: flex-end !important;
      margin-top: 10px !important;
      padding-top: 8px !important;
    }
    .pos-inv-totals-box, .sale-inv-totals {
      width: 240px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
    }
    .pos-inv-totals-row, .sale-inv-totals-row {
      display: flex !important;
      justify-content: space-between !important;
      font-size: 12px !important;
      color: #333333 !important;
    }
    .pos-inv-grand-total-callout, .sale-inv-grand-total-callout {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 6px 8px !important;
      background: #f1f5f9 !important;
      border-radius: 4px !important;
      margin-top: 6px !important;
    }
    .pos-inv-grand-total-label, .sale-inv-grand-total-label {
      font-size: 13px !important;
      font-weight: 800 !important;
      color: #000000 !important;
    }
    .pos-inv-grand-total-val, .sale-inv-grand-total-val {
      font-size: 14px !important;
      font-weight: 800 !important;
      color: #000000 !important;
    }
    .pos-inv-payment-card, .sale-inv-payment-card {
      margin-top: 14px !important;
      padding: 8px 10px !important;
      border: 1px solid #000000 !important;
      border-radius: 6px !important;
      background: #ffffff !important;
    }
    .pos-inv-payment-card-title, .sale-inv-payment-card-title {
      font-size: 9px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      color: #555555 !important;
      margin-bottom: 6px !important;
    }
    .pos-inv-payment-table, .sale-inv-payment-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 11px !important;
    }
    .pos-inv-payment-table th, .sale-inv-payment-table th {
      border-bottom: 1px solid #cbd5e1 !important;
      padding: 4px 2px !important;
      text-align: left !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
      color: #555555 !important;
    }
    .pos-inv-payment-table td, .sale-inv-payment-table td {
      border-bottom: 1px solid #f1f5f9 !important;
      padding: 4px 2px !important;
      color: #000000 !important;
    }
    .pos-inv-payment-total-row td, .sale-inv-payment-total-row td {
      border-top: 1px solid #000000 !important;
      border-bottom: none !important;
      font-weight: 800 !important;
      padding-top: 6px !important;
    }
    .pos-inv-footer, .sale-inv-footer, .ebill-footer-note {
      margin-top: 20px !important;
      padding-top: 10px !important;
      border-top: 1px solid #cbd5e1 !important;
      background: transparent !important;
    }
    .pos-inv-footer-inner, .sale-inv-footer-inner {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-end !important;
    }
    .pos-inv-footer-left h4, .sale-inv-footer-left h4 {
      font-size: 14px !important;
      font-weight: 800 !important;
      margin: 0 !important;
      color: #000000 !important;
    }
    .pos-inv-footer-left p, .sale-inv-footer-left p {
      font-size: 10px !important;
      color: #555555 !important;
      margin: 2px 0 0 !important;
    }
    .pos-inv-footer-right, .sale-inv-footer-right {
      text-align: right !important;
    }
    .pos-inv-footer-salon-name, .sale-inv-footer-salon-name {
      font-size: 12px !important;
      font-weight: 800 !important;
      color: #000000 !important;
    }
    .pos-inv-footer-tagline, .sale-inv-footer-tagline {
      font-size: 8px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.1em !important;
      color: #777777 !important;
      margin-top: 2px !important;
    }
    .no-print, button, .pos-inv-preview-header, .pos-inv-success-banner, .sale-inv-mobile-lines {
      display: none !important;
    }
  `;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice Receipt</title>
        <style>${styles}</style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch (e) {
      window.print();
    }
  }, 200);
}
