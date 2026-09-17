import { NotFoundException } from '@nestjs/common';
import { BillingCycle } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PlansService } from './plans.service';
import { AssignPlanFeaturesDto } from './dto/assign-plan-features.dto';
import { CreatePlanDto } from './dto/create-plan.dto';

describe('PlansService', () => {
  let prisma: {
    plan: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    feature: { findMany: jest.Mock };
    planFeature: { upsert: jest.Mock; updateMany: jest.Mock };
    planPrice: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: PlansService;

  beforeEach(() => {
    prisma = {
      plan: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      feature: { findMany: jest.fn() },
      planFeature: { upsert: jest.fn(), updateMany: jest.fn() },
      planPrice: { upsert: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };

    service = new PlansService(prisma as unknown as PrismaService);
  });

  it('creates a plan from database record, not hard-coded logic', async () => {
    const createdPlan = {
      id: 'plan-1',
      code: 'GOLD',
      name: 'Gold Plan',
      price: 15000,
      billingCycle: BillingCycle.MONTHLY,
      currency: 'LKR',
      active: true,
      planPrices: [],
      planFeatures: [],
    };

    prisma.plan.findUnique.mockResolvedValueOnce(null).mockResolvedValue(createdPlan);
    prisma.plan.create.mockResolvedValue(createdPlan);
    prisma.plan.update.mockResolvedValue(createdPlan);

    const dto: CreatePlanDto = {
      code: 'GOLD',
      name: 'Gold Plan',
      price: 15000,
      billingCycle: 'MONTHLY',
    };

    const plan = await service.create(dto);

    expect(plan.code).toBe('GOLD');
    expect(prisma.plan.create).toHaveBeenCalled();
  });

  it('assignFeatures updates only plan_features template', async () => {
    const planId = 'plan-gold';
    prisma.plan.findUnique.mockResolvedValue({ id: planId, code: 'GOLD' });
    prisma.feature.findMany.mockResolvedValue([
      { id: 'f1', code: 'CUSTOMERS', status: 'ACTIVE' },
      { id: 'f2', code: 'SERVICES', status: 'ACTIVE' },
      { id: 'f3', code: 'POS', status: 'ACTIVE' },
    ]);

    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<void>) => {
        await callback({
          planFeature: {
            upsert: jest.fn(),
            updateMany: jest.fn(),
          },
        } as never);
      },
    );

    const dto: AssignPlanFeaturesDto = {
      features: ['CUSTOMERS', 'SERVICES', 'POS'],
    };

    await service.assignFeatures(planId, dto);

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('throws when plan not found', async () => {
    prisma.plan.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });
});
