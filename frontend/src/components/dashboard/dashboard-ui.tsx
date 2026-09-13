import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import './dashboard-page.css';

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  sub,
  isMoney,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  isMoney?: boolean;
}) {
  return (
    <article className="dash-stat-card">
      <span className="dash-stat-icon">
        <Icon size={20} />
      </span>
      <div>
        <div className={`dash-stat-value ${isMoney ? 'is-money' : ''}`}>{value}</div>
        <div className="dash-stat-label">{label}</div>
        {sub && <div className="dash-stat-sub">{sub}</div>}
      </div>
    </article>
  );
}

export function DashboardPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      <div className="dash-panel-body">{children}</div>
    </section>
  );
}

export function DashboardEmpty({ message }: { message: string }) {
  return <div className="dash-empty">{message}</div>;
}
