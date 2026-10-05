import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

/** Builds the Express app without starting it, so tests and the serverless entry can import it. */
export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
