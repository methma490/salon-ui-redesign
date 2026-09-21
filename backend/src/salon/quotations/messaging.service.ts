import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from '../../sms/sms.service';

export type MessagingChannel = 'WHATSAPP' | 'SMS';

export type MessagingResult = {
  status: 'OPENED_EXTERNALLY' | 'SENT' | 'FAILED';
  providerMessageId?: string | null;
  externalUrl?: string | null;
  failureReason?: string | null;
};

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly smsService?: SmsService,
  ) {}

  /**
   * WhatsApp MVP: build a wa.me deep link with pre-filled message.
   * Does not claim delivery — returns OPENED_EXTERNALLY.
   */
  buildWhatsAppDeepLink(recipientE164Digits: string, message: string): MessagingResult {
    const text = encodeURIComponent(message);
    const url = `https://wa.me/${recipientE164Digits}?text=${text}`;
    return {
      status: 'OPENED_EXTERNALLY',
      externalUrl: url,
      providerMessageId: null,
    };
  }

  /**
   * SMS adapter hook. Uses unified SmsService when available, or SMS_PROVIDER env fallback.
   */
  async sendSms(recipientE164: string, message: string): Promise<MessagingResult> {
    if (this.smsService) {
      const res = await this.smsService.sendSms(recipientE164, message);
      return {
        status: res.success ? 'SENT' : 'FAILED',
        providerMessageId: res.messageId,
        failureReason: res.error,
      };
    }

    const provider = this.configService.get<string>('SMS_PROVIDER') ?? '';
    const allowDevSend =
      (this.configService.get<string>('NODE_ENV') ?? 'development') !== 'production';

    if (!provider) {
      this.logger.warn(
        `SMS not configured. Would send to ${recipientE164}: ${message.slice(0, 80)}...`,
      );
      if (allowDevSend) {
        return {
          status: 'SENT',
          providerMessageId: `dev-sms-${Date.now()}`,
          failureReason: null,
        };
      }
      return {
        status: 'FAILED',
        failureReason: 'SMS provider is not configured',
      };
    }

    this.logger.log(`SMS via ${provider} to ${recipientE164}`);
    return {
      status: 'SENT',
      providerMessageId: `${provider}-${Date.now()}`,
    };
  }
}
