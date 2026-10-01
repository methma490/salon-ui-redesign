import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantTheme } from '@/contexts/TenantThemeContext';

interface AppointmentOverviewData {
  total: number;
  completed: number;
  completedPct: number;
  pending: number;
  pendingPct: number;
  cancelled: number;
  cancelledPct: number;
  noShow?: number;
  noShowPct?: number;
  trend?: Array<{
    date: string;
    completed: number;
    pending: number;
    cancelled: number;
    noShow?: number;
  }>;
}

interface AppointmentOverviewCardProps {
  data?: AppointmentOverviewData;
}

export function AppointmentOverviewCard({ data }: AppointmentOverviewCardProps) {
  const theme = useTenantTheme();
  const primaryColor = theme?.palette?.primary ?? '#2563eb';
  const [timeframe, setTimeframe] = useState('month');

  const total = data?.total || 0;
  const completedPct = data?.completedPct ?? 0;
  const pendingPct = data?.pendingPct ?? 0;
  const cancelledPct = data?.cancelledPct ?? 0;

  const trendData = data?.trend && data.trend.length > 0 ? data.trend : [];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h2>Appointment Overview</h2>
          <p>Appointments count by status.</p>
        </div>

        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="h-8 w-28 text-xs bg-white border-slate-200">
            <SelectValue placeholder="This Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top 4 Summary metric tiles */}
      <div className="dash-appt-stats-row">
        <div className="dash-appt-stat-tile">
          <div className="dash-appt-stat-icon bg-blue-50 text-blue-600">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="dash-appt-stat-info">
            <span className="dash-appt-stat-val">{total}</span>
            <span className="dash-appt-stat-lbl">Total</span>
          </div>
        </div>

        <div className="dash-appt-stat-tile">
          <div className="dash-appt-stat-icon bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="dash-appt-stat-info">
            <span className="dash-appt-stat-val">{completedPct}%</span>
            <span className="dash-appt-stat-lbl">Completed</span>
          </div>
        </div>

        <div className="dash-appt-stat-tile">
          <div className="dash-appt-stat-icon bg-amber-50 text-amber-600">
            <Clock className="h-4 w-4" />
          </div>
          <div className="dash-appt-stat-info">
            <span className="dash-appt-stat-val">{pendingPct}%</span>
            <span className="dash-appt-stat-lbl">Pending</span>
          </div>
        </div>

        <div className="dash-appt-stat-tile">
          <div className="dash-appt-stat-icon bg-slate-100 text-slate-500">
            <XCircle className="h-4 w-4" />
          </div>
          <div className="dash-appt-stat-info">
            <span className="dash-appt-stat-val">{cancelledPct}%</span>
            <span className="dash-appt-stat-lbl">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="dash-legend-item">
          <span className="dash-legend-dot blue" style={{ backgroundColor: primaryColor }} />
          <span>Completed</span>
        </div>
        <div className="dash-legend-item">
          <span className="dash-legend-dot amber" />
          <span>Pending</span>
        </div>
        <div className="dash-legend-item">
          <span className="dash-legend-dot red" />
          <span>Cancelled</span>
        </div>
        <div className="dash-legend-item">
          <span className="dash-legend-dot gray" />
          <span>No Show</span>
        </div>
      </div>

      <div className="w-full h-48 sm:h-52 flex items-center justify-center">
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  fontSize: '11px',
                }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke={primaryColor}
                strokeWidth={2}
                dot={{ r: 3, fill: primaryColor }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="pending"
                stroke="#fb923c"
                strokeWidth={2}
                dot={{ r: 3, fill: '#fb923c' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="cancelled"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f43f5e' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="noShow"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-slate-400 font-medium">No appointment trend data for this period</div>
        )}
      </div>
    </div>
  );
}
