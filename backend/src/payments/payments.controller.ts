import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayProvider } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { TenantContext } from '../tenant/interfaces/tenant-context.interface';
import { CreateSubscriptionCheckoutDto } from './dto/create-payment-order.dto';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { PaymentOrdersService } from './payment-orders.service';
import { PaymentProcessorService } from './payment-processor.service';

import { PrismaService } from '../database/prisma.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentProcessor: PaymentProcessorService,
    private readonly paymentOrders: PaymentOrdersService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('gateways')
  listGateways() {
    return this.gatewayRegistry.listProviders();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  listHistory(@CurrentTenant() tenant: TenantContext, @Query() query: PaymentListQueryDto) {
    return this.paymentOrders.listForAdmin({
      ...query,
      tenantId: tenant.tenantId,
    });
  }

  /** Unified webhook entry — never used for subscription activation without verification. */
  @Post('webhooks/:gateway')
  @HttpCode(200)
  @SkipThrottle()
  async handleWebhook(
    @Param('gateway') gatewayParam: string,
    @Body() body: Record<string, unknown>,
  ) {
    const gateway = gatewayParam.toUpperCase() as PaymentGatewayProvider;

    if (!Object.values(PaymentGatewayProvider).includes(gateway)) {
      return { success: false, message: 'Unsupported gateway' };
    }

    return this.paymentProcessor.processWebhook(gateway, body);
  }

  @Post('orders/:reference/confirm-return')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  async confirmReturn(
    @CurrentTenant() tenant: TenantContext,
    @Param('reference') reference: string,
  ) {
    return this.paymentProcessor.confirmReturnOrder(reference, tenant.tenantId);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @Roles('SALON_ADMIN')
  async createSubscriptionCheckout(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateSubscriptionCheckoutDto,
  ) {
    if (dto.purpose === 'SUBSCRIPTION_UPGRADE' && !dto.planId) {
      throw new BadRequestException('planId is required for subscription upgrade checkout');
    }

    const order = await this.paymentOrders.createOrder({
      tenantId: tenant.tenantId,
      subscriptionId: dto.subscriptionId,
      gateway: dto.gateway,
      purpose: dto.purpose,
      metadata:
        dto.purpose === 'SUBSCRIPTION_UPGRADE'
          ? {
              planId: dto.planId,
              planPriceId: dto.planPriceId,
            }
          : undefined,
    });

    // Fetch actual tenant contact info for payment gateway
    const tenantRecord = await this.prisma.tenant.findUnique({
      where: { id: tenant.tenantId },
      select: { name: true, email: true, phone: true },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const [firstName, ...lastParts] = (tenantRecord?.name ?? tenant.tenantName ?? 'Salon').split(
      ' ',
    );
    const lastName = lastParts.join(' ') || 'Admin';

    const session = await this.paymentOrders.buildCheckoutSession(
      order.reference,
      {
        orderReference: order.reference,
        amount: Number(order.amount),
        currency: order.currency,
        description: 'Salon subscription payment',
        customer: {
          firstName,
          lastName,
          email: tenantRecord?.email ?? tenant.userEmail ?? 'billing@salon.local',
          phone: tenantRecord?.phone ?? '0770000000',
          address: 'Colombo',
          city: 'Colombo',
        },
        returnUrl: `${frontendUrl}/salon/subscription?payment=success&orderRef=${order.reference}`,
        cancelUrl: `${frontendUrl}/salon/subscription?payment=cancel&orderRef=${order.reference}`,
      },
      dto.gateway,
    );

    return {
      orderReference: order.reference,
      paymentOrderId: order.id,
      gateway: order.gateway,
      checkout: session.redirectData,
    };
  }
}
