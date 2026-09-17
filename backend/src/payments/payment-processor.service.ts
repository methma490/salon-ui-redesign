import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import {
  PaymentGatewayProvider,
  PaymentOrderStatus,
  PaymentRecordStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentPurpose } from './dto/create-payment-order.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationQueueService } from '../notifications/notification-queue.service';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { GatewayVerificationResult } from './interfaces/payment-gateway.interface';

export interface WebhookProcessResult {
  success: boolean;
  status: string;
  orderReference?: string;
  alreadyProcessed?: boolean;
}

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
    private readonly invoicesService: InvoicesService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  /**
   * Process a gateway webhook/callback. Never trusts frontend return URLs —
   * only verified server-side gateway payloads activate subscriptions.
   */
  async processWebhook(
    gateway: PaymentGatewayProvider,
    payload: unknown,
  ): Promise<WebhookProcessResult> {
    const gatewayAdapter = this.gatewayRegistry.get(gateway);
    const verification = gatewayAdapter.verifyWebhook(payload);

    if (!verification.orderReference) {
      throw new BadRequestException('Missing order reference in gateway payload');
    }

    const order = await this.prisma.paymentOrder.findUnique({
      where: { reference: verification.orderReference },
      include: { subscription: true },
    });

    if (!order) {
      this.logger.warn(`Payment order not found for reference ${verification.orderReference}`);
      throw new NotFoundException('Payment order not found');
    }

    if (order.gateway !== gateway) {
      throw new BadRequestException('Gateway mismatch for payment order');
    }

    await this.recordTransaction(order.id, gateway, 'webhook', verification);

    if (!verification.valid) {
      throw new BadRequestException(verification.error ?? 'Payment verification failed');
    }

    if (verification.status === 'pending') {
      return { success: true, status: 'pending', orderReference: order.reference };
    }

    if (verification.status === 'failed' || verification.status === 'cancelled') {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentOrderStatus.FAILED },
      });

      await this.notificationQueue
        .enqueuePaymentFailed({
          tenantId: order.tenantId,
          paymentOrderId: order.id,
          orderReference: order.reference,
        })
        .catch((error) => {
          this.logger.error(
            `Payment failed notification enqueue error: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

      return { success: false, status: 'failed', orderReference: order.reference };
    }

    if (verification.status !== 'paid') {
      return { success: true, status: verification.status, orderReference: order.reference };
    }

    return this.completePaidOrder(order, verification);
  }

  private async completePaidOrder(
    order: Prisma.PaymentOrderGetPayload<{ include: { subscription: true } }>,
    verification: GatewayVerificationResult,
  ): Promise<WebhookProcessResult> {
    if (order.status === PaymentOrderStatus.PAID) {
      return {
        success: true,
        status: 'paid',
        orderReference: order.reference,
        alreadyProcessed: true,
      };
    }

    this.validateAmountAndCurrency(order, verification);

    const transactionId = verification.transactionId ?? order.reference;

    const existingPayment = await this.prisma.payment.findUnique({
      where: { transactionId },
    });

    if (existingPayment?.status === PaymentRecordStatus.PAID) {
      return {
        success: true,
        status: 'paid',
        orderReference: order.reference,
        alreadyProcessed: true,
      };
    }

    const paidAt = new Date();
    let paymentId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: { transactionId },
        update: {
          status: PaymentRecordStatus.PAID,
          paidAt,
        },
        create: {
          paymentOrderId: order.id,
          transactionId,
          status: PaymentRecordStatus.PAID,
          paidAt,
        },
      });

      paymentId = payment.id;

      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentOrderStatus.PAID },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentOrderId: order.id,
          paymentId: payment.id,
          gateway: order.gateway,
          eventType: 'payment_completed',
          rawPayload: verification.rawPayload as Prisma.InputJsonValue,
          verificationResult: verification as unknown as Prisma.InputJsonValue,
          verified: true,
        },
      });
    });

    await this.fulfillOrder(order, transactionId);

    if (paymentId) {
      await this.invoicesService
        .generateFromPayment({
          paymentOrderId: order.id,
          paymentId,
          transactionId,
          paidAt,
        })
        .catch((error) => {
          this.logger.error(
            `Invoice generation failed for order ${order.reference}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

      await this.notificationQueue
        .enqueuePaymentSuccess({
          tenantId: order.tenantId,
          paymentOrderId: order.id,
          paymentReference: transactionId,
        })
        .catch((error) => {
          this.logger.error(
            `Payment success notification enqueue error: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    }

    return {
      success: true,
      status: 'paid',
      orderReference: order.reference,
    };
  }

  private validateAmountAndCurrency(
    order: { amount: Prisma.Decimal; currency: string },
    verification: GatewayVerificationResult,
  ) {
    if (verification.amount === null || verification.currency === null) {
      throw new BadRequestException('Gateway did not return amount/currency');
    }

    const expected = Number(order.amount).toFixed(2);
    const received = verification.amount.toFixed(2);

    if (expected !== received) {
      throw new BadRequestException(
        `Payment amount mismatch: expected ${expected}, received ${received}`,
      );
    }

    if (verification.currency !== order.currency) {
      throw new BadRequestException(
        `Payment currency mismatch: expected ${order.currency}, received ${verification.currency}`,
      );
    }
  }

  private async fulfillOrder(
    order: Prisma.PaymentOrderGetPayload<{ include: { subscription: true } }>,
    transactionId: string,
  ) {
    const purpose = order.purpose as PaymentPurpose;

    switch (purpose) {
      case PaymentPurpose.SIGNUP:
        // Signup fulfillment is handled by SignupService via callback registration
        return;

      case PaymentPurpose.SUBSCRIPTION_ACTIVATE:
        await this.subscriptionsService.activateSubscription(
          order.subscriptionId,
          order.tenantId,
          {
            paymentMethod: order.gateway,
            paymentReference: transactionId,
          },
          { fromPaymentProcessor: true },
        );
        return;

      case PaymentPurpose.SUBSCRIPTION_RENEW:
        await this.subscriptionsService.renewSubscription(
          order.subscriptionId,
          order.tenantId,
          {
            paymentMethod: order.gateway,
            paymentReference: transactionId,
          },
          { fromPaymentProcessor: true },
        );
        return;

      case PaymentPurpose.SUBSCRIPTION_UPGRADE: {
        const metadata = order.metadata as {
          planId?: string;
          planPriceId?: string;
          billingCycle?: 'MONTHLY' | 'YEARLY';
        } | null;

        if (!metadata?.planId) {
          throw new BadRequestException('Upgrade payment order is missing target plan metadata');
        }

        await this.subscriptionsService.upgradeSubscriptionFromPayment(
          order.subscriptionId,
          order.tenantId,
          {
            planId: metadata.planId,
            planPriceId: metadata.planPriceId,
            billingCycle: metadata.billingCycle,
          },
          {
            paymentMethod: order.gateway,
            paymentReference: transactionId,
          },
        );
        return;
      }

      default:
        throw new BadRequestException(`Unsupported payment purpose: ${purpose}`);
    }
  }

  private async recordTransaction(
    paymentOrderId: string,
    gateway: PaymentGatewayProvider,
    eventType: string,
    verification: GatewayVerificationResult,
  ) {
    await this.prisma.paymentTransaction.create({
      data: {
        paymentOrderId,
        gateway,
        eventType,
        rawPayload: verification.rawPayload as Prisma.InputJsonValue,
        verificationResult: verification as unknown as Prisma.InputJsonValue,
        verified: verification.valid,
      },
    });
  }
}
