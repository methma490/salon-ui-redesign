import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, fallback?: unknown) => fallback),
    };
    service = new SmsService(configService as unknown as ConfigService);
  });

  describe('normalizePhoneNumber', () => {
    it('formats local Sri Lankan 0-prefixed numbers to +94', () => {
      expect(service.normalizePhoneNumber('0771234567')).toBe('+94771234567');
      expect(service.normalizePhoneNumber('077 123 4567')).toBe('+94771234567');
      expect(service.normalizePhoneNumber('071-987-6543')).toBe('+94719876543');
    });

    it('preserves numbers already in E.164 format', () => {
      expect(service.normalizePhoneNumber('+94771234567')).toBe('+94771234567');
      expect(service.normalizePhoneNumber('+14155552671')).toBe('+14155552671');
    });

    it('prepends + to country code numbers missing plus', () => {
      expect(service.normalizePhoneNumber('94771234567')).toBe('+94771234567');
    });
  });

  describe('sendSms', () => {
    it('returns error when SMS_ENABLED is false', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMS_ENABLED') return 'false';
        return undefined;
      });

      const result = await service.sendSms('0771234567', 'Test message');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('returns dev-mock success in development when SMS_API_URL is empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMS_ENABLED') return 'true';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'SMS_API_URL') return undefined;
        return undefined;
      });

      const result = await service.sendSms('0771234567', 'Test bill message');
      expect(result.success).toBe(true);
      expect(result.messageId).toContain('dev-mock-');
    });

    it('calls external gateway via fetch when configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMS_ENABLED') return 'true';
        if (key === 'SMS_API_URL') return 'https://sms-gw.example.com/api/send';
        if (key === 'SMS_API_KEY') return 'secret-key-123';
        if (key === 'SMS_SENDER_ID') return 'SALON_VIP';
        return undefined;
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message_id: 'gw-msg-999' }),
      });
      global.fetch = mockFetch;

      const result = await service.sendSms('0771234567', 'Your bill receipt');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('gw-msg-999');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://sms-gw.example.com/api/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer secret-key-123',
          }),
        }),
      );
    });

    it('gracefully handles gateway error status without throwing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMS_ENABLED') return 'true';
        if (key === 'SMS_API_URL') return 'https://sms-gw.example.com/api/send';
        return undefined;
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid recipient phone',
      });

      const result = await service.sendSms('invalid', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 400');
    });

    it('dispatches to SMSLenz gateway when SMS_PROVIDER=smslenz', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMS_ENABLED') return 'true';
        if (key === 'SMS_PROVIDER') return 'smslenz';
        if (key === 'SMSLENZ_BASE_URL') return 'https://smslenz.lk';
        if (key === 'SMSLENZ_USER_ID') return '1862';
        if (key === 'SMSLENZ_API_KEY') return 'b706c1f8-0231-4d15-bb1a-d4616f3e3ef6';
        if (key === 'SMSLENZ_SENDER_ID') return 'DARTCODES';
        return undefined;
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: 'SMS sent successfully',
          data: {
            status: 'success',
            campaign_id: 1042,
            message: 'E-Bill test',
            sender_id: 'DARTCODES',
            pages: 1,
            sms_credit_balance: '495.16',
          },
        }),
      });
      global.fetch = mockFetch;

      const result = await service.sendSms('0771234567', 'Test SMSLenz eBill');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('1042');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://smslenz.lk/api/send-sms',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            user_id: '1862',
            api_key: 'b706c1f8-0231-4d15-bb1a-d4616f3e3ef6',
            sender_id: 'DARTCODES',
            contact: '+94771234567',
            message: 'Test SMSLenz eBill',
          }),
        }),
      );
    });
  });
});
