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

function brandPrimary(): string {
  if (typeof window === 'undefined') return '#7c3aed';
  const fromCss = getComputedStyle(document.documentElement)
    .getPropertyValue('--brand-primary')
    .trim();
  const fromRoot = getComputedStyle(
    document.querySelector('.salon-theme-root') ?? document.documentElement,
  )
    .getPropertyValue('--brand-primary')
    .trim();
  return fromRoot || fromCss || '#7c3aed';
}

function pieColors(primary: string) {
  const soft = (hex: string, mixWhite: number) => {
    // mixWhite 0..1 toward white for secondary slices
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const m = (c: number) =>
      Math.round(c + (255 - c) * mixWhite)
        .toString(16)
        .padStart(2, '0');
    return `#${m(r)}${m(g)}${m(b)}`;
  };
  return [primary, soft(primary, 0.25), soft(primary, 0.4), soft(primary, 0.55), soft(primary, 0.7), soft(primary, 0.85)];
}
const tooltipStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: 12,
};

export function SalesTrendChart({
  data,
}: {
  data: Array<{ name: string; revenue: number; sales: number }>;
}) {
  const primary = brandPrimary();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salonSalesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primary} stopOpacity={0.35} />
            <stop offset="95%" stopColor={primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`LKR ${Number(v).toLocaleString()}`, 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke={primary} strokeWidth={2} fill="url(#salonSalesGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ServiceDonutChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const colors = pieColors(brandPrimary());
  return (
    <div className="salon-donut-center">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={86} paddingAngle={3} dataKey="value" nameKey="name">
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`LKR ${Number(v).toLocaleString()} (${total ? ((Number(v) / total) * 100).toFixed(0) : 0}%)`, name]} />
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <div className="salon-donut-center-label">
          <strong>{total.toLocaleString()}</strong>
          <span>Total</span>
        </div>
      )}
    </div>
  );
}

export function TopServicesBarChart({
  data,
}: {
  data: Array<{ name: string; bookings: number }>;
}) {
  const primary = brandPrimary();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={100} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Bookings']} />
        <Bar dataKey="bookings" radius={[0, 4, 4, 0]} barSize={18} fill={primary} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EmployeePerformanceChart({
  data,
}: {
  data: Array<{ name: string; revenue: number; services: number }>;
}) {
  const primary = brandPrimary();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [name === 'revenue' ? `LKR ${Number(v).toLocaleString()}` : Number(v), name === 'revenue' ? 'Revenue' : 'Services']} />
        <Bar dataKey="revenue" fill={primary} radius={[4, 4, 0, 0]} barSize={28} />
        <Bar dataKey="services" fill={pieColors(primary)[2]} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AppointmentStackedChart({
  data,
}: {
  data: Array<{ name: string; completed: number; pending: number; cancelled: number }>;
}) {
  const primary = brandPrimary();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="completed" stackId="a" fill={primary} />
        <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
        <Bar dataKey="cancelled" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function InventoryDonutChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  const colors = ['#10b981', '#f59e0b', '#ef4444'];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={86} paddingAngle={3} dataKey="value" nameKey="name">
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CustomerGrowthChart({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  const primary = brandPrimary();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'New customers']} />
        <Line type="monotone" dataKey="count" stroke={primary} strokeWidth={2} dot={{ r: 3, fill: primary }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
