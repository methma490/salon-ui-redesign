import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BillingCycle,
  PaymentGatewayProvider,
  PaymentOrderStatus,
  Prisma,
  SubscriptionAddOnStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { buildPaginatedResponse, resolvePagination } from '../common/dto/pagination.dto';
import { PaymentListFilter, PaymentListQueryDto } from './dto/payment-list-query.dto';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PaymentPurpose } from './dto/create-payment-order.dto';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { CheckoutCustomerInfo, CreateCheckoutInput } from './interfaces/payment-gateway.interface';
import {
  calculateProratedUpgradeAmount,
  calculateSubscriptionRecurringTotals,
  comparePlanTier,
  getCurrentPeriodStart,
} from '../subscriptions/utils/subscription-billing.util';

export interface UpgradeOrderMetadata {
  planId: string;
  planPriceId: string;
  billingCycle: BillingCycle;
}

export interface CreatePaymentOrderInput {
  tenantId: string;
  subscriptionId: string;
  gateway: PaymentGatewayProvider;
  purpose: PaymentPurpose | string;
  reference?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface BuildCheckoutInput {
  orderReference: string;
  amount: number;
  currency: string;
  description: string;
  customer: CheckoutCustomerInfo;
  returnUrl: string;
  cancelUrl: string;
  /** Override gateway notify URL (e.g. signup uses /payments/payhere/notify). */
  notifyUrl?: string;
}

@Injectable()
export class PaymentOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly configService: ConfigService,
  ) {}

  async createOrder(input: CreatePaymentOrderInput) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: input.subscriptionId, tenantId: input.tenantId },
      include: {
        plan: { select: { id: true, name: true, displayOrder: true, status: true } },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found for tenant');
    }

    const payableStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.PENDING,
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.SUSPENDED,
      SubscriptionStatus.EXPIRED,
      SubscriptionStatus.PAST_DUE,
    ];

    if (!payableStatuses.includes(subscription.status)) {
      throw new BadRequestException('Subscription is not eligible for payment');
    }

    const reference = input.reference ?? `PO-${randomUUID()}`;

    const existing = await this.prisma.paymentOrder.findUnique({
      where: { reference },
    });

    if (existing) {
      throw new BadRequestException('Payment order reference already exists');
    }

    const { amount, currency, metadata } = await this.resolveOrderPricing(
      subscription,
      input.purpose as PaymentPurpose,
      input.metadata,
    );

    return this.prisma.paymentOrder.create({
      data: {
        tenantId: input.tenantId,
        subscriptionId: input.subscriptionId,
        amount,
        currency,
        gateway: input.gateway,
        reference,
        purpose: input.purpose,
        metadata,
        status: PaymentOrderStatus.PENDING,
      },
    });
  }

  private async resolveOrderPricing(
    subscription: Prisma.SubscriptionGetPayload<{
      include: { plan: { select: { id: true; displayOrder: true; status: true } } };
    }>,
    purpose: PaymentPurpose,
    metadata?: Prisma.InputJsonValue,
  ): Promise<{ amount: number; currency: string; metadata?: Prisma.InputJsonValue }> {
    if (purpose === PaymentPurpose.SUBSCRIPTION_UPGRADE) {
      return this.resolveUpgradePricing(subscription, metadata);
    }

    if (purpose === PaymentPurpose.SUBSCRIPTION_RENEW) {
      let basePrice = Number(subscription.price);
      let currency = subscription.currency;

      if (subscription.pendingPlanPriceId) {
        const pendingPrice = await this.prisma.planPrice.findUnique({
          where: { id: subscription.pendingPlanPriceId },
        });

        if (!pendingPrice) {
          throw new NotFoundException('Pending plan price not found');
        }

        basePrice = Number(pendingPrice.price);
        currency = pendingPrice.currency;
      }

      // Include strictly renewing ACTIVE add-ons in renewal recurring total (explicitly excluding CANCEL_AT_PERIOD_END)
      const activeAddOns = await this.prisma.subscriptionAddOn.findMany({
        where: {
          subscriptionId: subscription.id,
          status: SubscriptionAddOnStatus.ACTIVE,
          cancelAtPeriodEnd: false,
        },
      });

      const planFeatures = await this.prisma.subscriptionFeature.findMany({
        where: { subscriptionId: subscription.id, enabled: true },
        select: { featureId: true },
      });
      const planFeatureIds = new Set((planFeatures ?? []).map((f) => f.featureId));

      const totals = calculateSubscriptionRecurringTotals(
        basePrice,
        (activeAddOns ?? []).map((a) => ({
          featureId: a.featureId,
          status: a.status,
          recurringAmount: a.recurringAmount,
          currency: a.currency,
        })),
        currency,
        planFeatureIds,
      );

      return {
        amount: totals.nextRenewalTotal,
        currency,
        metadata: {
          ...(typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
            ? metadata
            : {}),
          ...(subscription.pendingPlanPriceId
            ? {
                pendingPlanId: subscription.pendingPlanId,
                pendingPlanPriceId: subscription.pendingPlanPriceId,
              }
            : {}),
          basePlanPrice: totals.basePlanPrice,
          activeAddonsTotal: totals.activeRenewingAddonsTotal,
          nextRenewalTotal: totals.nextRenewalTotal,
        },
      };
    }

    return {
      amount: Number(subscription.price),
      currency: subscription.currency,
      metadata,
    };
  }

  private async resolveUpgradePricing(
    subscription: Prisma.SubscriptionGetPayload<{
      include: { plan: { select: { id: true; displayOrder: true; status: true } } };
    }>,
    metadata?: Prisma.InputJsonValue,
  ): Promise<{ amount: number; currency: string; metadata: Prisma.InputJsonValue }> {
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be upgraded');
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Cannot upgrade a subscription scheduled for cancellation');
    }

    if (!subscription.endDate) {
      throw new BadRequestException('Subscription has no billing period end date');
    }

    const meta = metadata as Partial<UpgradeOrderMetadata> | undefined;
    if (!meta?.planId) {
      throw new BadRequestException('planId is required for subscription upgrade checkout');
    }

    const targetPlan = await this.prisma.plan.findUnique({
      where: { id: meta.planId },
      select: { id: true, status: true, displayOrder: true },
    });

    if (!targetPlan || targetPlan.status !== 'ACTIVE') {
      throw new BadRequestException('Target plan is not active');
    }

    const tierChange = comparePlanTier(subscription.plan.displayOrder, targetPlan.displayOrder);
    if (tierChange !== 'upgrade') {
      throw new BadRequestException('Target plan must be a higher tier than the current plan');
    }

    const billingCycle = meta.billingCycle ?? subscription.billingCycle;
    const targetPrice = meta.planPriceId
      ? await this.prisma.planPrice.findFirst({
          where: { id: meta.planPriceId, planId: targetPlan.id, isActive: true },
        })
      : await this.prisma.planPrice.findFirst({
          where: { planId: targetPlan.id, billingCycle, isActive: true },
        });

    if (!targetPrice) {
      throw new NotFoundException('Target plan price not found');
    }

    const currentPrice = Number(subscription.price);
    const newPrice = Number(targetPrice.price);
    const periodStart = getCurrentPeriodStart(subscription.endDate, subscription.billingCycle);
    const amount = calculateProratedUpgradeAmount(
      currentPrice,
      newPrice,
      periodStart,
      subscription.endDate,
    );

    if (amount <= 0) {
      throw new BadRequestException('No payment is due for this upgrade');
    }

    return {
      amount,
      currency: targetPrice.currency,
      metadata: {
        planId: targetPlan.id,
        planPriceId: targetPrice.id,
        billingCycle: targetPrice.billingCycle,
      } as Prisma.InputJsonValue,
    };
  }

  async buildCheckoutSession(
    orderReference: string,
    checkout: BuildCheckoutInput,
    gateway: PaymentGatewayProvider,
  ) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { reference: orderReference },
    });

    if (!order) {
      throw new NotFoundException('Payment order not found');
    }

    if (order.status === PaymentOrderStatus.PAID) {
      throw new BadRequestException('Payment order is already paid');
    }

    const gatewayAdapter = this.gatewayRegistry.getConfigured(gateway);
    const apiBase = this.configService.get<string>('API_PUBLIC_URL') ?? 'http://localhost:3000/api';
    const notifyUrl =
      checkout.notifyUrl ??
      `${apiBase.replace(/\/$/, '')}/payments/webhooks/${gateway.toLowerCase()}`;

    const sessionInput: CreateCheckoutInput = {
      orderReference: order.reference,
      amount: Number(order.amount),
      currency: order.currency,
      description: checkout.description,
      customer: checkout.customer,
      returnUrl: checkout.returnUrl,
      cancelUrl: checkout.cancelUrl,
      notifyUrl,
    };

    return gatewayAdapter.createCheckoutSession(sessionInput);
  }

  async findByReference(reference: string) {
    return this.prisma.paymentOrder.findUnique({
      where: { reference },
      include: {
        subscription: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async markFailed(reference: string) {
    return this.prisma.paymentOrder.update({
      where: { reference },
      data: { status: PaymentOrderStatus.FAILED },
    });
  }

  async listForAdmin(query: PaymentListQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);

    let statusFilter: PaymentOrderStatus[] | undefined;

    if (query.filter === PaymentListFilter.SUCCESS) {
      statusFilter = [PaymentOrderStatus.PAID];
    } else if (query.filter === PaymentListFilter.FAILED) {
      statusFilter = [PaymentOrderStatus.FAILED, PaymentOrderStatus.CANCELLED];
    } else if (query.status) {
      statusFilter = [query.status];
    }

    const where: Prisma.PaymentOrderWhereInput = {
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, code: true } },
          subscription: { include: { plan: { select: { code: true, name: true } } } },
          subscriptionAddOn: { include: { feature: { select: { code: true, name: true } } } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((order) => {
        let plan = order.subscription?.plan ?? { code: 'N/A', name: 'Subscription Plan' };
        if (order.subscriptionAddOn?.feature) {
          plan = {
            code: order.subscriptionAddOn.feature.code,
            name: `Add-on: ${order.subscriptionAddOn.feature.name}`,
          };
        }
        return {
          id: order.id,
          reference: order.reference,
          tenantId: order.tenantId,
          tenant: order.tenant ?? { id: order.tenantId, name: 'Salon', code: 'SALON' },
          subscriptionId: order.subscriptionId,
          plan,
          amount: Number(order.amount),
          currency: order.currency,
          status: order.status,
          gateway: order.gateway,
          purpose: order.purpose,
          payment: order.payments?.[0] ?? null,
          createdAt: order.createdAt,
        };
      }),
      total,
      page,
      limit,
    );
  }
}
