import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatMoneyAmount } from '@/lib/money';
import { resolveUploadUrl } from '@/lib/upload-url';
import { useTenantTheme } from '@/contexts/TenantThemeContext';

interface TopEmployeeItem {
  id: string;
  rank?: number;
  name: string;
  avatarUrl?: string | null;
  revenue: number;
  servicesDone: number;
  progressPct?: number;
}

interface TopEmployeesCardProps {
  employees?: TopEmployeeItem[];
}

export function TopEmployeesCard({ employees }: TopEmployeesCardProps) {
  const theme = useTenantTheme();
  const primaryColor = theme?.palette?.primary ?? '#7C3AED';

  const list = employees ?? [];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h3>Top Performing Employees</h3>
          <p>Based on revenue generated.</p>
        </div>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table-simple">
          <thead>
            <tr>
              <th style={{ width: '28px' }}>#</th>
              <th>Employee</th>
              <th>Revenue (LKR)</th>
              <th style={{ textAlign: 'right' }}>Services Done</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.slice(0, 5).map((emp, idx) => {
                const rank = emp.rank || idx + 1;
                const avatarSrc = resolveUploadUrl(emp.avatarUrl);
                const progress = emp.progressPct || Math.round((emp.revenue / (list[0]?.revenue || 1)) * 100);

                return (
                  <tr key={emp.id || idx}>
                    <td className="text-xs text-slate-400 font-semibold">{rank}</td>
                    <td>
                      <div className="dash-emp-row">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={emp.name} className="dash-emp-avatar" />
                        ) : (
                          <div className="dash-emp-avatar" style={{ backgroundColor: primaryColor }}>
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="dash-emp-name text-xs">{emp.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dash-revenue-progress">
                        <span className="dash-revenue-val">
                          {formatMoneyAmount(emp.revenue)}
                        </span>
                        <div className="dash-mini-bar-track">
                          <div
                            className="dash-mini-bar-fill"
                            style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: primaryColor }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '12px' }}>
                      {emp.servicesDone}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-6 text-xs text-slate-400">
                  No employee performance data recorded for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link to="/salon/employees" className="dash-card-footer-link">
        <span>View All Employees</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
