import * as bcrypt from 'bcrypt';
import { PrismaClient, SuperAdminStatus, FeatureStatus } from '@prisma/client';

const prisma = new PrismaClient();

const features = [
  { code: 'CUSTOMERS', name: 'Customers', description: 'Customer management' },
  { code: 'SERVICES', name: 'Services', description: 'Service catalog management' },
  { code: 'INVENTORY', name: 'Inventory', description: 'Inventory management' },
  { code: 'POS', name: 'Point of Sale', description: 'Point of sale operations' },
  {
    code: 'BRANCH_MANAGEMENT',
    name: 'Branch Management',
    description: 'Manage additional branches',
  },
];

async function seedFeatures() {
  for (const feature of features) {
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

  console.log(`✓ Seeded ${features.length} features.`);
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

  const user = await prisma.superAdminUser.upsert({
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

async function main() {
  console.log('Seeding public schema...');
  await seedFeatures();
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
