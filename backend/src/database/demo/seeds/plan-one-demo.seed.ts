import { DbClient } from '../../tenant-migration-runner';
import { DemoCommonSeedResult } from './common-demo.seed';

export async function seedPlanOneDemoData(
  schemaName: string,
  commonResult: DemoCommonSeedResult,
  client: DbClient,
): Promise<void> {
  // Plan One (Silver) operates with baseline features:
  // CUSTOMERS, SERVICES, APPOINTMENTS, EMPLOYEES
  // Ensure search_path is set
  await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

  // Ensure main branch has clear Plan One branding
  await client.$executeRawUnsafe(
    `UPDATE "${schemaName}".branches
     SET name = 'Demo Salon (Silver Plan) - Main Studio'
     WHERE id = $1::uuid`,
    commonResult.mainBranchId,
  );
}
