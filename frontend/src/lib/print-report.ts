/**
 * Dedicated report printing utility for Salon SaaS Reports (Sales, Inventory, Employee Performance).
 * Uses an isolated iframe to prevent SPA dashboard styles, fixed sidebars, overlays,
 * and overflow containers from clipping or blanking out the print / PDF preview.
 */
export function printReportDocument(elementId: string, title = 'Salon Report'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[printReportDocument] Element with id "${elementId}" not found. Falling back to window.print().`);
    window.print();
    return;
  }

  let iframe = document.getElementById('report-print-frame') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'report-print-frame';
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
      size: landscape;
      margin: 10mm 12mm;
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
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
    }
    .reports-print-document {
      display: block !important;
      visibility: visible !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    .reports-print-header {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 16px !important;
      padding-bottom: 12px !important;
      border-bottom: 2px solid #0f766e !important;
      margin-bottom: 14px !important;
    }
    .reports-print-eyebrow {
      margin: 0 0 3px 0 !important;
      color: #0f766e !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 0.12em !important;
      text-transform: uppercase !important;
    }
    .reports-print-header h1 {
      margin: 0 !important;
      color: #0f172a !important;
      font-size: 20px !important;
      font-weight: 800 !important;
      line-height: 1.2 !important;
    }
    .reports-print-header p {
      margin: 4px 0 0 0 !important;
      color: #475569 !important;
      font-size: 11px !important;
    }
    .reports-print-meta {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 12px !important;
      margin-top: 6px !important;
      font-size: 10px !important;
      color: #64748b !important;
    }
    .reports-print-meta span {
      background: #f1f5f9 !important;
      padding: 2px 8px !important;
      border-radius: 4px !important;
      border: 1px solid #e2e8f0 !important;
    }
    .reports-print-generated {
      padding-top: 4px !important;
      color: #64748b !important;
      font-size: 10px !important;
      font-weight: 500 !important;
      white-space: nowrap !important;
    }
    .reports-print-summary {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
      gap: 8px !important;
      margin: 12px 0 16px 0 !important;
    }
    .reports-print-summary > div {
      display: flex !important;
      flex-direction: column !important;
      gap: 3px !important;
      padding: 8px 12px !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      background: #f8fafc !important;
    }
    .reports-print-summary span {
      color: #64748b !important;
      font-size: 9px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
    }
    .reports-print-summary strong {
      color: #0f172a !important;
      font-size: 13px !important;
      font-weight: 800 !important;
      font-variant-numeric: tabular-nums !important;
    }
    .reports-print-section-title {
      font-size: 12px !important;
      font-weight: 700 !important;
      color: #1e293b !important;
      margin: 14px 0 6px 0 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
    }
    .reports-print-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 9.5px !important;
      margin-top: 8px !important;
    }
    .reports-print-table thead {
      display: table-header-group !important;
    }
    .reports-print-table tfoot {
      display: table-footer-group !important;
    }
    .reports-print-table th,
    .reports-print-table td {
      padding: 6px 8px !important;
      border: 1px solid #cbd5e1 !important;
      color: #334155 !important;
      text-align: left !important;
    }
    .reports-print-table thead th {
      background: #eef4f7 !important;
      color: #0f172a !important;
      font-weight: 700 !important;
      font-size: 9.5px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.03em !important;
    }
    .reports-print-table tbody tr:nth-child(even) {
      background: #f8fafc !important;
    }
    .reports-print-table tfoot th,
    .reports-print-table tfoot td {
      background: #e2e8f0 !important;
      color: #0f172a !important;
      font-weight: 700 !important;
      font-size: 10px !important;
    }
    .reports-print-table tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .reports-print-badge {
      display: inline-block !important;
      padding: 1px 6px !important;
      border-radius: 4px !important;
      font-size: 8.5px !important;
      font-weight: 600 !important;
      border: 1px solid #cbd5e1 !important;
      background: #f1f5f9 !important;
      color: #334155 !important;
      text-transform: uppercase !important;
    }
    .reports-print-badge.in-stock {
      background: #ecfdf5 !important;
      border-color: #a7f3d0 !important;
      color: #065f46 !important;
    }
    .reports-print-badge.low-stock {
      background: #fffbeb !important;
      border-color: #fde68a !important;
      color: #92400e !important;
    }
    .reports-print-badge.out-of-stock {
      background: #fef2f2 !important;
      border-color: #fecaca !important;
      color: #991b1b !important;
    }
    .no-print, button {
      display: none !important;
    }
  `;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
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
    } catch (err) {
      console.error('[printReportDocument] Iframe print failed:', err);
      window.print();
    }
  }, 250);
}
