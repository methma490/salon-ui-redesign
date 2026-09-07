import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateSalonStatus } from '@/features/salons/hooks/useSalons';
import type { SalonStatus } from '@/features/salons/types/salon.types';

const statusLabels: Record<SalonStatus, string> = {
  ACTIVE: 'Activate Salon',
  SUSPENDED: 'Suspend Salon',
  ARCHIVED: 'Archive Salon',
};

interface StatusChangeDialogProps {
  salonId: string;
  salonName: string;
  targetStatus: SalonStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatusChangeDialog({
  salonId,
  salonName,
  targetStatus,
  open,
  onOpenChange,
}: StatusChangeDialogProps) {
  const updateStatus = useUpdateSalonStatus(salonId);

  const handleConfirm = async () => {
    await updateStatus.mutateAsync(targetStatus);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{statusLabels[targetStatus]}?</DialogTitle>
          <DialogDescription>
            Are you sure you want to change the status of <strong>{salonName}</strong> to{' '}
            <strong>{targetStatus}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
