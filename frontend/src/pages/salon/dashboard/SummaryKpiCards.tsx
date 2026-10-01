import { CreditCard, TrendingUp, TrendingDown, Users, Coins } from 'lucide-react';
import { formatMoneyAmount } from '@/lib/money';

interface SummaryKpiCardsProps {
  revenue: number;
  revenueGrowth?: number;
  expenses: number;
  expensesGrowth?: number;
  salaries: number;
  salariesGrowth?: number;
  netProfit: number;
  profitGrowth?: number;
}

export function SummaryKpiCards({
  revenue,
  revenueGrowth = 0,
  expenses,
  expensesGrowth = 0,
  salaries,
  salariesGrowth = 0,
  netProfit,
  profitGrowth = 0,
}: SummaryKpiCardsProps) {
  return (
    <div className="dash-kpi-grid">
      {/* Card 1: Revenue */}
      <div className="dash-kpi-card">
        <div className="dash-kpi-icon-wrap dash-kpi-icon-blue">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Revenue</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-currency">LKR</span>
            <span className="dash-kpi-num">{formatMoneyAmount(revenue ?? 0)}</span>
          </div>
          <div className={`dash-kpi-trend ${revenueGrowth >= 0 ? 'dash-trend-green' : 'dash-trend-red'}`}>
            {revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            <span>{revenueGrowth >= 0 ? `+${revenueGrowth}%` : `${revenueGrowth}%`}</span>
            <span className="dash-trend-subtext">vs prev</span>
          </div>
        </div>
      </div>

      {/* Card 2: Expenses */}
      <div className="dash-kpi-card">
        <div className="dash-kpi-icon-wrap dash-kpi-icon-red">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Expenses</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-currency">LKR</span>
            <span className="dash-kpi-num">{formatMoneyAmount(expenses ?? 0)}</span>
          </div>
          <div className="dash-kpi-trend dash-trend-red">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{expensesGrowth >= 0 ? `+${expensesGrowth}%` : `${expensesGrowth}%`}</span>
            <span className="dash-trend-subtext">vs prev</span>
          </div>
        </div>
      </div>

      {/* Card 3: Salaries */}
      <div className="dash-kpi-card">
        <div className="dash-kpi-icon-wrap dash-kpi-icon-amber">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Salaries</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-currency">LKR</span>
            <span className="dash-kpi-num">{formatMoneyAmount(salaries ?? 0)}</span>
          </div>
          <div className="dash-kpi-trend dash-trend-green">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{salariesGrowth >= 0 ? `+${salariesGrowth}%` : `${salariesGrowth}%`}</span>
            <span className="dash-trend-subtext">vs prev</span>
          </div>
        </div>
      </div>

      {/* Card 4: Net Profit */}
      <div className="dash-kpi-card">
        <div className="dash-kpi-icon-wrap dash-kpi-icon-green">
          <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Net Profit</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-currency">LKR</span>
            <span className="dash-kpi-num">{formatMoneyAmount(netProfit ?? 0)}</span>
          </div>
          <div className={`dash-kpi-trend ${profitGrowth >= 0 ? 'dash-trend-green' : 'dash-trend-red'}`}>
            {profitGrowth >= 0 ? <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            <span>{profitGrowth >= 0 ? `+${profitGrowth}%` : `${profitGrowth}%`}</span>
            <span className="dash-trend-subtext">vs prev</span>
          </div>
        </div>
      </div>
    </div>
  );
}
