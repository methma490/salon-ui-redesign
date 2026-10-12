import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  Prisma,
  SubscriptionHistoryAction,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { TenantProvisioningService } from '../tenant-provisioning.service';
import { DemoSeedService } from './demo-seed.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { syncTenantFeatures } from '../sync-tenant-features.util';

export interface DemoProvisionResult {
  profile: string;
  tenantId: string;
  tenantCode: string;
  schemaName: string;
  salonName: string;
  planCode: string;
  planName: string;
  adminEmail: string;
  status: 'CREATED' | 'ALREADY_EXISTS' | 'FAILED';
  error?: string;
}

@Injectable()
export class DemoProvisionService {
  private readonly logger = new Logger(DemoProvisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly configService?: ConfigService,
    private readonly provisioning: TenantProvisioningService = new TenantProvisioningService(prisma),
    private readonly demoSeedService: DemoSeedService = new DemoSeedService(prisma),
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  /**
   * Idempotent provision command for the two dedicated Sales Demo Salon accounts.
   */
  async provisionDemoTenants(): Promise<DemoProvisionResult[]> {
    this.logger.log('--- Initializing Demo Sales Environment Provisioning ---');

    // 1. Fetch the 2 current active subscription plans in the system
    const activePlans = await this.prisma.plan.findMany({
      where: {
        status: 'ACTIVE',
        code: { not: 'CUSTOM' },
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        planFeatures: {
          where: { enabled: true },
          include: { feature: true },
        },
        planPrices: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (activePlans.length === 0) {
      throw new Error('No active subscription plans found in the database to assign to demo accounts.');
    }

    const planOne = activePlans[0];
    const planTwo = activePlans.length > 1 ? activePlans[1] : activePlans[0];

    const demoDefinitions = [
      {
        profile: 'PLAN_ONE_DEMO' as const,
        name: 'Demo Salon - Plan One',
        plan: planOne,
        email:
          this.configService?.get<string>('DEMO_PLAN_ONE_EMAIL') ||
          process.env.DEMO_PLAN_ONE_EMAIL ||
          'demo.plan1@salon.local',
        password:
          this.configService?.get<string>('DEMO_PLAN_ONE_PASSWORD') ||
          process.env.DEMO_PLAN_ONE_PASSWORD ||
          'DemoSalonPlan1!',
      },
      {
        profile: 'PLAN_TWO_DEMO' as const,
        name: 'Demo Salon - Plan Two',
        plan: planTwo,
        email:
          this.configService?.get<string>('DEMO_PLAN_TWO_EMAIL') ||
          process.env.DEMO_PLAN_TWO_EMAIL ||
          'demo.plan2@salon.local',
        password:
          this.configService?.get<string>('DEMO_PLAN_TWO_PASSWORD') ||
          process.env.DEMO_PLAN_TWO_PASSWORD ||
          'DemoSalonPlan2!',
      },
    ];

    const results: DemoProvisionResult[] = [];

    for (const def of demoDefinitions) {
      try {
        // Check if demo tenant for this profile already exists
        const existingTenant = await this.prisma.tenant.findFirst({
          where: {
            OR: [{ demoProfile: def.profile }, { email: def.email.toLowerCase() }],
          },
          include: {
            subscriptions: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: { plan: true },
            },
          },
        });

        if (existingTenant) {
          if (existingTenant.status === TenantStatus.ACTIVE) {
            this.logger.log(
              `Demo salon for profile ${def.profile} already exists: "${existingTenant.name}" (${existingTenant.schemaName}).`,
            );

            // Ensure demo flags are properly set
            if (!existingTenant.isDemo || existingTenant.demoProfile !== def.profile) {
              await this.prisma.tenant.update({
                where: { id: existingTenant.id },
                data: {
                  isDemo: true,
                  demoProfile: def.profile,
                },
              });
            }

            results.push({
              profile: def.profile,
              tenantId: existingTenant.id,
              tenantCode: existingTenant.code,
              schemaName: existingTenant.schemaName,
              salonName: existingTenant.name,
              planCode: def.plan.code,
              planName: def.plan.name,
              adminEmail: def.email,
              status: 'ALREADY_EXISTS',
            });
            continue;
          } else {
            this.logger.warn(
              `Demo salon for profile ${def.profile} was in state ${existingTenant.status}. Cleaning up previous failed attempt...`,
            );
            await this.prisma.subscriptionFeature.deleteMany({
              where: { subscription: { tenantId: existingTenant.id } },
            }).catch(() => {});
            await this.prisma.subscriptionHistory.deleteMany({
              where: { subscription: { tenantId: existingTenant.id } },
            }).catch(() => {});
            await this.prisma.subscription.deleteMany({
              where: { tenantId: existingTenant.id },
            }).catch(() => {});
            await this.prisma.tenantFeature.deleteMany({
              where: { tenantId: existingTenant.id },
            }).catch(() => {});
            await this.prisma.tenant.delete({
              where: { id: existingTenant.id },
            }).catch(() => {});
            try {
              await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${existingTenant.schemaName}" CASCADE`);
            } catch {}
          }
        }

        // 2. Generate unique tenant code & schema name
        const tenantCode = await this.generateTenantCode();
        const schemaName = await this.provisioning.generateSchemaName(def.name, tenantCode);

        this.logger.log(`Provisioning new demo tenant ${def.name} -> Code: ${tenantCode}, Schema: ${schemaName}`);

        // 3. Create Tenant in public schema with isDemo = true
        const tenant = await this.prisma.tenant.create({
          data: {
            code: tenantCode,
            schemaName,
            name: def.name,
            email: def.email.toLowerCase(),
            phone: '+94 11 268 9900',
            status: TenantStatus.PROVISIONING,
            isDemo: true,
            demoProfile: def.profile,
            lastDemoResetAt: new Date(),
          },
        });

        // 4. Provision schema with all tables, migrations, roles, permissions, and admin user
        const provisionResult = await this.provisioning.provisionTenantSchema({
          tenantCode: tenant.code,
          schemaName: tenant.schemaName,
          mainBranchName: 'Main Branch',
          adminUser: {
            name: `${def.name} Admin`,
            email: def.email.toLowerCase(),
            phone: '+94 11 268 9900',
            password: def.password,
          },
        });

        if (!provisionResult.success) {
          throw new Error(`Schema provisioning failed: ${provisionResult.error}`);
        }

        // 5. Create Dedicated Non-Expiring ACTIVE Demo Subscription
        const planPrice = def.plan.planPrices[0];
        const startDate = new Date();
        const endDate = new Date(startDate.getFullYear() + 10, startDate.getMonth(), startDate.getDate());

        const subscription = await this.prisma.$transaction(async (tx) => {
          const sub = await tx.subscription.create({
            data: {
              tenantId: tenant.id,
              planId: def.plan.id,
              planPriceId: planPrice?.id ?? null,
              status: SubscriptionStatus.ACTIVE,
              billingCycle: planPrice?.billingCycle ?? BillingCycle.MONTHLY,
              price: planPrice?.price ?? new Prisma.Decimal(0),
              currency: planPrice?.currency ?? 'LKR',
              startDate,
              endDate,
              autoRenew: true,
            },
          });

          // Snapshot plan features to subscription_features
          for (const pf of def.plan.planFeatures) {
            await tx.subscriptionFeature.create({
              data: {
                subscriptionId: sub.id,
                featureId: pf.featureId,
                enabled: true,
              },
            });
          }

          // Record history
          await tx.subscriptionHistory.create({
            data: {
              subscriptionId: sub.id,
              action: SubscriptionHistoryAction.STATUS_CHANGED,
              toPlanId: def.plan.id,
              toStatus: SubscriptionStatus.ACTIVE,
              metadata: {
                reason: 'DEMO_SALES_PROVISIONING',
                demoProfile: def.profile,
              },
            },
          });

          return sub;
        });

        // Sync tenant_features
        await syncTenantFeatures(
          this.prisma,
          tenant.id,
          def.plan.planFeatures.map((pf) => pf.featureId),
        );

        // 6. Update tenant status to ACTIVE
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: { status: TenantStatus.ACTIVE },
        });

        // 7. Seed complete deterministic demo baseline data
        await this.demoSeedService.seedBaseline(schemaName, def.profile);

        this.logger.log(`✓ Successfully provisioned demo salon: ${def.name} (${def.profile})`);

        results.push({
          profile: def.profile,
          tenantId: tenant.id,
          tenantCode: tenant.code,
          schemaName: tenant.schemaName,
          salonName: tenant.name,
          planCode: def.plan.code,
          planName: def.plan.name,
          adminEmail: def.email,
          status: 'CREATED',
        });
      } catch (err: any) {
        this.logger.error(`Error provisioning demo tenant ${def.name}:`, err);
        try {
          const stuckTenant = await this.prisma.tenant.findFirst({
            where: { email: def.email.toLowerCase(), status: TenantStatus.PROVISIONING },
          });
          if (stuckTenant) {
            await this.prisma.subscriptionFeature.deleteMany({
              where: { subscription: { tenantId: stuckTenant.id } },
            }).catch(() => {});
            await this.prisma.subscriptionHistory.deleteMany({
              where: { subscription: { tenantId: stuckTenant.id } },
            }).catch(() => {});
            await this.prisma.subscription.deleteMany({
              where: { tenantId: stuckTenant.id },
            }).catch(() => {});
            await this.prisma.tenantFeature.deleteMany({
              where: { tenantId: stuckTenant.id },
            }).catch(() => {});
            await this.prisma.tenant.delete({ where: { id: stuckTenant.id } }).catch(() => {});
          }
        } catch {}
        results.push({
          profile: def.profile,
          tenantId: '',
          tenantCode: '',
          schemaName: '',
          salonName: def.name,
          planCode: def.plan.code,
          planName: def.plan.name,
          adminEmail: def.email,
          status: 'FAILED',
          error: err.message || String(err),
        });
      }
    }

    return results;
  }

  private async generateTenantCode(): Promise<string> {
    const lastTenant = await this.prisma.tenant.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    let nextNumber = 1;
    if (lastTenant?.code) {
      const match = lastTenant.code.match(/\d+/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    return `SAL${String(nextNumber).padStart(6, '0')}`;
  }
}
