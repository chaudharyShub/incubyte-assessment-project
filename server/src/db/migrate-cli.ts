import { loadEnv } from '../config/env.js';
import { migrate } from './migrations.js';

const direction = process.argv[2] ?? 'up';
if (direction !== 'up' && direction !== 'down') {
  console.error('Usage: migrate [up|down]');
  process.exit(1);
}

const env = loadEnv();

await migrate({
  connectionString: env.DATABASE_URL,
  schema: env.DATABASE_SCHEMA,
  direction,
  log: console.log,
});
