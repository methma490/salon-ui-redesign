import { Link } from 'react-router-dom';
import { Award, Scissors, DollarSign, UserCheck, ArrowRight } from 'lucide-react';
import { formatMoneyLkr } from '@/lib/money';
import { resolveUploadUrl } from '@/lib/upload-url';

function EmployeeName({ name, photoUrl }: { name?: string | null; photoUrl?: string | null }) {
  const label = name?.trim() || 'No data';
  const avatarSrc = name ? resolveUploadUrl(photoUrl) : null;
  return (
    <div className="dash-emp-row">
      {name ? (
        avatarSrc ? (
          <img src={avatarSrc} alt={label} className="dash-emp-avatar" />
        ) : (
          <div className="dash-emp-avatar">{label.charAt(0).toUpperCase()}</div>
        )
      ) : null}
      <div className="text-sm sm:text-base font-bold text-slate-900 truncate">{label}</div>
    </div>
  );
}

interface PerformanceHighlightsProps {
  topEmployeeRevenue?: {
    name: string;
    revenue: number;
    avatarUrl?: string | null;
  } | null;
  topEmployeeServices?: {
    name: string;
    servicesDone: number;
    avatarUrl?: string | null;
  } | null;
  topCustomerSpending?: {
    name: string;
    totalSpend: number;
  } | null;
  topCustomerActive?: {
    name: string;
    visits?: number;
    servicesTaken?: number;
  } | null;
}

export function PerformanceHighlightsSection({
  topEmployeeRevenue,
  topEmployeeServices,
  topCustomerSpending,
  topCustomerActive,
}: PerformanceHighlightsProps) {
  return (
    <div className="dash-highlights-section space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--brand-primary,#0d5c3d)]" />
            Performance Highlights
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key employee and customer leaders for this salon
          </p>
        </div>
      </div>

      <div className="dash-highlights-grid">
        {/* 1. Top Employee by Revenue */}
        <div className="dash-card p-4 transition-all hover:border-[var(--brand-primary,#0d5c3d)]/40 hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Top Employee (Revenue)
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[var(--brand-primary,#0d5c3d)] flex items-center justify-center shrink-0 border border-emerald-100">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <EmployeeName name={topEmployeeRevenue?.name} photoUrl={topEmployeeRevenue?.avatarUrl} />
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              {topEmployeeRevenue?.revenue ? (
                <>
                  <span className="font-bold text-slate-900">
                    {formatMoneyLkr(topEmployeeRevenue.revenue)}
                  </span>{' '}
                  revenue
                </>
              ) : (
                '0'
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/salon/employees?tab=performance"
              className="text-[11px] font-semibold text-[var(--brand-primary,#0d5c3d)] hover:underline inline-flex items-center gap-1"
            >
              <span>Performance</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 2. Most Services Completed */}
        <div className="dash-card p-4 transition-all hover:border-[var(--brand-primary,#0d5c3d)]/40 hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Most Services Done
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <Scissors className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <EmployeeName name={topEmployeeServices?.name} photoUrl={topEmployeeServices?.avatarUrl} />
            <div className="text-xs text-slate-500 mt-0.5">
              <span className="font-extrabold text-blue-700">
                {topEmployeeServices?.servicesDone ?? 0}
              </span>{' '}
              completed services
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/salon/employees?tab=performance"
              className="text-[11px] font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Performance</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 3. Top Customer by Spending */}
        <div className="dash-card p-4 transition-all hover:border-[var(--brand-primary,#0d5c3d)]/40 hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Top Customer (Spend)
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {topCustomerSpending?.name || 'No data'}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              {topCustomerSpending?.totalSpend ? (
                <>
                  <span className="font-bold text-slate-900">
                    {formatMoneyLkr(topCustomerSpending.totalSpend)}
                  </span>{' '}
                  spend
                </>
              ) : (
                '0'
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/salon/customers?tab=analytics"
              className="text-[11px] font-semibold text-amber-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Customer Analytics</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 4. Most Active Customer */}
        <div className="dash-card p-4 transition-all hover:border-[var(--brand-primary,#0d5c3d)]/40 hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Most Active Customer
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {topCustomerActive?.name || 'No data'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              <span className="font-extrabold text-purple-700">
                {topCustomerActive?.visits ?? topCustomerActive?.servicesTaken ?? 0}
              </span>{' '}
              {topCustomerActive?.visits !== undefined ? 'visits recorded' : 'services taken'}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/salon/customers?tab=analytics"
              className="text-[11px] font-semibold text-purple-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Customer Analytics</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
