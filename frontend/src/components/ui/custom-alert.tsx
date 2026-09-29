import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface CustomAlertProps {
  variant?: AlertVariant;
  title?: string;
  message?: React.ReactNode;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const VARIANT_CONFIG: Record<
  AlertVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    bgClass: string;
    borderClass: string;
    textClass: string;
    iconClass: string;
    defaultTitle: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-200 dark:border-emerald-800/60',
    textClass: 'text-emerald-900 dark:text-emerald-200',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    defaultTitle: 'Success',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    borderClass: 'border-rose-200 dark:border-rose-800/60',
    textClass: 'text-rose-900 dark:text-rose-200',
    iconClass: 'text-rose-600 dark:text-rose-400',
    defaultTitle: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderClass: 'border-amber-200 dark:border-amber-800/60',
    textClass: 'text-amber-900 dark:text-amber-200',
    iconClass: 'text-amber-600 dark:text-amber-400',
    defaultTitle: 'Warning',
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800/60',
    textClass: 'text-blue-900 dark:text-blue-200',
    iconClass: 'text-blue-600 dark:text-blue-400',
    defaultTitle: 'Information',
  },
};

export function CustomAlert({
  variant = 'info',
  title,
  message,
  children,
  onClose,
  className,
}: CustomAlertProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const content = message || children;

  if (!content && !title) return null;

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-200',
        config.bgClass,
        config.borderClass,
        config.textClass,
        className,
      )}
    >
      <div className="shrink-0 pt-0.5">
        <Icon className={cn('h-5 w-5', config.iconClass)} />
      </div>

      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {content && (
          <div className={cn('leading-relaxed', title ? 'mt-0.5 text-xs opacity-90' : 'font-medium')}>
            {content}
          </div>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="ml-auto -mr-1.5 -mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
