import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BillingCycle, PlanStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

import {
  normalizeFeatureCodes,
  validateFeatureRecords,
} from '../super-admin/salons/utils/feature-validation.util';

import { AssignPlanFeaturesDto } from './dto/assign-plan-features.dto';

import { CreatePlanDto } from './dto/create-plan.dto';

import { UpdatePlanDto } from './dto/update-plan.dto';

import { UpdatePlanPricingDto } from './dto/update-plan-pricing.dto';

import {
  getDefaultMonthlyPlanPrice,
  getPlanCurrency,
  isPlanActive,
  resolvePlanPriceSelection,
} from './utils/plan-pricing.util';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    const code = dto.code.toUpperCase();

    const existing = await this.prisma.plan.findUnique({ where: { code } });

    if (existing) {
      throw new ConflictException(`Plan with code ${code} already exists`);
    }

    const currency = dto.currency ?? 'LKR';

    const monthlyPrice =
      dto.monthlyPrice ?? (dto.billingCycle === 'MONTHLY' ? dto.price : undefined);

    const yearlyPrice = dto.yearlyPrice ?? (dto.billingCycle === 'YEARLY' ? dto.price : undefined);

    if (monthlyPrice === undefined && yearlyPrice === undefined) {
      throw new BadRequestException('At least one plan price must be provided');
    }

    const plan = await this.prisma.plan.create({
      data: {
        code,

        name: dto.name,

        description: dto.description,

        status: dto.active === false ? PlanStatus.INACTIVE : PlanStatus.ACTIVE,
      },
    });

    await this.syncPlanPrices(plan.id, currency, {
      monthlyPrice,

      yearlyPrice,

      trialDays: dto.trialDays ?? 0,
    });

    return this.findById(plan.id);
  }

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],

      include: this.planInclude(),
    });
  }

  async activate(id: string) {
    await this.findById(id);

    return this.prisma.plan.update({
      where: { id },

      data: { status: PlanStatus.ACTIVE },

      include: this.planInclude(),
    });
  }

  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.plan.update({
      where: { id },

      data: { status: PlanStatus.INACTIVE },

      include: this.planInclude(),
    });
  }

  async updatePricing(id: string, dto: UpdatePlanPricingDto) {
    const plan = await this.findById(id);

    const currency = dto.currency ?? getPlanCurrency(plan);

    await this.syncPlanPrices(id, currency, dto);

    return this.findById(id);
  }

  async findPublicActivePlans() {
    const plans = await this.prisma.plan.findMany({
      where: {
        status: 'ACTIVE',

        code: { not: 'CUSTOM' },
      },

      orderBy: { displayOrder: 'asc' },

      include: {
        planPrices: {
          where: { isActive: true },

          orderBy: { billingCycle: 'asc' },
        },

        planFeatures: {
          where: { enabled: true },

          include: {
            feature: {
              select: { code: true, name: true, status: true },
            },
          },

          orderBy: { feature: { code: 'asc' } },
        },
      },
    });

    return plans.map((plan) => {
      const monthlyPrice = plan.planPrices.find((p) => p.billingCycle === 'MONTHLY');

      const defaultPrice = monthlyPrice ?? plan.planPrices[0];

      return {
        id: plan.id,

        code: plan.code,

        name: plan.name,

        description: plan.description,

        currency: defaultPrice?.currency ?? 'LKR',

        displayOrder: plan.displayOrder,

        price: defaultPrice ? Number(defaultPrice.price) : 0,

        billingCycle: defaultPrice?.billingCycle ?? BillingCycle.MONTHLY,

        prices: plan.planPrices.map((p) => ({
          billingCycle: p.billingCycle,

          price: Number(p.price),

          currency: p.currency,

          trialDays: p.trialDays,
        })),

        features: plan.planFeatures

          .filter((pf) => pf.feature.status === 'ACTIVE')

          .map((pf) => ({
            code: pf.feature.code,

            name: pf.feature.name,
          })),
      };
    });
  }

  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },

      include: this.planInclude(),
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async findByCode(code: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { code: code.toUpperCase() },

      include: this.planInclude(),
    });

    if (!plan) {
      throw new NotFoundException(`Plan not found: ${code}`);
    }

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findById(id);

    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.active === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    const nextStatus =
      dto.status !== undefined
        ? dto.status
        : dto.active !== undefined
          ? dto.active
            ? PlanStatus.ACTIVE
            : PlanStatus.INACTIVE
          : undefined;

    return this.prisma.plan.update({
      where: { id },

      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),

        ...(dto.description !== undefined ? { description: dto.description } : {}),

        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      },

      include: this.planInclude(),
    });
  }

  async assignFeatures(planId: string, dto: AssignPlanFeaturesDto) {
    await this.findById(planId);

    const uniqueFeatures = normalizeFeatureCodes(dto.features);

    const features = await this.resolveActiveFeatures(uniqueFeatures);

    await this.prisma.$transaction(async (tx) => {
      const requestedFeatureIds = new Set(features.map((feature) => feature.id));

      for (const feature of features) {
        await tx.planFeature.upsert({
          where: {
            planId_featureId: {
              planId,

              featureId: feature.id,
            },
          },

          update: { enabled: true },

          create: {
            planId,

            featureId: feature.id,

            enabled: true,
          },
        });
      }

      await tx.planFeature.updateMany({
        where: {
          planId,

          featureId: { notIn: [...requestedFeatureIds] },
        },

        data: { enabled: false },
      });
    });

    return this.findById(planId);
  }

  async getEnabledPlanFeatureCodes(planId: string): Promise<string[]> {
    const planFeatures = await this.prisma.planFeature.findMany({
      where: {
        planId,

        enabled: true,

        feature: { status: 'ACTIVE' },
      },

      include: { feature: { select: { code: true } } },
    });

    return planFeatures.map((pf) => pf.feature.code);
  }

  resolvePlanPrice(
    plan: Awaited<ReturnType<PlansService['findById']>>,

    options?: {
      planPriceId?: string;

      billingCycle?: BillingCycle;

      currency?: string;
    },
  ) {
    if (!isPlanActive(plan)) {
      throw new BadRequestException('Plan is not active');
    }

    return resolvePlanPriceSelection(plan, options);
  }

  getDefaultPlanPrice(plan: Awaited<ReturnType<PlansService['findById']>>) {
    return getDefaultMonthlyPlanPrice(plan);
  }

  private async resolveActiveFeatures(codes: string[]) {
    const features = await this.prisma.feature.findMany({
      where: { code: { in: codes } },
    });

    return validateFeatureRecords(codes, features);
  }

  private async syncPlanPrices(
    planId: string,

    currency: string,

    dto: {
      monthlyPrice?: number;

      yearlyPrice?: number;

      trialDays?: number;
    },
  ) {
    const trialDays = dto.trialDays ?? 0;

    if (dto.monthlyPrice !== undefined) {
      await this.prisma.planPrice.upsert({
        where: {
          planId_billingCycle_currency: {
            planId,

            billingCycle: BillingCycle.MONTHLY,

            currency,
          },
        },

        update: { price: dto.monthlyPrice, trialDays, isActive: true },

        create: {
          planId,

          billingCycle: BillingCycle.MONTHLY,

          price: dto.monthlyPrice,

          currency,

          trialDays,

          isActive: true,
        },
      });
    }

    if (dto.yearlyPrice !== undefined) {
      await this.prisma.planPrice.upsert({
        where: {
          planId_billingCycle_currency: {
            planId,

            billingCycle: BillingCycle.YEARLY,

            currency,
          },
        },

        update: { price: dto.yearlyPrice, trialDays, isActive: true },

        create: {
          planId,

          billingCycle: BillingCycle.YEARLY,

          price: dto.yearlyPrice,

          currency,

          trialDays,

          isActive: true,
        },
      });
    }
  }

  private planInclude(): Prisma.PlanInclude {
    return {
      planPrices: {
        orderBy: { billingCycle: 'asc' },
      },

      planFeatures: {
        where: { enabled: true },

        include: {
          feature: {
            select: { id: true, code: true, name: true, status: true },
          },
        },

        orderBy: { feature: { code: 'asc' } },
      },
    };
  }
}
