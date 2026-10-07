import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentOrderStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { PayHereService } from './payhere.service';

@Controller('public/add-on-payments')
export class PublicAddonPaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly payHereService: PayHereService,
  ) {}

  @Get(':token')
  async getPaymentSummary(@Param('token') token: string) {
    const order = await this.resolveOrderByToken(token);
    const now = new Date();

    let status = 'UNPAID';
    if (order.status === PaymentOrderStatus.PAID || order.tokenUsedAt) {
      status = 'PAID';
    } else if (order.tokenExpiresAt && order.tokenExpiresAt.getTime() <= now.getTime()) {
      status = 'EXPIRED';
    } else if (order.status === PaymentOrderStatus.CANCELLED) {
      status = 'CANCELLED';
    } else if (order.status === PaymentOrderStatus.FAILED) {
      status = 'FAILED';
    }

    const metadata = (order.metadata ?? {}) as Record<string, any>;
    const invoice = order.invoices[0] ?? null;

    return {
      status,
      salonName: order.tenant.name,
      featureName: order.subscriptionAddOn?.feature.name ?? metadata.featureName ?? 'Feature Add-on',
      featureCode: order.subscriptionAddOn?.feature.code ?? metadata.featureCode ?? 'ADDON',
      invoiceNumber: invoice?.invoiceNumber ?? null,
      amount: Number(order.amount),
      currency: order.currency,
      billingCycle: order.subscriptionAddOn?.billingCycle ?? metadata.billingCycle ?? 'MONTHLY',
      periodStart: metadata.periodStart ?? null,
      periodEnd: metadata.periodEnd ?? null,
      expiresAt: order.tokenExpiresAt,
      paidAt: invoice?.paidAt ?? order.tokenUsedAt ?? null,
    };
  }

  @Post(':token/payhere-checkout')
  async initiatePayHereCheckout(@Param('token') token: string) {
    const order = await this.resolveOrderByToken(token);
    const now = new Date();

    if (order.status === PaymentOrderStatus.PAID || order.tokenUsedAt) {
      throw new BadRequestException('This add-on payment order has already been paid.');
    }

    if (order.tokenExpiresAt && order.tokenExpiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException('This payment link has expired. Please contact your salon administrator.');
    }

    if (order.status === PaymentOrderStatus.CANCELLED || order.status === PaymentOrderStatus.FAILED) {
      throw new BadRequestException(`This payment order is no longer valid (status: ${order.status}).`);
    }

    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'
    ).replace(/\/$/, '');

    const backendUrl = (
      this.configService.get<string>('BACKEND_URL') ||
      this.configService.get<string>('APP_URL') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    const notifyUrl =
      this.configService.get<string>('payhere.notifyUrl') ||
      process.env.PAYHERE_NOTIFY_URL ||
      '';

    const returnUrl = `${frontendUrl}/pay/add-on/${token}?status=verifying`;
    const cancelUrl = `${frontendUrl}/pay/add-on/${token}?status=cancelled`;

    const metadata = (order.metadata ?? {}) as Record<string, any>;
    const featureName =
      order.subscriptionAddOn?.feature.name ?? metadata.featureName ?? 'Feature Add-on';
    const salonName = order.tenant.name;

    const [firstName, ...rest] = salonName.split(' ');
    const lastName = rest.join(' ') || 'Admin';

    const checkout = this.payHereService.buildCheckoutParams({
      orderId: order.reference,
      amount: Number(order.amount),
      currency: order.currency,
      items: `${featureName} Add-on Prorated Subscription`,
      firstName: firstName || 'Salon',
      lastName: lastName || 'Admin',
      email: order.tenant.email ?? 'billing@salon.local',
      phone: order.tenant.phone ?? '0770000000',
      address: 'Colombo',
      city: 'Colombo',
      returnUrl,
      cancelUrl,
      notifyUrl,
    });

    return { checkout };
  }

  private async resolveOrderByToken(token: string) {
    if (!token?.trim()) {
      throw new NotFoundException('Payment token is missing');
    }

    const cleanToken = token.trim();
    const tokenHash = createHash('sha256').update(cleanToken).digest('hex');

    const order = await this.prisma.paymentOrder.findFirst({
      where: {
        OR: [{ paymentToken: cleanToken }, { paymentTokenHash: tokenHash }],
      },
      include: {
        tenant: true,
        subscriptionAddOn: {
          include: {
            feature: true,
            subscription: true,
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Payment link not found or invalid.');
    }

    return order;
  }
}
