import {
  forwardRef,
  type ButtonHTMLAttributes,
  type FormHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronLeft, ChevronRight, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import './employees-page.css';

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  const err = error as { response?: { data?: { message?: string | string[] } } };
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
}

export function OpsStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'emp-badge emp-badge-active'
      : status === 'BLOCKED' || status === 'RESIGNED'
        ? 'emp-badge emp-badge-resigned'
        : 'emp-badge emp-badge-inactive';
  return <span className={cls}>{status}</span>;
}

/** Simple dialog matching the Branch create/edit modal style. */
export function SimpleFormDialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
  );
}

export function SimpleForm({
  children,
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form className={cn('space-y-4', className)} {...props}>
      {children}
    </form>
  );
}

export function FormSubmit({
  children,
  pending = false,
  disabled = false,
}: {
  children: ReactNode;
  pending?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {children}
    </Button>
  );
}

export function FormTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function OpsLoading() {
  return (
    <div className="emp-page">
      <div className="emp-skeleton" />
    </div>
  );
}

export function OpsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="emp-page">
      <div className="emp-error-box">
        <strong>Something went wrong</strong>
        <p style={{ margin: '0.5rem 0 0' }}>{message}</p>
      </div>
      <button type="button" className="emp-btn emp-btn-primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

type OpsIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  variant?: 'default' | 'danger' | 'success';
};

export const OpsIconButton = forwardRef<HTMLButtonElement, OpsIconButtonProps>(
  function OpsIconButton({ label, icon, variant = 'default', className = '', ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={`emp-icon-btn emp-icon-btn-${variant} ${className}`.trim()}
        aria-label={label}
        title={label}
        {...props}
      >
        <span className="emp-icon-btn-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="emp-icon-btn-label">{label}</span>
      </button>
    );
  },
);

export function OpsEditButton(props: Omit<OpsIconButtonProps, 'label' | 'icon'>) {
  return <OpsIconButton label="Edit" icon={<Pencil size={16} strokeWidth={2} />} {...props} />;
}

export function OpsDeleteButton(props: Omit<OpsIconButtonProps, 'label' | 'icon' | 'variant'>) {
  return <OpsIconButton label="Delete" variant="danger" icon={<Trash2 size={16} strokeWidth={2} />} {...props} />;
}

export function OpsToggleStatusButton({
  isActive,
  ...props
}: Omit<OpsIconButtonProps, 'label' | 'icon' | 'variant'> & { isActive: boolean }) {
  const label = isActive ? 'Deactivate' : 'Activate';
  return (
    <OpsIconButton
      label={label}
      icon={
        isActive ? (
          <PowerOff size={16} strokeWidth={2} />
        ) : (
          <Power size={16} strokeWidth={2} />
        )
      }
      variant={isActive ? 'danger' : 'success'}
      {...props}
    />
  );
}

export function OpsPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="emp-header">
      <div>
        <div className="emp-title-row">
          <h1>{title}</h1>
        </div>
        {subtitle && <p className="emp-subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function OpsPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  itemLabel = 'items',
  limitOptions = [10, 20, 50],
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  itemLabel?: string;
  limitOptions?: number[];
}) {
  if (total === 0) return null;

  const startItem = Math.min((page - 1) * limit + 1, total);
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: Array<number | string> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="ops-pagination">
      <div className="ops-pagination-info">
        Showing {startItem} to {endItem} of {total} {itemLabel}
      </div>

      <div className="ops-pagination-controls">
        {onLimitChange && (
          <div className="ops-pagination-limit">
            <select
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="ops-pagination-select"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} per page
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ops-pagination-nav">
          <button
            type="button"
            className="ops-pagination-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="ops-pagination-pages">
            {getPageNumbers().map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={idx}
                  type="button"
                  className={`ops-pagination-page ${page === p ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              ) : (
                <span key={idx} className="ops-pagination-ellipsis">
                  …
                </span>
              ),
            )}
          </div>

          <button
            type="button"
            className="ops-pagination-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

