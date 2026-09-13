import { NotificationChannel } from '@prisma/client';

export interface ChannelDeliveryInput {
  tenantId: string;
  type: string;
  title: string;
  subject?: string | null;
  body: string;
  recipient: {
    email?: string | null;
    phone?: string | null;
    customerName?: string | null;
  };
  metadata?: Record<string, unknown>;
}

export interface ChannelDeliveryResult {
  channel: NotificationChannel;
  recipient: string | null;
}

export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult>;
}
