import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Package,
  Receipt,
  BarChart3,
  MapPin,
  Wallet,
  Coins,
  Truck,
  Settings,
  Scissors,
  type LucideIcon,
} from 'lucide-react';

interface ModuleItem {
  id: string;
  name: string;
  description: string;
  to: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  borderClass: string;
  isHighlighted?: boolean;
}

const MODULES: ModuleItem[] = [
  {
    id: 'customers',
    name: 'Customers',
    description: 'Manage customers',
    to: '/salon/customers',
    icon: Users,
    iconBg: 'bg-[#fff7ed]',
    iconColor: 'text-[#f97316]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'employees',
    name: 'Employees',
    description: 'Manage your staff',
    to: '/salon/employees',
    icon: UserCheck,
    iconBg: 'bg-[#eff6ff]',
    iconColor: 'text-[#3b82f6]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'services',
    name: 'Services',
    description: 'Catalog & categories',
    to: '/salon/services-hub',
    icon: Scissors,
    iconBg: 'bg-[#fdf2f8]',
    iconColor: 'text-[#ec4899]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Products, stock & categories',
    to: '/salon/inventory-hub',
    icon: Package,
    iconBg: 'bg-[#f0fdf4]',
    iconColor: 'text-[#10b981]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Quotes, sales & reports',
    to: '/salon/sales-hub',
    icon: Receipt,
    iconBg: 'bg-[#f0fdf4]',
    iconColor: 'text-[#10b981]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'P&L, sales, staff & stock',
    to: '/salon/reports-hub',
    icon: BarChart3,
    iconBg: 'bg-[#faf5ff]',
    iconColor: 'text-[#9333ea]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'branches',
    name: 'Branches',
    description: 'Manage branches',
    to: '/salon/branches',
    icon: MapPin,
    iconBg: 'bg-[#eff6ff]',
    iconColor: 'text-[#2563eb]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Manage salaries & payments',
    to: '/salon/payroll',
    icon: Wallet,
    iconBg: 'bg-[#fff1f2]',
    iconColor: 'text-[#f43f5e]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'expenses',
    name: 'Expenses',
    description: 'Expense list & categories',
    to: '/salon/expenses-hub',
    icon: Coins,
    iconBg: 'bg-[#fffbeb]',
    iconColor: 'text-[#f59e0b]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'suppliers',
    name: 'Suppliers & GRN',
    description: 'Vendors, GRN & payments',
    to: '/salon/suppliers-hub',
    icon: Truck,
    iconBg: 'bg-[#eff6ff]',
    iconColor: 'text-[#3b82f6]',
    borderClass: 'border-slate-100',
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'System settings',
    to: '/salon/settings',
    icon: Settings,
    iconBg: 'bg-[#eff6ff]',
    iconColor: 'text-[#2563eb]',
    borderClass: 'border-slate-100',
  },
];

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4 px-2 sm:px-4 space-y-6">
      {/* Title & Subtitle - Matching Screen 2 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
          More
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Manage all features of your salon.
        </p>
      </div>

      {/* 3-Column Grid - Exactly Matching Screen 2 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {MODULES.map((item) => {
          const IconComp = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-1 transition-all duration-200 group text-center cursor-pointer"
            >
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${item.iconBg} flex items-center justify-center mb-2 transition-transform group-hover:scale-108 duration-200 shadow-2xs`}
              >
                <IconComp className={`w-5 h-5 sm:w-6 sm:h-6 ${item.iconColor}`} strokeWidth={2.2} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                {item.name}
              </span>
              <span className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                {item.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
