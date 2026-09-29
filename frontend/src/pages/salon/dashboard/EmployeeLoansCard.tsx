import { Link } from 'react-router-dom';
import { ChevronRight, Coins } from 'lucide-react';
import { formatMoneyAmount } from '@/lib/money';
import { resolveUploadUrl } from '@/lib/upload-url';
import { useTenantTheme } from '@/contexts/TenantThemeContext';

interface LoanItem {
  id: string;
  employeeName: string;
  avatarUrl?: string | null;
  amount: number;
  remainingBalance?: number;
  status: string;
}

interface EmployeeLoansData {
  activeCount: number;
  totalOutstanding: number;
  recentLoans?: LoanItem[];
}

interface EmployeeLoansCardProps {
  data?: EmployeeLoansData;
}

export function EmployeeLoansCard({ data }: EmployeeLoansCardProps) {
  const theme = useTenantTheme();
  const primaryColor = theme?.palette?.primary ?? '#2563eb';

  const defaultLoans: LoanItem[] = [
    { id: '1', employeeName: 'Nimesha Dias', amount: 30000, status: 'Active' },
    { id: '2', employeeName: 'Kasuni Tharuka', amount: 25000, status: 'Active' },
    { id: '3', employeeName: 'Ruvini Perera', amount: 20000, status: 'Active' },
    { id: '4', employeeName: 'Anjali Mendis', amount: 15000, status: 'Active' },
    { id: '5', employeeName: 'Tharushi Silva', amount: 10000, status: 'Completed' },
  ];

  const activeCount = data?.activeCount || 5;
  const totalOutstanding = data?.totalOutstanding || 120000;
  const loansList = data?.recentLoans && data.recentLoans.length > 0 ? data.recentLoans : defaultLoans;

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h3>Employee Loans</h3>
          <p>Loan status for employees.</p>
        </div>
      </div>

      {/* Summary Box */}
      <div className="dash-loans-summary-box">
        <div className="dash-loans-summary-icon">
          <Coins className="h-5 w-5" />
        </div>
        <div className="flex items-center justify-between flex-1">
          <div>
            <div className="dash-loans-summary-val">{activeCount}</div>
            <div className="dash-loans-summary-lbl">Active Loans</div>
          </div>
          <div className="text-right">
            <div className="dash-loans-summary-val">
              LKR {formatMoneyAmount(totalOutstanding)}
            </div>
            <div className="dash-loans-summary-lbl">Total Outstanding</div>
          </div>
        </div>
      </div>

      {/* Recent Loans List */}
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
          <span>Recent Loans</span>
          <Link to="/salon/payroll/loans" className="dash-header-view-all">
            View All →
          </Link>
        </div>

        {loansList.slice(0, 5).map((loan, idx) => {
          const avatarSrc = resolveUploadUrl(loan.avatarUrl);
          const isCompleted = loan.status?.toUpperCase() === 'COMPLETED';
          const isOverdue = loan.status?.toUpperCase() === 'OVERDUE';

          return (
            <div key={loan.id || idx} className="dash-loan-item-row">
              <div className="flex items-center gap-2 min-w-0">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={loan.employeeName} className="dash-emp-avatar" />
                ) : (
                  <div className="dash-emp-avatar" style={{ backgroundColor: primaryColor }}>
                    {loan.employeeName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-xs text-slate-800 truncate">
                  {loan.employeeName}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="dash-loan-item-amount text-xs">
                  LKR {formatMoneyAmount(loan.amount)}
                </span>
                <span
                  className={`dash-status-pill ${
                    isCompleted ? 'completed' : isOverdue ? 'overdue' : 'active'
                  }`}
                >
                  {loan.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/salon/payroll/loans" className="dash-card-footer-link">
        <span>View All</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
