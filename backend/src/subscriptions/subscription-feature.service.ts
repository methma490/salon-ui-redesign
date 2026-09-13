import { Injectable } from '@nestjs/common';
import { FeatureStatus, Subscription, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantFeatureService } from '../tenant/services/tenant-feature.service';
import { expandFeatureCodes, featureCodesEquivalent } from './feature-alias.util';
import { isPastDate } from './utils/subscription-billing.util';

type SubscriptionWithFeatures = Subscription & {
  subscriptionFeatures: Array<{
    enabled: boolean;
    feature: { code: string; status: FeatureStatus };
  }>;
};

@Injectable()
export class SubscriptionFeatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantFeatureService: TenantFeatureService,
  ) {}

  async hasFeature(tenantId: string, featureCode: string): Promise<boolean> {
    const subscription = await this.getEntitlementSubscriptionRecord(tenantId);

    if (subscription) {
      if (!this.isSubscriptionValid(subscription)) {
        return false;
      }

      const grantedCodes = subscription.subscriptionFeatures
        .filter((sf) => sf.enabled && sf.feature.status === FeatureStatus.ACTIVE)
        .map((sf) => sf.feature.code);

      return grantedCodes.some((granted) => featureCodesEquivalent(featureCode, granted));
    }

    return this.tenantFeatureService.tenantHasFeature(tenantId, featureCode);
  }

  async getTenantFeatureCodes(tenantId: string): Promise<string[]> {
    const subscription = await this.getEntitlementSubscriptionRecord(tenantId);

    if (subscription && this.isSubscriptionValid(subscription)) {
      const codes = subscription.subscriptionFeatures
        .filter((sf) => sf.enabled && sf.feature.status === FeatureStatus.ACTIVE)
        .map((sf) => sf.feature.code);

      return expandFeatureCodes(codes);
    }

    const legacy = await this.tenantFeatureService.getTenantFeatures(tenantId);
    return expandFeatureCodes(legacy.filter((f) => f.enabled).map((f) => f.code));
  }

  async getEntitlementSubscriptionRecord(
    tenantId: string,
  ): Promise<SubscriptionWithFeatures | null> {
    return this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptionFeatures: {
          where: { enabled: true },
          include: { feature: { select: { code: true, status: true } } },
        },
      },
    });
  }

  /** @deprecated Use getEntitlementSubscriptionRecord */
  async getActiveSubscriptionRecord(tenantId: string): Promise<SubscriptionWithFeatures | null> {
    return this.getEntitlementSubscriptionRecord(tenantId);
  }

  isSubscriptionValid(subscription: Subscription): boolean {
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
}
