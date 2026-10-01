import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantTheme } from '@/contexts/TenantThemeContext';

interface WeeklyFinancialItem {
  week: string;
  revenue: number;
  expenses: number;
  salaries: number;
}

interface FinancialOverviewChartProps {
  data?: WeeklyFinancialItem[];
}

export function FinancialOverviewChart({ data }: FinancialOverviewChartProps) {
  const theme = useTenantTheme();
  const primaryColor = theme?.palette?.primary ?? '#2563eb';
  const [timeframe, setTimeframe] = useState('month');

  const chartData = data && data.length > 0 ? data : [];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h2>Revenue, Expenses & Salaries</h2>
          <p>Compare your income, expenses and salary costs.</p>
        </div>

        <div className="dash-card-actions">
          <div className="dash-legend-wrap">
            <div className="dash-legend-item">
              <span className="dash-legend-dot blue" style={{ backgroundColor: primaryColor }} />
              <span>Revenue</span>
            </div>
            <div className="dash-legend-item">
              <span className="dash-legend-dot red" />
              <span>Expenses</span>
            </div>
            <div className="dash-legend-item">
              <span className="dash-legend-dot amber" />
              <span>Salaries</span>
            </div>
          </div>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="h-8 w-28 text-xs bg-white border-slate-200">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full h-60 sm:h-72 flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              barGap={6}
              barCategoryGap="25%"
            >
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="week"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`LKR ${Number(value).toLocaleString()}`, '']}
              />
              <Bar dataKey="revenue" name="Revenue" fill={primaryColor} radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="salaries" name="Salaries" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-slate-400 font-medium">No financial comparison data for this period</div>
        )}
      </div>
    </div>
  );
}
