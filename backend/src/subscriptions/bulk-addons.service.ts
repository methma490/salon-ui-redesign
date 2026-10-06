import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AddOnPriceSource,
  BillingCycle,
  BulkOperationStatus,
  FeatureStatus,
  InvoiceStatus,
  PaymentOrderStatus,
  Prisma,
  SubscriptionAddOnStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SubscriptionAddonsService } from './subscription-addons.service';
import {
  BulkAddonConfirmDto,
  BulkAddonPreviewDto,
  BulkAddonSalonItemDto,
  BulkAddonSalonsQueryDto,
} from './dto/subscription.dto';
import {
  calculateAddonProration,
  calculateSubscriptionRecurringTotals,
  SubscriptionRecurringTotals,
} from './utils/subscription-billing.util';

export interface BulkSalonsListItem {
  subscriptionId: string;
  tenantId: string;
  salonName: string;
  tenantCode: string;
  planId: string;
  planName: string;
  planCode: string;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  currency: string;
  currentPeriodEnd: Date | null;
  basePlanPrice: number;
  currentRecurringTotal: number;
  featureStatus:
    | 'ELIGIBLE'
    | 'INCLUDED_IN_PLAN'
    | 'ACTIVE_ADDON'
    | 'CANCELLATION_SCHEDULED'
    | 'PENDING_PAYMENT'
    | 'NO_PRICE'
    | 'SUBSCRIPTION_NOT_ELIGIBLE';
  featureStatusReason?: string;
  defaultRecurringPrice: number | null;
  isEligible: boolean;
}

export interface BulkPreviewItem {
  subscriptionId: string;
  tenantId: string;
  salonName: string;
  tenantCode: string;
  planName: string;
  planCode: string;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  currency: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  currentRecurringTotal: number;
  eligible: boolean;
  reason?: string;
  pricingMode: 'DEFAULT' | 'CUSTOM';
  recurringAmount: number;
  customReason?: string;
  estimatedActivationDate: Date;
  proratedAmount: number;
  projectedRecurringTotal: number;
}

export interface BulkPreviewResponse {
  feature: {
    id: string;
    code: string;
    name: string;
    defaultMonthlyPrice: number | null;
    defaultYearlyPrice: number | null;
    currency: string;
  };
  items: BulkPreviewItem[];
  summary: {
    totalSelected: number;
    eligibleCount: number;
    skippedCount: number;
    estimatedTotalImmediateBilling: number;
    monthlyCount: number;
    yearlyCount: number;
    customPriceCount: number;
    defaultPriceCount: number;
  };
}

export interface BulkConfirmResultItem {
  subscriptionId: string;
  tenantId: string;
  salonName: string;
  success: boolean;
  skipped: boolean;
  reason?: string;
  addonId?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  paymentUrl?: string;
  isReused?: boolean;
}

export interface BulkConfirmResponse {
  operationId: string;
  results: BulkConfirmResultItem[];
  summary: {
    totalSelected: number;
    successCount: number;
    skippedCount: number;
    failedCount: number;
    pendingPaymentsCount: number;
    totalImmediateBilled: number;
  };
}

@Injectable()
export class BulkAddonsService {
  private readonly logger = new Logger(BulkAddonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly addonsService: SubscriptionAddonsService,
  ) {}

