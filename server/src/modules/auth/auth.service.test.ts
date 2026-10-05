import { beforeAll, describe, expect, it } from 'vitest';
import { createFakeAuthRepository } from '../../test/fakes.js';
import { createAuthService, type AuthService } from './auth.service.js';
import { hashPassword } from './password.js';

describe('auth service: login', () => {
  let auth: AuthService;

  beforeAll(async () => {
    auth = createAuthService(
      createFakeAuthRepository([
        {
          id: 1,
          email: 'hr@example.com',
          name: 'HR Manager',
          passwordHash: await hashPassword('correct-password'),
        },
      ]),
    );
  });

  it('returns the user, without the password hash, for the right credentials', async () => {
    const user = await auth.login('hr@example.com', 'correct-password');

    expect(user).toEqual({ id: 1, email: 'hr@example.com', name: 'HR Manager' });
  });

  it('rejects a wrong password', async () => {
    await expect(auth.login('hr@example.com', 'wrong-password')).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects an unknown email with the very same error', async () => {
    const wrongPassword = await auth.login('hr@example.com', 'nope').catch((error) => error);
    const unknownEmail = await auth.login('nobody@example.com', 'nope').catch((error) => error);

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });
});
