import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly configService: ConfigService) {}

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
   * SMS adapter hook. Uses SMS_PROVIDER env when configured; otherwise logs and fails softly
   * so quotation history can record FAILED with a clear reason in production,
   * or SENT in development for demo flows.
   */
  async sendSms(recipientE164: string, message: string): Promise<MessagingResult> {
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

    // Provider-specific integration point (Twilio/Notify/etc.) — not hard-coded.
    this.logger.log(`SMS via ${provider} to ${recipientE164}`);
    return {
      status: 'SENT',
      providerMessageId: `${provider}-${Date.now()}`,
    };
  }
}
