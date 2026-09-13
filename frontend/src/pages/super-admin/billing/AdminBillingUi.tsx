import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/features/billing/types/billing.types';

export function AdminPageHero({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="admin-hero">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

export function AdminStatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{value}</div>
    </article>
  );
}

export function AdminPanel({
  title,
  description,
  filters,
  children,
  footer,
}: {
  title: string;
  description: string;
  filters?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2 className="admin-panel-title">{title}</h2>
        <p className="admin-panel-desc">{description}</p>
      </div>
      {filters}
      {children}
      {footer}
    </section>
  );
}

export function AdminKv({
  label,
  value,
  amount,
  fullWidth,
}: {
  label: string;
  value: ReactNode;
  amount?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className="admin-kv" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <div className="admin-kv-label">{label}</div>
      <div className={`admin-kv-value${amount ? ' is-amount' : ''}`}>{value}</div>
    </div>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return <div className="admin-empty">{message}</div>;
}

export function AdminPagination({
  meta,
  page,
  onPageChange,
}: {
  meta?: PaginationMeta;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = meta?.totalPages ?? 0;
  if (totalPages <= 1) return null;

  return (
    <div className="admin-pagination">
      <button
        type="button"
        className="admin-btn admin-btn-secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} strokeWidth={2} style={{ marginRight: '0.25rem' }} />
        Previous
      </button>
      <span className="admin-page-info">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="admin-btn admin-btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <ChevronRight size={16} strokeWidth={2} style={{ marginLeft: '0.25rem' }} />
      </button>
    </div>
  );
}
