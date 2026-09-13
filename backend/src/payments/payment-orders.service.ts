import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  PaymentOrderStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import {
  buildPaginatedResponse,
  resolvePagination,
} from '../common/dto/pagination.dto';
import { PaymentListFilter, PaymentListQueryDto } from './dto/payment-list-query.dto';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PaymentPurpose } from './dto/create-payment-order.dto';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { CheckoutCustomerInfo, CreateCheckoutInput } from './interfaces/payment-gateway.interface';

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
      include: { plan: { select: { name: true } } },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found for tenant');
    }

    if (
      subscription.status !== SubscriptionStatus.PENDING &&
      subscription.status !== SubscriptionStatus.TRIAL &&
      subscription.status !== SubscriptionStatus.ACTIVE
    ) {
      throw new BadRequestException('Subscription is not eligible for payment');
    }

    const reference = input.reference ?? `PO-${randomUUID()}`;

    const existing = await this.prisma.paymentOrder.findUnique({
      where: { reference },
    });

    if (existing) {
      throw new BadRequestException('Payment order reference already exists');
    }

    return this.prisma.paymentOrder.create({
      data: {
        tenantId: input.tenantId,
        subscriptionId: input.subscriptionId,
        amount: subscription.price,
        currency: subscription.currency,
        gateway: input.gateway,
        reference,
        purpose: input.purpose,
        metadata: input.metadata,
        status: PaymentOrderStatus.PENDING,
      },
    });
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
    const apiBase =
      this.configService.get<string>('API_PUBLIC_URL') ?? 'http://localhost:3000/api';
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
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((order) => ({
        id: order.id,
        reference: order.reference,
        tenantId: order.tenantId,
        tenant: order.tenant,
        subscriptionId: order.subscriptionId,
        plan: order.subscription.plan,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        gateway: order.gateway,
        purpose: order.purpose,
        payment: order.payments[0] ?? null,
        createdAt: order.createdAt,
      })),
      total,
      page,
      limit,
    );
  }
}
