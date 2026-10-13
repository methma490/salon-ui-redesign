import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Scissors,
  ShoppingBag,
  Percent,
  Building2,
  Printer,
  Minus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { ProfitLossReportResponse } from '@/api/tenant.api';
import { formatMoneyAmount } from '@/lib/money';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OpsLoading, OpsError, getErrorMessage } from './salon-ops-ui';
import { printReportDocument } from '@/lib/print-report';

export type PnLQuickFilter = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface BranchOption {
  id: string;
  name: string;
  isMain?: boolean;
}

interface ProfitLossReportViewProps {
  data?: ProfitLossReportResponse;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch?: () => void;
  // Filter controls
  quickFilter: PnLQuickFilter;
  onQuickFilterChange: (preset: PnLQuickFilter) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  branchId: string;
  onBranchChange: (val: string) => void;
  branches: BranchOption[];
  hideBranchFilter?: boolean;
  salonTitle?: string;
}

export function ProfitLossReportView({
  data,
  isLoading,
  isError,
  error,
  refetch,
  quickFilter,
  onQuickFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  branchId,
  onBranchChange,
  branches,
  hideBranchFilter = false,
  salonTitle,
}: ProfitLossReportViewProps) {
  const handlePrint = () => {
    if (!data) return;
    printReportDocument(
      'pnl-printable-report',
      `Profit_and_Loss_${data.period.startDate}_to_${data.period.endDate}`,
    );
  };

  const netProfitPositive = (data?.summary.netProfit ?? 0) >= 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* TOP FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-1">Period:</span>
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`reports-pill-btn ${quickFilter === preset.id ? 'active' : ''}`}
              onClick={() => onQuickFilterChange(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date pickers & Branch selector */}
        <div className="flex flex-wrap items-center gap-3">
          {quickFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="h-8 text-xs px-2.5 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>
              <span className="text-xs text-slate-400">to</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="h-8 text-xs px-2.5 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>
            </div>
          )}

          {!hideBranchFilter && (
            <div className="flex items-center gap-1.5 min-w-[170px]">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <Select value={branchId || 'all'} onValueChange={onBranchChange}>
                <SelectTrigger className="h-8 text-xs border-slate-200 bg-white">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.isMain ? '(Main)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrint}
            disabled={!data || isLoading}
            className="reports-export-btn"
            title="Print or export PDF report"
          >
            <Printer className="h-4 w-4" />
            <span>Print P&L</span>
          </button>
        </div>
      </div>

      {/* LOADING & ERROR STATES */}
      {isLoading && <OpsLoading />}
      {isError && (
        <OpsError
          message={getErrorMessage(error)}
          onRetry={refetch ?? (() => {})}
        />
      )}

      {/* REPORT CONTENT */}
      {!isLoading && !isError && data && (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. TOTAL REVENUE */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Revenue
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {formatMoneyAmount(data.summary.totalRevenue)}
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    Gross: {formatMoneyAmount(data.income.grossSales)}
                  </span>
                  {data.income.discounts > 0 && (
                    <span className="text-rose-500 font-medium">
                      (-{formatMoneyAmount(data.income.discounts)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. TOTAL EXPENSES (Including Supplier Payments) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 text-rose-600">
                <Receipt className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Expenses
                </p>
                <h3 className="text-2xl font-bold text-rose-600 mt-1">
                  {formatMoneyAmount(data.summary.totalExpenses)}
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                  <span>Across {data.operatingExpenses.categories.length} categories (inc. supplier payments)</span>
                </div>
              </div>
            </div>

            {/* 3. NET PROFIT / LOSS */}
            <div
              className={`p-5 rounded-xl border shadow-sm flex items-start gap-4 ${
                netProfitPositive
                  ? 'bg-gradient-to-br from-emerald-50/50 to-white border-emerald-200'
                  : 'bg-gradient-to-br from-rose-50/50 to-white border-rose-200'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  netProfitPositive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {netProfitPositive ? (
                  <TrendingUp className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    netProfitPositive ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {netProfitPositive ? 'Net Profit' : 'Net Loss'}
                </p>
                <h3
                  className={`text-2xl font-black mt-1 ${
                    netProfitPositive ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatMoneyAmount(data.summary.netProfit)}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                      netProfitPositive
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {data.summary.netProfitMargin.toFixed(1)}% net margin
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN BREAKDOWN: FINANCIAL STATEMENT & MONTHLY TREND CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT / TOP: FORMAL FINANCIAL STATEMENT */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Profit & Loss Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {data.branch.name || 'All Branches'} &bull; {data.period.startDate} to {data.period.endDate}
                  </p>
                </div>
                {/* <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <Sparkles className="h-3 w-3" />
                  Real-time
                </div> */}
              </div>

              <div className="divide-y divide-slate-100 overflow-x-auto text-sm">
                {/* 1. INCOME SECTION */}
                <div className="p-4 bg-slate-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                      1. Income
                    </span>
                    <span className="text-xs font-semibold text-slate-500">% Rev</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 pl-3">
                      <span className="flex items-center gap-2">
                        <Scissors className="h-3.5 w-3.5 text-purple-500" />
                        Service Revenue
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{formatMoneyAmount(data.income.serviceRevenue)}</span>
                        <span className="text-xs text-slate-400 w-12 text-right">
                          {data.summary.totalRevenue > 0
                            ? ((data.income.serviceRevenue / data.summary.totalRevenue) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 pl-3">
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
                        Product Revenue
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{formatMoneyAmount(data.income.productRevenue)}</span>
                        <span className="text-xs text-slate-400 w-12 text-right">
                          {data.summary.totalRevenue > 0
                            ? ((data.income.productRevenue / data.summary.totalRevenue) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 pl-3 text-xs italic">
                      <span>Gross Sales (Before Deductions)</span>
                      <div className="flex items-center gap-4">
                        <span>{formatMoneyAmount(data.income.grossSales)}</span>
                        <span className="w-12 text-right">-</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-rose-600 pl-3">
                      <span className="flex items-center gap-2">
                        <Percent className="h-3.5 w-3.5" />
                        Discounts Allowed
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">-{formatMoneyAmount(data.income.discounts)}</span>
                        <span className="text-xs text-rose-400 w-12 text-right">
                          {data.summary.totalRevenue > 0
                            ? ((data.income.discounts / data.summary.totalRevenue) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>

                    {data.income.refunds > 0 && (
                      <div className="flex items-center justify-between text-rose-600 pl-3">
                        <span className="flex items-center gap-2">
                          <Minus className="h-3.5 w-3.5" />
                          Returns / Refunds
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">-{formatMoneyAmount(data.income.refunds)}</span>
                          <span className="text-xs text-rose-400 w-12 text-right">
                            {data.summary.totalRevenue > 0
                              ? ((data.income.refunds / data.summary.totalRevenue) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-purple-100 flex items-center justify-between font-bold text-slate-900 bg-purple-50/60 px-3 py-1.5 rounded-lg">
                    <span className="text-purple-900">Net Revenue</span>
                    <div className="flex items-center gap-4">
                      <span className="text-purple-700">{formatMoneyAmount(data.summary.totalRevenue)}</span>
                      <span className="text-xs text-purple-600 w-12 text-right">100.0%</span>
                    </div>
                  </div>
                </div>

                {/* 2. OPERATING EXPENSES (Including Supplier Payments) */}
                <div className="p-4 bg-slate-50/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Operating Expenses
                    </span>
                    <span className="text-xs font-semibold text-slate-500">% Rev</span>
                  </div>

                  <div className="space-y-1.5">
                    {data.operatingExpenses.categories.map((cat) => (
                      <div
                        key={cat.categoryCode}
                        className="flex items-center justify-between text-slate-700 pl-3 text-xs sm:text-sm"
                      >
                        <span className="capitalize">{cat.categoryName.toLowerCase()}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{formatMoneyAmount(cat.amount)}</span>
                          <span className="text-xs text-slate-400 w-12 text-right">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-rose-100 flex items-center justify-between font-bold text-slate-900 bg-rose-50/60 px-3 py-1.5 rounded-lg">
                    <span className="text-rose-900">Total Expenses</span>
                    <div className="flex items-center gap-4">
                      <span className="text-rose-700">
                        {formatMoneyAmount(data.operatingExpenses.totalExpenses)}
                      </span>
                      <span className="text-xs text-rose-600 w-12 text-right">
                        {data.summary.totalRevenue > 0
                          ? ((data.operatingExpenses.totalExpenses / data.summary.totalRevenue) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. NET PROFIT / LOSS FINAL LINE */}
                <div
                  className={`p-5 flex items-center justify-between text-lg font-black border-t-2 ${
                    netProfitPositive
                      ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950'
                      : 'bg-rose-100/70 border-rose-400 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {netProfitPositive ? (
                      <TrendingUp className="h-6 w-6 text-emerald-700" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-rose-700" />
                    )}
                    <span>NET {netProfitPositive ? 'PROFIT' : 'LOSS'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={netProfitPositive ? 'text-emerald-800' : 'text-rose-800'}>
                      {formatMoneyAmount(data.summary.netProfit)}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        netProfitPositive
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {data.summary.netProfitMargin.toFixed(1)}% margin
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT / BOTTOM: MONTHLY TREND CHART */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Chart Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Monthly Trend
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Revenue vs Expenses vs Net Profit
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data.monthlyTrend}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        tickFormatter={(v: number | string) => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : String(v))}
                      />
                      <Tooltip
                        formatter={((val: unknown) => [formatMoneyAmount(Number(val) || 0), '']) as any}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="revenue" name="Revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="netProfit"
                        name="Net Profit"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#10b981' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Operating Expenses Distribution Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  Expense Structure
                </h4>
                <div className="space-y-2.5">
                  {data.operatingExpenses.categories.slice(0, 5).map((cat) => (
                    <div key={cat.categoryCode} className="text-xs">
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>{cat.categoryName}</span>
                        <span>{formatMoneyAmount(cat.amount)} ({cat.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden Formal Printable Statement Document for printReportDocument */}
          <section
            id="pnl-printable-report"
            className="reports-print-document"
            style={{ display: 'none' }}
            aria-label="Profit and Loss statement print template"
          >
            <header className="reports-print-header">
              <div>
                <p className="reports-print-eyebrow">{salonTitle || 'Dart Smart Salon'}</p>
                <h1>Profit &amp; Loss Statement</h1>
                <p>
                  Period: {data.period.startDate} to {data.period.endDate} &bull; Branch: {data.branch.name || 'All Branches'}
                </p>
              </div>
              <span className="reports-print-generated">Generated automatically</span>
            </header>

            <div className="reports-print-summary">
              <div><span>Total Revenue</span><strong>{formatMoneyAmount(data.summary.totalRevenue)}</strong></div>
              <div><span>Total Expenses</span><strong>{formatMoneyAmount(data.summary.totalExpenses)}</strong></div>
              <div><span>Net Profit</span><strong>{formatMoneyAmount(data.summary.netProfit)} ({data.summary.netProfitMargin.toFixed(1)}%)</strong></div>
            </div>

            <table className="reports-print-table">
              <thead>
                <tr>
                  <th>Category / Line Item</th>
                  <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                  <th style={{ textAlign: 'right' }}>% of Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}><td colSpan={3}>1. OPERATING REVENUE</td></tr>
                <tr><td>Service Revenue</td><td style={{ textAlign: 'right' }}>{formatMoneyAmount(data.income.serviceRevenue)}</td><td style={{ textAlign: 'right' }}>{data.summary.totalRevenue > 0 ? ((data.income.serviceRevenue / data.summary.totalRevenue) * 100).toFixed(1) : 0}%</td></tr>
                <tr><td>Product Revenue</td><td style={{ textAlign: 'right' }}>{formatMoneyAmount(data.income.productRevenue)}</td><td style={{ textAlign: 'right' }}>{data.summary.totalRevenue > 0 ? ((data.income.productRevenue / data.summary.totalRevenue) * 100).toFixed(1) : 0}%</td></tr>
                <tr><td>Discounts Allowed</td><td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatMoneyAmount(data.income.discounts)}</td><td style={{ textAlign: 'right' }}>-</td></tr>
                {data.income.refunds > 0 && <tr><td>Returns / Refunds</td><td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatMoneyAmount(data.income.refunds)}</td><td style={{ textAlign: 'right' }}>-</td></tr>}
                <tr style={{ fontWeight: 700, background: '#f1f5f9' }}><td>Total Net Revenue</td><td style={{ textAlign: 'right' }}>{formatMoneyAmount(data.summary.totalRevenue)}</td><td style={{ textAlign: 'right' }}>100.0%</td></tr>

                <tr style={{ background: '#f8fafc', fontWeight: 700 }}><td colSpan={3}>2. OPERATING EXPENSES (INC. SUPPLIER PAYMENTS)</td></tr>
                {data.operatingExpenses.categories.map((c) => (
                  <tr key={c.categoryCode}><td>{c.categoryName}</td><td style={{ textAlign: 'right' }}>{formatMoneyAmount(c.amount)}</td><td style={{ textAlign: 'right' }}>{c.percentage.toFixed(1)}%</td></tr>
                ))}
                <tr style={{ fontWeight: 700, background: '#fff1f2' }}><td>Total Operating Expenses</td><td style={{ textAlign: 'right', color: '#be123c' }}>{formatMoneyAmount(data.operatingExpenses.totalExpenses)}</td><td style={{ textAlign: 'right', color: '#be123c' }}>{data.summary.totalRevenue > 0 ? ((data.operatingExpenses.totalExpenses / data.summary.totalRevenue) * 100).toFixed(1) : 0}%</td></tr>

                <tr style={{ fontWeight: 900, background: netProfitPositive ? '#dcfce7' : '#fee2e2' }}>
                  <td>NET {netProfitPositive ? 'PROFIT' : 'LOSS'}</td>
                  <td style={{ textAlign: 'right', color: netProfitPositive ? '#15803d' : '#b91c1c' }}>{formatMoneyAmount(data.summary.netProfit)}</td>
                  <td style={{ textAlign: 'right', color: netProfitPositive ? '#15803d' : '#b91c1c' }}>{data.summary.netProfitMargin.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
