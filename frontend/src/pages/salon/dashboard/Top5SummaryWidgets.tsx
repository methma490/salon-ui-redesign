import { Link } from 'react-router-dom';
import { ChevronRight, Scissors } from 'lucide-react';
import { formatMoneyAmount } from '@/lib/money';
import { resolveUploadUrl } from '@/lib/upload-url';
import { useTenantTheme } from '@/contexts/TenantThemeContext';
import type { CustomerLoyaltyItem } from '@/api/tenant.api';

// ---------------------------------------------------------------------------
// 1. Top 5 Employees Card
// ---------------------------------------------------------------------------
interface TopEmployeeItem {
  id: string;
  rank?: number;
  name: string;
  avatarUrl?: string | null;
  revenue: number;
  servicesDone: number;
  progressPct?: number;
}

interface Top5EmployeesCardProps {
  employees?: TopEmployeeItem[];
}

export function Top5EmployeesCard({ employees }: Top5EmployeesCardProps) {
  const theme = useTenantTheme();
  const primaryColor = theme?.palette?.primary ?? '#0d5c3d';
  const list = employees ?? [];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h3>Top 5 Employees</h3>
          <p>Ranked by revenue & services completed</p>
        </div>
        <Link
          to="/salon/employees?tab=performance"
          className="dash-header-view-all inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary,#0d5c3d)] hover:underline"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table-simple">
          <thead>
            <tr>
              <th style={{ width: '28px' }}>#</th>
              <th>Employee</th>
              <th style={{ textAlign: 'right' }}>Revenue (LKR)</th>
              <th style={{ textAlign: 'right' }}>Services</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.slice(0, 5).map((emp, idx) => {
                const rank = emp.rank || idx + 1;
                const avatarSrc = resolveUploadUrl(emp.avatarUrl);
                return (
                  <tr key={emp.id || idx}>
                    <td className="text-xs text-slate-400 font-semibold">{rank}</td>
                    <td>
                      <div className="dash-emp-row">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={emp.name} className="dash-emp-avatar" />
                        ) : (
                          <div
                            className="dash-emp-avatar"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="dash-emp-name text-xs font-semibold">{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                      {formatMoneyAmount(emp.revenue)}
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
                  No employee performance data recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link
        to="/salon/employees?tab=performance"
        className="dash-card-footer-link"
      >
        <span>View All Employees Performance</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Top 5 Customers Card
// ---------------------------------------------------------------------------
interface Top5CustomersCardProps {
  customers?: CustomerLoyaltyItem[];
}

export function Top5CustomersCard({ customers }: Top5CustomersCardProps) {
  const list = customers ?? [];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h3>Top 5 Customers</h3>
          <p>Highest lifetime & period spenders</p>
        </div>
        <Link
          to="/salon/customers?tab=analytics"
          className="dash-header-view-all inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary,#0d5c3d)] hover:underline"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table-simple">
          <thead>
            <tr>
              <th style={{ width: '28px' }}>#</th>
              <th>Customer</th>
              <th style={{ textAlign: 'center' }}>Visits</th>
              <th style={{ textAlign: 'right' }}>Total Spend (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.slice(0, 5).map((cust, idx) => {
                return (
                  <tr key={cust.id || idx}>
                    <td className="text-xs text-slate-400 font-semibold">{idx + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-900 truncate block">
                            {cust.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {cust.phone || cust.code || '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>
                      {cust.visitCount ?? 0}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                      {formatMoneyAmount(cust.totalSpend ?? 0)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-6 text-xs text-slate-400">
                  No customer activity recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link
        to="/salon/customers?tab=analytics"
        className="dash-card-footer-link"
      >
        <span>View All Customer Analytics</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Top 5 Services Card
// ---------------------------------------------------------------------------
interface TopServiceItem {
  id: string;
  name: string;
  saleCount: number;
  revenue: number;
}

interface Top5ServicesCardProps {
  services?: TopServiceItem[];
}

export function Top5ServicesCard({ services }: Top5ServicesCardProps) {
  const list = services ?? [];

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h3>Top 5 Services</h3>
          <p>Most booked salon services</p>
        </div>
        <Link
          to="/salon/services"
          className="dash-header-view-all inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary,#0d5c3d)] hover:underline"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table-simple">
          <thead>
            <tr>
              <th style={{ width: '28px' }}>#</th>
              <th>Service</th>
              <th style={{ textAlign: 'center' }}>Sales</th>
              <th style={{ textAlign: 'right' }}>Revenue (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.slice(0, 5).map((srv, idx) => {
                return (
                  <tr key={srv.id || idx}>
                    <td className="text-xs text-slate-400 font-semibold">{idx + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <Scissors className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {srv.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>
                      {srv.saleCount}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                      {formatMoneyAmount(srv.revenue)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-6 text-xs text-slate-400">
                  No service sales recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link
        to="/salon/services"
        className="dash-card-footer-link"
      >
        <span>View All Services</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
