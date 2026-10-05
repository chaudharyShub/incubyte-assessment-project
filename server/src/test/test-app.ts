import { createApp, type AppDependencies } from '../app.js';
import { signSessionToken } from '../modules/auth/session-token.js';
import {
  createFakeAuthRepository,
  createFakeEmployeeRepository,
  createFakeMetaRepository,
} from './fakes.js';

export const TEST_JWT_SECRET = 'a-secret-used-only-in-tests-0123456789';

/** "Today" in tests, so date rules do not depend on when the tests are run. */
export const TEST_NOW = new Date('2026-06-15T09:00:00Z');

/** The real app wired to in-memory fakes. Pass overrides for the parts a test cares about. */
export function createTestApp(overrides: Partial<AppDependencies> = {}) {
  return createApp({
    authRepository: createFakeAuthRepository(),
    employeeRepository: createFakeEmployeeRepository(),
    metaRepository: createFakeMetaRepository(),
    session: { jwtSecret: TEST_JWT_SECRET, secureCookies: false },
    now: () => TEST_NOW,
    ...overrides,
  });
}

/** A Cookie header value for a signed-in HR Manager, for routes that require a session. */
export function sessionCookie(): string {
  const token = signSessionToken(
    { id: 1, email: 'hr@example.com', name: 'HR Manager' },
    TEST_JWT_SECRET,
  );
  return `session=${token}`;
}
