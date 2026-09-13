import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '@prisma/client';
import {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelAdapter,
} from './notification-channel.interface';

/** SMS adapter stub — logs in dev until a provider (Twilio, etc.) is configured. */
@Injectable()
export class SmsNotificationChannel implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.SMS;
  private readonly logger = new Logger(SmsNotificationChannel.name);

  constructor(private readonly configService: ConfigService) {}

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    const phone = input.recipient.phone;

    if (!phone) {
      throw new Error('SMS recipient phone is missing');
    }

    const provider = this.configService.get<string>('SMS_PROVIDER');

    if (!provider) {
      this.logger.warn(`[DEV] SMS to ${phone}: ${input.body}`);
      return { channel: this.channel, recipient: phone };
    }

    throw new Error(`SMS provider ${provider} is not implemented yet`);
  }
}
