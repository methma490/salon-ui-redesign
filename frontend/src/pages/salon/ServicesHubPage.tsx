import { useNavigate, Link } from 'react-router-dom';
import {
  Scissors,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Clock,
  Layers,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '@/api/tenant.api';

export default function ServicesHubPage() {
  const navigate = useNavigate();

  const { data: categories = [] } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => tenantApi.serviceCategories.list({ all: true }),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services-count'],
    queryFn: () => tenantApi.services.listPaginated({ limit: 1 }),
  });

  const totalServices = (servicesData as { meta?: { total: number } })?.meta?.total ?? 0;

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4 px-2 sm:px-4 space-y-6">
      {/* Back button link */}
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
        <div className="w-12 h-12 rounded-2xl bg-[#fdf2f8] border border-[#fce7f3] flex items-center justify-center shrink-0">
          <Scissors className="w-6 h-6 text-[#ec4899]" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
            Services
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage salon service catalog, pricing and service categories.
          </p>
        </div>
      </div>

      {/* Sub-Feature Tabs / Cards - Exactly matching Reference Image */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Service Catalog */}
        <Link
          to="/salon/services"
          className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#fbcfe8] transition-all group min-h-[116px] sm:min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <div className="w-11 h-11 rounded-2xl bg-[#fdf2f8] border border-[#fce7f3] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Scissors className="w-5 h-5 text-[#ec4899]" strokeWidth={2.2} />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#ec4899] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#ec4899] transition-colors leading-tight">
              Service Catalog &gt;
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              Manage all services &amp; pricing...
            </p>
          </div>
        </Link>

        {/* 2. Categories */}
        <Link
          to="/salon/service-categories"
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
              Group services into categories...
            </p>
          </div>
        </Link>
      </div>

      {/* Quick Summary Section */}
      <div className="space-y-3 pt-2">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Service Categories Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Layers className="w-4 h-4 text-[#ec4899]" />
              <span className="text-xs font-medium">Total Services</span>
            </div>
            <div className="text-xl font-black text-slate-900">{totalServices}</div>
          </div>
          <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-xs font-medium">Categories</span>
            </div>
            <div className="text-xl font-black text-slate-900">{categories.length}</div>
          </div>
          <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium">Active Status</span>
            </div>
            <div className="text-xl font-black text-emerald-600">Active</div>
          </div>
        </div>
      </div>
    </div>
  );
}
