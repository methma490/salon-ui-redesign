import { useNavigate, Link } from 'react-router-dom';
import {
  Coins,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Receipt,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '@/api/tenant.api';

export default function ExpensesHubPage() {
  const navigate = useNavigate();

  const { data: expensesData } = useQuery({
    queryKey: ['expenses-hub-recent'],
    queryFn: () => tenantApi.expenses.list({ page: '1', limit: '10' }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => tenantApi.expenseCategories.list(),
  });

  const expenses = expensesData?.data ?? [];
  const totalCount = expensesData?.meta?.total ?? expenses.length;

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4 px-2 sm:px-4 space-y-6">
      {/* Back button */}
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

      {/* Hero Banner */}
      <div className="flex items-center gap-3.5 p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="w-12 h-12 rounded-2xl bg-[#fffbeb] border border-[#fef3c7] flex items-center justify-center shrink-0">
          <Coins className="w-6 h-6 text-[#f59e0b]" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
            Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Track salon expenses, operating costs and expense categories.
          </p>
        </div>
      </div>

      {/* 2-Column Cards - Exactly Matching Reference Image */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Expense List */}
        <Link
          to="/salon/expenses"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#fde68a] transition-all group min-h-[116px] sm:min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <div className="w-11 h-11 rounded-2xl bg-[#fffbeb] border border-[#fef3c7] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Receipt className="w-5 h-5 text-[#f59e0b]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#f59e0b] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#f59e0b] transition-colors leading-tight">
              Expense List &gt;
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              View and record salon expenses...
            </p>
          </div>
        </Link>

        {/* 2. Categories */}
        <Link
          to="/salon/expense-categories"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#ddd6fe] transition-all group min-h-[116px] sm:min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <div className="w-11 h-11 rounded-2xl bg-[#faf5ff] border border-[#f3e8ff] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-5 h-5 text-[#8b5cf6]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#8b5cf6] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#8b5cf6] transition-colors leading-tight">
              Categories &gt;
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Manage expense categories ({categories.length})...
            </p>
          </div>
        </Link>
      </div>

      {/* Summary */}
      <div className="space-y-3 pt-2">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Expenses Overview
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Receipt className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-xs font-medium">Total Recorded</span>
            </div>
            <div className="text-xl font-black text-slate-900">{totalCount} Expenses</div>
          </div>
          <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-xs font-medium">Categories</span>
            </div>
            <div className="text-xl font-black text-slate-900">{categories.length} Categories</div>
          </div>
        </div>
      </div>
    </div>
  );
}
