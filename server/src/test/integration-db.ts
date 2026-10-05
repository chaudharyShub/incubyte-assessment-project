import { existsSync } from 'node:fs';
import type pg from 'pg';
import { loadEnv } from '../config/env.js';
import { migrate } from '../db/migrations.js';
import { createPool } from '../db/pool.js';
import { generateEmployees, type GeneratedEmployee } from '../seed/generate-employees.js';
import { seedDatabase } from '../seed/seed-database.js';

/** Kept apart from `public`, so the tests never touch development or production data. */
const INTEGRATION_SCHEMA = 'integration_test';
const EMPLOYEE_COUNT = 60;

export const INTEGRATION_USER = {
  email: 'hr@example.com',
  password: 'integration-password',
  name: 'HR Manager',
};

export interface IntegrationDatabase {
  pool: pg.Pool;
  /** The employees that were loaded, so a test can work out the answer it expects. */
  seeded: GeneratedEmployee[];
  close(): Promise<void>;
}

/**
 * Brings the integration schema up to date and reloads it with a small, fixed
 * data set. Call it in `beforeAll`; every test file starts from the same data.
 */
export async function setUpIntegrationDatabase(): Promise<IntegrationDatabase> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const { DATABASE_URL: connectionString } = loadEnv();

  await migrate({ connectionString, schema: INTEGRATION_SCHEMA, direction: 'up' });

  const pool = createPool({ connectionString, schema: INTEGRATION_SCHEMA });
  const seeded = generateEmployees(EMPLOYEE_COUNT);
  await seedDatabase(pool, INTEGRATION_USER, seeded);

  return { pool, seeded, close: () => pool.end() };
}
