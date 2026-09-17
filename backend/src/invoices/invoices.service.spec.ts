import { NotFoundException } from '@nestjs/common';
import { BillingCycle, InvoiceStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { InvoicesService } from './invoices.service';
import { buildInvoiceHtml } from './utils/invoice-html.util';

describe('InvoicesService', () => {
  let prisma: {
    invoice: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
    paymentOrder: { findUnique: jest.Mock };
  };
  let configService: { get: jest.Mock };
  let service: InvoicesService;

  beforeEach(() => {
    prisma = {
      invoice: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      paymentOrder: { findUnique: jest.fn() },
    };

    configService = {
      get: jest.fn((key: string, fallback?: string) => fallback),
    };

    service = new InvoicesService(prisma as never, configService as unknown as ConfigService);
  });

  it('returns existing invoice for duplicate payment (idempotent)', async () => {
    const existing = { id: 'inv-1', invoiceNumber: 'INV-2026-000001', items: [] };
    prisma.invoice.findUnique.mockResolvedValue(existing);

    const result = await service.generateFromPayment({
      paymentOrderId: 'order-1',
      paymentId: 'pay-1',
      transactionId: 'TX-1',
      paidAt: new Date(),
    });

    expect(result).toEqual(existing);
    expect(prisma.paymentOrder.findUnique).not.toHaveBeenCalled();
  });

  it('creates invoice with line item after successful payment', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      tenantId: 'tenant-1',
      subscriptionId: 'sub-1',
      amount: 5000,
      currency: 'LKR',
      gateway: 'PAYHERE',
      reference: 'PO-001',
      metadata: { customerName: 'Jane Admin', customerEmail: 'jane@salon.com' },
      tenant: { name: 'Glow Salon', email: 'info@glow.com', phone: '0771111111' },
      subscription: {
        billingCycle: BillingCycle.MONTHLY,
        plan: { name: 'Gold', code: 'GOLD' },
      },
    });

    prisma.invoice.create.mockResolvedValue({
      id: 'inv-new',
      invoiceNumber: 'INV-2026-000001',
      items: [{ description: 'Gold — Monthly subscription' }],
    });

    const result = await service.generateFromPayment({
      paymentOrderId: 'order-1',
      paymentId: 'pay-1',
      transactionId: 'TX-99',
      paidAt: new Date('2026-09-10'),
    });

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentId: 'pay-1',
          status: InvoiceStatus.PAID,
          customerName: 'Jane Admin',
          planCode: 'GOLD',
          paymentReference: 'TX-99',
        }),
      }),
    );
    expect(result?.invoiceNumber).toBe('INV-2026-000001');
  });

  it('throws when invoice not found for tenant', async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);

    await expect(service.findByIdForTenant('missing', 'tenant-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('buildInvoiceHtml', () => {
  it('renders invoice number and plan in HTML', () => {
    const html = buildInvoiceHtml(
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-000001',
        tenantId: 't1',
        subscriptionId: 's1',
        paymentId: 'p1',
        paymentOrderId: 'o1',
        status: InvoiceStatus.PAID,
        currency: 'LKR',
        subtotal: 5000 as never,
        total: 5000 as never,
        paidAt: new Date('2026-09-10'),
        issueDate: new Date('2026-09-10'),
        salonName: 'Glow Salon',
        salonEmail: 'info@glow.com',
        salonPhone: '0771111111',
        customerName: 'Jane Admin',
        customerEmail: 'jane@salon.com',
        customerPhone: null,
        planName: 'Gold',
        planCode: 'GOLD',
        billingCycle: BillingCycle.MONTHLY,
        paymentMethod: 'PAYHERE',
        paymentReference: 'TX-99',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'item-1',
            invoiceId: 'inv-1',
            description: 'Gold — Monthly subscription',
            quantity: 1 as never,
            unitPrice: 5000 as never,
            amount: 5000 as never,
            sortOrder: 0,
          },
        ],
      },
      { name: 'Dart Smart Salon', email: 'billing@dartsmartsalon.local', address: 'Colombo' },
    );

    expect(html).toContain('INV-2026-000001');
    expect(html).toContain('Glow Salon');
    expect(html).toContain('Gold');
    expect(html).toContain('Jane Admin');
  });
});