  /**
   * STEP 2: Query salons with pre-calculated eligibility for a selected feature.
   */
  async getSalonsForBulkSelection(
    query: BulkAddonSalonsQueryDto,
  ): Promise<{
    feature: {
      id: string;
      code: string;
      name: string;
      defaultMonthlyPrice: number | null;
      defaultYearlyPrice: number | null;
    };
    salons: BulkSalonsListItem[];
  }> {
    const feature = await this.prisma.feature.findUnique({
      where: { id: query.featureId },
      include: {
        addonPrices: {
          where: { isActive: true },
        },
      },
    });

    if (!feature || feature.status !== FeatureStatus.ACTIVE) {
      throw new NotFoundException(`Active feature with ID ${query.featureId} not found.`);
    }

    const monthlyPrice =
      feature.addonPrices.find((p) => p.billingCycle === BillingCycle.MONTHLY)?.price ?? null;
    const yearlyPrice =
      feature.addonPrices.find((p) => p.billingCycle === BillingCycle.YEARLY)?.price ?? null;

    // Load subscriptions matching query filters
    const whereClause: Prisma.SubscriptionWhereInput = {};

    if (query.planId) {
      whereClause.planId = query.planId;
    }

    if (query.status && query.status !== 'ALL') {
      whereClause.status = query.status as SubscriptionStatus;
    }

    if (query.billingCycle && query.billingCycle !== 'ALL') {
      whereClause.billingCycle = query.billingCycle as BillingCycle;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      whereClause.tenant = {
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { code: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: whereClause,
      include: {
        tenant: true,
        plan: true,
        subscriptionFeatures: { where: { enabled: true } },
        addOns: { include: { feature: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const salons: BulkSalonsListItem[] = subscriptions.map((sub) => {
      const isUnpaidOrSuspended = ([
        SubscriptionStatus.SUSPENDED,
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
      ] as SubscriptionStatus[]).includes(sub.status);

      let featureStatus: BulkSalonsListItem['featureStatus'] = 'ELIGIBLE';
      let featureStatusReason: string | undefined;

      const planFeatureIds = new Set((sub.subscriptionFeatures ?? []).map((sf) => sf.featureId));
      const hasInPlan = planFeatureIds.has(feature.id);

      const existingAddon = (sub.addOns ?? []).find(
        (a) =>
          a.featureId === feature.id &&
          (a.status === SubscriptionAddOnStatus.ACTIVE ||
            a.status === SubscriptionAddOnStatus.PENDING_PAYMENT ||
            a.status === SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END),
      );

      const defaultPriceObj = feature.addonPrices.find(
        (p) => p.billingCycle === sub.billingCycle && p.currency === sub.currency,
      );
      const defaultPrice = defaultPriceObj ? Number(defaultPriceObj.price) : null;

      if (isUnpaidOrSuspended) {
        featureStatus = 'SUBSCRIPTION_NOT_ELIGIBLE';
        featureStatusReason = `Subscription is ${sub.status}. Unpaid/suspended salons cannot receive add-ons.`;
      } else if (hasInPlan) {
        featureStatus = 'INCLUDED_IN_PLAN';
        featureStatusReason = `Feature is already included in ${sub.plan.name} base plan.`;
      } else if (existingAddon) {
        if (existingAddon.status === SubscriptionAddOnStatus.PENDING_PAYMENT) {
          featureStatus = 'PENDING_PAYMENT';
          featureStatusReason = 'Payment already pending for this add-on.';
        } else if (existingAddon.status === SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END) {
          featureStatus = 'CANCELLATION_SCHEDULED';
          const dateStr = existingAddon.cancellationEffectiveAt
            ? new Date(existingAddon.cancellationEffectiveAt).toISOString().split('T')[0]
            : 'period end';
          featureStatusReason = `Add-on is scheduled for cancellation on ${dateStr}.`;
        } else {
          featureStatus = 'ACTIVE_ADDON';
          featureStatusReason = 'Add-on is already active on this subscription.';
        }
      } else if (defaultPrice === null) {
        featureStatus = 'NO_PRICE';
        featureStatusReason = `No default add-on price configured for ${sub.billingCycle} cycle (${sub.currency}).`;
      }

      const totals = calculateSubscriptionRecurringTotals(
        sub.price,
        sub.addOns.map((a) => ({
          featureId: a.featureId,
          status: a.status,
          recurringAmount: a.recurringAmount,
          currency: a.currency,
        })),
        sub.currency,
        planFeatureIds,
      );

      return {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        salonName: sub.tenant.name,
        tenantCode: sub.tenant.code,
        planId: sub.plan.id,
        planName: sub.plan.name,
        planCode: sub.plan.code,
        subscriptionStatus: sub.status,
        billingCycle: sub.billingCycle,
        currency: sub.currency,
        currentPeriodEnd: sub.endDate ?? sub.trialEnd,
        basePlanPrice: Number(sub.price),
        currentRecurringTotal: totals.currentRecurringTotal,
        featureStatus,
        featureStatusReason,
        defaultRecurringPrice: defaultPrice,
        isEligible: featureStatus === 'ELIGIBLE',
      };
    });

    return {
      feature: {
        id: feature.id,
        code: feature.code,
        name: feature.name,
        defaultMonthlyPrice: monthlyPrice ? Number(monthlyPrice) : null,
        defaultYearlyPrice: yearlyPrice ? Number(yearlyPrice) : null,
      },
      salons,
    };
  }

  /**
   * STEP 4: Server-side Billing Preview (does NOT mutate database).
   */
  async previewBulkAddons(dto: BulkAddonPreviewDto): Promise<BulkPreviewResponse> {
    const feature = await this.prisma.feature.findUnique({
      where: { id: dto.featureId },
      include: {
        addonPrices: { where: { isActive: true } },
      },
    });

    if (!feature || feature.status !== FeatureStatus.ACTIVE) {
      throw new NotFoundException(`Active feature with ID ${dto.featureId} not found.`);
    }

    const defaultMonthlyPrice =
      feature.addonPrices.find((p) => p.billingCycle === BillingCycle.MONTHLY)?.price ?? null;
    const defaultYearlyPrice =
      feature.addonPrices.find((p) => p.billingCycle === BillingCycle.YEARLY)?.price ?? null;

    const items: BulkPreviewItem[] = [];
    const now = new Date();

    let totalImmediateBillingCents = 0;
    let eligibleCount = 0;
    let skippedCount = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;
    let customPriceCount = 0;
    let defaultPriceCount = 0;

    for (const item of dto.salons) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: item.subscriptionId },
        include: {
          tenant: true,
          plan: true,
          subscriptionFeatures: { where: { enabled: true } },
          addOns: { include: { feature: true } },
        },
      });

      if (!subscription) {
        items.push({
          subscriptionId: item.subscriptionId,
          tenantId: '',
          salonName: 'Unknown Salon',
          tenantCode: '',
          planName: '',
          planCode: '',
          subscriptionStatus: SubscriptionStatus.CANCELLED,
          billingCycle: BillingCycle.MONTHLY,
          currency: 'LKR',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          currentRecurringTotal: 0,
          eligible: false,
          reason: 'Subscription not found.',
          pricingMode: 'DEFAULT',
          recurringAmount: 0,
          estimatedActivationDate: now,
          proratedAmount: 0,
          projectedRecurringTotal: 0,
        });
        skippedCount++;
        continue;
      }

      const planFeatureIds = new Set(subscription.subscriptionFeatures.map((sf) => sf.featureId));
      const hasInPlan = planFeatureIds.has(feature.id);

      const isUnpaidOrSuspended = ([
        SubscriptionStatus.SUSPENDED,
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
      ] as SubscriptionStatus[]).includes(subscription.status);

      const existingAddon = subscription.addOns.find(
        (a) =>
          a.featureId === feature.id &&
          (a.status === SubscriptionAddOnStatus.ACTIVE ||
            a.status === SubscriptionAddOnStatus.PENDING_PAYMENT ||
            a.status === SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END),
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

      const periodStart =
        (subscription.status === SubscriptionStatus.TRIAL
          ? (subscription.trialStart ?? subscription.startDate)
          : subscription.startDate) ?? new Date();
      const periodEnd =
        (subscription.status === SubscriptionStatus.TRIAL
          ? (subscription.trialEnd ?? subscription.endDate)
          : subscription.endDate) ?? new Date();

      let eligible = true;
      let reason: string | undefined;
      let pricingMode: 'DEFAULT' | 'CUSTOM' = 'DEFAULT';
      let recurringAmount = 0;
      let proratedAmount = 0;

      if (isUnpaidOrSuspended) {
        eligible = false;
        reason = `Subscription is ${subscription.status}. Unpaid/suspended salons cannot receive add-ons.`;
      } else if (hasInPlan) {
        eligible = false;
        reason = `Feature is already included in ${subscription.plan.name} base plan.`;
      } else if (existingAddon) {
        eligible = false;
        if (existingAddon.status === SubscriptionAddOnStatus.PENDING_PAYMENT) {
          reason = 'Payment already pending for this add-on.';
        } else if (existingAddon.status === SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END) {
          reason = 'CANCELLATION_SCHEDULED: Add-on is already scheduled for cancellation at period end.';
        } else {
          reason = 'Add-on is already active on this subscription.';
        }
      } else {
        // Price resolution
        const isCustom =
          item.pricingMode === 'CUSTOM' ||
          (item.customPrice !== undefined && item.customPrice !== null);

        if (isCustom) {
          if (item.customPrice === undefined || item.customPrice === null || item.customPrice < 0) {
            eligible = false;
            reason = 'A valid positive custom price must be provided.';
          } else if (!item.customReason?.trim()) {
            eligible = false;
            reason = 'A reason is required when specifying a custom add-on price override.';
          } else {
            pricingMode = 'CUSTOM';
            recurringAmount = item.customPrice;
          }
        } else {
          pricingMode = 'DEFAULT';
          const defaultPriceObj = feature.addonPrices.find(
            (p) =>
              p.billingCycle === subscription.billingCycle &&
              p.currency === subscription.currency,
          );
          if (!defaultPriceObj) {
            eligible = false;
            reason = `No default add-on price configured for ${subscription.billingCycle} cycle (${subscription.currency}).`;
          } else {
            recurringAmount = Number(defaultPriceObj.price);
          }
        }
      }

      if (eligible) {
        const proration = calculateAddonProration({
          periodStart,
          periodEnd,
          effectiveDate: now,
          recurringAmount,
        });
        proratedAmount = proration.proratedAmount;
        totalImmediateBillingCents += Math.round(proratedAmount * 100);
        eligibleCount++;

        if (subscription.billingCycle === BillingCycle.MONTHLY) {
          monthlyCount++;
        } else {
          yearlyCount++;
        }

        if (pricingMode === 'CUSTOM') {
          customPriceCount++;
        } else {
          defaultPriceCount++;
        }
      } else {
        skippedCount++;
      }

      const projectedRecurringTotal = currentTotals.currentRecurringTotal + recurringAmount;

      items.push({
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        salonName: subscription.tenant.name,
        tenantCode: subscription.tenant.code,
        planName: subscription.plan.name,
        planCode: subscription.plan.code,
        subscriptionStatus: subscription.status,
        billingCycle: subscription.billingCycle,
        currency: subscription.currency,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        currentRecurringTotal: currentTotals.currentRecurringTotal,
        eligible,
        reason,
        pricingMode,
        recurringAmount,
        customReason: item.customReason?.trim(),
        estimatedActivationDate: now,
        proratedAmount,
        projectedRecurringTotal,
      });
    }

    return {
      feature: {
        id: feature.id,
        code: feature.code,
        name: feature.name,
        defaultMonthlyPrice: defaultMonthlyPrice ? Number(defaultMonthlyPrice) : null,
        defaultYearlyPrice: defaultYearlyPrice ? Number(defaultYearlyPrice) : null,
        currency: 'LKR',
      },
      items,
      summary: {
        totalSelected: dto.salons.length,
        eligibleCount,
        skippedCount,
        estimatedTotalImmediateBilling: totalImmediateBillingCents / 100,
        monthlyCount,
        yearlyCount,
        customPriceCount,
        defaultPriceCount,
      },
    };
  }

  /**
   * STEP 5: Authoritative server-side confirmation and execution.
   * Uses per-salon atomic transactions with controlled concurrency (chunks of 5).
   */
  async confirmBulkAddons(
    dto: BulkAddonConfirmDto,
    performedBy?: string,
  ): Promise<BulkConfirmResponse> {
    const feature = await this.prisma.feature.findUnique({
      where: { id: dto.featureId },
    });

    if (!feature || feature.status !== FeatureStatus.ACTIVE) {
      throw new NotFoundException(`Active feature with ID ${dto.featureId} not found.`);
    }

    // 1. Create top-level BulkAddonOperation audit record
    const operation = await this.prisma.bulkAddonOperation.create({
      data: {
        featureId: feature.id,
        status: BulkOperationStatus.PROCESSING,
        selectedCount: dto.salons.length,
        createdBy: performedBy,
        metadata: {
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });

    // 2. Process salons with controlled batch concurrency (BATCH_SIZE = 5)
    const BATCH_SIZE = 5;
    const results: BulkConfirmResultItem[] = [];

    for (let i = 0; i < dto.salons.length; i += BATCH_SIZE) {
      const batch = dto.salons.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((item) =>
          this.processSingleBulkItem(operation.id, feature.id, item, performedBy),
        ),
      );
      results.push(...batchResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failedCount = results.filter((r) => !r.success && !r.skipped).length;

    const totalImmediateBilled = results
      .filter((r) => r.success && r.amount)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    // 3. Complete BulkAddonOperation audit record
    await this.prisma.bulkAddonOperation.update({
      where: { id: operation.id },
      data: {
        status: BulkOperationStatus.COMPLETED,
        successCount,
        skippedCount,
        failedCount,
        completedAt: new Date(),
        metadata: {
          idempotencyKey: dto.idempotencyKey,
          totalImmediateBilled,
        },
      },
    });

    return {
      operationId: operation.id,
      results,
      summary: {
        totalSelected: dto.salons.length,
        successCount,
        skippedCount,
        failedCount,
        pendingPaymentsCount: successCount,
        totalImmediateBilled: Math.round(totalImmediateBilled * 100) / 100,
      },
    };
  }

  /**
   * Process a single salon item within its own atomic boundary.
   * If this salon fails, other salons are not affected.
   */
  private async processSingleBulkItem(
    operationId: string,
    featureId: string,
    item: BulkAddonSalonItemDto,
    performedBy?: string,
  ): Promise<BulkConfirmResultItem> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: item.subscriptionId },
        include: {
          tenant: true,
          plan: true,
          subscriptionFeatures: { where: { enabled: true } },
          addOns: { include: { feature: true } },
        },
      });

      if (!subscription) {
        await this.prisma.bulkAddonOperationItem.create({
          data: {
            operationId,
            tenantId: '00000000-0000-0000-0000-000000000000',
            subscriptionId: item.subscriptionId,
            result: 'SKIPPED',
            reason: 'Subscription not found.',
          },
        });
        return {
          subscriptionId: item.subscriptionId,
          tenantId: '',
          salonName: 'Unknown',
          success: false,
          skipped: true,
          reason: 'Subscription not found.',
        };
      }

      const tenantId = subscription.tenantId;
      const salonName = subscription.tenant.name;

      // Check suspension / unpayable statuses
      const isUnpaidOrSuspended = ([
        SubscriptionStatus.SUSPENDED,
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
      ] as SubscriptionStatus[]).includes(subscription.status);

      if (isUnpaidOrSuspended) {
        const reason = `Subscription is ${subscription.status}. Unpaid/suspended salons cannot receive add-ons.`;
        await this.prisma.bulkAddonOperationItem.create({
          data: {
            operationId,
            tenantId,
            subscriptionId: subscription.id,
            result: 'SKIPPED',
            reason,
          },
        });
        return {
          subscriptionId: subscription.id,
          tenantId,
          salonName,
          success: false,
          skipped: true,
          reason,
        };
      }

      // Check plan inclusion
      const isBasePlanFeature = subscription.subscriptionFeatures.some(
        (sf) => sf.featureId === featureId,
      );
      if (isBasePlanFeature) {
        const reason = 'Feature already included in base plan.';
        await this.prisma.bulkAddonOperationItem.create({
          data: {
            operationId,
            tenantId,
            subscriptionId: subscription.id,
            result: 'SKIPPED',
            reason,
          },
        });
        return {
          subscriptionId: subscription.id,
          tenantId,
          salonName,
          success: false,
          skipped: true,
          reason,
        };
      }

      // Check existing add-on
      const existingAddon = subscription.addOns.find((a) => a.featureId === featureId);
      let addOnId: string;

      if (existingAddon) {
        if (existingAddon.status === SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END) {
          const reason = 'CANCELLATION_SCHEDULED: Add-on is already scheduled for cancellation at period end.';
          await this.prisma.bulkAddonOperationItem.create({
            data: {
              operationId,
              tenantId,
              subscriptionId: subscription.id,
              addonId: existingAddon.id,
              result: 'SKIPPED',
              reason,
            },
          });
          return {
            subscriptionId: subscription.id,
            tenantId,
            salonName,
            success: false,
            skipped: true,
            reason,
          };
        } else if (existingAddon.status === SubscriptionAddOnStatus.ACTIVE) {
          const reason = 'Add-on already active on subscription.';
          await this.prisma.bulkAddonOperationItem.create({
            data: {
              operationId,
              tenantId,
              subscriptionId: subscription.id,
              addonId: existingAddon.id,
              result: 'SKIPPED',
              reason,
            },
          });
          return {
            subscriptionId: subscription.id,
            tenantId,
            salonName,
            success: false,
            skipped: true,
            reason,
          };
        } else if (existingAddon.status === SubscriptionAddOnStatus.PENDING_PAYMENT) {
          // Safe idempotency: Reuse existing pending add-on
          addOnId = existingAddon.id;
        } else {
          // CANCELLED add-on: can re-create or reactivate
          const created = await this.addonsService.createSubscriptionAddOn(
            subscription.id,
            {
              featureId,
              customPrice: item.customPrice,
              customReason: item.customReason,
            },
            performedBy,
          );
          addOnId = created.id;
        }
      } else {
        // Create new SubscriptionAddOn in PENDING_PAYMENT
        const created = await this.addonsService.createSubscriptionAddOn(
          subscription.id,
          {
            featureId,
            customPrice: item.customPrice,
            customReason: item.customReason,
          },
          performedBy,
        );
        addOnId = created.id;
      }

      // Create / reuse PaymentOrder + Invoice + PaymentLink via single-salon service
      const paymentOrderRes = await this.addonsService.createOrGetAddonPaymentOrder(
        subscription.id,
        addOnId,
        performedBy,
      );

      // Record successful BulkAddonOperationItem
      await this.prisma.bulkAddonOperationItem.create({
        data: {
          operationId,
          tenantId,
          subscriptionId: subscription.id,
          addonId: addOnId,
          invoiceId: paymentOrderRes.invoice?.id,
          paymentOrderId: paymentOrderRes.orderId,
          result: 'SUCCESS',
          amount: paymentOrderRes.amount,
          currency: paymentOrderRes.currency,
        },
      });

      return {
        subscriptionId: subscription.id,
        tenantId,
        salonName,
        success: true,
        skipped: false,
        addonId: addOnId,
        invoiceNumber: paymentOrderRes.invoice?.invoiceNumber,
        amount: paymentOrderRes.amount,
        currency: paymentOrderRes.currency,
        paymentUrl: paymentOrderRes.paymentUrl,
        isReused: paymentOrderRes.isReused,
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to process bulk add-on for subscription ${item.subscriptionId}: ${err.message}`,
        err.stack,
      );

      await this.prisma.bulkAddonOperationItem.create({
        data: {
          operationId,
          tenantId: '00000000-0000-0000-0000-000000000000',
          subscriptionId: item.subscriptionId,
          result: 'FAILED',
          reason: err.message,
        },
      });

      return {
        subscriptionId: item.subscriptionId,
        tenantId: '',
        salonName: 'Unknown',
        success: false,
        skipped: false,
        reason: err.message || 'Payment order creation failed.',
      };
    }
  }
}
