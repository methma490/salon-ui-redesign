import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { formatMoneyAmount } from '@/lib/money';

interface PaymentMethodAmount {
  paymentMethod: string;
  amount: number;
}

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
  salesByPaymentMethod?: PaymentMethodAmount[];
  expensesByPaymentMethod?: PaymentMethodAmount[];
}

export function SummaryKpiCards({
  revenue,
  revenueGrowth = 0,
  expenses,
  expensesGrowth = 0,
  salaries,
  salariesGrowth = 0,
  netProfit,
  openingBankBalance: _openingBankBalance,
  liveBankBalance,
}: SummaryKpiCardsProps) {
  return (
    <div className="dash-kpi-grid dash-gradient-modern-grid">
      {/* 1. Live Bank Balance - Modern Sky/Blue Gradient Style */}
      <div className="dash-kpi-card dash-card-gradient-blue">
        <div className="dash-kpi-deco-wave" aria-hidden="true">
          <svg viewBox="0 0 160 65" fill="none" preserveAspectRatio="none">
            <path
              d="M0 50 C 35 15, 65 60, 100 25 C 130 -5, 145 35, 160 20 L 160 65 L 0 65 Z"
              fill="url(#blueWaveGrad)"
            />
            <path
              d="M0 50 C 35 15, 65 60, 100 25 C 130 -5, 145 35, 160 20"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="blueWaveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="dash-kpi-icon-bubble bubble-blue">
          <Wallet className="w-5 h-5" />
        </div>

        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Bank Balance</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-num">
              {liveBankBalance === null ? '—' : formatMoneyAmount(liveBankBalance)}
            </span>
          </div>

          <div className="dash-kpi-sub-row">
            <span className="dash-kpi-sub-badge">
              Available balance
            </span>
          </div>
        </div>
      </div>

      {/* 2. Total Revenue - Modern Mint/Green Gradient Style */}
      <div className="dash-kpi-card dash-card-gradient-green">
        <div className="dash-kpi-deco-bars" aria-hidden="true">
          <div className="deco-bar b1" />
          <div className="deco-bar b2" />
          <div className="deco-bar b3" />
          <div className="deco-bar b4" />
        </div>

        <div className="dash-kpi-icon-bubble bubble-green">
          <TrendingUp className="w-5 h-5" />
        </div>

        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Total Revenue</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-num text-emerald">
              {formatMoneyAmount(revenue ?? 0)}
            </span>
          </div>

          <div className="dash-kpi-sub-row">
            <div className={`dash-kpi-trend ${revenueGrowth >= 0 ? 'trend-green' : 'trend-red'}`}>
              {revenueGrowth >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{revenueGrowth >= 0 ? `+${revenueGrowth}%` : `${revenueGrowth}%`}</span>
              <span className="trend-sub">vs prev</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Net Profit - Modern Purple/Lavender Gradient Style */}
      <div className="dash-kpi-card dash-card-gradient-purple">
        <div className="dash-kpi-deco-bars" aria-hidden="true">
          <div className="deco-bar b1" />
          <div className="deco-bar b2" />
          <div className="deco-bar b3" />
          <div className="deco-bar b4" />
        </div>

        <div className="dash-kpi-icon-bubble bubble-purple">
          <CheckCircle2 className="w-5 h-5" />
        </div>

        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Net Profit</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-num">
              {formatMoneyAmount(netProfit ?? 0)}
            </span>
          </div>

          <div className="dash-kpi-sub-row">
            <span className="dash-kpi-sub-badge badge-purple">
              {netProfit >= 0 ? 'Profitable' : 'Deficit'} this period
            </span>
          </div>
        </div>
      </div>

      {/* 4. Expenses - Modern Warm Amber Gradient Style */}
      <div className="dash-kpi-card dash-card-gradient-amber">
        <div className="dash-kpi-deco-wave" aria-hidden="true">
          <svg viewBox="0 0 160 65" fill="none" preserveAspectRatio="none">
            <path
              d="M0 45 C 40 60, 80 15, 120 40 C 140 50, 150 30, 160 25 L 160 65 L 0 65 Z"
              fill="url(#amberWaveGrad)"
            />
            <path
              d="M0 45 C 40 60, 80 15, 120 40 C 140 50, 150 30, 160 25"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="amberWaveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="dash-kpi-icon-bubble bubble-amber">
          <CreditCard className="w-5 h-5" />
        </div>

        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Total Expenses</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-num">
              {formatMoneyAmount(expenses ?? 0)}
            </span>
          </div>

          <div className="dash-kpi-sub-row">
            <div className="dash-kpi-trend trend-amber">
              {expensesGrowth <= 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              <span>{expensesGrowth >= 0 ? `+${expensesGrowth}%` : `${expensesGrowth}%`}</span>
              <span className="trend-sub">vs prev</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Salaries / Payroll - Modern Rose/Pink Gradient Style (Desktop/Tablet) */}
      <div className="dash-kpi-card dash-card-gradient-rose hidden md:flex">
        <div className="dash-kpi-deco-bars" aria-hidden="true">
          <div className="deco-bar b1" />
          <div className="deco-bar b2" />
          <div className="deco-bar b3" />
          <div className="deco-bar b4" />
        </div>

        <div className="dash-kpi-icon-bubble bubble-rose">
          <Users className="w-5 h-5" />
        </div>

        <div className="dash-kpi-content">
          <span className="dash-kpi-label">Salaries / Payroll</span>
          <div className="dash-kpi-value">
            <span className="dash-kpi-num">
              {formatMoneyAmount(salaries ?? 0)}
            </span>
          </div>

          <div className="dash-kpi-sub-row">
            <div className={`dash-kpi-trend ${salariesGrowth <= 0 ? 'trend-green' : 'trend-red'}`}>
              {salariesGrowth > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{salariesGrowth >= 0 ? `+${salariesGrowth}%` : `${salariesGrowth}%`}</span>
              <span className="trend-sub">vs prev</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

