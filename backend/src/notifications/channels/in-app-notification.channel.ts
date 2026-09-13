import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelAdapter,
} from './notification-channel.interface';

@Injectable()
export class InAppNotificationChannel implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.IN_APP;

  constructor(private readonly prisma: PrismaService) {}

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    await this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        type: input.type as NotificationType,
        title: input.title,
        message: input.body,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    return { channel: this.channel, recipient: input.tenantId };
  }
}
