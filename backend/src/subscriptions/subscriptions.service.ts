import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import {
  BillingCycle,
  FeatureStatus,
  PaymentGatewayProvider,
  PaymentOrderStatus,
  PaymentRecordStatus,
  Plan,
  PlanPrice,
  Prisma,
  Subscription,
  SubscriptionHistoryAction,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { syncTenantFeatures } from '../database/sync-tenant-features.util';
import { PaymentPurpose } from '../payments/dto/create-payment-order.dto';
import { PlansService } from '../plans/plans.service';
import { getPlanCurrency, isPlanActive } from '../plans/utils/plan-pricing.util';
import {
  normalizeFeatureCodes,
  validateFeatureRecords,
} from '../super-admin/salons/utils/feature-validation.util';
import { buildPaginatedResponse, resolvePagination } from '../common/dto/pagination.dto';
import {
  ActivateSubscriptionDto,
  CreateCustomSubscriptionDto,
  CreateTrialSubscriptionDto,
  RenewSubscriptionDto,
  ScheduleDowngradeDto,
  UpgradeSubscriptionDto,
} from './dto/subscription.dto';
import { SubscriptionListQueryDto } from './dto/subscription-list-query.dto';
import { SubscriptionFeatureService } from './subscription-feature.service';
import { InvoicesService } from '../invoices/invoices.service';
import {
  addTrialDays,
  comparePlanTier,
  extendBillingPeriod,
  isPastDate,
} from './utils/subscription-billing.util';

type SubscriptionWithPlan = Subscription & { plan: Pick<Plan, 'id' | 'code' | 'displayOrder'> };

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly subscriptionFeatureService: SubscriptionFeatureService,
    @Inject(forwardRef(() => InvoicesService))
    @Optional()
    private readonly invoicesService?: InvoicesService,
  ) {}

  async createSubscription(tenantId: string, planId: string) {
    await this.ensureTenantExists(tenantId);
    await this.assertNoBlockingSubscription(tenantId);

    const plan = await this.plansService.findById(planId);
    if (!isPlanActive(plan)) {
      throw new BadRequestException('Plan is not active');
    }

    const planPrice = this.plansService.getDefaultPlanPrice(plan);

    return this.prisma.subscription.create({
      data: {
        tenantId,
        planId: plan.id,
        planPriceId: planPrice.id,
        status: SubscriptionStatus.PENDING,
        billingCycle: planPrice.billingCycle,
        price: planPrice.price,
        currency: planPrice.currency,
      },
      include: this.subscriptionInclude(),
    });
  }

  async createTrialSubscription(tenantId: string, dto: CreateTrialSubscriptionDto) {
    await this.ensureTenantExists(tenantId);
    await this.assertNoBlockingSubscription(tenantId);

    const plan = await this.plansService.findById(dto.planId);
    if (!isPlanActive(plan) || plan.code === 'CUSTOM') {
      throw new BadRequestException('Plan is not available for trial');
    }

    const planPrice = await this.resolvePlanPrice(plan.id, dto.planPriceId, dto.billingCycle);
    if (planPrice.trialDays <= 0) {
      throw new BadRequestException('Selected plan price does not include a free trial');
    }

    const trialStart = new Date();
    const trialEnd = addTrialDays(trialStart, planPrice.trialDays);

    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          tenantId,
          planId: plan.id,
          planPriceId: planPrice.id,
          status: SubscriptionStatus.TRIAL,
          billingCycle: planPrice.billingCycle,
          price: planPrice.price,
          currency: planPrice.currency,
          trialStart,
          trialEnd,
          startDate: trialStart,
          endDate: trialEnd,
          nextBillingDate: trialEnd,
        },
      });

      await this.snapshotPlanFeatures(tx, created.id, plan.id);

      await this.recordHistory(tx, {
        subscriptionId: created.id,
        action: SubscriptionHistoryAction.TRIAL_STARTED,
        toPlanId: plan.id,
        toPlanPriceId: planPrice.id,
        toStatus: SubscriptionStatus.TRIAL,
        metadata: { trialDays: planPrice.trialDays },
      });

      return created;
    });

    await this.syncTenantFeaturesFromSubscription(subscription.id, tenantId);
    this.logger.log(
      `Trial subscription created: tenant=${tenantId}, subscription=${subscription.id}`,
    );
    return this.findById(subscription.id, tenantId);
  }

  async activateSubscription(
    subscriptionId: string,
    tenantId: string,
    dto: ActivateSubscriptionDto,
    options?: { fromPaymentProcessor?: boolean },
  ) {
    const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId, {
      plan: true,
    });

    if (
      subscription.status !== SubscriptionStatus.PENDING &&
      subscription.status !== SubscriptionStatus.TRIAL
    ) {
      throw new BadRequestException('Only pending or trial subscriptions can be activated');
    }

    if (!options?.fromPaymentProcessor) {
      const existingPaid = await this.prisma.paymentOrder.findFirst({
        where: {
          subscriptionId,
          tenantId,
          status: PaymentOrderStatus.PAID,
        },
      });

      if (existingPaid) {
        throw new ConflictException('Subscription payment has already been applied');
      }
    }

    const paidAt = new Date();
    const fromStatus = subscription.status;
    const anchorEnd = subscription.endDate ?? paidAt;
    const endDate = extendBillingPeriod(anchorEnd, subscription.billingCycle);
    const startDate =
      subscription.status === SubscriptionStatus.TRIAL && subscription.startDate
        ? subscription.startDate
        : paidAt;

    const { subscription: updated, recordedPayment } = await this.prisma.$transaction(async (tx) => {
      let paymentInfo: {
        order: { id: string; reference: string };
        payment: { id: string; transactionId: string | null; paidAt: Date | null };
      } | null = null;

      if (!options?.fromPaymentProcessor) {
        paymentInfo = await this.recordSubscriptionPayment(tx, {
          tenantId,
          subscriptionId,
          amount: subscription.price,
          currency: subscription.currency,
          purpose: PaymentPurpose.SUBSCRIPTION_ACTIVATE,
          paymentMethod: dto.paymentMethod ?? 'MANUAL',
          paymentReference: dto.paymentReference,
          paidAt,
        });
      }

      const existingSnapshot = await tx.subscriptionFeature.count({ where: { subscriptionId } });
      if (existingSnapshot === 0) {
        await this.snapshotPlanFeatures(tx, subscriptionId, subscription.planId);
      }

      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
          nextBillingDate: endDate,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId,
        action:
          fromStatus === SubscriptionStatus.TRIAL
            ? SubscriptionHistoryAction.TRIAL_CONVERTED
            : SubscriptionHistoryAction.ACTIVATED,
        fromStatus,
        toStatus: SubscriptionStatus.ACTIVE,
        toPlanId: subscription.planId,
        toPlanPriceId: subscription.planPriceId,
        metadata: { startDate, endDate },
      });

      return { subscription: result, recordedPayment: paymentInfo };
    });

    if (recordedPayment && this.invoicesService) {
      await this.invoicesService
        .generateFromPayment({
          paymentOrderId: recordedPayment.order.id,
          paymentId: recordedPayment.payment.id,
          transactionId: recordedPayment.payment.transactionId ?? recordedPayment.order.reference,
          paidAt: recordedPayment.payment.paidAt ?? new Date(),
        })
        .catch((err) => {
          this.logger.warn(`Invoice generation on activation warning: ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    await this.syncTenantFeaturesFromSubscription(subscriptionId, tenantId);
    this.logger.log(
      `Subscription activated: tenant=${tenantId}, subscription=${subscriptionId}, from=${fromStatus}`,
    );
    return updated;
  }

  async renewSubscription(
    subscriptionId: string,
    tenantId: string,
    dto: RenewSubscriptionDto,
    options?: { fromPaymentProcessor?: boolean },
  ) {
    const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId, {
      plan: true,
    });

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.EXPIRED
    ) {
      throw new BadRequestException('Only active or expired subscriptions can be renewed');
    }

    if (!subscription.endDate) {
      throw new BadRequestException('Subscription has no billing period end date');
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Cancelled subscriptions cannot be renewed');
    }

    if (subscription.pendingPlanId && subscription.pendingPlanPriceId) {
      return this.renewWithPendingPlanChange(subscription, tenantId, dto, options);
    }

    const paidAt = new Date();
    const previousEnd = subscription.endDate;
    const anchorEnd = isPastDate(previousEnd) ? paidAt : previousEnd;
    const newEndDate = extendBillingPeriod(anchorEnd, subscription.billingCycle);

    const { subscription: updated, recordedPayment } = await this.prisma.$transaction(async (tx) => {
      let paymentInfo: {
        order: { id: string; reference: string };
        payment: { id: string; transactionId: string | null; paidAt: Date | null };
      } | null = null;

      if (!options?.fromPaymentProcessor) {
        paymentInfo = await this.recordSubscriptionPayment(tx, {
          tenantId,
          subscriptionId,
          amount: subscription.price,
          currency: subscription.currency,
          purpose: PaymentPurpose.SUBSCRIPTION_RENEW,
          paymentMethod: dto.paymentMethod ?? 'MANUAL',
          paymentReference: dto.paymentReference,
          paidAt,
        });
      }

      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          endDate: newEndDate,
          nextBillingDate: newEndDate,
          status: SubscriptionStatus.ACTIVE,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId,
        action: SubscriptionHistoryAction.RENEWED,
        fromStatus: subscription.status,
        toStatus: SubscriptionStatus.ACTIVE,
        metadata: {
          previousEndDate: previousEnd,
          newEndDate,
          startDateUnchanged: subscription.startDate,
        },
      });

      return { subscription: result, recordedPayment: paymentInfo };
    });

    if (recordedPayment && this.invoicesService) {
      await this.invoicesService
        .generateFromPayment({
          paymentOrderId: recordedPayment.order.id,
          paymentId: recordedPayment.payment.id,
          transactionId: recordedPayment.payment.transactionId ?? recordedPayment.order.reference,
          paidAt: recordedPayment.payment.paidAt ?? new Date(),
        })
        .catch((err) => {
          this.logger.warn(`Invoice generation on renewal warning: ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    await this.syncTenantFeaturesFromSubscription(subscriptionId, tenantId);
    return updated;
  }

  private async renewWithPendingPlanChange(
    subscription: Prisma.SubscriptionGetPayload<{ include: { plan: true } }>,
    tenantId: string,
    dto: RenewSubscriptionDto,
    options?: { fromPaymentProcessor?: boolean },
  ) {
    const pendingPrice = await this.prisma.planPrice.findUnique({
      where: { id: subscription.pendingPlanPriceId! },
    });

    if (!pendingPrice) {
      throw new NotFoundException('Pending plan price not found');
    }

    const paidAt = new Date();
    const previousEnd = subscription.endDate!;
    const anchorEnd = isPastDate(previousEnd) ? paidAt : previousEnd;
    const newEndDate = extendBillingPeriod(anchorEnd, pendingPrice.billingCycle);
    const fromPlanId = subscription.planId;
    const fromPlanPriceId = subscription.planPriceId;
    const toPlanId = subscription.pendingPlanId!;

    const { subscription: updated, recordedPayment } = await this.prisma.$transaction(async (tx) => {
      let paymentInfo: {
        order: { id: string; reference: string };
        payment: { id: string; transactionId: string | null; paidAt: Date | null };
      } | null = null;

      if (!options?.fromPaymentProcessor) {
        paymentInfo = await this.recordSubscriptionPayment(tx, {
          tenantId,
          subscriptionId: subscription.id,
          amount: pendingPrice.price,
          currency: pendingPrice.currency,
          purpose: PaymentPurpose.SUBSCRIPTION_RENEW,
          paymentMethod: dto.paymentMethod ?? 'MANUAL',
          paymentReference: dto.paymentReference,
          paidAt,
        });
      }

      await this.applyPlanChange(tx, subscription.id, toPlanId, pendingPrice);

      const result = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          pendingPlanId: null,
          pendingPlanPriceId: null,
          endDate: newEndDate,
          nextBillingDate: newEndDate,
          status: SubscriptionStatus.ACTIVE,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId: subscription.id,
        action: SubscriptionHistoryAction.PLAN_CHANGED,
        fromPlanId,
        toPlanId,
        fromPlanPriceId,
        toPlanPriceId: pendingPrice.id,
        fromStatus: subscription.status,
        toStatus: SubscriptionStatus.ACTIVE,
        metadata: { scheduledDowngradeApplied: true, previousEndDate: previousEnd, newEndDate },
      });

      await this.recordHistory(tx, {
        subscriptionId: subscription.id,
        action: SubscriptionHistoryAction.RENEWED,
        fromStatus: subscription.status,
        toStatus: SubscriptionStatus.ACTIVE,
        metadata: { previousEndDate: previousEnd, newEndDate, planChangedOnRenew: true },
      });

      return { subscription: result, recordedPayment: paymentInfo };
    });

    if (recordedPayment && this.invoicesService) {
      await this.invoicesService
        .generateFromPayment({
          paymentOrderId: recordedPayment.order.id,
          paymentId: recordedPayment.payment.id,
          transactionId: recordedPayment.payment.transactionId ?? recordedPayment.order.reference,
          paidAt: recordedPayment.payment.paidAt ?? new Date(),
        })
        .catch((err) => {
          this.logger.warn(`Invoice generation on plan change renew warning: ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    await this.syncTenantFeaturesFromSubscription(subscription.id, tenantId);
    return updated;
  }

  async cancelAtPeriodEnd(subscriptionId: string, tenantId: string) {
    const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId);

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIAL
    ) {
      throw new BadRequestException('Only active or trial subscriptions can be cancelled');
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new ConflictException('Subscription is already scheduled for cancellation');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
          autoRenew: false,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId,
        action: SubscriptionHistoryAction.CANCELLED,
        fromStatus: subscription.status,
        toStatus: subscription.status,
        metadata: {
          cancelAtPeriodEnd: true,
          accessUntil: subscription.endDate,
        },
      });

      return updated;
    });
  }

  async undoCancelAtPeriodEnd(subscriptionId: string, tenantId: string) {
    const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId);

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not scheduled for cancellation');
    }

    if (isPastDate(subscription.endDate)) {
      throw new BadRequestException('Subscription period has already ended');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        autoRenew: true,
      },
      include: this.subscriptionInclude(),
    });
  }

  async upgradeSubscription(
    subscriptionId: string,
    tenantId: string,
    dto: UpgradeSubscriptionDto,
    options?: { fromPaymentProcessor?: boolean; allowWithoutPayment?: boolean },
  ) {
    if (!options?.fromPaymentProcessor && !options?.allowWithoutPayment) {
      throw new BadRequestException(
        'Plan upgrades require payment. Complete checkout before upgrading.',
      );
    }

    const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId, {
      plan: true,
    });

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be upgraded');
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Cannot upgrade a subscription scheduled for cancellation');
    }

    const targetPlan = await this.plansService.findById(dto.planId);
    if (!isPlanActive(targetPlan)) {
      throw new BadRequestException('Target plan is not active');
    }

    const tierChange = comparePlanTier(subscription.plan.displayOrder, targetPlan.displayOrder);
    if (tierChange !== 'upgrade') {
      throw new BadRequestException('Target plan must be a higher tier than the current plan');
    }

    const targetPrice = await this.resolvePlanPrice(
      targetPlan.id,
      dto.planPriceId,
      dto.billingCycle ?? subscription.billingCycle,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.applyPlanChange(tx, subscriptionId, targetPlan.id, targetPrice);

      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          pendingPlanId: null,
          pendingPlanPriceId: null,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId,
        action: SubscriptionHistoryAction.UPGRADED,
        fromPlanId: subscription.planId,
        toPlanId: targetPlan.id,
        fromPlanPriceId: subscription.planPriceId,
        toPlanPriceId: targetPrice.id,
        fromStatus: SubscriptionStatus.ACTIVE,
        toStatus: SubscriptionStatus.ACTIVE,
        metadata: dto.paymentReference ? { paymentReference: dto.paymentReference } : undefined,
      });

      return result;
    });

    await this.syncTenantFeaturesFromSubscription(subscriptionId, tenantId);
    return updated;
  }

  async upgradeSubscriptionFromPayment(
    subscriptionId: string,
    tenantId: string,
    metadata: { planId: string; planPriceId?: string; billingCycle?: BillingCycle },
    dto: ActivateSubscriptionDto,
  ) {
    return this.upgradeSubscription(
      subscriptionId,
      tenantId,
      {
        planId: metadata.planId,
        planPriceId: metadata.planPriceId,
        billingCycle: metadata.billingCycle,
        paymentReference: dto.paymentReference,
      },
      { fromPaymentProcessor: true },
    );
  }

  async scheduleDowngrade(subscriptionId: string, tenantId: string, dto: ScheduleDowngradeDto) {
    const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId, {
      plan: true,
    });

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be downgraded');
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Cannot downgrade a subscription scheduled for cancellation');
    }

    const targetPlan = await this.plansService.findById(dto.planId);
    if (!isPlanActive(targetPlan)) {
      throw new BadRequestException('Target plan is not active');
    }

    const tierChange = comparePlanTier(subscription.plan.displayOrder, targetPlan.displayOrder);
    if (tierChange !== 'downgrade') {
      throw new BadRequestException('Target plan must be a lower tier than the current plan');
    }

    const targetPrice = await this.resolvePlanPrice(
      targetPlan.id,
      dto.planPriceId,
      dto.billingCycle ?? subscription.billingCycle,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          pendingPlanId: targetPlan.id,
          pendingPlanPriceId: targetPrice.id,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId,
        action: SubscriptionHistoryAction.DOWNGRADED,
        fromPlanId: subscription.planId,
        toPlanId: targetPlan.id,
        fromPlanPriceId: subscription.planPriceId,
        toPlanPriceId: targetPrice.id,
        fromStatus: SubscriptionStatus.ACTIVE,
        toStatus: SubscriptionStatus.ACTIVE,
        metadata: {
          scheduled: true,
          effectiveAt: subscription.endDate,
        },
      });

      return updated;
    });
  }

  async cancelPendingDowngrade(subscriptionId: string, tenantId: string) {
    const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId, {
      plan: true,
    });

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can cancel a pending downgrade');
    }

    if (!subscription.pendingPlanId) {
      throw new BadRequestException('No pending downgrade to cancel');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          pendingPlanId: null,
          pendingPlanPriceId: null,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId,
        action: SubscriptionHistoryAction.PLAN_CHANGED,
        fromPlanId: subscription.pendingPlanId,
        toPlanId: subscription.planId,
        fromPlanPriceId: subscription.pendingPlanPriceId,
        toPlanPriceId: subscription.planPriceId,
        fromStatus: SubscriptionStatus.ACTIVE,
        toStatus: SubscriptionStatus.ACTIVE,
        metadata: { cancelledPendingDowngrade: true },
      });

      return updated;
    });
  }

  async processDueSubscriptions(asOf: Date = new Date()) {
    const due = await this.prisma.subscription.findMany({
      where: {
        endDate: { lte: asOf },
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      },
    });

    const results = [];
    for (const subscription of due) {
      results.push(await this.processSubscriptionPeriodEnd(subscription.id, asOf));
    }

    return results;
  }

  async processSubscriptionPeriodEnd(subscriptionId: string, asOf: Date = new Date()) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription?.endDate || subscription.endDate > asOf) {
      return { subscriptionId, action: 'skipped', reason: 'not_due' };
    }

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIAL
    ) {
      return { subscriptionId, action: 'skipped', reason: 'invalid_status' };
    }

    if (subscription.status === SubscriptionStatus.TRIAL) {
      return this.expireSubscription(subscription, SubscriptionHistoryAction.EXPIRED);
    }

    if (subscription.cancelAtPeriodEnd) {
      return this.finalizeCancellation(subscription);
    }

    // Scheduled downgrades require payment at renewal — expire and keep pending plan for checkout
    return this.expireSubscription(subscription, SubscriptionHistoryAction.EXPIRED);
  }

  async updateSubscriptionFeatures(
    subscriptionId: string,
    tenantId: string,
    featureCodes: string[],
  ) {
    let stage = 'load subscription';
    try {
      const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId);

      const editableStatuses: SubscriptionStatus[] = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.PENDING,
      ];

      if (!editableStatuses.includes(subscription.status)) {
        throw new BadRequestException(
          'Features can only be updated for active, trial, or pending subscriptions',
        );
      }

      stage = 'validate selected features';
      const uniqueFeatures = normalizeFeatureCodes(featureCodes);
      const features = await this.resolveActiveFeatures(uniqueFeatures);
      const featureIds = features.map((feature) => feature.id);

      stage = 'replace subscription feature snapshot';
      await this.prisma.$transaction(async (tx) => {
        await tx.subscriptionFeature.deleteMany({ where: { subscriptionId } });

        if (featureIds.length > 0) {
          await tx.subscriptionFeature.createMany({
            data: featureIds.map((featureId) => ({
              subscriptionId,
              featureId,
              enabled: true,
            })),
          });
        }

        await this.recordHistory(tx, {
          subscriptionId,
          action: SubscriptionHistoryAction.STATUS_CHANGED,
          metadata: {
            reason: 'SUPER_ADMIN_FEATURE_OVERRIDE',
            features: uniqueFeatures,
          },
        });
      });

      stage = 'sync tenant feature cache';
      await this.syncTenantFeaturesFromSubscription(subscriptionId, tenantId);
      this.logger.log(
        `Subscription features updated: subscription=${subscriptionId}, tenant=${tenantId}`,
      );

      stage = 'reload subscription';
      return await this.findById(subscriptionId, tenantId);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Subscription feature update failed at stage "${stage}" (subscription=${subscriptionId}, tenant=${tenantId}): ${detail}`,
        stack,
      );
      throw error;
    }
  }

  async createCustomSubscription(dto: CreateCustomSubscriptionDto) {
    await this.ensureTenantExists(dto.tenantId);

    let planId = dto.planId;
    if (!planId && dto.planCode) {
      const plan = await this.plansService.findByCode(dto.planCode);
      planId = plan.id;
    }

    if (!planId) {
      throw new BadRequestException('planId or planCode is required');
    }

    const plan = await this.plansService.findById(planId);
    const uniqueFeatures = normalizeFeatureCodes(dto.features);
    const features = await this.resolveActiveFeatures(uniqueFeatures);

    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          tenantId: dto.tenantId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: dto.billingCycle as BillingCycle,
          price: dto.price,
          currency: dto.currency ?? getPlanCurrency(plan),
          startDate: new Date(),
          endDate: this.calculateEndDate(new Date(), dto.billingCycle as BillingCycle),
          nextBillingDate: this.calculateEndDate(new Date(), dto.billingCycle as BillingCycle),
        },
      });

      await this.snapshotFeatures(
        tx,
        created.id,
        features.map((f) => f.id),
      );
      return created;
    });

    const result = await this.findById(subscription.id, dto.tenantId);
    await this.syncTenantFeaturesFromSubscription(subscription.id, dto.tenantId);
    return result;
  }

  async recordFailedPayment(subscriptionId: string, tenantId: string) {
    const subscription = await this.findTenantSubscriptionOrThrow(subscriptionId, tenantId);

    return this.prisma.paymentOrder.create({
      data: {
        tenantId,
        subscriptionId,
        amount: subscription.price,
        currency: subscription.currency,
        status: PaymentOrderStatus.FAILED,
        gateway: PaymentGatewayProvider.MANUAL,
        reference: `FAILED-${subscriptionId}-${Date.now()}`,
        purpose: PaymentPurpose.SUBSCRIPTION_RENEW,
        metadata: {
          paymentMethod: 'MANUAL',
        },
      },
    });
  }

  async listForAdmin(query: SubscriptionListQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);

    const where: Prisma.SubscriptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.search
        ? {
            OR: [
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { code: { contains: query.search, mode: 'insensitive' } } },
              { plan: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, code: true, email: true, status: true } },
          plan: { select: { id: true, code: true, name: true } },
          planPrice: { select: { billingCycle: true, trialDays: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((sub) => ({
        id: sub.id,
        tenantId: sub.tenantId,
        tenant: sub.tenant,
        plan: sub.plan,
        status: sub.status,
        billingCycle: sub.billingCycle,
        price: sub.price,
        currency: sub.currency,
        startDate: sub.startDate,
        endDate: sub.endDate,
        trialStart: sub.trialStart,
        trialEnd: sub.trialEnd,
        nextBillingDate: sub.nextBillingDate,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        createdAt: sub.createdAt,
      })),
      total,
      page,
      limit,
    );
  }

  async getTenantSubscriptionContext(tenantId: string) {
    const tenant = await this.ensureTenantExists(tenantId);
    const subscription = await this.getCurrentSubscriptionRecord(tenantId);
    const features = await this.subscriptionFeatureService.getTenantFeatureCodes(tenantId);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            planId: subscription.planId,
            plan: subscription.plan.name,
            planCode: subscription.plan.code,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            trialStart: subscription.trialStart,
            trialEnd: subscription.trialEnd,
            nextBillingDate: subscription.nextBillingDate,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            cancelledAt: subscription.cancelledAt,
            pendingPlanId: subscription.pendingPlanId,
            pendingPlan: subscription.pendingPlan
              ? {
                  id: subscription.pendingPlan.id,
                  code: subscription.pendingPlan.code,
                  name: subscription.pendingPlan.name,
                }
              : null,
            pendingPlanPrice: subscription.pendingPlanPrice
              ? {
                  id: subscription.pendingPlanPrice.id,
                  price: subscription.pendingPlanPrice.price,
                  currency: subscription.pendingPlanPrice.currency,
                  billingCycle: subscription.pendingPlanPrice.billingCycle,
                }
              : null,
            price: subscription.price,
            currency: subscription.currency,
            billingCycle: subscription.billingCycle,
            features,
          }
        : null,
      features,
    };
  }

  async findById(subscriptionId: string, tenantId: string) {
    return this.findTenantSubscriptionOrThrow(subscriptionId, tenantId);
  }

  async changePlanForTenant(subscriptionId: string, tenantId: string, newPlanId: string) {
    const updated = await this.changePlan(subscriptionId, tenantId, newPlanId);
    return this.findById(subscriptionId, tenantId);
  }

  async changePlan(subscriptionId: string, tenantId: string, newPlanId: string) {
    const subscription = await this.findById(subscriptionId, tenantId);
    const plan = await this.plansService.findById(newPlanId);

    if (!isPlanActive(plan)) {
      throw new BadRequestException('Target plan is not active');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can change plan');
    }

    if (subscription.planId === newPlanId) {
      throw new BadRequestException('This plan is already active on the subscription');
    }

    const planPrice = this.plansService.resolvePlanPrice(plan, {
      billingCycle: subscription.billingCycle,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      // Full replace snapshot so downgrades remove old entitlements
      await this.applyPlanChange(tx, subscriptionId, newPlanId, planPrice);

      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          pendingPlanId: null,
          pendingPlanPriceId: null,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId,
        action: SubscriptionHistoryAction.PLAN_CHANGED,
        fromPlanId: subscription.planId,
        toPlanId: newPlanId,
        fromPlanPriceId: subscription.planPriceId,
        toPlanPriceId: planPrice.id,
        fromStatus: SubscriptionStatus.ACTIVE,
        toStatus: SubscriptionStatus.ACTIVE,
        metadata: { source: 'admin_change_plan' },
      });

      return result;
    });

    await this.syncTenantFeaturesFromSubscription(subscriptionId, tenantId);
    return updated;
  }

  private async expireSubscription(subscription: Subscription, action: SubscriptionHistoryAction) {
    const fromStatus = subscription.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      await this.recordHistory(tx, {
        subscriptionId: subscription.id,
        action,
        fromStatus,
        toStatus: SubscriptionStatus.EXPIRED,
      });
    });

    return { subscriptionId: subscription.id, action: 'expired', fromStatus };
  }

  private async finalizeCancellation(subscription: Subscription) {
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.CANCELLED },
      });

      await this.recordHistory(tx, {
        subscriptionId: subscription.id,
        action: SubscriptionHistoryAction.CANCELLED,
        fromStatus: SubscriptionStatus.ACTIVE,
        toStatus: SubscriptionStatus.CANCELLED,
        metadata: { cancelAtPeriodEnd: true },
      });
    });

    return { subscriptionId: subscription.id, action: 'cancelled' };
  }

  private async applyScheduledDowngrade(subscription: SubscriptionWithPlan) {
    if (!subscription.pendingPlanId || !subscription.pendingPlanPriceId) {
      throw new BadRequestException('Pending downgrade is incomplete');
    }

    const pendingPrice = await this.prisma.planPrice.findUnique({
      where: { id: subscription.pendingPlanPriceId },
    });

    if (!pendingPrice) {
      throw new NotFoundException('Pending plan price not found');
    }

    const fromPlanId = subscription.planId;
    const fromPlanPriceId = subscription.planPriceId;
    const toPlanId = subscription.pendingPlanId;

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.applyPlanChange(tx, subscription.id, toPlanId, pendingPrice);

      const newEndDate = extendBillingPeriod(subscription.endDate!, pendingPrice.billingCycle);

      const result = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          pendingPlanId: null,
          pendingPlanPriceId: null,
          endDate: newEndDate,
          nextBillingDate: newEndDate,
          status: SubscriptionStatus.ACTIVE,
        },
        include: this.subscriptionInclude(),
      });

      await this.recordHistory(tx, {
        subscriptionId: subscription.id,
        action: SubscriptionHistoryAction.PLAN_CHANGED,
        fromPlanId,
        toPlanId,
        fromPlanPriceId,
        toPlanPriceId: pendingPrice.id,
        fromStatus: SubscriptionStatus.ACTIVE,
        toStatus: SubscriptionStatus.ACTIVE,
        metadata: { scheduledDowngradeApplied: true },
      });

      return result;
    });

    await this.syncTenantFeaturesFromSubscription(subscription.id, subscription.tenantId);
    return { subscriptionId: subscription.id, action: 'downgrade_applied', subscription: updated };
  }

  private async applyPlanChange(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    planId: string,
    planPrice: PlanPrice,
  ) {
    await tx.subscriptionFeature.deleteMany({ where: { subscriptionId } });
    await this.snapshotPlanFeatures(tx, subscriptionId, planId);

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId,
        planPriceId: planPrice.id,
        billingCycle: planPrice.billingCycle,
        price: planPrice.price,
        currency: planPrice.currency,
      },
    });
  }

  private async resolvePlanPrice(
    planId: string,
    planPriceId: string | undefined,
    billingCycle: BillingCycle | undefined,
  ): Promise<PlanPrice> {
    if (planPriceId) {
      const planPrice = await this.prisma.planPrice.findFirst({
        where: { id: planPriceId, planId, isActive: true },
      });

      if (!planPrice) {
        throw new NotFoundException('Plan price not found for this plan');
      }

      return planPrice;
    }

    if (!billingCycle) {
      throw new BadRequestException('planPriceId or billingCycle is required');
    }

    const planPrice = await this.prisma.planPrice.findFirst({
      where: { planId, billingCycle, isActive: true },
    });

    if (!planPrice) {
      throw new NotFoundException(`No active ${billingCycle} price for this plan`);
    }

    return planPrice;
  }

  private async getCurrentSubscriptionRecord(tenantId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.PENDING,
            SubscriptionStatus.EXPIRED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { id: true, code: true, name: true, displayOrder: true } },
        pendingPlan: { select: { id: true, code: true, name: true } },
        pendingPlanPrice: {
          select: { id: true, price: true, currency: true, billingCycle: true },
        },
      },
    });
  }

  private async assertNoBlockingSubscription(tenantId: string) {
    const existing = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: {
          in: [SubscriptionStatus.PENDING, SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      return;
    }

    if (
      existing.status === SubscriptionStatus.ACTIVE &&
      this.subscriptionFeatureService.isSubscriptionValid(existing)
    ) {
      throw new ConflictException('Tenant already has an active subscription');
    }

    if (existing.status === SubscriptionStatus.TRIAL && !isPastDate(existing.endDate)) {
      throw new ConflictException('Tenant already has an active trial');
    }

    if (existing.status === SubscriptionStatus.PENDING) {
      throw new ConflictException('A pending subscription already exists for this tenant');
    }
  }

  private async findTenantSubscriptionOrThrow(
    subscriptionId: string,
    tenantId: string,
    include?: Prisma.SubscriptionInclude,
  ) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
      include: include ?? this.subscriptionInclude(),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  private async syncTenantFeaturesFromSubscription(subscriptionId: string, tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
      include: {
        subscriptionFeatures: { where: { enabled: true }, select: { featureId: true } },
      },
    });

    if (!subscription) {
      return;
    }

    const featureIds = (subscription.subscriptionFeatures ?? []).map((sf) => sf.featureId);
    await this.prisma.$transaction(async (tx) => {
      await syncTenantFeatures(tx, tenantId, featureIds);
    });
  }

  private async recordHistory(
    tx: Prisma.TransactionClient,
    input: {
      subscriptionId: string;
      action: SubscriptionHistoryAction;
      fromPlanId?: string | null;
      toPlanId?: string | null;
      fromPlanPriceId?: string | null;
      toPlanPriceId?: string | null;
      fromStatus?: SubscriptionStatus | null;
      toStatus?: SubscriptionStatus | null;
      metadata?: Prisma.InputJsonValue;
      performedBy?: string | null;
    },
  ) {
    await tx.subscriptionHistory.create({
      data: {
        subscriptionId: input.subscriptionId,
        action: input.action,
        fromPlanId: input.fromPlanId ?? null,
        toPlanId: input.toPlanId ?? null,
        fromPlanPriceId: input.fromPlanPriceId ?? null,
        toPlanPriceId: input.toPlanPriceId ?? null,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        metadata: input.metadata,
        performedBy: input.performedBy ?? null,
      },
    });
  }

  private async snapshotPlanFeatures(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    planId: string,
  ) {
    const planFeatures = await tx.planFeature.findMany({
      where: {
        planId,
        enabled: true,
        feature: { status: FeatureStatus.ACTIVE },
      },
      select: { featureId: true },
    });

    await this.snapshotFeatures(
      tx,
      subscriptionId,
      planFeatures.map((pf) => pf.featureId),
    );
  }

  private async snapshotFeatures(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    featureIds: string[],
  ) {
    if (featureIds.length === 0) {
      return;
    }

    await tx.subscriptionFeature.createMany({
      data: featureIds.map((featureId) => ({
        subscriptionId,
        featureId,
        enabled: true,
      })),
      skipDuplicates: true,
    });
  }

  private calculateEndDate(startDate: Date, billingCycle: BillingCycle): Date {
    return extendBillingPeriod(startDate, billingCycle);
  }

  private async resolveActiveFeatures(codes: string[]) {
    const features = await this.prisma.feature.findMany({
      where: { code: { in: codes } },
    });

    return validateFeatureRecords(codes, features);
  }

  private async ensureTenantExists(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  private async recordSubscriptionPayment(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      subscriptionId: string;
      amount: Prisma.Decimal | number;
      currency: string;
      purpose: PaymentPurpose;
      paymentMethod?: string;
      paymentReference?: string;
      paidAt?: Date;
    },
  ) {
    const reference =
      params.paymentReference?.trim() || `${params.purpose}-${params.subscriptionId}-${Date.now()}`;

    const order = await tx.paymentOrder.create({
      data: {
        tenantId: params.tenantId,
        subscriptionId: params.subscriptionId,
        amount: params.amount,
        currency: params.currency,
        status: PaymentOrderStatus.PAID,
        gateway: PaymentGatewayProvider.MANUAL,
        reference,
        purpose: params.purpose,
        metadata: {
          paymentMethod: params.paymentMethod ?? 'MANUAL',
          paymentReference: params.paymentReference ?? reference,
        },
      },
    });

    const payment = await tx.payment.create({
      data: {
        paymentOrderId: order.id,
        transactionId: reference,
        status: PaymentRecordStatus.PAID,
        paidAt: params.paidAt ?? new Date(),
      },
    });

    return { order, payment };
  }

  private subscriptionInclude(): Prisma.SubscriptionInclude {
    return {
      plan: { select: { id: true, code: true, name: true, displayOrder: true } },
      planPrice: true,
      subscriptionFeatures: {
        where: { enabled: true },
        include: {
          feature: { select: { id: true, code: true, name: true, status: true } },
        },
        orderBy: { feature: { code: 'asc' } },
      },
      paymentOrders: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    };
  }
}
