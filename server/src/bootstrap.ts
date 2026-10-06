import type { Express } from 'express';
import { createApp } from './app.js';
import { loadAuthEnv, loadEnv } from './config/env.js';
import { createPool } from './db/pool.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createEmployeeRepository } from './modules/employees/employee.repository.js';
import { createInsightsRepository } from './modules/insights/insights.repository.js';
import { createMetaRepository } from './modules/meta/meta.repository.js';

/** Builds the app against the real database, configured from environment variables. */
export function createAppFromEnv(): Express {
  const env = loadEnv();
  const authEnv = loadAuthEnv();
  const pool = createPool({ connectionString: env.DATABASE_URL, schema: env.DATABASE_SCHEMA });

  return createApp({
    authRepository: createAuthRepository(pool),
    employeeRepository: createEmployeeRepository(pool),
    insightsRepository: createInsightsRepository(pool),
    metaRepository: createMetaRepository(pool),
    session: {
      jwtSecret: authEnv.JWT_SECRET,
      secureCookies: process.env.NODE_ENV === 'production',
    },
  });
}
