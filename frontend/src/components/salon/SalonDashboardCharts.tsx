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

const GREEN = '#0d5c3d';
const GREEN_LIGHT = '#10b981';
const PIE_COLORS = ['#0d5c3d', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

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
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salonSalesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={GREEN} stopOpacity={0.35} />
            <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`LKR ${Number(v).toLocaleString()}`, 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} fill="url(#salonSalesGrad)" />
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
  return (
    <div className="salon-donut-center">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={86} paddingAngle={3} dataKey="value" nameKey="name">
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={100} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Bookings']} />
        <Bar dataKey="bookings" radius={[0, 4, 4, 0]} barSize={18} fill={GREEN} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EmployeePerformanceChart({
  data,
}: {
  data: Array<{ name: string; revenue: number; services: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [name === 'revenue' ? `LKR ${Number(v).toLocaleString()}` : Number(v), name === 'revenue' ? 'Revenue' : 'Services']} />
        <Bar dataKey="revenue" fill={GREEN} radius={[4, 4, 0, 0]} barSize={28} />
        <Bar dataKey="services" fill={GREEN_LIGHT} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AppointmentStackedChart({
  data,
}: {
  data: Array<{ name: string; completed: number; pending: number; cancelled: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="completed" stackId="a" fill={GREEN} />
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
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'New customers']} />
        <Line type="monotone" dataKey="count" stroke={GREEN} strokeWidth={2} dot={{ r: 3, fill: GREEN }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
