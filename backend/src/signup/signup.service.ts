import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FeatureStatus,
  PaymentGatewayProvider,
  PaymentOrderStatus,
  Prisma,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { syncTenantFeatures } from '../database/sync-tenant-features.util';
import { TenantProvisioningService } from '../database/tenant-provisioning.service';
import { PaymentPurpose } from '../payments/dto/create-payment-order.dto';
import { PaymentGatewayRegistry } from '../payments/payment-gateway.registry';
import { PaymentOrdersService } from '../payments/payment-orders.service';
import { PaymentProcessorService } from '../payments/payment-processor.service';
import { PayHereNotifyPayload, PayHereService } from '../payments/payhere.service';
import { PlansService } from '../plans/plans.service';
import { isPlanActive } from '../plans/utils/plan-pricing.util';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { tenantTable } from '../tenant/utils/schema-name.util';
import { PublicSignupDto } from './dto/public-signup.dto';
import { PublicTrialSignupDto } from './dto/public-trial-signup.dto';

const TENANT_CODE_PREFIX = 'SAL';
const MAX_CODE_GENERATION_ATTEMPTS = 5;

@Injectable()
export class SignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: TenantProvisioningService,
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly payHereService: PayHereService,
    private readonly paymentProcessor: PaymentProcessorService,
    private readonly paymentOrdersService: PaymentOrdersService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly configService: ConfigService,
  ) {}

  async createTrialSignup(dto: PublicTrialSignupDto) {
    const plan = await this.plansService.findById(dto.planId);

    if (!isPlanActive(plan) || plan.code === 'CUSTOM') {
      throw new BadRequestException('Selected plan is not available for trial');
    }

    const adminEmail = dto.admin.email.toLowerCase();
    await this.releaseAbandonedSignups(adminEmail);
    await this.ensureAdminEmailAvailable(adminEmail);

    let tenantId: string | null = null;
    let createdTenant: Awaited<ReturnType<typeof this.createTenantRecord>> | null = null;

    try {
      // Step 1: Create tenant record in a short transaction (no provisioning inside)
      createdTenant = await this.prisma.$transaction(
        async (tx) => {
          const t = await this.createTenantRecord(tx, dto, adminEmail);
          tenantId = t.id;
          return t;
        },
        { timeout: 10000, maxWait: 5000 },
      );

      // Step 2: Provision tenant schema OUTSIDE any transaction (long-running ~10-15s)
      const provisioningResult = await this.provisioning.provisionTenantSchema({
        tenantCode: createdTenant.code,
        schemaName: createdTenant.schemaName,
        mainBranchName: 'Main Branch',
        adminUser: {
          name: dto.admin.name,
          email: adminEmail,
          phone: dto.admin.phone,
          password: dto.admin.password,
        },
      });

      if (!provisioningResult.success) {
        throw new InternalServerErrorException(
          `Salon provisioning failed: ${provisioningResult.error}`,
        );
      }

      // Step 3: Activate tenant in a short transaction
      await this.prisma.tenant.update({
        where: { id: createdTenant.id },
        data: { status: TenantStatus.ACTIVE },
      });

      const subscription = await this.subscriptionsService.createTrialSubscription(createdTenant.id, {
        planId: dto.planId,
        planPriceId: dto.planPriceId,
        billingCycle: dto.billingCycle,
      });

      return {
        tenantId: createdTenant.id,
        subscriptionId: subscription.id,
        plan: {
          id: plan.id,
          code: plan.code,
          name: plan.name,
        },
        subscription: {
          status: subscription.status,
          trialStart: subscription.trialStart,
          trialEnd: subscription.trialEnd,
          endDate: subscription.endDate,
        },
        adminEmail,
        canLogin: true,
        loginUrl: '/salon/login',
      };
    } catch (error) {
      if (tenantId) {
        await this.prisma.tenant
          .update({
            where: { id: tenantId },
            data: { status: TenantStatus.PROVISION_FAILED },
          })
          .catch(() => undefined);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Trial signup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async createSignupCheckout(dto: PublicSignupDto) {
    if (!this.gatewayRegistry.get(PaymentGatewayProvider.PAYHERE).isConfigured()) {
      throw new BadRequestException(
        'PayHere is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.',
      );
    }

    const plan = await this.plansService.findById(dto.planId);

    if (!isPlanActive(plan)) {
      throw new BadRequestException('Selected plan is not available');
    }

    if (plan.code === 'CUSTOM') {
      throw new BadRequestException('Custom plans require platform admin setup');
    }

    const planPrice = this.plansService.getDefaultPlanPrice(plan);
    const price = Number(planPrice.price);
    if (price <= 0) {
      throw new BadRequestException('This plan requires custom pricing');
    }

    const adminEmail = dto.admin.email.toLowerCase();
    await this.releaseAbandonedSignups(adminEmail);
    await this.ensureAdminEmailAvailable(adminEmail);

    const orderId = `SIGNUP-${randomUUID()}`;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const apiBase = this.configService.get<string>('API_PUBLIC_URL') ?? 'http://localhost:3000/api';

    const [firstName, ...lastParts] = dto.admin.name.trim().split(/\s+/);
    const lastName = lastParts.join(' ') || firstName;

    let tenantId: string | null = null;
    let provisionedTenant: Awaited<ReturnType<typeof this.createTenantRecord>> | null = null;

    try {
      // Step 1: Create tenant record in a short transaction (no provisioning inside)
      provisionedTenant = await this.prisma.$transaction(
        async (tx) => {
          const tenant = await this.createTenantRecord(tx, dto, adminEmail);
          tenantId = tenant.id;
          return tenant;
        },
        { timeout: 10000, maxWait: 5000 },
      );

      // Step 2: Provision tenant schema OUTSIDE any transaction (long-running ~10-15s)
      const provisioningResult = await this.provisioning.provisionTenantSchema({
        tenantCode: provisionedTenant.code,
        schemaName: provisionedTenant.schemaName,
        mainBranchName: 'Main Branch',
        adminUser: {
          name: dto.admin.name,
          email: adminEmail,
          phone: dto.admin.phone,
          password: dto.admin.password,
        },
      });

      if (!provisioningResult.success) {
        throw new InternalServerErrorException(
          `Salon provisioning failed: ${provisioningResult.error}`,
        );
      }

      // Step 3: Create subscription, payment order, and update tenant status in a short transaction
      const result = await this.prisma.$transaction(
        async (tx) => {
          const subscription = await tx.subscription.create({
            data: {
              tenantId: provisionedTenant!.id,
              planId: plan.id,
              planPriceId: planPrice.id,
              status: SubscriptionStatus.PENDING,
              billingCycle: planPrice.billingCycle,
              price: planPrice.price,
              currency: planPrice.currency,
            },
          });

          await tx.paymentOrder.create({
            data: {
              tenantId: provisionedTenant!.id,
              subscriptionId: subscription.id,
              amount: planPrice.price,
              currency: planPrice.currency,
              gateway: PaymentGatewayProvider.PAYHERE,
              reference: orderId,
              purpose: PaymentPurpose.SIGNUP,
              status: PaymentOrderStatus.PENDING,
              metadata: {
                customerName: dto.admin.name,
                customerEmail: adminEmail,
                customerPhone: dto.admin.phone ?? dto.salon.phone ?? null,
                salonName: dto.salon.name,
                adminEmail,
                planId: plan.id,
              },
            },
          });

          await tx.tenant.update({
            where: { id: provisionedTenant!.id },
            data: { status: TenantStatus.SUSPENDED },
          });

          return { tenant: provisionedTenant!, subscription };
        },
        { timeout: 15000, maxWait: 5000 },
      );

      const signupNotifyUrl =
        this.configService.get<string>('payhere.notifyUrl') ||
        process.env.PAYHERE_NOTIFY_URL ||
        '';

      const checkoutSession = await this.paymentOrdersService.buildCheckoutSession(
        orderId,
        {
          orderReference: orderId,
          amount: price,
          currency: planPrice.currency,
          description: `${plan.name} Subscription`,
          customer: {
            firstName,
            lastName,
            email: adminEmail,
            phone: dto.admin.phone ?? dto.salon.phone ?? '0770000000',
            address: dto.salon.address ?? 'Colombo',
            city: dto.salon.city ?? 'Colombo',
          },
          returnUrl: `${frontendUrl}/signup/success?orderId=${encodeURIComponent(orderId)}`,
          cancelUrl: `${frontendUrl}/signup/cancel?orderId=${encodeURIComponent(orderId)}`,
          notifyUrl: signupNotifyUrl,
        },
        PaymentGatewayProvider.PAYHERE,
      );

      const checkout = checkoutSession.redirectData;

      return {
        orderId,
        tenantId: result.tenant.id,
        subscriptionId: result.subscription.id,
        plan: {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          price,
          currency: planPrice.currency,
        },
        adminEmail,
        checkout,
      };
    } catch (error) {
      if (tenantId) {
        await this.prisma.tenant
          .update({
            where: { id: tenantId },
            data: { status: TenantStatus.PROVISION_FAILED },
          })
          .catch(() => undefined);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Signup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async handlePayHereNotify(payload: PayHereNotifyPayload) {
    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { reference: payload.order_id },
    });

    if (paymentOrder) {
      const result = await this.paymentProcessor.processWebhook(
        PaymentGatewayProvider.PAYHERE,
        payload,
      );

      if (paymentOrder.purpose === PaymentPurpose.SIGNUP) {
        if (result.status === 'paid' || result.alreadyProcessed) {
          return this.finalizePaidSignup(payload.order_id, payload.payment_id ?? payload.order_id);
        }

        if (result.status === 'failed') {
          await this.markSignupFailed(payload.order_id);
          return { success: false, status: 'failed' };
        }
      }

      return result;
    }

    throw new NotFoundException('Payment order not found');
  }

  async cancelPendingSignup(orderId: string) {
    const order = await this.findSignupPaymentOrder(orderId);

    if (!order) {
      throw new NotFoundException('Signup order not found');
    }

    if (order.status === PaymentOrderStatus.PAID) {
      return { success: true, alreadyPaid: true };
    }

    if (order.status !== PaymentOrderStatus.PENDING) {
      return { success: true, alreadyCancelled: true };
    }

    await this.cleanupAbandonedSignup(order.tenantId, order.tenant.schemaName);
    return { success: true };
  }

  async confirmReturn(orderId: string) {
    return this.getOrderStatus(orderId);
  }

  async getOrderStatus(orderId: string) {
    const order = await this.findSignupPaymentOrder(orderId);

    if (!order) {
      throw new NotFoundException('Signup order not found');
    }

    const metadata = this.parseSignupMetadata(order);
    const plan = await this.prisma.plan.findUnique({
      where: { id: order.subscription.planId },
      select: { code: true, name: true },
    });

    const paymentComplete = order.status === PaymentOrderStatus.PAID;
    const salonActive = order.tenant.status === TenantStatus.ACTIVE;
    const awaitingActivation = paymentComplete && !salonActive;

    return {
      orderId: order.reference,
      status: order.status,
      salonName: metadata.salonName,
      adminEmail: metadata.adminEmail,
      plan,
      subscription: order.subscription,
      tenantStatus: order.tenant.status,
      awaitingActivation,
      canLogin: paymentComplete && salonActive,
      loginUrl: '/salon/login',
    };
  }

  private async finalizePaidSignup(orderId: string, payherePaymentId: string) {
    const order = await this.findSignupPaymentOrder(orderId);

    if (!order) {
      throw new NotFoundException('Signup order not found');
    }

    if (order.status === PaymentOrderStatus.PAID && order.tenant.status === TenantStatus.ACTIVE) {
      return { success: true, alreadyProcessed: true, orderId };
    }

    const metadata = this.parseSignupMetadata(order);
    const startDate = new Date();

    await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: order.subscriptionId },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status === SubscriptionStatus.PENDING) {
        const endDate = this.calculateEndDate(startDate, subscription.billingCycle);

        const planFeatures = await tx.planFeature.findMany({
          where: {
            planId: subscription.planId,
            enabled: true,
            feature: { status: FeatureStatus.ACTIVE },
          },
          select: { featureId: true },
        });

        if (planFeatures.length > 0) {
          await tx.subscriptionFeature.createMany({
            data: planFeatures.map((pf) => ({
              subscriptionId: order.subscriptionId,
              featureId: pf.featureId,
              enabled: true,
            })),
            skipDuplicates: true,
          });

          await syncTenantFeatures(
            tx,
            order.tenantId,
            planFeatures.map((pf) => pf.featureId),
          );
        }

        await tx.subscription.update({
          where: { id: order.subscriptionId },
          data: {
            status: SubscriptionStatus.ACTIVE,
            startDate,
            endDate,
            nextBillingDate: endDate,
          },
        });
      }

      await tx.tenant.update({
        where: { id: order.tenantId },
        data: { status: TenantStatus.ACTIVE },
      });

      if (order.status !== PaymentOrderStatus.PAID) {
        await tx.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: PaymentOrderStatus.PAID,
            metadata: {
              ...(order.metadata as Record<string, unknown>),
              payherePaymentId,
            },
          },
        });
      }
    });

    return {
      success: true,
      orderId,
      adminEmail: metadata.adminEmail,
      awaitingActivation: false,
    };
  }

  private async markSignupFailed(orderId: string) {
    const order = await this.findSignupPaymentOrder(orderId);
    if (!order || order.status === PaymentOrderStatus.PAID) {
      return;
    }

    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: PaymentOrderStatus.FAILED },
    });
  }

  private async releaseAbandonedSignups(adminEmail: string) {
    const pendingOrders = await this.prisma.paymentOrder.findMany({
      where: {
        purpose: PaymentPurpose.SIGNUP,
        status: PaymentOrderStatus.PENDING,
        metadata: {
          path: ['customerEmail'],
          equals: adminEmail,
        },
      },
      include: {
        tenant: { select: { id: true, schemaName: true, status: true } },
      },
    });

    for (const order of pendingOrders) {
      if (order.tenant.status === TenantStatus.ACTIVE) {
        continue;
      }
      await this.cleanupAbandonedSignup(order.tenantId, order.tenant.schemaName);
    }
  }

  private async findSignupPaymentOrder(orderReference: string) {
    return this.prisma.paymentOrder.findUnique({
      where: { reference: orderReference },
      include: {
        subscription: {
          select: {
            id: true,
            planId: true,
            status: true,
            startDate: true,
            endDate: true,
            billingCycle: true,
          },
        },
        tenant: {
          select: {
            id: true,
            status: true,
            schemaName: true,
            name: true,
          },
        },
      },
    });
  }

  private parseSignupMetadata(order: {
    metadata: Prisma.JsonValue | null;
    subscription: { planId: string };
  }) {
    const metadata = (order.metadata ?? {}) as Record<string, string | null | undefined>;
    return {
      salonName: metadata.salonName ?? metadata.customerName ?? '',
      adminEmail: metadata.adminEmail ?? metadata.customerEmail ?? '',
      planId: metadata.planId ?? order.subscription.planId,
    };
  }

  private async cleanupAbandonedSignup(tenantId: string, schemaName: string) {
    try {
      await this.provisioning.cleanupTenantSchema(schemaName);
    } catch {
      // Schema may already be missing; still remove tenant record
    }

    await this.prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
  }

  private async ensureAdminEmailAvailable(email: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: {
          in: [TenantStatus.ACTIVE, TenantStatus.SUSPENDED, TenantStatus.PROVISIONING],
        },
      },
      select: { schemaName: true },
    });

    for (const tenant of tenants) {
      try {
        const usersTable = tenantTable(tenant.schemaName, 'users');
        const existing = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM ${usersTable} WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          email,
        );
        if (existing.length > 0) {
          throw new ConflictException('An account with this admin email already exists');
        }
      } catch (error) {
        if (error instanceof ConflictException) {
          throw error;
        }
      }
    }
  }

  private async createTenantRecord(
    tx: Prisma.TransactionClient,
    dto: PublicSignupDto,
    adminEmail: string,
  ) {
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      try {
        const tenantCode = await this.generateTenantCode(tx);
        const schemaName = await this.provisioning.generateSchemaName();

        return tx.tenant.create({
          data: {
            code: tenantCode,
            schemaName,
            name: dto.salon.name,
            email: dto.salon.email ?? adminEmail,
            phone: dto.salon.phone,
            status: TenantStatus.PROVISIONING,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < MAX_CODE_GENERATION_ATTEMPTS - 1
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException('Unable to generate a unique tenant code');
  }

  private async generateTenantCode(tx: Prisma.TransactionClient): Promise<string> {
    const latestTenant = await tx.tenant.findFirst({
      where: { code: { startsWith: TENANT_CODE_PREFIX } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let nextNumber = 1;
    if (latestTenant) {
      const match = latestTenant.code.match(/^SAL(\d+)$/);
      if (match) {
        nextNumber = Number.parseInt(match[1], 10) + 1;
      }
    }

    return `${TENANT_CODE_PREFIX}${String(nextNumber).padStart(6, '0')}`;
  }

  private calculateEndDate(startDate: Date, billingCycle: string): Date {
    const end = new Date(startDate);
    if (billingCycle === 'YEARLY') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}
