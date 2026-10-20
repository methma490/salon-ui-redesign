import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Wallet,
  Banknote,
  FileSpreadsheet,
  Coins,
  ChevronRight,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  CreditCard,
  ChevronLeft,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { tenantApi, type EmployeeAdvance, type PayrollRun } from '@/api/tenant.api';
import { formatMoneyLkr } from '@/lib/money';

export default function PayrollHubPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Payroll Hub is designed for mobile and tablet navigation; desktop users are redirected to Run Payroll
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      navigate('/salon/payroll/runs', { replace: true });
    }
  }, [navigate]);

  // Load recent advances and payroll runs for the "Recent Payroll Activities" section
  const { data: advancesData } = useQuery({
    queryKey: ['payroll-advances-recent'],
    queryFn: () => tenantApi.payroll.listAdvances({ limit: '5' }),
  });

  const { data: payrollRunsData } = useQuery({
    queryKey: ['payroll-runs-recent'],
    queryFn: () => tenantApi.payroll.listRuns({ limit: '3' }),
  });

  const advances: EmployeeAdvance[] = Array.isArray(advancesData)
    ? advancesData
    : (advancesData && Array.isArray(advancesData.data) ? advancesData.data : []);

  const runs: PayrollRun[] = Array.isArray(payrollRunsData)
    ? payrollRunsData
    : (payrollRunsData && Array.isArray(payrollRunsData.data) ? payrollRunsData.data : []);

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4 px-2 sm:px-4 space-y-6">
      {/* Back button link for sub-page */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/salon/more')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to More</span>
        </button>
      </div>

      {/* Screen 3 Hero Banner */}
      <div className="flex items-center gap-3.5 p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="w-12 h-12 rounded-2xl bg-[#fff1f2] border border-[#ffe4e6] flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6 text-[#f43f5e]" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
            Payroll
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage salaries, advances and employee payments.
          </p>
        </div>
      </div>

      {/* 2x2 Grid of the 4 Main Sub-Feature Tasks - Exactly Matching Screen 3 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Salary Advances */}
        <Link
          to="/salon/payroll/advances"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#ddd6fe] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#faf5ff] border border-[#f3e8ff] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Banknote className="w-5 h-5 text-[#8b5cf6]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#7c3aed] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#7c3aed] transition-colors leading-tight">
              Salary Advances &gt;
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              Manage staff salary advances
            </p>
          </div>
        </Link>

        {/* 2. Run Payroll */}
        <Link
          to="/salon/payroll/runs"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#bbf7d0] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5 text-[#10b981]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#10b981] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#10b981] transition-colors leading-tight">
              Run Payroll &gt;
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              Process this month&apos;s salary
            </p>
          </div>
        </Link>

        {/* 3. Payslips */}
        <Link
          to="/salon/payroll/payslips"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#fde68a] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#fffbeb] border border-[#fef3c7] flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5 text-[#f59e0b]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#f59e0b] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#f59e0b] transition-colors leading-tight">
              Payslips &gt;
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              View and download employee payslips
            </p>
          </div>
        </Link>

        {/* 4. Advance Wages / Loans */}
        <Link
          to="/salon/payroll/loans"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#bfdbfe] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Coins className="w-5 h-5 text-[#3b82f6]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3b82f6] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#3b82f6] transition-colors leading-tight">
              Advance Wages &gt;
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              Manage wage adjustments &amp; loans
            </p>
          </div>
        </Link>
      </div>

      {/* Screen 3 Section: Recent Payroll Activities */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Recent Payroll Activities
          </h2>
          <Link
            to="/salon/payroll/advances"
            className="text-xs font-semibold text-[#7c3aed] hover:text-purple-700 flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {/* Recent items or fallback sample list from Screen 3 */}
          {runs.length > 0 ? (
            runs.slice(0, 2).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      Payroll Run {run.status === 'PAID' ? 'Completed' : 'Draft'}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {run.year}-{String(run.month).padStart(2, '0')} • {formatMoneyLkr(Number(run.totalNet ?? 0))}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400 shrink-0 ml-2">
                  {new Date(run.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">Payroll Run Completed</p>
                  <p className="text-xs text-slate-500 mt-0.5">October 2026</p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-400">Oct 10, 2026</span>
            </div>
          )}

          {advances.length > 0 ? (
            advances.slice(0, 3).map((adv) => (
              <div
                key={adv.id}
                className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100/80 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-5 h-5 text-[#7c3aed]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      Advance Added
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {adv.employeeName} • {formatMoneyLkr(Number(adv.originalAmount))}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400 shrink-0 ml-2">
                  {new Date(adv.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100/80 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-5 h-5 text-[#7c3aed]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Advance Added</p>
                    <p className="text-xs text-slate-500 mt-0.5">Nimal Perera</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">Oct 08, 2026</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Payslip Generated</p>
                    <p className="text-xs text-slate-500 mt-0.5">Kasun Fernando</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">Oct 05, 2026</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Advance Paid</p>
                    <p className="text-xs text-slate-500 mt-0.5">Sashini Silva</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">Oct 02, 2026</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
