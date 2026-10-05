import { CreditCard, TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react';
import { formatMoneyAmount } from '@/lib/money';

interface SummaryKpiCardsProps {
  revenue: number;
  revenueGrowth?: number;
  expenses: number;
  expensesGrowth?: number;
  salaries: number;
  salariesGrowth?: number;
  netProfit: number;
  openingBankBalance: number | null;
  liveBankBalance: number | null;
}

export function SummaryKpiCards({
  revenue,
  revenueGrowth = 0,
  expenses,
  expensesGrowth = 0,
  salaries,
  salariesGrowth = 0,
  netProfit,
  openingBankBalance,
  liveBankBalance,
}: SummaryKpiCardsProps) {
  return (
    <div className="dash-kpi-grid dash-kpi-grid-with-live-balance">
      <div className="dash-kpi-card dash-kpi-card-live-balance">
        <div className="dash-kpi-watermark dash-kpi-watermark-live" aria-hidden="true">
          <Wallet />
        </div>
        <div className="dash-kpi-icon-wrap dash-kpi-icon-live">
          <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Bank Balance</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-num">
              {liveBankBalance === null ? '—' : formatMoneyAmount(liveBankBalance)}
            </span>
          </div>
          <div className="dash-kpi-balance-details">
            <div>
              <span>Opening Balance</span>
              <strong>{openingBankBalance === null ? '—' : formatMoneyAmount(openingBankBalance)}</strong>
            </div>
            <div>
              <span>Net Profit</span>
              <strong>{formatMoneyAmount(netProfit ?? 0)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Card 1: Revenue */}
      <div className="dash-kpi-card dash-kpi-card-revenue">
        <div className="dash-kpi-watermark" aria-hidden="true">
          <TrendingUp />
        </div>
        <div className="dash-kpi-icon-wrap dash-kpi-icon-blue">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Revenue</span>
          <div className="dash-kpi-value">
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
      <div className="dash-kpi-card dash-kpi-card-expenses">
        <div className="dash-kpi-watermark dash-kpi-watermark-expenses" aria-hidden="true">
          <CreditCard />
        </div>
        <div className="dash-kpi-icon-wrap dash-kpi-icon-red">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Expenses</span>
          <div className="dash-kpi-value">
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
      <div className="dash-kpi-card dash-kpi-card-salaries">
        <div className="dash-kpi-watermark" aria-hidden="true">
          <Users />
        </div>
        <div className="dash-kpi-icon-wrap dash-kpi-icon-amber">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Salaries</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-num">{formatMoneyAmount(salaries ?? 0)}</span>
          </div>
          <div className="dash-kpi-trend dash-trend-green">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{salariesGrowth >= 0 ? `+${salariesGrowth}%` : `${salariesGrowth}%`}</span>
            <span className="dash-trend-subtext">vs prev</span>
          </div>
        </div>
      </div>

    </div>
  );
}
