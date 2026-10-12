import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { tenantApi } from '@/api/tenant.api';

export function DemoBanner() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const isDemo = Boolean(user?.tenant?.isDemo);

  if (!isDemo) {
    return null;
  }

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setFeedbackMessage(null);
      await tenantApi.demo.reset();

      // Invalidate all query caches to restore seeded baseline across UI
      await queryClient.invalidateQueries();
      await refreshUser();

      setFeedbackMessage('Demo data restored successfully.');
      setConfirmOpen(false);

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Demo reset error:', err);
      setFeedbackMessage(
        err?.response?.data?.message || err?.message || 'Failed to restore demo data.',
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div
        role="region"
        aria-label="Demo Sales Environment"
        className="relative z-10 w-full border-b border-amber-200 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 px-4 py-2 text-amber-950 shadow-xs transition-all"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white shadow-xs">
              <Sparkles className="h-3 w-3" />
              <span>DEMO ACCOUNT</span>
            </span>

            <span className="text-xs sm:text-sm font-medium text-amber-900 leading-snug">
              This is a sales demo environment. Changes can be restored to the original demo state anytime.
            </span>

            {feedbackMessage && (
              <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-300">
                {feedbackMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isResetting}
              className="group inline-flex items-center gap-1.5 rounded-lg border-amber-300 bg-white hover:bg-amber-100/80 text-amber-900 text-xs h-7 px-3 font-semibold shadow-xs transition-all"
              onClick={() => setConfirmOpen(true)}
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                  <span>Restoring…</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-amber-600 transition-transform duration-200 group-hover:-rotate-45" />
                  <span>Reset Demo Data</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => !isResetting && setConfirmOpen(open)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold">
              Reset Demo Data?
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground pt-1">
              All changes made during this demonstration will be removed and the original sample data will be restored.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isResetting}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isResetting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={() => void handleReset()}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring Data…
                </>
              ) : (
                'Reset Demo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
