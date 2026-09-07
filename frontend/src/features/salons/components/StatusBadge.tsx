import { Badge } from '@/components/ui/badge';
import type { SalonStatus } from '@/features/salons/types/salon.types';

const statusVariant: Record<SalonStatus, 'success' | 'warning' | 'muted'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  ARCHIVED: 'muted',
};

export function StatusBadge({ status }: { status: SalonStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}
