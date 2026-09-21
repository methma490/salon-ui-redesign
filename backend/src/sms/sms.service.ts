import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsSendResult {
  success: boolean;
  messageId?: string | null;
  error?: string | null;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Normalizes mobile numbers to E.164-compatible format.
   * e.g. "077 123 4567" -> "+94771234567"
   * e.g. "+94771234567" -> "+94771234567"
   */
  normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('0')) {
      return `+94${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('94') && !cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    if (!cleaned.startsWith('+') && cleaned.length >= 9) {
      return `+${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Sends an SMS message via the configured SMS Gateway (SMSLenz or generic REST API).
   * Fully non-throwing: returns { success: boolean, messageId?: string, error?: string }.
   */
  async sendSms(to: string, message: string): Promise<SmsSendResult> {
    const enabledRaw = this.configService.get<string | boolean>('SMS_ENABLED');
    const isEnabled = enabledRaw === undefined || enabledRaw === true || enabledRaw === 'true' || enabledRaw === '1';
    const isDev = (this.configService.get<string>('NODE_ENV') ?? 'development') !== 'production';
    const normalizedRecipient = this.normalizePhoneNumber(to);

    if (!isEnabled) {
      this.logger.warn(`SMS is disabled via SMS_ENABLED. Skipping send to ${normalizedRecipient}.`);
      return {
        success: false,
        error: 'SMS service is disabled',
      };
    }

    // 1. Check for SMSLenz Gateway Provider
    const provider = (this.configService.get<string>('SMS_PROVIDER') ?? '').toLowerCase();
    const smslenzApiKey = this.configService.get<string>('SMSLENZ_API_KEY')?.trim();
    const smslenzUserId = this.configService.get<string | number>('SMSLENZ_USER_ID')?.toString().trim();
    const isSmslenz = provider === 'smslenz' || Boolean(smslenzApiKey && smslenzUserId);

    if (isSmslenz) {
      return this.sendViaSmslenz(normalizedRecipient, message, {
        userId: smslenzUserId,
        apiKey: smslenzApiKey,
      });
    }

    // 2. Generic HTTP POST Gateway
    const apiUrl = this.configService.get<string>('SMS_API_URL')?.trim();
    const apiKey = this.configService.get<string>('SMS_API_KEY')?.trim();
    const senderId = this.configService.get<string>('SMS_SENDER_ID')?.trim() || 'SALON';
    const username = this.configService.get<string>('SMS_USERNAME')?.trim();
    const password = this.configService.get<string>('SMS_PASSWORD')?.trim();
    const timeoutMs = Number(this.configService.get<number>('SMS_TIMEOUT_MS')) || 10000;

    // Dev/Mock fallback when no external API URL is provided
    if (!apiUrl) {
      this.logger.log(
        `[DEV SMS] (No gateway configured) To: ${normalizedRecipient}\n` +
          `[DEV SMS] Sender: ${senderId}\n` +
          `[DEV SMS] Content (${message.length} chars):\n${message}\n---`,
      );

      if (isDev) {
        return {
          success: true,
          messageId: `dev-mock-${Date.now()}`,
        };
      }

      return {
        success: false,
        error: 'SMS gateway URL (SMS_API_URL / SMSLENZ_API_KEY) is not configured',
      };
    }

    // Dispatch generic HTTP POST request
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['x-api-key'] = apiKey;
      } else if (username && password) {
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const payload = {
        to: normalizedRecipient,
        recipient: normalizedRecipient,
        phone: normalizedRecipient,
        message,
        text: message,
        sender_id: senderId,
        from: senderId,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        const errMsg = `SMS Gateway returned HTTP ${response.status}: ${errText.slice(0, 150)}`;
        this.logger.error(`SMS dispatch failed: ${errMsg}`);
        return {
          success: false,
          error: errMsg,
        };
      }

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // Plain text response
      }

      const messageId =
        data?.message_id || data?.id || data?.msg_id || data?.reference || `sms-${Date.now()}`;

      this.logger.log(`SMS successfully dispatched to ${normalizedRecipient} (ID: ${messageId})`);

      return {
        success: true,
        messageId: String(messageId),
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err?.name === 'AbortError';
      const errMsg = isTimeout
        ? `SMS dispatch timed out after ${timeoutMs}ms`
        : err?.message || 'Network error while contacting SMS gateway';

      this.logger.error(`SMS send error for ${normalizedRecipient}: ${errMsg}`);
      return {
        success: false,
        error: errMsg,
      };
    }
  }

  /**
   * Dispatches an SMS via the SMSLenz.lk gateway API.
   * Endpoint: POST https://smslenz.lk/api/send-sms
   */
  private async sendViaSmslenz(
    recipient: string,
    message: string,
    creds: { userId?: string; apiKey?: string },
  ): Promise<SmsSendResult> {
    const baseUrl = this.configService.get<string>('SMSLENZ_BASE_URL')?.trim() || 'https://smslenz.lk';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/api/send-sms`;
    const userId = creds.userId || this.configService.get<string>('SMSLENZ_USER_ID')?.trim();
    const apiKey = creds.apiKey || this.configService.get<string>('SMSLENZ_API_KEY')?.trim();
    const senderId =
      this.configService.get<string>('SMSLENZ_SENDER_ID')?.trim() ||
      this.configService.get<string>('SMS_SENDER_ID')?.trim() ||
      'DARTCODES';
    const timeoutMs =
      Number(
        this.configService.get<number>('SMSLENZ_READ_TIMEOUT_MS') ||
          this.configService.get<number>('SMSLENZ_CONNECTION_TIMEOUT_MS') ||
          this.configService.get<number>('SMS_TIMEOUT_MS'),
      ) || 30000;

    if (!userId || !apiKey) {
      return {
        success: false,
        error: 'SMSLENZ_USER_ID and SMSLENZ_API_KEY must be configured',
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payload = {
        user_id: String(userId),
        api_key: apiKey,
        sender_id: senderId,
        contact: recipient,
        message,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      const data: any = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        const errMsg =
          data?.message ||
          (data?.errors
            ? Object.values(data.errors).flat().join(', ')
            : `SMSlenz returned HTTP ${response.status}`);
        this.logger.error(`SMSlenz dispatch failed: ${errMsg}`);
        return {
          success: false,
          error: errMsg,
        };
      }

      const messageId =
        data?.data?.campaign_id ||
        data?.data?.message_id ||
        data?.campaign_id ||
        `smslenz-${Date.now()}`;

      this.logger.log(
        `SMSlenz successfully sent to ${recipient} (Campaign ID: ${messageId}, Balance: ${data?.data?.sms_credit_balance ?? 'N/A'})`,
      );

      return {
        success: true,
        messageId: String(messageId),
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err?.name === 'AbortError';
      const errMsg = isTimeout
        ? `SMSlenz request timed out after ${timeoutMs}ms`
        : err?.message || 'Network error while contacting SMSlenz gateway';

      this.logger.error(`SMSlenz send error for ${recipient}: ${errMsg}`);
      return {
        success: false,
        error: errMsg,
      };
    }
  }
}
