import { PrismaClient } from '@prisma/client';
import { discoverTenantSchemas } from '../src/database/tenant-migration-runner';
import { TenantProvisioningService } from '../src/database/tenant-provisioning.service';
import { PrismaService } from '../src/database/prisma.service';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const provisioningService = new TenantProvisioningService(prismaService);

async function main() {
  console.log('Verifying / seeding tenant roles and permissions across all tenants...');
  await prisma.$connect();
  const schemas = await discoverTenantSchemas(prisma);

  if (schemas.length === 0) {
    console.log('No tenant schemas found.');
    return;
  }

  for (const schema of schemas) {
    console.log(`Seeding roles & permissions for [${schema}]...`);
    await provisioningService.seedRolesAndPermissions(schema, undefined, prisma);
  }

  console.log(`\n✓ Tenant seed verification completed for ${schemas.length} tenant schemas.`);
}

main()
  .catch((err) => {
    console.error('Tenant seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
