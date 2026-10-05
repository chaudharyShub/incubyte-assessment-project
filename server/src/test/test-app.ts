import { createApp, type AppDependencies } from '../app.js';
import { createFakeAuthRepository } from './fakes.js';

export const TEST_JWT_SECRET = 'a-secret-used-only-in-tests-0123456789';

/** The real app wired to in-memory fakes. Pass overrides for the parts a test cares about. */
export function createTestApp(overrides: Partial<AppDependencies> = {}) {
  return createApp({
    authRepository: createFakeAuthRepository(),
    session: { jwtSecret: TEST_JWT_SECRET, secureCookies: false },
    ...overrides,
  });
}
