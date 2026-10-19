import 'dotenv/config';
import { bootstrapDatabase } from '../src/database/bootstrap-database';

async function main() {
  console.log('Running complete database setup (public migrations + seed + tenant migrations)...');
  await bootstrapDatabase();
  console.log('✓ Database setup completed successfully!');
}

main().catch((err: unknown): void => {
  console.error('Database setup failed:', err);
  process.exitCode = 1;
});
