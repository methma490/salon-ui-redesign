import { useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  FileText,
  CreditCard,
  Coins,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export default function SuppliersHubPage() {
  const navigate = useNavigate();

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
        <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center shrink-0">
          <Truck className="w-6 h-6 text-[#2563eb]" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
            Suppliers &amp; GRN
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage vendors, goods received notes, supplier payments &amp; credit outstanding.
          </p>
        </div>
      </div>

      {/* 2x2 Grid of the 4 Cards - Exactly Matching Reference Image */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Suppliers */}
        <Link
          to="/salon/suppliers"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#bfdbfe] transition-all group min-h-[116px] sm:min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <div className="w-11 h-11 rounded-2xl bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Truck className="w-5 h-5 text-[#2563eb]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors leading-tight">
              Suppliers &gt;
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Manage product vendors...
            </p>
          </div>
        </Link>

        {/* 2. GRN / Purchases */}
        <Link
          to="/salon/grns"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#bbf7d0] transition-all group min-h-[116px] sm:min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <div className="w-11 h-11 rounded-2xl bg-[#f0fdf4] border border-[#dcfce7] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <FileText className="w-5 h-5 text-[#16a34a]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#16a34a] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#16a34a] transition-colors leading-tight">
              GRN / Purchases &gt;
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Goods received notes &amp; stock...
            </p>
          </div>
        </Link>

        {/* 3. Supplier Payments */}
        <Link
          to="/salon/supplier-payments"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#fed7aa] transition-all group min-h-[116px] sm:min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <div className="w-11 h-11 rounded-2xl bg-[#fff7ed] border border-[#ffedd5] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <CreditCard className="w-5 h-5 text-[#ea580c]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#ea580c] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#ea580c] transition-colors leading-tight">
              Supplier Payments &gt;
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Record payments to vendors...
            </p>
          </div>
        </Link>

        {/* 4. Outstanding / Credit */}
        <Link
          to="/salon/supplier-outstanding"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#ddd6fe] transition-all group min-h-[116px] sm:min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <div className="w-11 h-11 rounded-2xl bg-[#faf5ff] border border-[#f3e8ff] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Coins className="w-5 h-5 text-[#8b5cf6]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#8b5cf6] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#8b5cf6] transition-colors leading-tight">
              Outstanding / Credit &gt;
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Credit balance &amp; payables...
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
