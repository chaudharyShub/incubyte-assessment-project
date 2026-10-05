import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { sslFor, type DatabaseConfig } from './pool.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url));

export interface MigrateOptions extends DatabaseConfig {
  direction: 'up' | 'down';
  log?: (message: string) => void;
}

/**
 * Applies every pending migration, or reverts the most recent one.
 * Tables and the migrations bookkeeping table are created inside `schema`.
 */
export async function migrate({
  connectionString,
  schema,
  direction,
  log,
}: MigrateOptions): Promise<void> {
  await runner({
    databaseUrl: { connectionString, ssl: sslFor(connectionString) },
    dir: MIGRATIONS_DIR,
    migrationsTable: 'schema_migrations',
    schema,
    createSchema: true,
    direction,
    count: direction === 'up' ? Infinity : 1,
    log: log ?? (() => {}),
  });
}
