import { Link } from 'react-router-dom';
import { formatMoneyAmount } from '@/lib/money';

interface TransactionItem {
  id: string;
  date: string;
  type?: string;
  category?: string;
  amount: number;
  status?: string;
}

interface RecentTransactionsCardProps {
  transactions?: TransactionItem[];
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function RecentTransactionsCard({ transactions }: RecentTransactionsCardProps) {
  const list = transactions ?? [];

  return (
    <div className="dash-card dash-recent-transactions">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h3>Recent Transactions</h3>
          <p>Latest financial transactions from this branch.</p>
        </div>

        <Link to="/salon/sales" className="dash-header-view-all">
          View All →
        </Link>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th style={{ width: '28px' }}>#</th>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.slice(0, 5).map((tx, idx) => {
                const typeLower = (tx.type || 'income').toLowerCase();

                return (
                  <tr key={tx.id || idx}>
                    <td className="text-slate-400 text-xs font-semibold">{idx + 1}</td>
                    <td className="text-xs text-slate-600">{formatDate(tx.date)}</td>
                    <td>
                      <span
                        className={`dash-status-pill ${
                          typeLower === 'expense'
                            ? 'expense'
                            : typeLower === 'salary'
                            ? 'salary'
                            : 'income'
                        }`}
                      >
                        {tx.type || 'Income'}
                      </span>
                    </td>
                    <td className="text-xs font-medium text-slate-700">{tx.category || 'POS Order'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                      {formatMoneyAmount(tx.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="dash-status-pill paid">{tx.status || 'Paid'}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-xs text-slate-400">
                  No recent transactions recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
