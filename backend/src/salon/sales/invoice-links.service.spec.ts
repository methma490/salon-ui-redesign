import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../../sms/sms.service';
import { TenantSchemaService } from '../../tenant/services/tenant-schema.service';
import { InvoiceLinksService } from './invoice-links.service';

describe('InvoiceLinksService', () => {
  let service: InvoiceLinksService;
  let prisma: {
    invoiceLink: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    tenant: {
      findUnique: jest.Mock;
    };
  };
  let configService: { get: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let tenantSchemaService: { withTenantSchema: jest.Mock };

  beforeEach(() => {
    prisma = {
      invoiceLink: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    configService = {
      get: jest.fn((key: string, fallback?: unknown) => fallback),
    };

    smsService = {
      sendSms: jest.fn().mockResolvedValue({ success: true, messageId: 'sms-test-1' }),
    };

    tenantSchemaService = {
      withTenantSchema: jest.fn(),
    };

    service = new InvoiceLinksService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      smsService as unknown as SmsService,
      tenantSchemaService as unknown as TenantSchemaService,
    );
  });

  describe('buildEbillUrl', () => {
    it('constructs correct public URL using PUBLIC_BILL_URL', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'PUBLIC_BILL_URL') return 'https://bill.example.com';
        return undefined;
      });

      const url = service.buildEbillUrl('test-token-123');
      expect(url).toBe('https://bill.example.com/i/test-token-123');
    });

    it('falls back to FRONTEND_URL if PUBLIC_BILL_URL is unset', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173/';
        return undefined;
      });

      const url = service.buildEbillUrl('test-token-123');
      expect(url).toBe('http://localhost:5173/i/test-token-123');
    });
  });

  describe('formatSmsBody and 1 SMS credit limit', () => {
    it('formats message exactly as requested and is well below 160 GSM-7 characters', () => {
      const body = service.formatSmsBody(
        'Luxe Salon Colombo',
        'INV-2026-0042',
        4500,
        'https://bill.example.com/i/abc123xyz456',
      );

      expect(body).toBe(
        'Luxe Salon Colombo\nINV-2026-0042 | Rs.4,500.00\neBill: https://bill.example.com/i/abc123xyz456\nThank you!',
      );

      // Single standard SMS credit is 160 GSM-7 characters
      expect(body.length).toBeLessThan(160);
      expect(body.length).toBeLessThanOrEqual(120);
    });
  });

  describe('maskPhoneNumber', () => {
    it('masks phone numbers safely', () => {
      expect(service.maskPhoneNumber('0771234567')).toBe('077****567');
      expect(service.maskPhoneNumber('+94771234567')).toBe('+9477****567');
      expect(service.maskPhoneNumber(null)).toBeNull();
      expect(service.maskPhoneNumber('')).toBeNull();
    });
  });

  describe('createOrGetLink', () => {
    it('returns existing link if already present', async () => {
      const existing = {
        id: 'link-1',
        token: 'tok-existing',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        customerPhone: '0771234567',
      };
      prisma.invoiceLink.findFirst.mockResolvedValue(existing);

      const result = await service.createOrGetLink({
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        saleId: 'sale-1',
        customerPhone: '0771234567',
      });

      expect(result).toBe(existing);
      expect(prisma.invoiceLink.create).not.toHaveBeenCalled();
    });

    it('generates secure random token and creates link when none exists', async () => {
      prisma.invoiceLink.findFirst.mockResolvedValue(null);
      prisma.invoiceLink.create.mockImplementation((args: any) => ({
        id: 'link-new',
        ...args.data,
      }));

      const result = await service.createOrGetLink({
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        saleId: 'sale-1',
        saleNumber: 'INV-100',
        customerPhone: '0771234567',
      });

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThanOrEqual(16);
      expect(result.smsStatus).toBe('NOT_SENT');
      expect(prisma.invoiceLink.create).toHaveBeenCalled();
    });
  });

  describe('getPublicInvoiceByToken', () => {
    it('throws NotFoundException when link token does not exist', async () => {
      prisma.invoiceLink.findUnique.mockResolvedValue(null);

      await expect(service.getPublicInvoiceByToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns invoice-safe data scrubbing internal IDs, profit margins, and costs', async () => {
      const mockLink = {
        id: 'link-1',
        token: 'public-tok-123',
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        saleId: 'sale-uuid-123',
        customerPhone: '0771234567',
        tenant: {
          id: 'tenant-1',
          name: 'Crown Salon',
          phone: '0112345678',
          email: 'info@crown.lk',
          logoUrl: 'https://cdn.example.com/logo.png',
          primaryColor: '#10b981',
        },
      };

      prisma.invoiceLink.findUnique.mockResolvedValue(mockLink);

      tenantSchemaService.withTenantSchema.mockImplementation(
        async (_schema: string, callback: any) => {
          const fakeTx = {
            $queryRawUnsafe: jest
              .fn()
              // First call: sale header
              .mockResolvedValueOnce([
                {
                  saleNumber: 'SALE-2026-0001',
                  subtotal: '3500.00',
                  discount: '500.00',
                  total: '3000.00',
                  status: 'COMPLETED',
                  branchName: 'Main Branch',
                  customerName: 'Nimal Silva',
                  customerPhone: '0771234567',
                  createdAt: new Date('2026-09-21T10:00:00Z'),
                },
              ])
              // Second call: sale items
              .mockResolvedValueOnce([
                {
                  itemType: 'service',
                  serviceName: 'Haircut & Styling',
                  productName: null,
                  quantity: 1,
                  unitPrice: '3500.00',
                  discount: '500.00',
                  total: '3000.00',
                },
              ])
              // Third call: payments
              .mockResolvedValueOnce([
                {
                  method: 'CASH',
                  amount: '3000.00',
                  status: 'COMPLETED',
                  createdAt: new Date('2026-09-21T10:05:00Z'),
                },
              ]),
          };
          return callback({ tx: fakeTx });
        },
      );

      const result = await service.getPublicInvoiceByToken('public-tok-123');

      expect(result.token).toBe('public-tok-123');
      expect(result.invoiceNumber).toBe('SALE-2026-0001');
      expect(result.total).toBe(3000);
      expect(result.customer.name).toBe('Nimal Silva');
      expect(result.customer.phone).toBe('0771234567');
      expect(result.customer.maskedPhone).toBe('077****567');
      expect(result.salon.name).toBe('Crown Salon');
      expect(result.items[0].name).toBe('Haircut & Styling');
      expect(result.payments[0].method).toBe('CASH');

      // Crucial security assertions: internal schema, employee commissions, costs must not exist
      expect((result as any).schemaName).toBeUndefined();
      expect((result as any).costPrice).toBeUndefined();
      expect((result as any).profit).toBeUndefined();
      expect((result as any).commission).toBeUndefined();
    });
  });
});
