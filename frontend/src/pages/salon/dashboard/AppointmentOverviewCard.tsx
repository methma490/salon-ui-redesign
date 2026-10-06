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
const STATUS_COLORS = {
  completed: '#10b981',
  confirmed: '#3b82f6',
  cancelled: '#f43f5e',
  pending: '#f59e0b',
} as const;

interface AppointmentOverviewData {
  total: number;
  completed: number;
  completedPct: number;
  confirmed: number;
  confirmedPct: number;
  pending?: number;
  cancelled: number;
  cancelledPct: number;
  noShow?: number;
  noShowPct?: number;
  trend?: Array<{
    date: string;
    completed: number;
    confirmed: number;
    pending?: number;
    cancelled: number;
    noShow?: number;
  }>;
}

interface AppointmentOverviewCardProps {
  data?: AppointmentOverviewData;
  timeframe: string;
  onTimeframeChange?: (timeframe: string) => void;
}

export function AppointmentOverviewCard({ data, timeframe, onTimeframeChange }: AppointmentOverviewCardProps) {

  const total = data?.total || 0;
  const completed = data?.completed ?? 0;
  const confirmed = data?.confirmed ?? 0;
  const pending = data?.pending ?? 0;
  const cancelled = data?.cancelled ?? 0;

  const trendData = data?.trend && data.trend.length > 0 ? data.trend : [];

  return (
    <div className="dash-card dash-appointment-overview-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h2>Appointment Overview</h2>
          <p>Appointments count by status.</p>
        </div>

        <Select value={timeframe} onValueChange={(value) => {
          onTimeframeChange?.(value);
        }}>
          <SelectTrigger className="h-8 w-32 text-xs bg-white border-slate-200">
            <SelectValue placeholder="This Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointment summary tiles */}
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
            <span className="dash-appt-stat-val">{completed}</span>
            <span className="dash-appt-stat-lbl">Completed</span>
          </div>
        </div>

        <div className="dash-appt-stat-tile">
          <div className="dash-appt-stat-icon bg-blue-50 text-blue-600">
            <Clock className="h-4 w-4" />
          </div>
          <div className="dash-appt-stat-info">
            <span className="dash-appt-stat-val">{confirmed}</span>
            <span className="dash-appt-stat-lbl">Confirmed</span>
          </div>
        </div>

        <div className="dash-appt-stat-tile">
          <div className="dash-appt-stat-icon bg-amber-50 text-amber-600">
            <Clock className="h-4 w-4" />
          </div>
          <div className="dash-appt-stat-info">
            <span className="dash-appt-stat-val">{pending}</span>
            <span className="dash-appt-stat-lbl">Pending</span>
          </div>
        </div>

        <div className="dash-appt-stat-tile">
          <div className="dash-appt-stat-icon bg-rose-50 text-rose-600">
            <XCircle className="h-4 w-4" />
          </div>
          <div className="dash-appt-stat-info">
            <span className="dash-appt-stat-val">{cancelled}</span>
            <span className="dash-appt-stat-lbl">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="dash-legend-item">
          <span className="dash-legend-dot" style={{ backgroundColor: STATUS_COLORS.completed }} />
          <span>Completed</span>
        </div>
        <div className="dash-legend-item">
          <span className="dash-legend-dot" style={{ backgroundColor: STATUS_COLORS.confirmed }} />
          <span>Confirmed</span>
        </div>
        <div className="dash-legend-item">
          <span className="dash-legend-dot" style={{ backgroundColor: STATUS_COLORS.pending }} />
          <span>Pending</span>
        </div>
        <div className="dash-legend-item">
          <span className="dash-legend-dot" style={{ backgroundColor: STATUS_COLORS.cancelled }} />
          <span>Cancelled</span>
        </div>
        <div className="dash-legend-item">
          <span className="dash-legend-dot" style={{ backgroundColor: STATUS_COLORS.cancelled }} />
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
                stroke={STATUS_COLORS.completed}
                strokeWidth={2}
                dot={{ r: 3, fill: STATUS_COLORS.completed }}
                activeDot={{ r: 5 }}
                isAnimationActive
                animationBegin={0}
                animationDuration={850}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="confirmed"
                stroke={STATUS_COLORS.confirmed}
                strokeWidth={2}
                dot={{ r: 3, fill: STATUS_COLORS.confirmed }}
                activeDot={{ r: 5 }}
                isAnimationActive
                animationBegin={100}
                animationDuration={850}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="cancelled"
                stroke={STATUS_COLORS.cancelled}
                strokeWidth={2}
                dot={{ r: 3, fill: STATUS_COLORS.cancelled }}
                activeDot={{ r: 5 }}
                isAnimationActive
                animationBegin={200}
                animationDuration={850}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="pending"
                stroke={STATUS_COLORS.pending}
                strokeWidth={2}
                dot={{ r: 3, fill: STATUS_COLORS.pending }}
                activeDot={{ r: 5 }}
                isAnimationActive
                animationBegin={300}
                animationDuration={850}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="noShow"
                stroke={STATUS_COLORS.cancelled}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive
                animationBegin={400}
                animationDuration={850}
                animationEasing="ease-out"
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
