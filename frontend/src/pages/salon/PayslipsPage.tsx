import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import {
  tenantApi,
  type PaginatedResponse,
  type PayslipDetail,
  type PayslipListItem,
} from '@/api/tenant.api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Scissors, Printer, FileDown, Eye, FileCode, ChevronLeft } from 'lucide-react';
import { formatMoneyAmount } from '@/lib/money';
import { resolveUploadUrl } from '@/lib/upload-url';
import { printReceipt } from '@/lib/print-receipt';
import { getErrorMessage, OpsError, OpsLoading, OpsPageHeader } from './salon-ops-ui';
import './employees-page.css';
import './payroll-page.css';

const MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

function unwrapList<T>(payload: PaginatedResponse<T> | T[]): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function formatMoney(value: number) {
  return formatMoneyAmount(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(month: number) {
  return MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

function monthShort(month: number) {
  return MONTHS.find((m) => m.value === month)?.short ?? String(month);
}

function getPayPeriodDates(year: number, month: number) {
  const mShort = monthShort(month);
  const lastDay = new Date(year, month, 0).getDate();
  const payPeriod = `01 ${mShort} ${year} – ${lastDay} ${mShort} ${year}`;
  const payDate = `${lastDay} ${mShort} ${year}`;
  return { payPeriod, payDate };
}

function PayslipStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'PAID'
      ? 'emp-badge emp-badge-active'
      : status === 'FINALIZED'
        ? 'emp-badge emp-badge-inactive'
        : 'emp-badge';
  return <span className={cls}>{status}</span>;
}

function buildPayslipHtml(
  detail: PayslipDetail,
  salon: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  },
) {
  const period = `${monthLabel(detail.month)} ${detail.year}`;
  const { payPeriod, payDate } = getPayPeriodDates(detail.year, detail.month);
  const resolvedLogo = resolveUploadUrl(salon.logoUrl);
  const contactLine = [
    salon.phone ? `Tel: ${salon.phone}` : '',
    salon.email ? `Email: ${salon.email}` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Payslip - ${detail.employeeName} - ${period}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #0f172a; line-height: 1.4; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 1.25rem; margin-bottom: 1.25rem; }
    .brand-wrap { display: flex; align-items: flex-start; gap: 1rem; }
    .salon-logo-img { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px; background: #fff; }
    .salon-name { font-size: 1.45rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
    .salon-sub { font-size: 0.8125rem; color: #475569; margin: 0.2rem 0 0; }
    .payslip-title-block { text-align: right; }
    .payslip-title { font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: 0.04em; }
    .period-title { font-size: 1rem; font-weight: 700; color: #1e293b; margin: 0.15rem 0 0.35rem; }
    .period-sub { font-size: 0.75rem; color: #64748b; margin: 0.1rem 0; }
    .emp-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem 1.25rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem 2rem; margin-bottom: 1.25rem; font-size: 0.8125rem; }
    .emp-row { display: flex; align-items: baseline; }
    .emp-lbl { width: 7.5rem; font-weight: 600; color: #334155; flex-shrink: 0; }
    .emp-val { font-weight: 500; color: #0f172a; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
    .card { border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; background: #fff; margin-bottom: 1.25rem; }
    .card-head { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    .head-earn { background: #f0f7ff; color: #1e3a8a; border-bottom: 1px solid #dbeafe; }
    .head-ded { background: #fff1f2; color: #9f1239; border-bottom: 1px solid #ffe4e6; }
    .head-sec { background: #f0f7ff; color: #1e3a8a; border-bottom: 1px solid #dbeafe; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    td { padding: 0.55rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; color: #0f172a; }
    tr.total td { font-weight: 700; color: #0f172a; background: #f8fafc; border-top: 1.5px solid #cbd5e1; border-bottom: none; font-size: 0.875rem; padding: 0.65rem 1rem; }
    .net-banner { border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; padding: 1rem 0.5rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .net-title { font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0; }
    .net-sub { font-size: 0.8125rem; color: #64748b; margin: 0.2rem 0 0; }
    .net-val { font-size: 1.55rem; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }
    .info-box { margin: 0.75rem 1rem; padding: 0.65rem 0.85rem; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 0.375rem; font-size: 0.75rem; color: #1e40af; }
    .notes { margin-top: 1.5rem; font-size: 0.75rem; color: #475569; line-height: 1.6; }
    .notes h4 { margin: 0 0 0.35rem; font-size: 0.8125rem; font-weight: 700; color: #1e293b; }
    .notes ul { margin: 0; padding-left: 1.2rem; }
    .notes li { margin-bottom: 0.2rem; }
    @media (max-width: 600px) {
      body { margin: 0.5rem auto; padding: 0.5rem; }
      .header { flex-direction: column; gap: 0.75rem; }
      .payslip-title-block { text-align: left; }
      .emp-box { grid-template-columns: 1fr; gap: 0.4rem; padding: 0.75rem; }
      .emp-lbl { width: 6.5rem; }
      .two-col { grid-template-columns: 1fr; gap: 0.75rem; }
      .net-banner { flex-direction: column; align-items: flex-start; gap: 0.35rem; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-wrap">
      ${resolvedLogo ? `<img src="${resolvedLogo}" class="salon-logo-img" alt="${salon.name}" />` : ''}
      <div>
        <h1 class="salon-name">${salon.name}</h1>
        ${salon.address ? `<p class="salon-sub">${salon.address}</p>` : ''}
        ${contactLine ? `<p class="salon-sub">${contactLine}</p>` : ''}
      </div>
    </div>
    <div class="payslip-title-block">
      <div class="payslip-title">PAYSLIP</div>
      <div class="period-title">${period}</div>
      <div class="period-sub">Pay Period: ${payPeriod}</div>
      <div class="period-sub">Pay Date: ${payDate}</div>
    </div>
  </div>

  <div class="emp-box">
    <div>
      <div class="emp-row"><span class="emp-lbl">Employee Name</span><span>: &nbsp;</span><span class="emp-val">${detail.employeeName}</span></div>
      <div class="emp-row" style="margin-top:0.4rem"><span class="emp-lbl">Employee ID</span><span>: &nbsp;</span><span class="emp-val">${detail.employeeCode}</span></div>
      <div class="emp-row" style="margin-top:0.4rem"><span class="emp-lbl">Designation</span><span>: &nbsp;</span><span class="emp-val">${detail.designation || 'Stylist'}</span></div>
      <div class="emp-row" style="margin-top:0.4rem"><span class="emp-lbl">Department</span><span>: &nbsp;</span><span class="emp-val">${detail.branchName || 'Salon Operations'}</span></div>
    </div>
    <div>
      <div class="emp-row"><span class="emp-lbl">Employment Type</span><span>: &nbsp;</span><span class="emp-val">Full-time</span></div>
      <div class="emp-row" style="margin-top:0.4rem"><span class="emp-lbl">Bank Account</span><span>: &nbsp;</span><span class="emp-val">—</span></div>
      <div class="emp-row" style="margin-top:0.4rem"><span class="emp-lbl">Status</span><span>: &nbsp;</span><span class="emp-val">${detail.status}</span></div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="card-head head-earn">
        <span>Earnings</span>
        <span>Amount (LKR)</span>
      </div>
      <table>
        <tr><td>Basic Salary</td><td class="num">${formatMoney(detail.basicSalary)}</td></tr>
        <tr><td>Commission</td><td class="num">${formatMoney(detail.commissionAmount)}</td></tr>
        <tr><td>Bonus / Allowance</td><td class="num">${formatMoney(detail.bonus)}</td></tr>
        <tr><td>Other Allowance</td><td class="num">0.00</td></tr>
        <tr class="total"><td>Total Earnings (Gross Salary)</td><td class="num">${formatMoney(detail.grossSalary)}</td></tr>
      </table>
    </div>

    <div class="card">
      <div class="card-head head-ded">
        <span>Deductions</span>
        <span>Amount (LKR)</span>
      </div>
      <table>
        <tr><td>Employee EPF (8%)</td><td class="num">${formatMoney(detail.employeeEpf)}</td></tr>
        <tr><td>Salary Advance</td><td class="num">${formatMoney(detail.advanceDeduction ?? 0)}</td></tr>
        <tr><td>Loan Deduction</td><td class="num">${formatMoney(detail.loanDeduction)}</td></tr>
        <tr><td>Other Deduction</td><td class="num">${formatMoney(detail.otherDeduction)}</td></tr>
        <tr class="total"><td>Total Deductions</td><td class="num">${formatMoney(detail.totalDeductions)}</td></tr>
      </table>
    </div>
  </div>

  <div class="net-banner">
    <div>
      <div class="net-title">Net Salary</div>
      <div class="net-sub">(Total Earnings – Total Deductions)</div>
    </div>
    <div class="net-val">LKR ${formatMoney(detail.netSalary)}</div>
  </div>

  <div class="card">
    <div class="card-head head-sec">
      <span>Commission Details</span>
    </div>
    <table>
      <thead>
        <tr style="background:#f8fafc;font-size:0.75rem;font-weight:700;color:#64748b">
          <td style="padding:0.45rem 1rem">Description</td>
          <td style="padding:0.45rem 1rem;text-align:right">Amount / Rate</td>
        </tr>
      </thead>
      <tbody>
        <tr><td>Employee Service Sales</td><td class="num">${formatMoney(detail.commissionBase ?? 0)}</td></tr>
        <tr><td>Commission Rate</td><td class="num">${detail.commissionPercentage ?? 0}%</td></tr>
        <tr class="total"><td>Commission</td><td class="num">${formatMoney(detail.commissionAmount)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <div class="card-head head-sec">
      <span>Employer Contributions</span>
    </div>
    <table>
      <thead>
        <tr style="background:#f8fafc;font-size:0.75rem;font-weight:700;color:#64748b">
          <td style="padding:0.45rem 1rem">Description</td>
          <td style="padding:0.45rem 1rem;text-align:right">Amount (LKR)</td>
        </tr>
      </thead>
      <tbody>
        <tr><td>Employer EPF (12%)</td><td class="num">${formatMoney(detail.employerEpf)}</td></tr>
        <tr><td>Employer ETF (3%)</td><td class="num">${formatMoney(detail.employerEtf)}</td></tr>
      </tbody>
    </table>
    </div>

  <div class="notes">
    <h4>Notes:</h4>
    <ul>
      <li>This is a computer generated payslip and does not require a signature.</li>
      <li>Please contact the HR / Payroll department for any queries.</li>
      <li>All amounts are in Sri Lankan Rupees (LKR).</li>
    </ul>
  </div>
</body>
</html>`;
}

function PayslipLogo({ logoUrl, name }: { logoUrl?: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveUploadUrl(logoUrl);

  useEffect(() => {
    setImgError(false);
  }, [resolved]);

  if (resolved && !imgError) {
    return (
      <img
        key={resolved}
        src={resolved}
        alt={name}
        onError={() => setImgError(true)}
        className="ps-logo-img"
      />
    );
  }

  return (
    <div className="ps-logo-fallback">
      {name ? name.slice(0, 2).toUpperCase() : <Scissors size={24} />}
    </div>
  );
}

function downloadPayslipHtml(
  detail: PayslipDetail,
  salon: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  },
) {
  const html = buildPayslipHtml(detail, salon);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = detail.employeeCode || detail.employeeName.replace(/\s+/g, '-');
  anchor.href = url;
  anchor.download = `Payslip-${safeName}-${detail.year}-${detail.month}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function PayslipModernView({
  detail,
  salon,
}: {
  detail: PayslipDetail;
  salon: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}) {
  const period = `${monthLabel(detail.month)} ${detail.year}`;
  const { payPeriod, payDate } = getPayPeriodDates(detail.year, detail.month);
  const contactLine = [
    salon.phone ? `Tel: ${salon.phone}` : '',
    salon.email ? `Email: ${salon.email}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div className="payslip-modern" id="payslip-modern-view">
      {/* Header */}
      <div className="ps-header">
        <div className="ps-brand">
          <PayslipLogo logoUrl={salon.logoUrl} name={salon.name} />
          <div className="ps-brand-info">
            <h1>{salon.name}</h1>
            {salon.address && <p>{salon.address}</p>}
            {contactLine && <p>{contactLine}</p>}
          </div>
        </div>

        <div className="ps-title-block">
          <h2>PAYSLIP</h2>
          <div className="ps-period-title">{period}</div>
          <div className="ps-meta-line">Pay Period: {payPeriod}</div>
          <div className="ps-meta-line">Pay Date: {payDate}</div>
        </div>
      </div>

      {/* Employee Details Box */}
      <div className="ps-emp-box">
        <div className="space-y-1.5">
          <div className="ps-emp-row">
            <span className="ps-emp-label">Employee Name</span>
            <span className="ps-emp-sep">:</span>
            <span className="ps-emp-val">{detail.employeeName}</span>
          </div>
          <div className="ps-emp-row">
            <span className="ps-emp-label">Employee ID</span>
            <span className="ps-emp-sep">:</span>
            <span className="ps-emp-val">{detail.employeeCode}</span>
          </div>
          <div className="ps-emp-row">
            <span className="ps-emp-label">Designation</span>
            <span className="ps-emp-sep">:</span>
            <span className="ps-emp-val">{detail.designation || 'Stylist'}</span>
          </div>
          <div className="ps-emp-row">
            <span className="ps-emp-label">Department</span>
            <span className="ps-emp-sep">:</span>
            <span className="ps-emp-val">{detail.branchName || 'Salon Operations'}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="ps-emp-row">
            <span className="ps-emp-label">Employment Type</span>
            <span className="ps-emp-sep">:</span>
            <span className="ps-emp-val">Full-time</span>
          </div>
          <div className="ps-emp-row">
            <span className="ps-emp-label">Bank Account</span>
            <span className="ps-emp-sep">:</span>
            <span className="ps-emp-val">—</span>
          </div>
          <div className="ps-emp-row">
            <span className="ps-emp-label">Status</span>
            <span className="ps-emp-sep">:</span>
            <span className="ps-emp-val">{detail.status}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Earnings & Deductions */}
      <div className="ps-two-col">
        <div className="ps-table-card">
          <div className="ps-table-head earnings">
            <span>EARNINGS</span>
            <span>Amount (LKR)</span>
          </div>
          <table className="ps-table">
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td>{formatMoney(detail.basicSalary)}</td>
              </tr>
              <tr>
                <td>Commission</td>
                <td>{formatMoney(detail.commissionAmount)}</td>
              </tr>
              <tr>
                <td>Bonus / Allowance</td>
                <td>{formatMoney(detail.bonus)}</td>
              </tr>
              <tr>
                <td>Other Allowance</td>
                <td>0.00</td>
              </tr>
              <tr className="total-row">
                <td>Total Earnings (Gross Salary)</td>
                <td>{formatMoney(detail.grossSalary)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="ps-table-card">
          <div className="ps-table-head deductions">
            <span>DEDUCTIONS</span>
            <span>Amount (LKR)</span>
          </div>
          <table className="ps-table">
            <tbody>
              <tr>
                <td>Employee EPF (8%)</td>
                <td>{formatMoney(detail.employeeEpf)}</td>
              </tr>
              <tr>
                <td>Salary Advance</td>
                <td>{formatMoney(detail.advanceDeduction ?? 0)}</td>
              </tr>
              <tr>
                <td>Loan Deduction</td>
                <td>{formatMoney(detail.loanDeduction)}</td>
              </tr>
              <tr>
                <td>Other Deduction</td>
                <td>{formatMoney(detail.otherDeduction)}</td>
              </tr>
              <tr className="total-row">
                <td>Total Deductions</td>
                <td>{formatMoney(detail.totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Salary Banner */}
      <div className="ps-net-banner">
        <div className="ps-net-left">
          <h3>Net Salary</h3>
          <p>(Total Earnings – Total Deductions)</p>
        </div>
        <div className="ps-net-right">LKR {formatMoney(detail.netSalary)}</div>
      </div>

      {/* Commission Details Card */}
      <div className="ps-section-card">
        <div className="ps-table-head section">
          <span>COMMISSION DETAILS</span>
        </div>
        <table className="ps-table">
          <thead>
            <tr style={{ background: '#f8fafc', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
              <td style={{ padding: '0.45rem 1rem' }}>Description</td>
              <td style={{ padding: '0.45rem 1rem', textAlign: 'right' }}>Amount / Rate</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Employee Service Sales</td>
              <td>{formatMoney(detail.commissionBase ?? 0)}</td>
            </tr>
            <tr>
              <td>Commission Rate</td>
              <td>{detail.commissionPercentage ?? 0}%</td>
            </tr>
            <tr className="total-row">
              <td>Commission</td>
              <td>{formatMoney(detail.commissionAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Employer Contributions Card */}
      <div className="ps-section-card">
        <div className="ps-table-head section">
          <span>EMPLOYER CONTRIBUTIONS</span>
        </div>
        <table className="ps-table">
          <thead>
            <tr style={{ background: '#f8fafc', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
              <td style={{ padding: '0.45rem 1rem' }}>Description</td>
              <td style={{ padding: '0.45rem 1rem', textAlign: 'right' }}>Amount (LKR)</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Employer EPF (12%)</td>
              <td>{formatMoney(detail.employerEpf)}</td>
            </tr>
            <tr>
              <td>Employer ETF (3%)</td>
              <td>{formatMoney(detail.employerEtf)}</td>
            </tr>
          </tbody>
        </table>
        </div>

      {/* Notes */}
      <div className="ps-notes">
        <h4>Notes:</h4>
        <ul>
          <li>This is a computer generated payslip and does not require a signature.</li>
          <li>Please contact the HR / Payroll department for any queries.</li>
          <li>All amounts are in Sri Lankan Rupees (LKR).</li>
        </ul>
      </div>
    </div>
  );
}

export default function PayslipsPage() {
  const now = new Date();
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [viewId, setViewId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const listParams: Record<string, string> = { limit: '100' };
  if (yearFilter !== 'all') listParams.year = yearFilter;
  if (monthFilter !== 'all') listParams.month = monthFilter;

  const {
    data: payslipsPayload,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['payroll-payslips', listParams],
    queryFn: () => tenantApi.payroll.listPayslips(listParams),
  });

  const allPayslips = unwrapList(payslipsPayload ?? []);
  const searchLower = search.trim().toLowerCase();
  const payslips = searchLower
    ? allPayslips.filter(
        (p) =>
          p.employeeName.toLowerCase().includes(searchLower) ||
          p.employeeCode.toLowerCase().includes(searchLower),
      )
    : allPayslips;

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantApi.settings.get,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: payslipDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['payroll-payslip', viewId],
    queryFn: () => tenantApi.payroll.getPayslip(viewId!),
    enabled: !!viewId,
  });

  const employeeBranch =
    branches.find((b) => b.name === payslipDetail?.branchName) ??
    branches.find((b) => b.isMain) ??
    branches[0];

  const salonLogo =
    settings?.salon.logoUrl ||
    (settings?.salon as unknown as { logoThumbnailUrl?: string | null })?.logoThumbnailUrl ||
    null;

  const salonInfo = {
    name: settings?.salon.name || 'Salon',
    logoUrl: salonLogo,
    address: employeeBranch?.address || null,
    phone: employeeBranch?.phone || settings?.salon.phone || null,
    email: employeeBranch?.email || settings?.salon.email || null,
  };

  const [previewingPdf, setPreviewingPdf] = useState(false);

  const [previewPdfBlobUrl, setPreviewPdfBlobUrl] = useState<string | null>(null);

  const handlePdfAction = async (action: 'download' | 'preview') => {
    const element = document.getElementById('payslip-modern-view');
    if (!element || !payslipDetail) return;

    const opt = {
      margin: [4, 4, 4, 4],
      filename: `Payslip-${payslipDetail.employeeCode || payslipDetail.employeeName.replace(/\s+/g, '-')}-${payslipDetail.year}-${String(payslipDetail.month).padStart(2, '0')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    // For preview in browsers/mobile that block async popups, open an empty tab first synchronously
    let previewTab: Window | null = null;
    if (action === 'preview') {
      try {
        previewTab = window.open('about:blank', '_blank');
        if (previewTab) {
          previewTab.document.write('<div style="font-family:sans-serif;display:flex;height:100vh;align-items:center;justify-content:center;color:#475569;"><p>Generating payslip PDF preview...</p></div>');
        }
      } catch {
        // Ignored if popup was blocked
      }
    }

    if (action === 'download') setDownloadingPdf(true);
    else setPreviewingPdf(true);

    try {
      // @ts-expect-error html2pdf typing
      const worker = html2pdf().set(opt).from(element);
      if (action === 'preview') {
        const pdfBlob = await worker.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);

        if (previewTab && !previewTab.closed) {
          previewTab.location.href = blobUrl;
        } else {
          // If popup blocker intervened, show built-in preview dialog or trigger download/direct nav
          const win = window.open(blobUrl, '_blank');
          if (!win) {
            setPreviewPdfBlobUrl(blobUrl);
          }
        }
        toast.success('Payslip PDF preview ready');
      } else {
        await worker.save();
        toast.success('Payslip PDF downloaded successfully');
      }
    } catch (err) {
      if (previewTab && !previewTab.closed) {
        previewTab.close();
      }
      console.error('PDF export failed:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
      setPreviewingPdf(false);
    }
  };

  const handlePrint = () => {
    const isMobile =
      typeof window !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      window.print();
    } else {
      printReceipt('payslip-modern-view');
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  if (isLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="emp-page payroll-page">
      {/* Back button to Payroll Hub */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          to="/salon/payroll"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Payroll</span>
        </Link>
      </div>

      <OpsPageHeader title="Payslips" subtitle="View and print finalized employee payslips" />

      <div className="emp-panel">
        <div className="payroll-toolbar">
          <div className="payroll-toolbar-title">Filters</div>
          <div className="emp-filter-grid cols-3">
            <div className="emp-filter-field">
              <Label>Search</Label>
              <Input
                placeholder="Employee name, code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="emp-filter-field">
              <Label>Year</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="emp-filter-field">
              <Label>Month</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="emp-panel-header">
          <div>
            <h2 className="emp-panel-title">Payslip records</h2>
            <p className="emp-panel-desc">
              {payslips.length} payslip{payslips.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {payslips.length === 0 ? (
          <div className="emp-empty">
            No payslips yet. Finalize a payroll run to generate payslips.
          </div>
        ) : (
          <>
            <div className="emp-cards">
              {payslips.map((p: PayslipListItem) => (
                <article key={p.id} className="emp-card">
                  <div className="emp-card-top">
                    <div>
                      <div className="emp-name-cell">{p.employeeName}</div>
                      <div className="emp-code">
                        {monthLabel(p.month)} {p.year}
                      </div>
                    </div>
                    <PayslipStatusBadge status={p.status} />
                  </div>
                  <div className="emp-card-meta">
                    <span>
                      <strong>Gross:</strong> {formatMoney(p.grossSalary)}
                    </span>
                    <span>
                      <strong>Net:</strong> {formatMoney(p.netSalary)}
                    </span>
                  </div>
                  <div className="emp-card-actions">
                    <button
                      type="button"
                      className="emp-btn emp-btn-primary"
                      onClick={() => setViewId(p.id)}
                    >
                      View
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="emp-table-wrap">
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Designation</th>
                    <th className="num">Gross (LKR)</th>
                    <th className="num">Deductions (LKR)</th>
                    <th className="num">Net (LKR)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p: PayslipListItem) => (
                    <tr key={p.id}>
                      <td>
                        <div className="emp-name-cell">{p.employeeName}</div>
                        <div className="emp-code">{p.employeeCode}</div>
                      </td>
                      <td>
                        {monthLabel(p.month)} {p.year}
                      </td>
                      <td>{p.designation || '—'}</td>
                      <td className="num">{formatMoney(p.grossSalary)}</td>
                      <td className="num">{formatMoney(p.totalDeductions)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {formatMoney(p.netSalary)}
                      </td>
                      <td>
                        <PayslipStatusBadge status={p.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="emp-link-btn"
                          onClick={() => setViewId(p.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!viewId} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="max-h-[94vh] overflow-y-auto w-[calc(100%-1rem)] max-w-4xl p-3 sm:p-6 rounded-2xl">
          <DialogHeader className="payslip-no-print">
            <DialogTitle>Employee Payslip</DialogTitle>
          </DialogHeader>

          {detailLoading && <div className="emp-skeleton" style={{ height: 260 }} />}

          {payslipDetail && (
            <>
              <div className="payslip-modal-actions payslip-no-print">
                <button
                  type="button"
                  className="emp-btn emp-btn-primary"
                  onClick={() => handlePdfAction('preview')}
                  disabled={previewingPdf || downloadingPdf}
                  title="Open PDF Preview in a new tab"
                >
                  <Eye size={15} style={{ marginRight: 6 }} />
                  {previewingPdf ? 'Opening Preview…' : 'Preview PDF'}
                </button>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => handlePdfAction('download')}
                  disabled={downloadingPdf || previewingPdf}
                  title="Download Payslip as PDF file"
                >
                  <FileDown size={15} style={{ marginRight: 6 }} />
                  {downloadingPdf ? 'Downloading PDF…' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={handlePrint}
                  title="Print Payslip directly"
                >
                  <Printer size={15} style={{ marginRight: 6 }} />
                  Print
                </button>
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => downloadPayslipHtml(payslipDetail, salonInfo)}
                  title="Download standalone HTML document"
                >
                  <FileCode size={15} style={{ marginRight: 6 }} />
                  Download HTML
                </button>
              </div>
              <PayslipModernView detail={payslipDetail} salon={salonInfo} />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Fallback embedded preview dialog when popup is blocked */}
      <Dialog open={!!previewPdfBlobUrl} onOpenChange={(open) => !open && setPreviewPdfBlobUrl(null)}>
        <DialogContent className="max-h-[94vh] h-[85vh] w-[calc(100%-1rem)] max-w-4xl p-4 sm:p-6 rounded-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
          </DialogHeader>
          {previewPdfBlobUrl && (
            <div className="flex-1 w-full h-full min-h-0 pt-2 flex flex-col">
              <iframe
                src={previewPdfBlobUrl}
                className="w-full flex-1 border border-slate-200 rounded-xl"
                title="Payslip PDF Preview"
              />
              <div className="flex justify-end gap-2 pt-3">
                <a
                  href={previewPdfBlobUrl}
                  download="Payslip.pdf"
                  className="emp-btn emp-btn-primary"
                >
                  Download PDF
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
