import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter, type SessionConfig } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';

/** Everything the app needs from outside: where data lives and how sessions are signed. */
export interface AppDependencies {
  authRepository: AuthRepository;
  session: SessionConfig;
}

/** Builds the Express app without starting it, so tests and the serverless entry can import it. */
export function createApp({ authRepository, session }: AppDependencies): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', createAuthRouter(createAuthService(authRepository), session));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
