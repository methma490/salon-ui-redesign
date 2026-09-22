import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { SmsService } from '../../sms/sms.service';
import {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelAdapter,
} from './notification-channel.interface';

@Injectable()
export class SmsNotificationChannel implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.SMS;
  private readonly logger = new Logger(SmsNotificationChannel.name);

  constructor(private readonly smsService: SmsService) {}

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    const phone = input.recipient.phone;

    if (!phone) {
      throw new Error('SMS recipient phone is missing');
    }

    const result = await this.smsService.sendSms(phone, input.body);

    if (!result.success) {
      const errMsg = result.error || 'Failed to dispatch SMS';
      this.logger.warn(`SMS delivery failed to ${phone}: ${errMsg}`);
      throw new Error(errMsg);
    }

    return { channel: this.channel, recipient: phone };
  }
}
