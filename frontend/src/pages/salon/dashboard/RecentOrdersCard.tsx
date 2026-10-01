import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { formatMoneyAmount } from '@/lib/money';

interface OrderItem {
  id: string;
  saleNumber?: string;
  customerName: string;
  amount: number;
  status: string;
  date: string;
}

interface RecentOrdersCardProps {
  orders?: OrderItem[];
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

export function RecentOrdersCard({ orders }: RecentOrdersCardProps) {
  const list = orders ?? [];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h3>Recent Orders</h3>
          <p>Latest POS orders from this branch.</p>
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
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ width: '28px' }} />
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.slice(0, 5).map((order, idx) => {
                const isCompleted = order.status?.toUpperCase() === 'COMPLETED';

                return (
                  <tr key={order.id || idx}>
                    <td className="text-slate-400 text-xs font-semibold">{idx + 1}</td>
                    <td className="text-xs text-slate-600">{formatDate(order.date)}</td>
                    <td className="text-xs font-semibold text-slate-800">{order.customerName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                      {formatMoneyAmount(order.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`dash-status-pill ${isCompleted ? 'completed' : 'pending'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-xs text-slate-400">
                  No recent orders recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
