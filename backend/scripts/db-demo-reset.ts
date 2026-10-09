import { PrismaService } from '../src/database/prisma.service';
import { DemoSeedService } from '../src/database/demo/demo-seed.service';
import { DemoResetService } from '../src/database/demo/demo-reset.service';

function parseArgs() {
  const args = process.argv.slice(2);
  let profile: string | null = process.env.npm_config_profile || null;
  let all =
    process.env.npm_config_all === 'true' ||
    process.env.npm_config_all === '' ||
    Boolean(process.env.npm_config_all) ||
    false;

  for (let i = 0; i < args.length; i++) {
    const raw = args[i].trim();
    if (raw === '--all' || raw === '-a' || raw === 'all') {
      all = true;
    } else if (raw.startsWith('--profile=')) {
      profile = raw.split('=')[1]?.trim() || null;
    } else if (raw.startsWith('profile=')) {
      profile = raw.split('=')[1]?.trim() || null;
    } else if ((raw === '--profile' || raw === '-p' || raw === 'profile') && args[i + 1]) {
      profile = args[i + 1].trim();
      i++;
    }
  }

  return { profile, all };
}

async function main() {
  console.log('================================================================================');
  console.log('DART SMART SALON - DEMO DATA RESET CLI');
  console.log('================================================================================\n');

  const { profile, all } = parseArgs();

  if (!all && !profile) {
    console.error('Usage:');
    console.error('  npm run db:demo:reset -- --profile=PLAN_ONE_DEMO');
    console.error('  npm run db:demo:reset -- --profile=PLAN_TWO_DEMO');
    console.error('  npm run db:demo:reset -- --all\n');
    process.exit(1);
  }

  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    const demoSeedService = new DemoSeedService(prisma);
    const demoResetService = new DemoResetService(prisma, demoSeedService);

    let results;
    if (all) {
      console.log('Resetting ALL demo salon accounts...\n');
      results = await demoResetService.resetAllDemoTenants('CLI_ALL');
    } else if (profile) {
      console.log(`Resetting demo salon account with profile "${profile}"...\n`);
      results = await demoResetService.resetByProfile(profile, `CLI_${profile}`);
    }

    console.log('\n================================================================================');
    console.log('RESET RESULTS');
    console.log('================================================================================');

    for (const r of results || []) {
      console.log(`\n[Tenant: ${r.tenantId}]`);
      console.log(`  Schema Name      : ${r.schemaName}`);
      console.log(`  Profile          : ${r.demoProfile}`);
      console.log(`  Reset Timestamp  : ${r.lastDemoResetAt.toISOString()}`);
      console.log(`  Status           : SUCCESS ✓`);
    }

    console.log('\n================================================================================');
    console.log('DEMO DATA RESET COMPLETE ✓');
    console.log('================================================================================\n');
  } catch (error) {
    console.error('Fatal error during demo reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
