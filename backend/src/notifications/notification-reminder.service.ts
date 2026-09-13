import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DeliverNotificationPayload } from './interfaces/notification-job.interface';
import {
  addDays,
  endOfDay,
  formatDisplayDate,
  startOfDay,
} from './utils/date-window.util';

@Injectable()
export class NotificationReminderService {
  private readonly logger = new Logger(NotificationReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async collectReminders(asOf = new Date()): Promise<DeliverNotificationPayload[]> {
    const payloads: DeliverNotificationPayload[] = [];

    payloads.push(...(await this.collectTrialReminders(asOf, 7, 'TRIAL_EXPIRY_7D')));
    payloads.push(...(await this.collectTrialReminders(asOf, 1, 'TRIAL_EXPIRY_1D')));
    payloads.push(
      ...(await this.collectSubscriptionExpiryReminders(asOf, 3, 'SUBSCRIPTION_EXPIRY_3D')),
    );
    payloads.push(
      ...(await this.collectSubscriptionExpiryReminders(asOf, 1, 'SUBSCRIPTION_EXPIRY_1D')),
    );
    payloads.push(...(await this.collectRenewalReminders(asOf, 7, 'RENEWAL_REMINDER_7D')));

    this.logger.log(`Reminder scan collected ${payloads.length} notification(s)`);
    return payloads;
  }

  private getActionUrl(path = '/salon/settings'): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    return `${frontendUrl.replace(/\/$/, '')}${path}`;
  }

  private async collectTrialReminders(
    asOf: Date,
    daysBefore: number,
    templateCode: string,
  ): Promise<DeliverNotificationPayload[]> {
    const target = addDays(asOf, daysBefore);
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEnd: { gte: startOfDay(target), lte: endOfDay(target) },
      },
      include: { tenant: true, plan: true },
    });

    return subscriptions.flatMap((sub) => {
      const expiryDate = sub.trialEnd ?? sub.endDate;
      if (!expiryDate) return [];

      return [
        {
          idempotencyKey: `trial-expiry:${sub.id}:${daysBefore}d`,
          tenantId: sub.tenantId,
          templateCode,
          type: NotificationType.TRIAL_EXPIRY_REMINDER,
          recipient: {
            email: sub.tenant.email,
            phone: sub.tenant.phone,
            customerName: sub.tenant.name,
          },
          context: {
            salonName: sub.tenant.name,
            customerName: sub.tenant.name,
            planName: sub.plan.name,
            expiryDate: formatDisplayDate(expiryDate),
            actionUrl: this.getActionUrl(),
          },
          metadata: { subscriptionId: sub.id, daysBefore },
        },
      ];
    });
  }

  private async collectSubscriptionExpiryReminders(
    asOf: Date,
    daysBefore: number,
    templateCode: string,
  ): Promise<DeliverNotificationPayload[]> {
    const target = addDays(asOf, daysBefore);
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: true,
        endDate: { gte: startOfDay(target), lte: endOfDay(target) },
      },
      include: { tenant: true, plan: true },
    });

    return subscriptions.flatMap((sub) => {
      if (!sub.endDate) return [];

      return [
        {
          idempotencyKey: `subscription-expiry:${sub.id}:${daysBefore}d`,
          tenantId: sub.tenantId,
          templateCode,
          type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
          recipient: {
            email: sub.tenant.email,
            phone: sub.tenant.phone,
            customerName: sub.tenant.name,
          },
          context: {
            salonName: sub.tenant.name,
            customerName: sub.tenant.name,
            planName: sub.plan.name,
            expiryDate: formatDisplayDate(sub.endDate!),
            actionUrl: this.getActionUrl(),
          },
          metadata: { subscriptionId: sub.id, daysBefore },
        },
      ];
    });
  }

  private async collectRenewalReminders(
    asOf: Date,
    daysBefore: number,
    templateCode: string,
  ): Promise<DeliverNotificationPayload[]> {
    const target = addDays(asOf, daysBefore);
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        OR: [
          { nextBillingDate: { gte: startOfDay(target), lte: endOfDay(target) } },
          {
            nextBillingDate: null,
            endDate: { gte: startOfDay(target), lte: endOfDay(target) },
          },
        ],
      },
      include: { tenant: true, plan: true },
    });

    return subscriptions.flatMap((sub) => {
      const renewalDate = sub.nextBillingDate ?? sub.endDate;
      if (!renewalDate) return [];

      return [
        {
          idempotencyKey: `renewal-reminder:${sub.id}:${daysBefore}d`,
          tenantId: sub.tenantId,
          templateCode,
          type: NotificationType.RENEWAL_REMINDER,
          recipient: {
            email: sub.tenant.email,
            phone: sub.tenant.phone,
            customerName: sub.tenant.name,
          },
          context: {
            salonName: sub.tenant.name,
            customerName: sub.tenant.name,
            planName: sub.plan.name,
            renewalDate: formatDisplayDate(renewalDate),
            amount: Number(sub.price).toFixed(2),
            currency: sub.currency,
            actionUrl: this.getActionUrl(),
          },
          metadata: { subscriptionId: sub.id, daysBefore },
        },
      ];
    });
  }
}
