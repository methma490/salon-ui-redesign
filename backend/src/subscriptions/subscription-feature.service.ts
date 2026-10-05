import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { FeatureStatus, Subscription, SubscriptionAddOnStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantFeatureService } from '../tenant/services/tenant-feature.service';
import { expandFeatureCodes, featureCodesEquivalent } from './feature-alias.util';
import { isPastDate } from './utils/subscription-billing.util';

export type FeatureEntitlementSource = 'PLAN' | 'ADD_ON' | 'MANUAL' | 'TRIAL';

export interface DetailedFeatureEntitlement {
  featureId?: string;
  featureCode: string;
  featureName?: string;
  source: FeatureEntitlementSource;
  status: 'ACTIVE' | 'PENDING_PAYMENT' | 'CANCEL_AT_PERIOD_END' | 'CANCELLED';
  recurringAmount?: number;
  currency?: string;
  cancellationEffectiveAt?: Date | null;
}

type SubscriptionWithFeatures = Subscription & {
  subscriptionFeatures: Array<{
    enabled: boolean;
    feature: { id?: string; code: string; name?: string; status: FeatureStatus };
  }>;
  addOns?: Array<{
    id: string;
    featureId: string;
    status: SubscriptionAddOnStatus;
    recurringAmount: any;
    currency: string;
    cancellationEffectiveAt?: Date | null;
    cancelAtPeriodEnd?: boolean;
    feature: { id?: string; code: string; name?: string; status: FeatureStatus };
  }>;
};

