import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../test/test-app.js';
import { AppError, errorHandler } from './errors.js';

function appThatThrows(error: unknown) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 in the standard error shape for an unknown route', async () => {
    const response = await request(createTestApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'No route for GET /api/does-not-exist' },
    });
  });

  it('returns 400 when the request body is not valid JSON', async () => {
    const response = await request(createTestApp())
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send('{ not json');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('reports an AppError with its own status, code and details', async () => {
    const error = new AppError(409, 'CONFLICT', 'Already exists', { field: 'email' });

    const response = await request(appThatThrows(error)).get('/boom');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: { code: 'CONFLICT', message: 'Already exists', details: { field: 'email' } },
    });
  });

  it('hides the details of an unexpected error behind a generic 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(appThatThrows(new Error('connection refused'))).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  });
});
