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

/**
 * Hook to execute the demo data reset logic with modal confirmation.
 */
export function useResetDemoData() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const isDemo = Boolean(user?.tenant?.isDemo);

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

  const dialog = (
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
  );

  return {
    isDemo,
    isResetting,
    feedbackMessage,
    openConfirm: () => setConfirmOpen(true),
    dialog,
  };
}

/**
 * Settings page header demo reset action button.
 */
export function SettingsDemoResetAction() {
  const { isDemo, isResetting, feedbackMessage, openConfirm, dialog } = useResetDemoData();

  if (!isDemo) return null;

  return (
    <>
      <div className="settings-hero-demo-action flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-amber-200 border border-amber-300/30">
          <Sparkles className="h-3 w-3 text-amber-300" />
          <span>DEMO</span>
        </span>

        <button
          type="button"
          disabled={isResetting}
          onClick={openConfirm}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/40 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 backdrop-blur-xs transition-all cursor-pointer shadow-xs"
          title="Restore baseline sample data"
        >
          {isResetting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
              <span>Restoring…</span>
            </>
          ) : (
            <>
              <RotateCcw className="h-3.5 w-3.5 text-amber-300" />
              <span>Reset Demo Data</span>
            </>
          )}
        </button>

        {feedbackMessage && (
          <span className="inline-flex items-center rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-xs font-semibold text-emerald-200">
            {feedbackMessage}
          </span>
        )}
      </div>

      {dialog}
    </>
  );
}

/**
 * Default global DemoBanner - removed from global top layout per user request.
 * Kept here if ever needed on specific demo views.
 */
export function DemoBanner() {
  return null;
}
