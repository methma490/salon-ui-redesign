import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const DASH_CHART_COLORS = [
  '#a44a5c',
  '#16a34a',
  '#22c55e',
  '#4ade80',
  '#065f46',
  '#047857',
  '#86efac',
  '#14532d',
];

export interface ChartDatum {
  name: string;
  value: number;
  [key: string]: string | number;
}

function formatAxisMoney(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function ChartTooltip({
  active,
  payload,
  label,
  valuePrefix = '',
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; payload?: ChartDatum }>;
  label?: string;
  valuePrefix?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const value = Number(item.value ?? 0);
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-[#0f172a]">{label ?? item.name}</p>
      <p className="mt-0.5 text-[#a44a5c]">
        {valuePrefix}
        {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export function DashboardBarChart({
  data,
  dataKey = 'value',
  xKey = 'name',
  valuePrefix = 'LKR ',
  color = DASH_CHART_COLORS[0],
}: {
  data: ChartDatum[];
  dataKey?: string;
  xKey?: string;
  valuePrefix?: string;
  color?: string;
}) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatAxisMoney}
          width={42}
        />
        <Tooltip content={<ChartTooltip valuePrefix={valuePrefix} />} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DashboardPieChart({
  data,
  valuePrefix = '',
}: {
  data: ChartDatum[];
  valuePrefix?: string;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={88}
          paddingAngle={2}
        >
          {filtered.map((entry, index) => (
            <Cell key={entry.name} fill={DASH_CHART_COLORS[index % DASH_CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip valuePrefix={valuePrefix} />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value: string) => (
            <span style={{ color: '#475569', fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function fillWeeklySales(
  weeklySales: Array<{ date: string; saleCount: number; total: number }>,
) {
  const map = new Map(weeklySales.map((row) => [row.date, row]));
  const result: ChartDatum[] = [];

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = map.get(key);
    result.push({
      name: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: row?.total ?? 0,
      date: key,
      saleCount: row?.saleCount ?? 0,
    });
  }

  return result;
}
