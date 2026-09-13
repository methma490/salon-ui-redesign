import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = {
  primary: '#0d5c3d',
  secondary: '#10b981',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#94a3b8',
};

const PLAN_COLORS: Record<string, string> = {
  Gold: '#d4a017',
  Silver: '#94a3b8',
  Platinum: '#6366f1',
  Custom: '#0d5c3d',
};

interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface MultiSeriesData {
  name: string;
  [key: string]: string | number;
}

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #e5ebe8',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: 12,
};

export function SparklineChart({
  data,
  dataKey = 'value',
  color = COLORS.primary,
  height = 44,
}: {
  data: Array<{ value: number }>;
  dataKey?: string;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SalonGrowthAreaChart({ data }: { data: MultiSeriesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="newSalonsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.35} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe8" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="newSalons"
          name="New Salons"
          stroke={COLORS.primary}
          strokeWidth={2}
          fill="url(#newSalonsGrad)"
        />
        <Line
          type="monotone"
          dataKey="cancelledSalons"
          name="Cancelled Salons"
          stroke={COLORS.danger}
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueStackedBarChart({ data }: { data: MultiSeriesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe8" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={42}
          tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`LKR ${Number(value).toLocaleString()}`, '']}
        />
        <Bar dataKey="subscription" name="Subscriptions" stackId="a" fill={COLORS.primary} radius={[0, 0, 0, 0]} />
        <Bar dataKey="upgrade" name="Upgrades" stackId="a" fill={COLORS.secondary} />
        <Bar dataKey="renewal" name="Renewals" stackId="a" fill="#34d399" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionDonutChart({
  data,
  centerTotal,
}: {
  data: ChartDataItem[];
  centerTotal?: number;
}) {
  const total = centerTotal ?? data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="s360-donut-center">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={PLAN_COLORS[entry.name] ?? COLORS.primary} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [
              `${Number(value)} (${((Number(value) / total) * 100).toFixed(0)}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="s360-donut-center-label">
        <strong>{total.toLocaleString()}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

// Legacy exports kept for compatibility
export function SalonGrowthChart({ data }: { data: MultiSeriesData[] }) {
  return <SalonGrowthAreaChart data={data} />;
}

export function RevenueAreaChart({ data }: { data: MultiSeriesData[] }) {
  return <RevenueStackedBarChart data={data} />;
}

export function PaymentStatusChart({ data }: { data: ChartDataItem[] }) {
  const statusColors: Record<string, string> = {
    Successful: COLORS.success,
    Pending: COLORS.warning,
    Failed: COLORS.danger,
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe8" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={statusColors[entry.name] ?? COLORS.muted} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FeatureUsageChart({ data }: { data: ChartDataItem[] }) {
  const palette = ['#0d5c3d', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe8" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={90} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value)}%`, 'Usage']} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
