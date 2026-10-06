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
import { getDashboardChartColors } from './chart-colors';

interface WeeklyFinancialItem {
  week: string;
  revenue: number;
  expenses: number;
  salaries: number;
}

interface FinancialOverviewChartProps {
  data?: WeeklyFinancialItem[];
  timeframe: string;
  onTimeframeChange?: (timeframe: string) => void;
}

export function FinancialOverviewChart({ data, timeframe, onTimeframeChange }: FinancialOverviewChartProps) {
  const [chartWidth, setChartWidth] = useState(0);
  const theme = useTenantTheme();
  const primaryColor = theme?.palette?.primary ?? '#2563eb';
  const chartColors = getDashboardChartColors(primaryColor);

  const chartData = data && data.length > 0 ? data : [];
  const compactBars = chartWidth > 0 && chartWidth < 400 && chartData.length <= 10;

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
              <span className="dash-legend-dot" style={{ backgroundColor: chartColors[0] }} />
              <span>Revenue</span>
            </div>
            <div className="dash-legend-item">
              <span className="dash-legend-dot" style={{ backgroundColor: chartColors[1] }} />
              <span>Expenses</span>
            </div>
            <div className="dash-legend-item">
              <span className="dash-legend-dot" style={{ backgroundColor: chartColors[2] }} />
              <span>Salaries</span>
            </div>
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
      </div>

      <div className="w-full flex-1 min-h-[15rem] flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
            onResize={(width) => setChartWidth(Math.round(width))}
          >
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              barGap={compactBars ? 2 : 6}
              barCategoryGap={compactBars ? '10%' : '25%'}
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
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill={chartColors[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                barSize={compactBars ? 8 : undefined}
                isAnimationActive
                animationBegin={0}
                animationDuration={850}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill={chartColors[1]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                barSize={compactBars ? 8 : undefined}
                isAnimationActive
                animationBegin={100}
                animationDuration={850}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="salaries"
                name="Salaries"
                fill={chartColors[2]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                barSize={compactBars ? 8 : undefined}
                isAnimationActive
                animationBegin={200}
                animationDuration={850}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-slate-400 font-medium">No financial comparison data for this period</div>
        )}
      </div>
    </div>
  );
}
