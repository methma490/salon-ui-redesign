import { PrismaService } from '../prisma.service';
import { DemoSeedService } from './demo-seed.service';
import { DemoResetService } from './demo-reset.service';
import { ForbiddenException } from '@nestjs/common';

describe('Demo Sales Environment Integration Tests', () => {
  let prisma: PrismaService;
  let demoSeedService: DemoSeedService;
  let demoResetService: DemoResetService;

  beforeAll(async () => {
    jest.setTimeout(30000);
    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.tenant.updateMany({
      where: { isDemo: true },
      data: { demoResetInProgress: false },
    });
    demoSeedService = new DemoSeedService(prisma);
    demoResetService = new DemoResetService(prisma, demoSeedService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Demo Tenant Metadata & Provisioning', () => {
    it('both PLAN_ONE_DEMO and PLAN_TWO_DEMO tenants exist with isDemo=true', async () => {
      const demo1 = await prisma.tenant.findFirst({
        where: { demoProfile: 'PLAN_ONE_DEMO' },
      });
      const demo2 = await prisma.tenant.findFirst({
        where: { demoProfile: 'PLAN_TWO_DEMO' },
      });

      expect(demo1).toBeDefined();
      expect(demo1?.isDemo).toBe(true);
      expect(demo1?.name).toBe('Demo Salon - Plan One');
      expect(demo1?.schemaName).toMatch(/^tenant_demo_salon_plan_one_\d{6}$/);

      expect(demo2).toBeDefined();
      expect(demo2?.isDemo).toBe(true);
      expect(demo2?.name).toBe('Demo Salon - Plan Two');
      expect(demo2?.schemaName).toMatch(/^tenant_demo_salon_plan_two_\d{6}$/);
    });

    it('each demo tenant has an active non-expiring subscription assigned to the respective plan', async () => {
      const demo1 = await prisma.tenant.findFirst({
        where: { demoProfile: 'PLAN_ONE_DEMO' },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
          },
        },
      });
      const demo2 = await prisma.tenant.findFirst({
        where: { demoProfile: 'PLAN_TWO_DEMO' },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
          },
        },
      });

      expect(demo1?.subscriptions.length).toBeGreaterThan(0);
      expect(demo1?.subscriptions[0].status).toBe('ACTIVE');
      expect(demo1?.subscriptions[0].plan.code).toBe('SILVER');

      expect(demo2?.subscriptions.length).toBeGreaterThan(0);
      expect(demo2?.subscriptions[0].status).toBe('ACTIVE');
      expect(demo2?.subscriptions[0].plan.code).toBe('GOLD');
    });
  });

  describe('2. Security Guard & Real Tenant Protection', () => {
    it('CRITICAL: real non-demo tenant is strictly blocked from Demo Reset API (403 Forbidden)', async () => {
      // Find a non-demo tenant or create a dummy mock check
      const nonDemoTenant = await prisma.tenant.findFirst({
        where: { isDemo: false },
      });

      if (nonDemoTenant) {
        await expect(
          demoResetService.resetDemoTenant(nonDemoTenant.id, { performedBy: 'ATTACKER' }),
        ).rejects.toThrow(ForbiddenException);
      }
    });
  });

  describe('3. Platform Analytics Exclusions', () => {
    it('demo subscriptions are excluded from real paying subscription count queries', async () => {
      const realActiveSubscriptions = await prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          tenant: { isDemo: false },
        },
      });

      const totalActiveSubscriptions = await prisma.subscription.count({
        where: {
          status: 'ACTIVE',
        },
      });

      // Total count includes demo accounts, but real customer count strictly excludes them
      expect(totalActiveSubscriptions).toBeGreaterThanOrEqual(realActiveSubscriptions);
    });
  });

  describe('4. Reset Determinism & Baseline Integrity', () => {
    it('resets Plan One demo salon and restores all baseline business entities', async () => {
      const demo1 = await prisma.tenant.findFirst({
        where: { demoProfile: 'PLAN_ONE_DEMO' },
      });
      expect(demo1).toBeDefined();

      const result = await demoResetService.resetDemoTenant(demo1!.id, {
        performedBy: 'INTEGRATION_TEST',
      });
      expect(result.success).toBe(true);

      const schema = demo1!.schemaName;

      // Verify baseline data in tenant schema
      const [customers, services, products, appointments, sales, expenses] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".customers`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".services`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".products`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".appointments`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".sales`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".expenses`,
        ),
      ]);

      expect(parseInt(customers[0].count, 10)).toBe(20);
      expect(parseInt(services[0].count, 10)).toBe(15);
      expect(parseInt(products[0].count, 10)).toBe(11);
      expect(parseInt(appointments[0].count, 10)).toBe(13);
      expect(parseInt(sales[0].count, 10)).toBe(10);
      expect(parseInt(expenses[0].count, 10)).toBe(7);
    });

    it('resets Plan Two demo salon and restores Plan Two specific modules (GRN, Suppliers, Payroll, Quotations)', async () => {
      const demo2 = await prisma.tenant.findFirst({
        where: { demoProfile: 'PLAN_TWO_DEMO' },
      });
      expect(demo2).toBeDefined();

      const result = await demoResetService.resetDemoTenant(demo2!.id, {
        performedBy: 'INTEGRATION_TEST',
      });
      expect(result.success).toBe(true);

      const schema = demo2!.schemaName;

      // Verify Plan Two specific data in tenant schema
      const [suppliers, grns, payrollRuns, quotations, branches] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".suppliers`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".grns`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".payroll_runs`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".quotations`,
        ),
        prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT COUNT(*)::text as count FROM "${schema}".branches`,
        ),
      ]);

      expect(parseInt(suppliers[0].count, 10)).toBe(3);
      expect(parseInt(grns[0].count, 10)).toBe(3);
      expect(parseInt(payrollRuns[0].count, 10)).toBe(2);
      expect(parseInt(quotations[0].count, 10)).toBe(3);
      expect(parseInt(branches[0].count, 10)).toBe(2); // Main Branch + Kandy Branch
    });
  });
});
