import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AddOnPriceSource,
  BillingCycle,
  FeatureStatus,
  InvoiceStatus,
  PaymentGatewayProvider,
  PaymentOrderStatus,
  PaymentRecordStatus,
  Prisma,
  SubscriptionAddOnStatus,
  SubscriptionHistoryAction,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { syncTenantFeatures } from '../database/sync-tenant-features.util';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentPurpose } from '../payments/dto/create-payment-order.dto';
import {
  CreateSubscriptionAddOnDto,
  SetFeatureAddonPriceDto,
} from './dto/subscription.dto';
import {
  calculateAddonProration,
  calculateSubscriptionRecurringTotals,
  extendBillingPeriod,
  isPastDate,
  SubscriptionRecurringTotals,
} from './utils/subscription-billing.util';

@Injectable()
export class SubscriptionAddonsService {
  private readonly logger = new Logger(SubscriptionAddonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly invoicesService: InvoicesService,
  ) {}

  // ---------------------------------------------------------------------------
  // DEFAULT ADD-ON PRICING
  // ---------------------------------------------------------------------------

  async getFeatureAddonPrices(featureId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { addonPrices: true },
    });

    if (!feature) {
      throw new NotFoundException(`Feature with ID ${featureId} not found.`);
    }

    return feature.addonPrices;
  }

  async setFeatureAddonPrice(featureId: string, dto: SetFeatureAddonPriceDto) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
    });

    if (!feature) {
      throw new NotFoundException(`Feature with ID ${featureId} not found.`);
    }

    const currency = dto.currency?.toUpperCase() || 'LKR';
    const billingCycle = dto.billingCycle as BillingCycle;

    return this.prisma.featureAddonPrice.upsert({
      where: {
        featureId_billingCycle_currency: {
          featureId,
          billingCycle,
          currency,
        },
      },
      update: {
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
      create: {
        featureId,
        billingCycle,
        price: dto.price,
        currency,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listFeaturesWithAddonPrices() {
    return this.prisma.feature.findMany({
      where: { status: FeatureStatus.ACTIVE },
      include: {
        addonPrices: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION ADD-ONS
  // ---------------------------------------------------------------------------

  async getSubscriptionAddOns(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        subscriptionFeatures: {
          where: { enabled: true },
        },
        addOns: {
          include: {
            feature: true,
            addonPrice: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const planFeatureIds = new Set(
      subscription.subscriptionFeatures.map((sf) => sf.featureId),
    );

    const totals: SubscriptionRecurringTotals = calculateSubscriptionRecurringTotals(
      subscription.price,
      subscription.addOns.map((a) => ({
        featureId: a.featureId,
        status: a.status,
        recurringAmount: a.recurringAmount,
        currency: a.currency,
      })),
      subscription.currency,
      planFeatureIds,
    );

    const addOnsWithPlanCoveredFlag = subscription.addOns.map((addon) => {
      const isCovered = planFeatureIds.has(addon.featureId);
      const nextRenewalIncluded =
        addon.status === SubscriptionAddOnStatus.ACTIVE && !addon.cancelAtPeriodEnd && !isCovered;
      let entitledUntil: Date | null = null;
      if (addon.status === SubscriptionAddOnStatus.ACTIVE) {
        entitledUntil = subscription.endDate ?? subscription.trialEnd ?? null;
      } else if (addon.status === SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END) {
        entitledUntil =
          addon.cancellationEffectiveAt ?? subscription.endDate ?? subscription.trialEnd ?? null;
      }

      return {
        ...addon,
        isCoveredByBasePlan: isCovered,
        nextRenewalIncluded,
        entitledUntil,
      };
    });

    return {
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
      basePlan: {
        id: subscription.plan.id,
        code: subscription.plan.code,
        name: subscription.plan.name,
        price: Number(subscription.price),
        currency: subscription.currency,
      },
      totals,
      addOns: addOnsWithPlanCoveredFlag,
    };
  }

  async getEligibleAddonFeatures(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        subscriptionFeatures: {
          where: { enabled: true },
        },
        addOns: {
          where: {
            status: {
              in: [
                SubscriptionAddOnStatus.ACTIVE,
                SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
              ],
            },
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const basePlanFeatureIds = new Set(
      subscription.subscriptionFeatures.map((sf) => sf.featureId),
    );
    const existingAddonFeatureIds = new Set(
      subscription.addOns.map((a) => a.featureId),
    );

    const allFeatures = await this.prisma.feature.findMany({
      where: { status: FeatureStatus.ACTIVE },
      include: {
        addonPrices: {
          where: {
            billingCycle: subscription.billingCycle,
            currency: subscription.currency,
            isActive: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return allFeatures
      .filter((f) => !basePlanFeatureIds.has(f.id) && !existingAddonFeatureIds.has(f.id))
      .map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
        description: f.description,
        defaultPrice: f.addonPrices.length > 0 ? Number(f.addonPrices[0].price) : null,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        hasDefaultPrice: f.addonPrices.length > 0,
      }));
  }

  async createSubscriptionAddOn(
    subscriptionId: string,
    dto: CreateSubscriptionAddOnDto,
    performedBy?: string,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        tenant: true,
        plan: true,
        subscriptionFeatures: { where: { enabled: true } },
        addOns: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const feature = await this.prisma.feature.findUnique({
      where: { id: dto.featureId },
    });

    if (!feature || feature.status !== FeatureStatus.ACTIVE) {
      throw new NotFoundException(`Active feature with ID ${dto.featureId} not found.`);
    }

    // 1. Core rule: Feature must NOT already be part of base plan
    const isBasePlanFeature = subscription.subscriptionFeatures.some(
      (sf) => sf.featureId === dto.featureId,
    );
    if (isBasePlanFeature) {
      throw new ConflictException(
        `Feature "${feature.name}" is already included in the subscription base plan.`,
      );
    }

    // 2. Duplicate protection: No active duplicate add-on
    const activeAddOn = subscription.addOns.find(
      (a) =>
        a.featureId === dto.featureId &&
        (a.status === SubscriptionAddOnStatus.ACTIVE ||
          a.status === SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END),
    );
    if (activeAddOn) {
      throw new ConflictException(
        `This subscription already has an active add-on for feature "${feature.name}".`,
      );
    }

    const enteredPrice =
      dto.price !== undefined && dto.price !== null ? dto.price : dto.customPrice;
    let recurringAmount: number;
    let priceSource: AddOnPriceSource;
    let addonPriceId: string | null = null;
    let customReason: string | null = dto.customReason?.trim() || dto.reason?.trim() || null;

    if (enteredPrice !== undefined && enteredPrice !== null) {
      recurringAmount = Number(enteredPrice);
      priceSource = AddOnPriceSource.CUSTOM;
    } else {
      const defaultPrice = await this.prisma.featureAddonPrice.findUnique({
        where: {
          featureId_billingCycle_currency: {
            featureId: dto.featureId,
            billingCycle: subscription.billingCycle,
            currency: subscription.currency,
          },
        },
      });

      if (defaultPrice && defaultPrice.isActive) {
        recurringAmount = Number(defaultPrice.price);
        priceSource = AddOnPriceSource.DEFAULT;
        addonPriceId = defaultPrice.id;
      } else {
        throw new BadRequestException(
          `Please provide a recurring add-on price for feature "${feature.name}".`,
        );
      }
    }

    const existingAddOn = subscription.addOns.find((a) => a.featureId === dto.featureId);

    let addOn;
    if (existingAddOn) {
      addOn = await this.prisma.subscriptionAddOn.update({
        where: { id: existingAddOn.id },
        data: {
          status: SubscriptionAddOnStatus.ACTIVE,
          recurringAmount,
          priceSource,
          addonPriceId,
          customReason,
          billingCycle: subscription.billingCycle,
          currency: subscription.currency,
          activatedAt: new Date(),
          cancelAtPeriodEnd: false,
          cancellationEffectiveAt: null,
          cancelledAt: null,
          cancelReason: null,
        },
        include: {
          feature: true,
        },
      });
    } else {
      addOn = await this.prisma.subscriptionAddOn.create({
        data: {
          subscriptionId: subscription.id,
          featureId: dto.featureId,
          status: SubscriptionAddOnStatus.ACTIVE,
          billingCycle: subscription.billingCycle,
          recurringAmount,
          currency: subscription.currency,
          addonPriceId,
          priceSource,
          customReason,
          activatedAt: new Date(),
          createdBy: performedBy,
        },
        include: {
          feature: true,
        },
      });
    }

    await this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: SubscriptionHistoryAction.STATUS_CHANGED,
        metadata: {
          action: 'ADDON_ACTIVATED_DIRECT',
          addOnId: addOn.id,
          featureId: dto.featureId,
          featureCode: feature.code,
          featureName: feature.name,
          status: SubscriptionAddOnStatus.ACTIVE,
          priceSource,
          recurringAmount,
          currency: subscription.currency,
          billingCycle: subscription.billingCycle,
          customReason,
          performedBy,
        },
        performedBy,
      },
    });

    this.logger.log(
      `Subscription add-on activated immediately: subscription=${subscription.id}, feature=${feature.code}, amount=${recurringAmount} ${subscription.currency}`,
    );

    await this.syncTenantFeaturesForSubscription(subscription.id, subscription.tenantId);

    return addOn;
  }

  // ---------------------------------------------------------------------------
  // PRORATION QUOTE & PAYMENT ORDERS (TASK 4)
  // ---------------------------------------------------------------------------

  buildPaymentUrl(token: string): string {
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'
    ).replace(/\/$/, '');
    return `${frontendUrl}/pay/add-on/${token}`;
  }

  async getAddonProrationQuote(
    subscriptionId: string,
    addOnId: string,
    effectiveDate?: Date,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        tenant: true,
        plan: true,
        subscriptionFeatures: { where: { enabled: true } },
        addOns: { include: { feature: true } },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const addOn = subscription.addOns.find((a) => a.id === addOnId);
    if (!addOn) {
      throw new NotFoundException(`Subscription add-on with ID ${addOnId} not found.`);
    }

    if (addOn.status === SubscriptionAddOnStatus.CANCELLED) {
      throw new BadRequestException(
        `Proration quote cannot be generated for CANCELLED add-on. Current status: ${addOn.status}`,
      );
    }

    // Determine period boundaries
    let periodStart: Date;
    let periodEnd: Date;

    if (subscription.status === 'TRIAL' && subscription.trialEnd) {
      periodStart = subscription.trialStart ?? subscription.startDate ?? subscription.createdAt;
      periodEnd = subscription.trialEnd;
    } else {
      periodStart = subscription.startDate ?? subscription.createdAt;
      periodEnd =
        subscription.endDate ??
        subscription.nextBillingDate ??
        extendBillingPeriod(periodStart, subscription.billingCycle);
    }

    const proration = calculateAddonProration({
      recurringAmount: addOn.recurringAmount,
      periodStart,
      periodEnd,
      effectiveDate,
      currency: addOn.currency,
    });

    const planFeatureIds = new Set(
      subscription.subscriptionFeatures.map((sf) => sf.featureId),
    );
    const currentTotals = calculateSubscriptionRecurringTotals(
      subscription.price,
      subscription.addOns.map((a) => ({
        featureId: a.featureId,
        status: a.status,
        recurringAmount: a.recurringAmount,
        currency: a.currency,
      })),
      subscription.currency,
      planFeatureIds,
    );

    const isCoveredByPlan = planFeatureIds.has(addOn.featureId);
    const nextRecurringTotal =
      currentTotals.currentRecurringTotal +
      (isCoveredByPlan ? 0 : Number(addOn.recurringAmount));

    await this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: SubscriptionHistoryAction.STATUS_CHANGED,
        metadata: {
          action: 'ADDON_QUOTED',
          addOnId: addOn.id,
          featureId: addOn.featureId,
          featureCode: addOn.feature.code,
          periodStart: proration.periodStart,
          periodEnd: proration.periodEnd,
          effectiveDate: proration.effectiveDate,
          recurringAmount: proration.recurringAmount,
          proratedAmount: proration.proratedAmount,
          ratio: proration.ratio,
          currency: addOn.currency,
        },
      },
    });

    return {
      addOn: {
        id: addOn.id,
        featureId: addOn.featureId,
        featureCode: addOn.feature.code,
        featureName: addOn.feature.name,
        status: addOn.status,
        billingCycle: addOn.billingCycle,
        recurringAmount: Number(addOn.recurringAmount),
        currency: addOn.currency,
        priceSource: addOn.priceSource,
        customReason: addOn.customReason,
      },
      subscription: {
        id: subscription.id,
        tenantId: subscription.tenantId,
        salonName: subscription.tenant.name,
        planName: subscription.plan.name,
        planCode: subscription.plan.code,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        basePlanPrice: Number(subscription.price),
      },
      proration: {
        periodStart: proration.periodStart,
        periodEnd: proration.periodEnd,
        estimatedActivationDate: proration.effectiveDate,
        totalDurationMs: proration.totalDurationMs,
        remainingDurationMs: proration.remainingDurationMs,
        ratio: proration.ratio,
        proratedAmount: proration.proratedAmount,
        recurringAmount: proration.recurringAmount,
        currency: addOn.currency,
      },
      recurringTotals: {
        basePlanPrice: currentTotals.basePlanPrice,
        currentActiveAddonsTotal: currentTotals.activeAddonsTotal,
        currentRecurringTotal: currentTotals.currentRecurringTotal,
        nextRecurringTotal,
        projectedRecurringTotal: currentTotals.projectedRecurringTotal,
      },
    };
  }

  async createOrGetAddonPaymentOrder(
    subscriptionId: string,
    addOnId: string,
    performedBy?: string,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        tenant: true,
        plan: true,
        subscriptionFeatures: { where: { enabled: true } },
        addOns: { include: { feature: true } },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const addOn = subscription.addOns.find((a) => a.id === addOnId);
    if (!addOn) {
      throw new NotFoundException(`Subscription add-on with ID ${addOnId} not found.`);
    }

    if (addOn.status === SubscriptionAddOnStatus.CANCELLED) {
      throw new BadRequestException(
        `Payment order cannot be created for CANCELLED add-on. Current status: ${addOn.status}`,
      );
    }

    const now = new Date();

    // Check for an existing valid PENDING payment order
    const existingOrder = await this.prisma.paymentOrder.findFirst({
      where: {
        subscriptionAddOnId: addOn.id,
        status: PaymentOrderStatus.PENDING,
        tokenExpiresAt: { gt: now },
      },
      include: {
        invoices: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOrder && existingOrder.paymentToken) {
      const invoice = existingOrder.invoices[0] ?? null;
      return {
        orderId: existingOrder.id,
        orderReference: existingOrder.reference,
        amount: Number(existingOrder.amount),
        currency: existingOrder.currency,
        status: existingOrder.status,
        token: existingOrder.paymentToken,
        paymentUrl: this.buildPaymentUrl(existingOrder.paymentToken),
        expiresAt: existingOrder.tokenExpiresAt,
        invoice: invoice
          ? {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              amount: Number(invoice.total),
            }
          : null,
        isReused: true,
      };
    }

    // Cancel any old expired pending orders for this add-on
    await this.prisma.paymentOrder.updateMany({
      where: {
        subscriptionAddOnId: addOn.id,
        status: PaymentOrderStatus.PENDING,
        tokenExpiresAt: { lte: now },
      },
      data: { status: PaymentOrderStatus.CANCELLED },
    });

    // Calculate fresh quote
    const quote = await this.getAddonProrationQuote(subscriptionId, addOnId);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
    const reference = `ADDON-${addOn.id.slice(0, 8)}-${Date.now()}`;

    const { order, invoice } = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.paymentOrder.create({
        data: {
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          subscriptionAddOnId: addOn.id,
          amount: quote.proration.proratedAmount,
          currency: addOn.currency,
          status: PaymentOrderStatus.PENDING,
          gateway: PaymentGatewayProvider.PAYHERE,
          reference,
          purpose: PaymentPurpose.SUBSCRIPTION_ADDON_ACTIVATE,
          paymentToken: rawToken,
          paymentTokenHash: tokenHash,
          tokenExpiresAt,
          metadata: {
            featureId: addOn.featureId,
            featureCode: addOn.feature.code,
            featureName: addOn.feature.name,
            billingCycle: addOn.billingCycle,
            periodStart: quote.proration.periodStart,
            periodEnd: quote.proration.periodEnd,
            recurringAmount: quote.proration.recurringAmount,
            proratedAmount: quote.proration.proratedAmount,
            salonName: subscription.tenant.name,
            performedBy,
          },
        },
      });

      const createdInvoice = await this.invoicesService.createAddonInvoice({
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        subscriptionAddOnId: addOn.id,
        paymentOrderId: createdOrder.id,
        amount: quote.proration.proratedAmount,
        currency: addOn.currency,
        salonName: subscription.tenant.name,
        salonEmail: subscription.tenant.email,
        salonPhone: subscription.tenant.phone,
        customerName: subscription.tenant.name,
        customerEmail: subscription.tenant.email ?? 'billing@salon.local',
        customerPhone: subscription.tenant.phone,
        featureName: addOn.feature.name,
        featureCode: addOn.feature.code,
        billingCycle: addOn.billingCycle,
        periodStart: quote.proration.periodStart,
        periodEnd: quote.proration.periodEnd,
        metadata: {
          subscriptionAddOnId: addOn.id,
          paymentOrderId: createdOrder.id,
          recurringAmount: quote.proration.recurringAmount,
          proratedAmount: quote.proration.proratedAmount,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: SubscriptionHistoryAction.STATUS_CHANGED,
          metadata: {
            action: 'ADDON_PAYMENT_ORDER_CREATED',
            addOnId: addOn.id,
            paymentOrderId: createdOrder.id,
            orderReference: reference,
            invoiceId: createdInvoice.id,
            invoiceNumber: createdInvoice.invoiceNumber,
            proratedAmount: quote.proration.proratedAmount,
            currency: addOn.currency,
            tokenExpiresAt,
            performedBy,
          },
          performedBy,
        },
      });

      return { order: createdOrder, invoice: createdInvoice };
    });

    return {
      orderId: order.id,
      orderReference: order.reference,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
      token: rawToken,
      paymentUrl: this.buildPaymentUrl(rawToken),
      expiresAt: tokenExpiresAt,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amount: Number(invoice.total),
      },
      isReused: false,
    };
  }

  async getAddonPaymentDetails(subscriptionId: string, addOnId: string) {
    const addOn = await this.prisma.subscriptionAddOn.findFirst({
      where: { id: addOnId, subscriptionId },
      include: {
        feature: true,
        paymentOrders: {
          include: {
            invoices: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!addOn) {
      throw new NotFoundException(`Add-on ${addOnId} not found on subscription ${subscriptionId}`);
    }

    const latestOrder = addOn.paymentOrders[0] ?? null;
    const latestInvoice = latestOrder?.invoices[0] ?? null;
    const latestPayment = latestOrder?.payments[0] ?? null;

    const now = new Date();
    const isExpired = latestOrder?.tokenExpiresAt
      ? latestOrder.tokenExpiresAt.getTime() <= now.getTime()
      : false;

    return {
      addOnId: addOn.id,
      featureCode: addOn.feature.code,
      featureName: addOn.feature.name,
      status: addOn.status,
      recurringAmount: Number(addOn.recurringAmount),
      currency: addOn.currency,
      activatedAt: addOn.activatedAt,
      order: latestOrder
        ? {
            id: latestOrder.id,
            reference: latestOrder.reference,
            status: latestOrder.status,
            amount: Number(latestOrder.amount),
            currency: latestOrder.currency,
            expiresAt: latestOrder.tokenExpiresAt,
            isExpired,
            paymentUrl: latestOrder.paymentToken
              ? this.buildPaymentUrl(latestOrder.paymentToken)
              : null,
            tokenUsedAt: latestOrder.tokenUsedAt,
          }
        : null,
      invoice: latestInvoice
        ? {
            id: latestInvoice.id,
            invoiceNumber: latestInvoice.invoiceNumber,
            status: latestInvoice.status,
            amount: Number(latestInvoice.total),
            paidAt: latestInvoice.paidAt,
          }
        : null,
      payment: latestPayment
        ? {
            id: latestPayment.id,
            transactionId: latestPayment.transactionId,
            status: latestPayment.status,
            paidAt: latestPayment.paidAt,
          }
        : null,
    };
  }

  /**
   * Central fulfillment method for both PayHere webhook & manual payment confirmation.
   */
  async activatePaidAddOn(params: {
    paymentOrderId: string;
    subscriptionAddOnId?: string | null;
    transactionId: string;
    paymentMethod: string;
    paidAt?: Date;
    confirmedBy?: string;
  }) {
    let addOnId = params.subscriptionAddOnId;

    if (!addOnId) {
      const order = await this.prisma.paymentOrder.findUnique({
        where: { id: params.paymentOrderId },
        select: { subscriptionAddOnId: true },
      });
      addOnId = order?.subscriptionAddOnId ?? null;
    }

    if (!addOnId) {
      throw new BadRequestException('Payment order is not linked to any subscription add-on');
    }

    const addOn = await this.prisma.subscriptionAddOn.findUnique({
      where: { id: addOnId },
      include: {
        feature: true,
        subscription: { include: { tenant: true } },
      },
    });

    if (!addOn) {
      throw new NotFoundException(`Subscription add-on ${addOnId} not found`);
    }

    // Idempotency: If already ACTIVE, do nothing
    if (addOn.status === SubscriptionAddOnStatus.ACTIVE) {
      this.logger.log(`Add-on ${addOn.id} is already ACTIVE. Skipping duplicate activation.`);
      return { success: true, alreadyActive: true };
    }

    if (addOn.status !== SubscriptionAddOnStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Cannot activate add-on in status: ${addOn.status}`);
    }

    const paidAt = params.paidAt ?? new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionAddOn.update({
        where: { id: addOn.id },
        data: {
          status: SubscriptionAddOnStatus.ACTIVE,
          activatedAt: paidAt,
          effectiveFrom: paidAt,
        },
      });

      await tx.paymentOrder.update({
        where: { id: params.paymentOrderId },
        data: {
          status: PaymentOrderStatus.PAID,
          tokenUsedAt: paidAt,
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: addOn.subscriptionId,
          action: SubscriptionHistoryAction.STATUS_CHANGED,
          metadata: {
            action: 'ADDON_ACTIVATED',
            subscriptionAddOnId: addOn.id,
            featureId: addOn.featureId,
            featureCode: addOn.feature.code,
            featureName: addOn.feature.name,
            recurringAmount: Number(addOn.recurringAmount),
            currency: addOn.currency,
            billingCycle: addOn.billingCycle,
            paymentOrderId: params.paymentOrderId,
            transactionId: params.transactionId,
            gateway: params.paymentMethod,
            activatedAt: paidAt,
            performedBy: params.confirmedBy,
          },
          performedBy: params.confirmedBy,
        },
      });
    });

    this.logger.log(
      `Subscription add-on activated: subscription=${addOn.subscriptionId}, feature=${addOn.feature.code}, method=${params.paymentMethod}`,
    );

    await this.syncTenantFeaturesForSubscription(
      addOn.subscriptionId,
      addOn.subscription.tenantId,
    );

    return { success: true, activated: true };
  }

  async confirmManualPayment(
    subscriptionId: string,
    addOnId: string,
    input: {
      paymentMethod: string;
      paymentReference?: string;
      notes?: string;
      performedBy?: string;
    },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const addOn = await this.prisma.subscriptionAddOn.findFirst({
      where: { id: addOnId, subscriptionId },
      include: { feature: true },
    });

    if (!addOn) {
      throw new NotFoundException(`Add-on ${addOnId} not found`);
    }

    if (addOn.status !== SubscriptionAddOnStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Cannot confirm payment for add-on in status: ${addOn.status}`);
    }

    // Ensure there is a payment order and invoice
    const orderData = await this.createOrGetAddonPaymentOrder(
      subscriptionId,
      addOnId,
      input.performedBy,
    );
    const transactionId =
      input.paymentReference?.trim() || `MANUAL-${addOn.id.slice(0, 8)}-${Date.now()}`;
    const paidAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Upsert Payment
      const payment = await tx.payment.create({
        data: {
          paymentOrderId: orderData.orderId,
          transactionId,
          status: PaymentRecordStatus.PAID,
          paidAt,
        },
      });

      // Mark PaymentOrder as PAID
      await tx.paymentOrder.update({
        where: { id: orderData.orderId },
        data: {
          status: PaymentOrderStatus.PAID,
          gateway: PaymentGatewayProvider.MANUAL,
          tokenUsedAt: paidAt,
        },
      });

      // Mark invoice PAID if it exists
      if (orderData.invoice) {
        await tx.invoice.update({
          where: { id: orderData.invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            paymentId: payment?.id || 'manual-pay-id',
            paidAt,
            paymentMethod: input.paymentMethod || 'MANUAL',
            paymentReference: transactionId,
          },
        });
      }

      // Record Transaction
      await tx.paymentTransaction.create({
        data: {
          paymentOrderId: orderData.orderId,
          paymentId: payment.id,
          gateway: PaymentGatewayProvider.MANUAL,
          eventType: 'manual_payment_confirmed',
          rawPayload: {
            notes: input.notes,
            method: input.paymentMethod,
            reference: transactionId,
            confirmedBy: input.performedBy,
          },
          verified: true,
        },
      });
    });

    // Activate add-on using same central method
    await this.activatePaidAddOn({
      paymentOrderId: orderData.orderId,
      subscriptionAddOnId: addOn.id,
      transactionId,
      paymentMethod: input.paymentMethod || 'MANUAL',
      paidAt,
      confirmedBy: input.performedBy,
    });

    return {
      success: true,
      message: 'Manual payment confirmed and add-on activated successfully.',
      transactionId,
    };
  }

  // ---------------------------------------------------------------------------
  // ADD-ON REMOVAL (IMMEDIATE DEACTIVATION & EXCLUSION FROM NEXT RENEWAL)
  // ---------------------------------------------------------------------------

  async removeSubscriptionAddOn(
    subscriptionId: string,
    addOnId: string,
    input?: { reason?: string; performedBy?: string },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const addOn = await this.prisma.subscriptionAddOn.findFirst({
      where: { id: addOnId, subscriptionId },
      include: { feature: true },
    });

    if (!addOn) {
      throw new NotFoundException(`Subscription add-on with ID ${addOnId} not found.`);
    }

    const now = new Date();
    const reason = input?.reason?.trim() ?? 'Add-on removed by super admin';

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.subscriptionAddOn.update({
        where: { id: addOn.id },
        data: {
          status: SubscriptionAddOnStatus.CANCELLED,
          cancelAtPeriodEnd: false,
          cancelledAt: now,
          cancelReason: reason,
        },
        include: { feature: true },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: SubscriptionHistoryAction.STATUS_CHANGED,
          metadata: {
            action: 'ADDON_REMOVED',
            addOnId: addOn.id,
            featureId: addOn.featureId,
            featureCode: addOn.feature.code,
            featureName: addOn.feature.name,
            reason,
            performedBy: input?.performedBy,
          },
          performedBy: input?.performedBy,
        },
      });

      return record;
    });

    this.logger.log(
      `Add-on ${addOn.id} (${addOn.feature.code}) removed immediately for subscription ${subscriptionId}`,
    );

    await this.syncTenantFeaturesForSubscription(subscription.id, subscription.tenantId);

    return {
      success: true,
      addOnId: updated.id,
      status: updated.status,
      message: `Add-on "${addOn.feature.name}" removed successfully. Feature entitlement disabled and price excluded from next renewal.`,
    };
  }

  // ---------------------------------------------------------------------------
  // TASK 6: CANCELLATION AT PERIOD END & UNDO CANCELLATION
  // ---------------------------------------------------------------------------

  async cancelAddonAtPeriodEnd(
    subscriptionId: string,
    addOnId: string,
    input: { reason: string; performedBy?: string },
  ) {
    if (!input.reason?.trim()) {
      throw new BadRequestException('A cancellation reason is required.');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const addOn = await this.prisma.subscriptionAddOn.findFirst({
      where: { id: addOnId, subscriptionId },
      include: { feature: true },
    });

    if (!addOn) {
      throw new NotFoundException(`Subscription add-on with ID ${addOnId} not found.`);
    }

    // If still in PENDING_PAYMENT status, route to immediate cancellation
    if (addOn.status === SubscriptionAddOnStatus.PENDING_PAYMENT) {
      return this.cancelPendingAddonPayment(subscriptionId, addOnId, input);
    }

    if (addOn.status !== SubscriptionAddOnStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot schedule cancellation for add-on in status ${addOn.status}. Only ACTIVE add-ons can be cancelled at period end.`,
      );
    }

    if (addOn.cancelAtPeriodEnd) {
      throw new ConflictException('This add-on is already scheduled for cancellation.');
    }

    // Determine cancellationEffectiveAt: immutable snapshot of the current period end
    let cancellationEffectiveAt: Date;
    if (subscription.status === 'TRIAL' && subscription.trialEnd) {
      cancellationEffectiveAt = subscription.trialEnd;
    } else {
      cancellationEffectiveAt =
        subscription.endDate ??
        subscription.nextBillingDate ??
        extendBillingPeriod(subscription.startDate ?? new Date(), subscription.billingCycle);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const addonRecord = await tx.subscriptionAddOn.update({
        where: { id: addOn.id },
        data: {
          status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
          cancelAtPeriodEnd: true,
          cancellationEffectiveAt,
          cancelReason: input.reason.trim(),
        },
        include: { feature: true },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: SubscriptionHistoryAction.STATUS_CHANGED,
          metadata: {
            action: 'ADDON_CANCELLATION_SCHEDULED',
            addOnId: addOn.id,
            featureId: addOn.featureId,
            featureCode: addOn.feature.code,
            featureName: addOn.feature.name,
            recurringAmount: Number(addOn.recurringAmount),
            billingCycle: addOn.billingCycle,
            cancellationEffectiveAt,
            reason: input.reason.trim(),
            performedBy: input.performedBy,
          },
          performedBy: input.performedBy,
        },
      });

      return addonRecord;
    });

    this.logger.log(
      `Add-on ${addOn.id} (${addOn.feature.code}) scheduled for cancellation on ${cancellationEffectiveAt.toISOString()} for subscription ${subscriptionId}`,
    );

    return {
      success: true,
      addOnId: updated.id,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      cancellationEffectiveAt,
      nextRenewalIncluded: false,
      entitledUntil: cancellationEffectiveAt,
      message: `Cancellation scheduled for ${cancellationEffectiveAt.toISOString().split('T')[0]}. Service remains active until then.`,
    };
  }

  async undoAddonCancellation(
    subscriptionId: string,
    addOnId: string,
    input?: { reason?: string; performedBy?: string },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const addOn = await this.prisma.subscriptionAddOn.findFirst({
      where: { id: addOnId, subscriptionId },
      include: { feature: true },
    });

    if (!addOn) {
      throw new NotFoundException(`Subscription add-on with ID ${addOnId} not found.`);
    }

    if (addOn.status !== SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END) {
      throw new BadRequestException(
        `Cannot undo cancellation for add-on in status ${addOn.status}. Only CANCEL_AT_PERIOD_END add-ons can be restored.`,
      );
    }

    const cutoff = addOn.cancellationEffectiveAt ?? subscription.endDate;
    if (cutoff && isPastDate(cutoff)) {
      throw new BadRequestException(
        'Cannot undo cancellation: the billing period has already ended and cancellation was finalized or is due.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const addonRecord = await tx.subscriptionAddOn.update({
        where: { id: addOn.id },
        data: {
          status: SubscriptionAddOnStatus.ACTIVE,
          cancelAtPeriodEnd: false,
          cancellationEffectiveAt: null,
          cancelReason: null,
        },
        include: { feature: true },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: SubscriptionHistoryAction.STATUS_CHANGED,
          metadata: {
            action: 'ADDON_CANCELLATION_UNDONE',
            addOnId: addOn.id,
            featureId: addOn.featureId,
            featureCode: addOn.feature.code,
            featureName: addOn.feature.name,
            previousCancellationEffectiveAt: addOn.cancellationEffectiveAt,
            reason: input?.reason?.trim() ?? 'Cancellation undone by admin',
            performedBy: input?.performedBy,
          },
          performedBy: input?.performedBy,
        },
      });

      return addonRecord;
    });

    this.logger.log(
      `Add-on ${addOn.id} (${addOn.feature.code}) cancellation undone. Restored to ACTIVE on subscription ${subscriptionId}`,
    );

    await this.syncTenantFeaturesForSubscription(subscription.id, subscription.tenantId);

    return {
      success: true,
      addOnId: updated.id,
      status: updated.status,
      cancelAtPeriodEnd: false,
      nextRenewalIncluded: true,
      message: 'Add-on restored to ACTIVE. It will renew with next billing cycle.',
    };
  }

  async cancelPendingAddonPayment(
    subscriptionId: string,
    addOnId: string,
    input?: { reason?: string; performedBy?: string },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found.`);
    }

    const addOn = await this.prisma.subscriptionAddOn.findFirst({
      where: { id: addOnId, subscriptionId },
      include: { feature: true },
    });

    if (!addOn) {
      throw new NotFoundException(`Subscription add-on with ID ${addOnId} not found.`);
    }

    if (addOn.status !== SubscriptionAddOnStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Cannot cancel pending payment for add-on in status ${addOn.status}. Only PENDING_PAYMENT add-ons can be cancelled immediately.`,
      );
    }

    const now = new Date();
    const reason = input?.reason?.trim() ?? 'Pending add-on payment cancelled by admin';

    await this.prisma.$transaction(async (tx) => {
      // 1. Mark add-on CANCELLED
      await tx.subscriptionAddOn.update({
        where: { id: addOn.id },
        data: {
          status: SubscriptionAddOnStatus.CANCELLED,
          cancelAtPeriodEnd: false,
          cancelledAt: now,
          cancelReason: reason,
        },
      });

      // 2. Invalidate all pending PaymentOrders for this add-on
      await tx.paymentOrder.updateMany({
        where: {
          subscriptionAddOnId: addOn.id,
          status: PaymentOrderStatus.PENDING,
        },
        data: {
          status: PaymentOrderStatus.CANCELLED,
          tokenExpiresAt: new Date(0), // immediately invalidate token
        },
      });

      // 3. Void any unpaid issued invoices for this add-on
      await tx.invoice.updateMany({
        where: {
          subscriptionAddOnId: addOn.id,
          status: InvoiceStatus.ISSUED,
        },
        data: {
          status: InvoiceStatus.VOID,
        },
      });

      // 4. Record audit history
      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: SubscriptionHistoryAction.STATUS_CHANGED,
          metadata: {
            action: 'PENDING_ADDON_CANCELLED',
            addOnId: addOn.id,
            featureId: addOn.featureId,
            featureCode: addOn.feature.code,
            featureName: addOn.feature.name,
            reason,
            performedBy: input?.performedBy,
          },
          performedBy: input?.performedBy,
        },
      });
    });

    this.logger.log(
      `Pending add-on ${addOn.id} (${addOn.feature.code}) cancelled immediately for subscription ${subscriptionId}`,
    );

    return {
      success: true,
      addOnId: addOn.id,
      status: SubscriptionAddOnStatus.CANCELLED,
      message: 'Pending add-on payment request cancelled. Invoices voided and payment links invalidated.',
    };
  }

  private async syncTenantFeaturesForSubscription(subscriptionId: string, tenantId: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { id: subscriptionId, tenantId },
        include: {
          subscriptionFeatures: { where: { enabled: true }, select: { featureId: true } },
          addOns: {
            where: {
              status: {
                in: [
                  SubscriptionAddOnStatus.ACTIVE,
                  SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
                ],
              },
            },
            select: { featureId: true },
          },
        },
      });

      if (!subscription) {
        return;
      }

      const baseFeatureIds = (subscription.subscriptionFeatures ?? []).map((sf) => sf.featureId);
      const addonFeatureIds = (subscription.addOns ?? []).map((a) => a.featureId);
      const featureIds = Array.from(new Set([...baseFeatureIds, ...addonFeatureIds]));

      await this.prisma.$transaction(async (tx) => {
        await syncTenantFeatures(tx, tenantId, featureIds);
      });
    } catch (err) {
      this.logger.error(
        `Failed to sync tenant features for subscription ${subscriptionId}: ${err}`,
      );
    }
  }
}
