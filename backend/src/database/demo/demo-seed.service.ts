import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DbClient, validateTenantSchemaName } from '../tenant-migration-runner';
import { seedCommonDemoData } from './seeds/common-demo.seed';
import { seedPlanOneDemoData } from './seeds/plan-one-demo.seed';
import { seedPlanTwoDemoData } from './seeds/plan-two-demo.seed';

export type DemoProfile = 'PLAN_ONE_DEMO' | 'PLAN_TWO_DEMO';

@Injectable()
export class DemoSeedService {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed complete deterministic baseline for a demo salon account.
   */
  async seedBaseline(
    schemaName: string,
    demoProfile: DemoProfile | string,
    client: DbClient = this.prisma,
  ): Promise<void> {
    const safeSchema = validateTenantSchemaName(schemaName);
    this.logger.log(`Seeding deterministic demo baseline for ${safeSchema} [Profile: ${demoProfile}]`);

    // 1. Common demo baseline (settings, branch, employees, customers, services, products, stock, appointments, sales, expenses)
    const commonResult = await seedCommonDemoData(safeSchema, client);

    // 2. Plan-specific demo baseline
    if (demoProfile === 'PLAN_ONE_DEMO') {
      await seedPlanOneDemoData(safeSchema, commonResult, client);
    } else if (demoProfile === 'PLAN_TWO_DEMO') {
      await seedPlanTwoDemoData(safeSchema, commonResult, client);
    } else {
      this.logger.warn(`Unknown demo profile "${demoProfile}", default common seed applied only`);
    }

    this.logger.log(`✓ Demo baseline seeded successfully for ${safeSchema} [${demoProfile}]`);
  }
}
