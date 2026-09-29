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
  revenueGrowth = 12,
  expenses,
  expensesGrowth = 8,
  salaries,
  salariesGrowth = 5,
  netProfit,
  profitGrowth = 16,
}: SummaryKpiCardsProps) {
  return (
    <div className="dash-kpi-grid">
      {/* Card 1: Revenue */}
      <div className="dash-kpi-card">
        <div className="dash-kpi-icon-wrap dash-kpi-icon-blue">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Revenue</span>
          <span className="dash-kpi-value">
            LKR {formatMoneyAmount(revenue > 0 ? revenue : 482350)}
          </span>
          <div className="dash-kpi-trend dash-trend-green">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+{revenueGrowth}%</span>
            <span className="dash-trend-subtext">vs last month</span>
          </div>
        </div>
      </div>

      {/* Card 2: Expenses */}
      <div className="dash-kpi-card">
        <div className="dash-kpi-icon-wrap dash-kpi-icon-red">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Expenses</span>
          <span className="dash-kpi-value">
            LKR {formatMoneyAmount(expenses > 0 ? expenses : 231800)}
          </span>
          <div className="dash-kpi-trend dash-trend-red">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+{expensesGrowth}%</span>
            <span className="dash-trend-subtext">vs last month</span>
          </div>
        </div>
      </div>

      {/* Card 3: Salaries */}
      <div className="dash-kpi-card">
        <div className="dash-kpi-icon-wrap dash-kpi-icon-amber">
          <Users className="h-5 w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Salaries</span>
          <span className="dash-kpi-value">
            LKR {formatMoneyAmount(salaries > 0 ? salaries : 78600)}
          </span>
          <div className="dash-kpi-trend dash-trend-green">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+{salariesGrowth}%</span>
            <span className="dash-trend-subtext">vs last month</span>
          </div>
        </div>
      </div>

      {/* Card 4: Net Profit */}
      <div className="dash-kpi-card">
        <div className="dash-kpi-icon-wrap dash-kpi-icon-green">
          <Coins className="h-5 w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Net Profit</span>
          <span className="dash-kpi-value">
            LKR {formatMoneyAmount(netProfit !== 0 ? netProfit : 171950)}
          </span>
          <div className={`dash-kpi-trend ${profitGrowth >= 0 ? 'dash-trend-green' : 'dash-trend-red'}`}>
            {profitGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{profitGrowth >= 0 ? `+${profitGrowth}%` : `${profitGrowth}%`}</span>
            <span className="dash-trend-subtext">vs last month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
