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
  const primaryColor = theme?.palette?.primary ?? '#2563eb';

  const defaultList: TopEmployeeItem[] = [
    { id: '1', rank: 1, name: 'Sanduni Lakmali', revenue: 102350, servicesDone: 86, progressPct: 95 },
    { id: '2', rank: 2, name: 'Nimesha Dias', revenue: 88420, servicesDone: 71, progressPct: 82 },
    { id: '3', rank: 3, name: 'Kasuni Tharuka', revenue: 76800, servicesDone: 64, progressPct: 71 },
    { id: '4', rank: 4, name: 'Ruvini Perera', revenue: 68210, servicesDone: 58, progressPct: 63 },
    { id: '5', rank: 5, name: 'Anjali Mendis', revenue: 54300, servicesDone: 46, progressPct: 50 },
  ];

  const list = employees && employees.length > 0 ? employees : defaultList;

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
            {list.slice(0, 5).map((emp, idx) => {
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
            })}
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
