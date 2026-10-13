import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import {
  BillingCycle,
  FeatureStatus,
  PlanStatus,
  PrismaClient,
  SuperAdminStatus,
} from '@prisma/client';
import {
  FEATURE_CATALOG,
  getSeedCurrency,
  LEGACY_FEATURE_CATALOG,
  PLAN_SEED_DEFINITIONS,
} from './seeds/billing-seed.config';
import { seedNotificationTemplates } from './seeds/notification-templates.seed';

const logger = new Logger('PublicSeed');

export async function seedPublicFeatures(prisma: PrismaClient): Promise<void> {
  for (const feature of FEATURE_CATALOG) {
    await prisma.feature.upsert({
      where: { code: feature.code },
      update: {
        name: feature.name,
        description: feature.description,
        status: FeatureStatus.ACTIVE,
      },
      create: {
        ...feature,
        status: FeatureStatus.ACTIVE,
      },
    });
  }

  for (const feature of LEGACY_FEATURE_CATALOG) {
    await prisma.feature.upsert({
      where: { code: feature.code },
      update: {
        name: feature.name,
        description: feature.description,
        status: FeatureStatus.INACTIVE,
      },
      create: {
        ...feature,
        status: FeatureStatus.INACTIVE,
      },
    });
  }

  logger.log(`✓ Verified ${FEATURE_CATALOG.length} features (+ ${LEGACY_FEATURE_CATALOG.length} legacy aliases).`);
}

export async function seedSuperAdminUser(prisma: PrismaClient): Promise<void> {
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    const existingCount = await prisma.superAdminUser.count();
    if (existingCount > 0) {
      logger.log(`Super admin user(s) already exist (${existingCount} found).`);
      return;
    }
    logger.warn('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD not set in environment. Skipping initial Super Admin creation.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.superAdminUser.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name,
      passwordHash,
      status: SuperAdminStatus.ACTIVE,
      updatedAt: new Date(),
    },
    create: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      status: SuperAdminStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });

  logger.log(`✓ Super admin user verified: ${email}`);
}

async function assignPlanFeatures(prisma: PrismaClient, planId: string, featureCodes: string[]) {
  const features = await prisma.feature.findMany({
    where: { code: { in: featureCodes } },
  });

  const foundCodes = new Set(features.map((f) => f.code));
  const missing = featureCodes.filter((code) => !foundCodes.has(code));
  if (missing.length > 0) {
    logger.warn(`Missing features for plan seed: ${missing.join(', ')}`);
  }

  const requestedFeatureIds = new Set(features.map((feature) => feature.id));

  for (const feature of features) {
    await prisma.planFeature.upsert({
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

  await prisma.planFeature.updateMany({
    where: {
      planId,
      featureId: { notIn: [...requestedFeatureIds] },
    },
    data: { enabled: false },
  });
}

async function upsertPlanPrices(
  prisma: PrismaClient,
  planId: string,
  currency: string,
  prices: Array<{ billingCycle: BillingCycle; price: number; compareAtPrice?: number; trialDays: number }>,
) {
  for (const priceDef of prices) {
    const existingPrice = await prisma.planPrice.findUnique({
      where: {
        planId_billingCycle_currency: {
          planId,
          billingCycle: priceDef.billingCycle,
          currency,
        },
      },
    });

    if (!existingPrice) {
      await prisma.planPrice.create({
        data: {
          planId,
          billingCycle: priceDef.billingCycle,
          price: priceDef.price,
          compareAtPrice: priceDef.compareAtPrice ?? null,
          currency,
          trialDays: priceDef.trialDays,
          isActive: true,
        },
      });
    } else if (existingPrice.compareAtPrice === null && priceDef.compareAtPrice !== undefined) {
      // Backfill compareAtPrice if not yet set
      await prisma.planPrice.update({
        where: { id: existingPrice.id },
        data: {
          compareAtPrice: priceDef.compareAtPrice,
        },
      });
    }
  }
}

export async function seedPublicPlans(prisma: PrismaClient): Promise<void> {
  const currency = getSeedCurrency();

  for (const planDef of PLAN_SEED_DEFINITIONS) {
    const plan = await prisma.plan.upsert({
      where: { code: planDef.code },
      update: {
        name: planDef.name,
        description: planDef.description,
        displayOrder: planDef.displayOrder,
      },
      create: {
        ...(planDef.id ? { id: planDef.id } : {}),
        code: planDef.code,
        name: planDef.name,
        description: planDef.description,
        displayOrder: planDef.displayOrder,
        status: PlanStatus.ACTIVE,
      },
    });

    await upsertPlanPrices(prisma, plan.id, currency, planDef.prices);
    await assignPlanFeatures(prisma, plan.id, planDef.features);
  }

  logger.log(`✓ Verified ${PLAN_SEED_DEFINITIONS.length} plans with plan_prices and plan_features.`);
}

/**
 * Master idempotent public schema seeder.
 * Safe to run multiple times without duplicating or overwriting customer/tenant production data.
 */
export async function seedAllPublicMasterData(prisma: PrismaClient): Promise<void> {
  logger.log('Seeding / verifying public schema master data...');
  await seedPublicFeatures(prisma);
  await seedPublicPlans(prisma);
  await seedNotificationTemplates(prisma);
  await seedSuperAdminUser(prisma);
  logger.log('✓ Public schema seed complete.');
}
