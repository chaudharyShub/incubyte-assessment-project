import cookieParser from 'cookie-parser';
import express, { Router, type Express } from 'express';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { requireAuth } from './middleware/require-auth.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter, type SessionConfig } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import type { EmployeeRepository } from './modules/employees/employee.repository.js';
import { createEmployeeRouter } from './modules/employees/employee.routes.js';
import { createEmployeeService } from './modules/employees/employee.service.js';
import type { InsightsRepository } from './modules/insights/insights.repository.js';
import { createInsightsRouter } from './modules/insights/insights.routes.js';
import type { MetaRepository } from './modules/meta/meta.repository.js';
import { createMetaRouter } from './modules/meta/meta.routes.js';

/** Everything the app needs from outside: where data lives and how sessions are signed. */
export interface AppDependencies {
  authRepository: AuthRepository;
  employeeRepository: EmployeeRepository;
  insightsRepository: InsightsRepository;
  metaRepository: MetaRepository;
  session: SessionConfig;
  /** The current time. Defaults to the system clock. */
  now?: () => Date;
}

/** Builds the Express app without starting it, so tests and the serverless entry can import it. */
export function createApp({
  authRepository,
  employeeRepository,
  insightsRepository,
  metaRepository,
  session,
  now = () => new Date(),
}: AppDependencies): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', createAuthRouter(createAuthService(authRepository), session));

  // Everything else under /api requires a signed-in session.
  const api = Router();
  api.use(requireAuth(session.jwtSecret));
  api.use('/meta', createMetaRouter(metaRepository));
  api.use(
    '/employees',
    createEmployeeRouter(
      createEmployeeService({ employees: employeeRepository, meta: metaRepository, now }),
    ),
  );
  api.use('/insights', createInsightsRouter(insightsRepository));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
