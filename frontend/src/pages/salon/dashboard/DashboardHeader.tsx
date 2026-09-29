import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSalonBranch } from '@/contexts/SalonBranchContext';

export type QuickFilterType = 'today' | 'this_week' | 'this_month' | 'custom';

interface DashboardHeaderProps {
  quickFilter: QuickFilterType;
  onQuickFilterChange: (filter: QuickFilterType) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function DashboardHeader({
  quickFilter,
  onQuickFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DashboardHeaderProps) {
  const { user } = useAuth();
  const { branchId, branches } = useSalonBranch();

  const currentBranch = branches.find((b) => b.id === branchId);
  const branchName = branchId === 'all' || !currentBranch ? 'All Branches' : currentBranch.name;
  const userName = user?.name?.split(' ')[0] || user?.name || 'Admin';

  return (
    <div className="dash-top-header">
      <div className="dash-greeting-wrap">
        <h1>
          {getGreeting()}, {userName}! 👋
        </h1>
        <p>
          Here&apos;s how your salon is performing at <span className="dash-greeting-branch">{branchName}</span>.
        </p>
      </div>

      <div className="dash-top-actions">
        <div className="dash-quick-pills">
          <button
            type="button"
            className={`dash-pill-btn ${quickFilter === 'today' ? 'active' : ''}`}
            onClick={() => onQuickFilterChange('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`dash-pill-btn ${quickFilter === 'this_week' ? 'active' : ''}`}
            onClick={() => onQuickFilterChange('this_week')}
          >
            This Week
          </button>
          <button
            type="button"
            className={`dash-pill-btn ${quickFilter === 'this_month' ? 'active' : ''}`}
            onClick={() => onQuickFilterChange('this_month')}
          >
            This Month
          </button>
          <button
            type="button"
            className={`dash-pill-btn ${quickFilter === 'custom' ? 'active' : ''}`}
            onClick={() => onQuickFilterChange('custom')}
          >
            Custom
          </button>
        </div>

        {quickFilter === 'custom' && (
          <div className="dash-custom-dates">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              className="text-xs text-slate-700 bg-transparent outline-none cursor-pointer"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              className="text-xs text-slate-700 bg-transparent outline-none cursor-pointer"
              value={endDate}
              min={startDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
