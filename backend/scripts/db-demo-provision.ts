import { PrismaService } from '../src/database/prisma.service';
import { TenantProvisioningService } from '../src/database/tenant-provisioning.service';
import { DemoSeedService } from '../src/database/demo/demo-seed.service';
import { DemoProvisionService } from '../src/database/demo/demo-provision.service';

async function main() {
  console.log('================================================================================');
  console.log('DART SMART SALON - DEMO SALES ENVIRONMENT PROVISIONING');
  console.log('================================================================================\n');

  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    const provisioningService = new TenantProvisioningService(prisma);
    const demoSeedService = new DemoSeedService(prisma);
    const demoProvisionService = new DemoProvisionService(
      prisma,
      undefined,
      provisioningService,
      demoSeedService,
    );

    const results = await demoProvisionService.provisionDemoTenants();

    console.log('\n================================================================================');
    console.log('PROVISIONING RESULTS');
    console.log('================================================================================');

    for (const r of results) {
      console.log(`\n[Profile: ${r.profile}]`);
      console.log(`  Salon Name   : ${r.salonName}`);
      console.log(`  Status       : ${r.status}`);
      if (r.tenantCode) console.log(`  Tenant Code  : ${r.tenantCode}`);
      if (r.schemaName) console.log(`  Schema Name  : ${r.schemaName}`);
      console.log(`  Plan         : ${r.planName} (${r.planCode})`);
      console.log(`  Login Email  : ${r.adminEmail}`);
      if (r.error) console.log(`  Error        : ${r.error}`);
    }

    console.log('\n================================================================================');
    console.log('DEMO PROVISION COMPLETE ✓');
    console.log('================================================================================\n');
  } catch (error) {
    console.error('Fatal error during demo provisioning:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
