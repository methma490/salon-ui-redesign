import * as bcrypt from 'bcrypt';
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

const prisma = new PrismaClient();

async function seedFeatures() {
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

  console.log(
    `✓ Seeded ${FEATURE_CATALOG.length} features (+ ${LEGACY_FEATURE_CATALOG.length} legacy aliases).`,
  );
}

async function seedSuperAdmin() {
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in environment.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.superAdminUser.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name,
      passwordHash,
      status: SuperAdminStatus.ACTIVE,
    },
    create: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      status: SuperAdminStatus.ACTIVE,
    },
  });

  console.log(`✓ Seeded super admin user: ${email}`);
}

async function assignPlanFeatures(planId: string, featureCodes: string[]) {
  const features = await prisma.feature.findMany({
    where: { code: { in: featureCodes } },
  });

  const foundCodes = new Set(features.map((f) => f.code));
  const missing = featureCodes.filter((code) => !foundCodes.has(code));
  if (missing.length > 0) {
    throw new Error(`Missing features for plan seed: ${missing.join(', ')}`);
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
  planId: string,
  currency: string,
  prices: Array<{ billingCycle: BillingCycle; price: number; trialDays: number }>,
) {
  for (const priceDef of prices) {
    await prisma.planPrice.upsert({
      where: {
        planId_billingCycle_currency: {
          planId,
          billingCycle: priceDef.billingCycle,
          currency,
        },
      },
      update: {
        price: priceDef.price,
        trialDays: priceDef.trialDays,
        isActive: true,
      },
      create: {
        planId,
        billingCycle: priceDef.billingCycle,
        price: priceDef.price,
        currency,
        trialDays: priceDef.trialDays,
        isActive: true,
      },
    });
  }

}

async function seedPlans() {
  const currency = getSeedCurrency();

  for (const planDef of PLAN_SEED_DEFINITIONS) {
    const plan = await prisma.plan.upsert({
      where: { code: planDef.code },
      update: {
        name: planDef.name,
        description: planDef.description,
        displayOrder: planDef.displayOrder,
        status: PlanStatus.ACTIVE,
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

    await upsertPlanPrices(plan.id, currency, planDef.prices);
    await assignPlanFeatures(plan.id, planDef.features);

    console.log(
      `  • ${planDef.code}: monthly=${planDef.prices[0]?.price} yearly=${planDef.prices[1]?.price} trial=${planDef.prices[0]?.trialDays}d features=[${planDef.features.join(', ')}]`,
    );
  }

  console.log(`✓ Seeded ${PLAN_SEED_DEFINITIONS.length} plans with plan_prices and plan_features.`);
}

async function main() {
  console.log('Seeding public schema (Phase 2 billing)...');
  console.log(`Currency: ${getSeedCurrency()}`);
  await seedFeatures();
  await seedPlans();
  await seedNotificationTemplates(prisma);
  await seedSuperAdmin();
  console.log('✓ Seed complete!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