@Injectable()
export class SubscriptionFeatureService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TenantFeatureService))
    private readonly tenantFeatureService: TenantFeatureService,
  ) {}

  async hasFeature(tenantId: string, featureCode: string): Promise<boolean> {
    const subscription = await this.getEntitlementSubscriptionRecord(tenantId);

    if (subscription) {
      if (!this.isSubscriptionEntitled(subscription)) {
        return false;
      }

      const baseCodes = (subscription.subscriptionFeatures ?? [])
        .filter((sf) => sf.enabled && sf.feature.status === FeatureStatus.ACTIVE)
        .map((sf) => sf.feature.code);

      const addonCodes = (subscription.addOns ?? [])
        .filter((a) => this.isAddonEntitled(a, subscription))
        .map((a) => a.feature.code);

      const grantedCodes = [...baseCodes, ...addonCodes];

      if (grantedCodes.some((granted) => featureCodesEquivalent(featureCode, granted))) {
        return true;
      }

      const direct = await this.tenantFeatureService.tenantHasFeature(tenantId, featureCode);
      return Boolean(direct);
    }

    const direct = await this.tenantFeatureService.tenantHasFeature(tenantId, featureCode);
    return Boolean(direct);
  }

  async getTenantFeatureCodes(tenantId: string): Promise<string[]> {
    const subscription = await this.getEntitlementSubscriptionRecord(tenantId);

    if (subscription) {
      if (!this.isSubscriptionEntitled(subscription)) {
        return [];
      }

      const baseCodes = (subscription.subscriptionFeatures ?? [])
        .filter((sf) => sf.enabled && sf.feature.status === FeatureStatus.ACTIVE)
        .map((sf) => sf.feature.code);

      const addonCodes = (subscription.addOns ?? [])
        .filter((a) => this.isAddonEntitled(a, subscription))
        .map((a) => a.feature.code);

      const legacy = await this.tenantFeatureService.getTenantFeatures(tenantId);
      const legacyCodes = legacy.filter((f) => f.enabled).map((f) => f.code);

      const codes = [...baseCodes, ...addonCodes, ...legacyCodes];

      return expandFeatureCodes(codes);
    }

    const legacy = await this.tenantFeatureService.getTenantFeatures(tenantId);
    return expandFeatureCodes(legacy.filter((f) => f.enabled).map((f) => f.code));
  }

  async canTenantWrite(tenantId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      const legacy = await this.tenantFeatureService.getTenantFeatures(tenantId);
      return legacy.some((f) => f.enabled);
    }

    return this.isSubscriptionWritable(subscription);
  }

  isSubscriptionWritable(subscription: Subscription): boolean {
    if (
      subscription.status === SubscriptionStatus.SUSPENDED ||
      subscription.status === SubscriptionStatus.EXPIRED ||
      subscription.status === SubscriptionStatus.CANCELLED
    ) {
      return false;
    }

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIAL
    ) {
      return false;
    }

    const periodEnd = subscription.endDate ?? subscription.trialEnd;
    if (isPastDate(periodEnd)) {
      return false;
    }

    return true;
  }

  isSubscriptionEntitled(subscription: Subscription): boolean {
    const entitledStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.SUSPENDED,
      SubscriptionStatus.PAST_DUE,
    ];
    return entitledStatuses.includes(subscription.status);
  }

  isAddonEntitled(
    addon: {
      status: SubscriptionAddOnStatus | string;
      cancellationEffectiveAt?: Date | null;
      feature?: { status?: FeatureStatus };
    },
    subscription: Subscription,
  ): boolean {
    if (addon.feature?.status && addon.feature.status !== FeatureStatus.ACTIVE) {
      return false;
    }
    if (addon.status === SubscriptionAddOnStatus.ACTIVE) {
      return true;
    }
    if (addon.status === SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END) {
      const cutoff = addon.cancellationEffectiveAt ?? subscription.endDate;
      if (cutoff && !isPastDate(cutoff)) {
        return true;
      }
    }
    return false;
  }

  getEntitlementSubscriptionRecord(
    tenantId: string,
  ): Promise<SubscriptionWithFeatures | null> {
    return this.prisma.subscription.findFirst({
      where: {
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptionFeatures: {
          where: { enabled: true },
          include: { feature: { select: { id: true, code: true, name: true, status: true } } },
        },
        addOns: {
          include: { feature: { select: { id: true, code: true, name: true, status: true } } },
        },
      },
    });
  }

  async getDetailedEntitlements(
    tenantId: string,
  ): Promise<DetailedFeatureEntitlement[]> {
    const subscription = await this.getEntitlementSubscriptionRecord(tenantId);
    const entitlements: DetailedFeatureEntitlement[] = [];
    const seenFeatureCodes = new Set<string>();

    if (subscription && this.isSubscriptionEntitled(subscription)) {
      const planSource: FeatureEntitlementSource =
        subscription.status === SubscriptionStatus.TRIAL ? 'TRIAL' : 'PLAN';

      for (const sf of subscription.subscriptionFeatures ?? []) {
        if (sf.enabled && sf.feature.status === FeatureStatus.ACTIVE) {
          entitlements.push({
            featureId: sf.feature.id,
            featureCode: sf.feature.code,
            featureName: sf.feature.name,
            source: planSource,
            status: 'ACTIVE',
          });
          seenFeatureCodes.add(sf.feature.code);
        }
      }

      for (const addon of subscription.addOns ?? []) {
        // If already provided by base plan, base plan takes precedence
        if (seenFeatureCodes.has(addon.feature.code)) {
          continue;
        }

        const isEntitled = this.isAddonEntitled(addon, subscription);
        entitlements.push({
          featureId: addon.feature.id,
          featureCode: addon.feature.code,
          featureName: addon.feature.name,
          source: 'ADD_ON',
          status: isEntitled
            ? 'ACTIVE'
            : (addon.status as any),
          recurringAmount: Number(addon.recurringAmount),
          currency: addon.currency,
          cancellationEffectiveAt: addon.cancellationEffectiveAt ?? null,
        });
        seenFeatureCodes.add(addon.feature.code);
      }
    }

    try {
      const legacy = await this.tenantFeatureService.getTenantFeatures(tenantId);
      for (const tf of legacy) {
        if (tf.enabled && !seenFeatureCodes.has(tf.code)) {
          entitlements.push({
            featureId: (tf as any).id,
            featureCode: tf.code,
            featureName: tf.name,
            source: 'MANUAL',
            status: 'ACTIVE',
          });
          seenFeatureCodes.add(tf.code);
        }
      }
    } catch {
      // ignore
    }

    return entitlements;
  }

  /** @deprecated Use getEntitlementSubscriptionRecord */
  async getActiveSubscriptionRecord(tenantId: string): Promise<SubscriptionWithFeatures | null> {
    return this.getEntitlementSubscriptionRecord(tenantId);
  }

  isSubscriptionValid(subscription: Subscription): boolean {
    return this.isSubscriptionWritable(subscription);
  }
}

