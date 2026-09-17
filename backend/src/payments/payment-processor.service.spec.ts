import { BadRequestException } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  PaymentOrderStatus,
  PaymentRecordStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { PaymentProcessorService } from './payment-processor.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

describe('PaymentProcessorService', () => {
  const orderRef = 'PO-TEST-001';
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const subscriptionId = '22222222-2222-2222-2222-222222222222';

  let prisma: {
    paymentOrder: { findUnique: jest.Mock; update: jest.Mock };
    payment: { findUnique: jest.Mock; upsert: jest.Mock };
    paymentTransaction: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let gatewayRegistry: { get: jest.Mock };
  let subscriptionsService: {
    activateSubscription: jest.Mock;
    renewSubscription: jest.Mock;
    upgradeSubscriptionFromPayment: jest.Mock;
  };
  let invoicesService: { generateFromPayment: jest.Mock };
  let notificationQueue: {
    enqueuePaymentSuccess: jest.Mock;
    enqueuePaymentFailed: jest.Mock;
  };
  let service: PaymentProcessorService;

  beforeEach(() => {
    prisma = {
      paymentOrder: { findUnique: jest.fn(), update: jest.fn() },
      payment: { findUnique: jest.fn(), upsert: jest.fn() },
      paymentTransaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    gatewayRegistry = { get: jest.fn() };
    subscriptionsService = {
      activateSubscription: jest.fn(),
      renewSubscription: jest.fn(),
      upgradeSubscriptionFromPayment: jest.fn(),
    };
    invoicesService = {
      generateFromPayment: jest.fn().mockResolvedValue(null),
    };
    notificationQueue = {
      enqueuePaymentSuccess: jest.fn().mockResolvedValue(undefined),
      enqueuePaymentFailed: jest.fn().mockResolvedValue(undefined),
    };

    service = new PaymentProcessorService(
      prisma as never,
      gatewayRegistry as unknown as PaymentGatewayRegistry,
      subscriptionsService as unknown as SubscriptionsService,
      invoicesService as never,
      notificationQueue as never,
    );
  });

  it('rejects invalid gateway signatures', async () => {
    gatewayRegistry.get.mockReturnValue({
      verifyWebhook: jest.fn().mockReturnValue({
        valid: false,
        orderReference: orderRef,
        transactionId: null,
        status: 'pending',
        amount: null,
        currency: null,
        rawPayload: {},
        error: 'Invalid signature',
      }),
    });

    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      reference: orderRef,
      gateway: PaymentGatewayProvider.PAYHERE,
      tenantId,
      subscriptionId,
      amount: 5000,
      currency: 'LKR',
      status: PaymentOrderStatus.PENDING,
      purpose: 'SUBSCRIPTION_ACTIVATE',
      subscription: { id: subscriptionId, status: SubscriptionStatus.PENDING },
    });

    await expect(service.processWebhook(PaymentGatewayProvider.PAYHERE, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('prevents duplicate paid transactions (idempotency)', async () => {
    gatewayRegistry.get.mockReturnValue({
      verifyWebhook: jest.fn().mockReturnValue({
        valid: true,
        orderReference: orderRef,
        transactionId: 'TX-123',
        status: 'paid',
        amount: 5000,
        currency: 'LKR',
        rawPayload: { status_code: '2' },
      }),
    });

    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      reference: orderRef,
      gateway: PaymentGatewayProvider.PAYHERE,
      tenantId,
      subscriptionId,
      amount: 5000,
      currency: 'LKR',
      status: PaymentOrderStatus.PAID,
      purpose: 'SUBSCRIPTION_ACTIVATE',
      subscription: { id: subscriptionId, status: SubscriptionStatus.PENDING },
    });

    prisma.paymentTransaction.create.mockResolvedValue({});

    const result = await service.processWebhook(PaymentGatewayProvider.PAYHERE, {});

    expect(result.alreadyProcessed).toBe(true);
    expect(subscriptionsService.activateSubscription).not.toHaveBeenCalled();
  });

  it('activates subscription after verified paid webhook', async () => {
    gatewayRegistry.get.mockReturnValue({
      verifyWebhook: jest.fn().mockReturnValue({
        valid: true,
        orderReference: orderRef,
        transactionId: 'TX-456',
        status: 'paid',
        amount: 5000,
        currency: 'LKR',
        rawPayload: { status_code: '2' },
      }),
    });

    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      reference: orderRef,
      gateway: PaymentGatewayProvider.PAYHERE,
      tenantId,
      subscriptionId,
      amount: 5000,
      currency: 'LKR',
      status: PaymentOrderStatus.PENDING,
      purpose: 'SUBSCRIPTION_ACTIVATE',
      subscription: { id: subscriptionId, status: SubscriptionStatus.PENDING },
    });

    prisma.paymentTransaction.create.mockResolvedValue({});
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb) =>
      cb({
        payment: {
          upsert: jest.fn().mockResolvedValue({
            id: 'pay-1',
            status: PaymentRecordStatus.PAID,
          }),
        },
        paymentOrder: { update: jest.fn() },
        paymentTransaction: { create: jest.fn() },
      }),
    );

    const result = await service.processWebhook(PaymentGatewayProvider.PAYHERE, {});

    expect(result.success).toBe(true);
    expect(subscriptionsService.activateSubscription).toHaveBeenCalledWith(
      subscriptionId,
      tenantId,
      expect.objectContaining({ paymentReference: 'TX-456' }),
      { fromPaymentProcessor: true },
    );
  });
});
