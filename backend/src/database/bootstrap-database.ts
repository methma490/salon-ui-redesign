import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('DatabaseBootstrap');

function resolveBackendRoot(): string {
  const candidates = [join(__dirname, '..'), join(__dirname, '../..'), process.cwd()];

  for (const dir of candidates) {
    if (existsSync(join(dir, 'prisma', 'schema.prisma'))) {
      return dir;
    }
  }

  return process.cwd();
}

function runPrismaCommand(command: string, backendRoot: string): void {
  execSync(`npx prisma ${command}`, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

/**
 * Applies Prisma migrations and seeds when the public schema is empty.
 * Runs before NestJS bootstraps so tables exist on first `npm run dev`.
 */
export async function bootstrapDatabase(): Promise<void> {
  if (process.env.DATABASE_AUTO_SETUP === 'false') {
    logger.log('Skipping auto database setup (DATABASE_AUTO_SETUP=false)');
    return;
  }

  const backendRoot = resolveBackendRoot();

  logger.log('Applying database migrations...');
  runPrismaCommand('migrate deploy', backendRoot);

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    await prisma.$executeRawUnsafe(
      `CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`,
    );

    const planCount = await prisma.plan.count();

    if (planCount === 0) {
      logger.log('Empty database detected — seeding default data...');
      runPrismaCommand('db seed', backendRoot);
    } else {
      logger.log('Database schema ready');
    }
  } finally {
    await prisma.$disconnect();
  }
}
