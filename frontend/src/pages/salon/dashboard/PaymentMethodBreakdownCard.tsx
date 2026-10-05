import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTenantTheme } from '@/contexts/TenantThemeContext';
import { formatMoneyAmount } from '@/lib/money';
import { getDashboardChartColors } from './chart-colors';

interface PaymentMethodAmount {
  paymentMethod: string;
  amount: number;
}

interface PaymentMethodBreakdownCardProps {
  sales?: PaymentMethodAmount[];
  expenses?: PaymentMethodAmount[];
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'];

function formatMethod(method: string) {
  switch (method) {
    case 'CASH': return 'Cash';
    case 'CARD': return 'Card';
    case 'BANK_TRANSFER': return 'Bank Transfer';
    case 'OTHER': return 'Other';
    default:
      return method.toLowerCase().split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}

function PaymentMethodPanel({
  title,
  rows,
  colors,
}: {
  title: string;
  rows: PaymentMethodAmount[];
  colors: string[];
}) {
  const amounts = useMemo(() => {
    const methods = [...PAYMENT_METHODS, ...rows.map((row) => row.paymentMethod)
      .filter((method) => !PAYMENT_METHODS.includes(method))];
    return methods.map((method) => ({
      method,
      amount: rows.filter((row) => row.paymentMethod === method)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    }));
  }, [rows]);
  const total = amounts.reduce((sum, row) => sum + row.amount, 0);
  const chartData = amounts.map((row, index) => ({
    ...row,
    name: formatMethod(row.method),
    color: colors[index % colors.length],
  }));

  return (
    <section className="dash-payment-method-panel" aria-label={`${title} payment methods`}>
      <h3>{title}</h3>
      <div className="dash-payment-method-donut-wrap">
        <div
          className="dash-payment-method-donut"
          role="img"
          aria-label={`${title} by payment method, total ${formatMoneyAmount(total)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="89%"
                paddingAngle={total > 0 ? 2 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((entry) => <Cell key={entry.method} fill={entry.color} />)}
              </Pie>
              <Tooltip
                wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                allowEscapeViewBox={{ x: true, y: true }}
                content={({ active, payload }) => {
                  const entry = payload?.[0]?.payload as
                    | { name: string; amount: number }
                    | undefined;
                  if (!active || !entry) return null;
                  return (
                    <div className="dash-payment-method-tooltip">
                      <strong>{entry.name}</strong>
                      <span>{formatMoneyAmount(entry.amount)}</span>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="dash-payment-method-donut-center">
            <strong>{formatMoneyAmount(total)}</strong>
            <span>Total {title}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PaymentMethodBreakdownCard({
  sales = [],
  expenses = [],
}: PaymentMethodBreakdownCardProps) {
  const theme = useTenantTheme();
  const colors = useMemo(() => getDashboardChartColors(theme.palette.primary), [theme.palette.primary]);

  return (
    <div className="dash-card dash-payment-method-card">
      <div className="dash-payment-method-header">
        <div className="dash-card-title-group">
          <h2>Payment Method Breakdown</h2>
          <p>Sales and expenses grouped by payment method for the selected period.</p>
        </div>
      </div>
      <div className="dash-payment-method-legend" aria-label="Payment method colour key">
        {PAYMENT_METHODS.map((method, index) => (
          <span className="dash-payment-method-legend-item" key={method}>
            <span
              className="dash-payment-method-legend-swatch"
              style={{ backgroundColor: colors[index] }}
              aria-hidden="true"
            />
            {formatMethod(method)}
          </span>
        ))}
      </div>
      <div className="dash-payment-method-panels">
        <PaymentMethodPanel title="Sales" rows={sales} colors={colors} />
        <PaymentMethodPanel title="Expenses" rows={expenses} colors={colors} />
      </div>
    </div>
  );
}
