import {
  forwardRef,
  type ButtonHTMLAttributes,
  type FormHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Pencil, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import './employees-page.css';

export function getErrorMessage(error: unknown) {
  const err = error as { response?: { data?: { message?: string | string[] } } };
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return 'Something went wrong. Please try again.';
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
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
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="emp-header">
      <div>
        <div className="emp-title-row">
          <h1>{title}</h1>
        </div>
        <p className="emp-subtitle">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
