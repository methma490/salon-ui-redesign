import { Bell, Check, CheckCheck, CreditCard, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantApi, type InAppNotification } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: tenantApi.notifications.unreadCount,
    refetchInterval: 30_000,
  });

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => tenantApi.notifications.list({ limit: 15 }),
    enabled: open,
  });

  const unreadCount = countData?.count ?? 0;
  const notifications: InAppNotification[] = notificationsData?.data ?? [];

  const markReadMutation = useMutation({
    mutationFn: tenantApi.notifications.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: tenantApi.notifications.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleNotificationAction = (notification: InAppNotification) => {
    if (notification.status === 'UNREAD') {
      markReadMutation.mutate(notification.id);
    }

    const actionUrl = notification.metadata?.actionUrl;
    if (actionUrl) {
      setOpen(false);
      navigate(actionUrl);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((prev) => !prev)}
        title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'Notifications'}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-primary gap-1"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                Loading notifications…
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No notifications right now
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = item.status === 'UNREAD';
                const isSubscriptionReminder =
                  item.type === 'SUBSCRIPTION_EXPIRY_REMINDER' ||
                  item.type === 'TRIAL_EXPIRY_REMINDER' ||
                  item.metadata?.action === 'RENEW_NOW';

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-3.5 transition-colors text-left',
                      isUnread ? 'bg-primary/5' : 'hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isSubscriptionReminder && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <CreditCard className="h-3 w-3" />
                          </span>
                        )}
                        <h4
                          className={cn(
                            'text-xs truncate',
                            isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/80',
                          )}
                        >
                          {item.title}
                        </h4>
                      </div>

                      {isUnread && (
                        <button
                          type="button"
                          className="shrink-0 text-muted-foreground hover:text-primary p-0.5"
                          title="Mark as read"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(item.id);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('en-LK', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {item.metadata?.actionUrl && (
                        <Button
                          size="sm"
                          className={cn(
                            'h-6 text-xs px-2.5 gap-1 shadow-sm font-semibold',
                            isSubscriptionReminder
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-primary text-primary-foreground',
                          )}
                          onClick={() => handleNotificationAction(item)}
                        >
                          {isSubscriptionReminder ? (
                            <>
                              <Sparkles className="h-3 w-3" />
                              Renew Now
                            </>
                          ) : (
                            item.metadata.label || 'View'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
