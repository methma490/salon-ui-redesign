/**
 * Dedicated receipt / invoice printing utility.
 * Renders the invoice into an isolated print document to prevent
 * browser modal dialogs, overlays, transforms, or scroll containers from clipping the preview.
 */
export function printReceipt(elementId = 'pos-printable-invoice'): void {
  const isMobile =
    typeof window !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const element = document.getElementById(elementId);
  if (!element || isMobile) {
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
    .pos-inv-document, .sale-inv-document, .ebill-receipt-card, .payslip-modern {
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
    .apt-ticket-invoice {
      width: 72mm !important;
      max-width: 72mm !important;
      margin: 0 auto !important;
      padding: 5mm !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      font-size: 10px !important;
    }
    .apt-ticket-header {
      padding-bottom: 10px !important;
      border-bottom: 1px dashed #94a3b8 !important;
      text-align: center !important;
    }
    .apt-ticket-brand { display: flex !important; align-items: center !important; justify-content: flex-start !important; gap: 7px !important; margin-bottom: 5px !important; }
    .apt-ticket-logo, .apt-ticket-logo-fallback {
      width: 34px !important; height: 34px !important; margin: 0 !important; flex: 0 0 auto !important;
      object-fit: cover !important; border: 1px solid #cbd5e1 !important; border-radius: 5px !important;
    }
    .apt-ticket-header h2 { margin: 0 !important; color: #000 !important; font-size: 15px !important; font-weight: 800 !important; }
    .apt-ticket-header > p, .apt-ticket-brand p { margin: 2px 0 0 !important; color: #444 !important; font-size: 9px !important; }
    .apt-ticket-header .apt-ticket-type { margin-top: 8px !important; font-size: 8px !important; font-weight: 800 !important; letter-spacing: .1em !important; }
    .apt-ticket-header .apt-ticket-code { font-family: monospace !important; font-size: 10px !important; font-weight: 700 !important; }
    .apt-ticket-info { display: grid !important; gap: 5px !important; padding: 8px 0 !important; border-bottom: 1px dashed #94a3b8 !important; }
    .apt-ticket-header .apt-ticket-info { margin-top: 7px !important; border-bottom: 0 !important; text-align: left !important; }
    .apt-ticket-info div, .apt-ticket-lines-head, .apt-ticket-line, .apt-ticket-total {
      display: flex !important; justify-content: space-between !important; gap: 8px !important;
    }
    .apt-ticket-info span, .apt-ticket-info strong, .apt-ticket-line, .apt-ticket-lines-head { font-size: 9px !important; }
    .apt-ticket-info span, .apt-ticket-lines-head { color: #555 !important; }
    .apt-ticket-info strong { color: #000 !important; font-weight: 600 !important; text-align: right !important; }
    .apt-ticket-lines-head { padding: 6px 0 !important; border-bottom: 1px solid #cbd5e1 !important; font-weight: 800 !important; text-transform: uppercase !important; }
    .apt-ticket-lines-body { display: block !important; }
    .apt-ticket-line { padding: 6px 0 !important; border-bottom: 1px solid #e2e8f0 !important; color: #000 !important; }
    .apt-ticket-line strong { color: #000 !important; font-weight: 600 !important; white-space: nowrap !important; }
    .apt-ticket-total { margin-top: 8px !important; padding: 7px !important; background: #f1f5f9 !important; color: #000 !important; font-size: 11px !important; font-weight: 800 !important; }
    .apt-ticket-total strong { font-size: 12px !important; font-variant-numeric: tabular-nums !important; }
    .apt-ticket-footer { padding-top: 9px !important; border-top: 1px dashed #94a3b8 !important; color: #555 !important; text-align: center !important; }
    .apt-ticket-footer p { margin: 0 !important; color: #222 !important; font-size: 10px !important; font-weight: 700 !important; }
    .apt-ticket-footer span { display: block !important; margin-top: 3px !important; font-size: 8px !important; }
    .apt-invoice-document { width: 100% !important; max-width: 100% !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; color: #0f172a !important; }
    .apt-invoice-brand-row { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 16px !important; padding: 18px !important; border: 1px solid #dbeafe !important; border-radius: 10px !important; background: #f1f7ff !important; }
    .apt-invoice-brand { display: flex !important; align-items: center !important; gap: 12px !important; }
    .apt-invoice-logo, .apt-invoice-logo-fallback { width: 64px !important; height: 64px !important; flex: 0 0 auto !important; border: 4px solid #dbeafe !important; border-radius: 50% !important; object-fit: cover !important; }
    .apt-invoice-brand-text h2 { margin: 0 !important; color: #0f1e3d !important; font-size: 24px !important; font-weight: 800 !important; }
    .apt-invoice-brand-text p { margin: 3px 0 0 !important; color: #617898 !important; font-size: 9px !important; font-weight: 700 !important; letter-spacing: .16em !important; }
    .apt-invoice-brand-text span { display: inline-block !important; margin-top: 3px !important; color: #64748b !important; font-size: 10px !important; }
    .apt-invoice-ref { min-width: 175px !important; padding-left: 20px !important; border-left: 1px solid #d5e3f5 !important; text-align: center !important; }
    .apt-invoice-ref p { margin: 0 0 6px !important; color: #607797 !important; font-size: 9px !important; font-weight: 800 !important; letter-spacing: .16em !important; }
    .apt-invoice-ref strong { display: block !important; padding: 7px 12px !important; border-radius: 8px !important; background: #dcecff !important; color: #1456a8 !important; font-size: 16px !important; }
    .apt-invoice-details { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 20px !important; margin: 16px 0 !important; padding: 14px !important; border: 1px solid #e2eaf4 !important; border-radius: 9px !important; }
    .apt-invoice-detail-column { display: grid !important; align-content: start !important; gap: 12px !important; }
    .apt-invoice-detail-column + .apt-invoice-detail-column { padding-left: 18px !important; border-left: 1px solid #dbe4ef !important; }
    .apt-invoice-detail { display: grid !important; grid-template-columns: 18px 75px 1fr !important; align-items: center !important; gap: 8px !important; }
    .apt-invoice-detail svg { width: 15px !important; height: 15px !important; color: #536b8c !important; }
    .apt-invoice-detail span { color: #607797 !important; font-size: 10px !important; }
    .apt-invoice-detail strong { color: #0f1e3d !important; font-size: 11px !important; font-weight: 600 !important; }
    .apt-invoice-lines { overflow: hidden !important; border: 1px solid #e2eaf4 !important; border-radius: 8px !important; }
    .apt-invoice-lines-head, .apt-invoice-line { display: grid !important; grid-template-columns: 1fr 110px !important; gap: 12px !important; }
    .apt-invoice-lines-head { padding: 9px 12px !important; background: #f2f7fd !important; color: #526b8e !important; font-size: 9px !important; font-weight: 800 !important; letter-spacing: .08em !important; text-transform: uppercase !important; }
    .apt-invoice-lines-head span:last-child, .apt-invoice-line strong { text-align: right !important; }
    .apt-invoice-line { padding: 10px 12px !important; border-top: 1px solid #e8eef6 !important; color: #203451 !important; font-size: 11px !important; }
    .apt-invoice-line strong { color: #0f1e3d !important; font-weight: 600 !important; }
    .apt-invoice-total { display: flex !important; align-items: center !important; justify-content: space-between !important; margin: 14px 0 !important; padding: 12px 16px !important; border-radius: 9px !important; background: #edf5ff !important; color: #0f1e3d !important; font-size: 18px !important; font-weight: 800 !important; }
    .apt-invoice-total strong { color: #1764c0 !important; font-size: 25px !important; }
    .apt-invoice-footer { display: flex !important; flex-direction: column !important; align-items: center !important; padding-top: 14px !important; border-top: 1px solid #e5edf7 !important; color: #607797 !important; text-align: center !important; }
    .apt-invoice-crown { display: flex !important; width: 42px !important; height: 42px !important; align-items: center !important; justify-content: center !important; margin-bottom: 8px !important; border: 1px solid #dbeafe !important; border-radius: 50% !important; background: #f2f7ff !important; color: #1764c0 !important; }
    .apt-invoice-crown svg { width: 18px !important; height: 18px !important; fill: currentColor !important; }
    .apt-invoice-footer p { margin: 0 !important; color: #0f1e3d !important; font-size: 15px !important; font-weight: 800 !important; }
    .apt-invoice-footer > span:last-child { margin-top: 4px !important; font-size: 10px !important; }
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
    /* Payslip print styles */
    .ps-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      gap: 20px !important;
      padding-bottom: 16px !important;
      border-bottom: 2px solid #e2e8f0 !important;
      margin-bottom: 16px !important;
    }
    .ps-brand {
      display: flex !important;
      align-items: flex-start !important;
      gap: 12px !important;
    }
    .ps-logo, .ps-logo-img {
      width: 44px !important;
      height: 44px !important;
      object-fit: contain !important;
      border-radius: 6px !important;
      border: 1px solid #cbd5e1 !important;
    }
    .ps-logo-fallback {
      width: 44px !important;
      height: 44px !important;
      border-radius: 6px !important;
      background: #0f172a !important;
      color: #ffffff !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-weight: 800 !important;
    }
    .ps-brand-info h1 {
      margin: 0 !important;
      font-size: 18px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
    }
    .ps-brand-info p {
      margin: 2px 0 0 !important;
      font-size: 11px !important;
      color: #475569 !important;
    }
    .ps-title-block {
      text-align: right !important;
    }
    .ps-title-block h2 {
      margin: 0 !important;
      font-size: 20px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      letter-spacing: 0.04em !important;
    }
    .ps-period-title {
      margin: 2px 0 4px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      color: #1e293b !important;
    }
    .ps-meta-line {
      margin: 1px 0 !important;
      font-size: 10px !important;
      color: #64748b !important;
    }
    .ps-emp-box {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 6px !important;
      padding: 10px 14px !important;
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px 24px !important;
      margin-bottom: 14px !important;
      font-size: 11px !important;
    }
    .ps-emp-row {
      display: flex !important;
      align-items: baseline !important;
      gap: 6px !important;
    }
    .ps-emp-label {
      font-weight: 600 !important;
      color: #334155 !important;
      width: 90px !important;
      flex-shrink: 0 !important;
    }
    .ps-emp-sep {
      color: #94a3b8 !important;
    }
    .ps-emp-val {
      font-weight: 600 !important;
      color: #0f172a !important;
    }
    .ps-two-col {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 14px !important;
      margin-bottom: 14px !important;
    }
    .ps-table-card, .ps-section-card, .ps-notes, .ps-two-col, .ps-net-banner { break-inside: avoid !important; page-break-inside: avoid !important; }
    .ps-table-card, .ps-section-card {
      border: 1px solid #e2e8f0 !important;
      border-radius: 6px !important;
      overflow: hidden !important;
      background: #ffffff !important;
      margin-bottom: 14px !important;
    }
    .ps-table-card {
      margin-bottom: 0 !important;
    }
    .ps-table-head {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 7px 12px !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 0.04em !important;
      text-transform: uppercase !important;
    }
    .ps-table-head.earnings, .ps-table-head.section {
      background: #f0f7ff !important;
      color: #1e3a8a !important;
      border-bottom: 1px solid #dbeafe !important;
    }
    .ps-table-head.deductions {
      background: #fff1f2 !important;
      color: #9f1239 !important;
      border-bottom: 1px solid #ffe4e6 !important;
    }
    .ps-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 11px !important;
    }
    .ps-table tr td {
      padding: 6px 12px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      color: #334155 !important;
    }
    .ps-table tr td:last-child {
      text-align: right !important;
      font-weight: 600 !important;
      color: #0f172a !important;
    }
    .ps-table tr.total-row td {
      font-weight: 700 !important;
      color: #0f172a !important;
      background: #f8fafc !important;
      border-top: 1.5px solid #cbd5e1 !important;
      border-bottom: none !important;
      font-size: 11px !important;
      padding: 8px 12px !important;
    }
    .ps-net-banner {
      border-top: 2px solid #cbd5e1 !important;
      border-bottom: 2px solid #cbd5e1 !important;
      padding: 10px 8px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 14px !important;
      background: #f8fafc !important;
    }
    .ps-net-left h3 {
      margin: 0 !important;
      font-size: 16px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
    }
    .ps-net-left p {
      margin: 2px 0 0 !important;
      font-size: 10px !important;
      color: #64748b !important;
    }
    .ps-net-right {
      font-size: 18px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
    }
    
    .ps-notes {
      margin-top: 16px !important;
      font-size: 10px !important;
      color: #475569 !important;
      line-height: 1.5 !important;
    }
    .ps-notes h4 {
      margin: 0 0 4px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #1e293b !important;
    }
    .ps-notes ul {
      margin: 0 !important;
      padding-left: 16px !important;
    }
    .no-print, button, .payslip-no-print, .pos-inv-preview-header, .pos-inv-success-banner, .sale-inv-mobile-lines {
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
