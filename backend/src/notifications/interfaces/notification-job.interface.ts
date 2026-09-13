import { NotificationType } from '@prisma/client';

export interface NotificationRecipient {
  email?: string | null;
  phone?: string | null;
  customerName?: string | null;
}

export interface DeliverNotificationPayload {
  idempotencyKey: string;
  tenantId: string;
  templateCode: string;
  type: NotificationType;
  recipient: NotificationRecipient;
  context: Record<string, string>;
  metadata?: Record<string, unknown>;
  jobId?: string;
}
